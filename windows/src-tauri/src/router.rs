// Unified OpenAI-compatible API client for OpenRouter, OrcaRouter, and TokenRouter.
// Multi-turn chat with multimodal image and text context.
// All keys live in the Windows Credential Manager.

use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use crate::secrets;

const MAX_INLINE_TEXT: u64 = 200_000;

const SYSTEM_PROMPT: &str = "You are Mochi, a personal AI assistant living on the user's screen. \
You can help with anything — research, coding, spreadsheets, productivity, and questions. \
When analyzing screenshots or selected screen areas, examine formulas, numbers, tables, code, and errors attentively to provide direct, accurate answers. \
Respond in the user's language. Be thorough but concise. \
No markdown formatting (no **, no ##, no bullet dashes). Use plain text with line breaks.";

#[derive(Default)]
pub struct RouterChat {
    messages: Mutex<Vec<Value>>,
}

impl RouterChat {
    pub fn reset(&self) {
        self.messages.lock().unwrap().clear();
    }

    fn is_empty(&self) -> bool {
        self.messages.lock().unwrap().is_empty()
    }

    fn push(&self, message: Value) {
        self.messages.lock().unwrap().push(message);
    }

    fn pop(&self) {
        self.messages.lock().unwrap().pop();
    }

    fn snapshot(&self) -> Vec<Value> {
        self.messages.lock().unwrap().clone()
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RouterContext {
    File { name: String, path: String },
    Window { app_name: String, title: String, url: Option<String> },
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RouterReply {
    pub text: String,
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
    pub total_tokens: Option<u32>,
}

pub struct ProviderConfig {
    pub name: &'static str,
    pub endpoint: &'static str,
    pub secret_key_name: &'static str,
    pub default_model: &'static str,
}

pub fn get_provider_config(provider: &str) -> Result<ProviderConfig, String> {
    match provider.to_lowercase().as_str() {
        "openrouter" => Ok(ProviderConfig {
            name: "OpenRouter",
            endpoint: "https://openrouter.ai/api/v1/chat/completions",
            secret_key_name: "openrouter-api-key",
            default_model: "google/gemini-2.5-flash",
        }),
        "orcarouter" => Ok(ProviderConfig {
            name: "OrcaRouter",
            endpoint: "https://api.orcarouter.ai/v1/chat/completions",
            secret_key_name: "orcarouter-api-key",
            default_model: "google/gemini-2.5-flash",
        }),
        "tokenrouter" => Ok(ProviderConfig {
            name: "TokenRouter",
            endpoint: "https://api.tokenrouter.com/v1/chat/completions",
            secret_key_name: "tokenrouter-api-key",
            default_model: "deepseek/deepseek-chat",
        }),
        other => Err(format!("Unknown router provider: {other}")),
    }
}

pub async fn send(
    chat: &RouterChat,
    provider: &str,
    model: &str,
    query: String,
    context: Option<RouterContext>,
) -> Result<RouterReply, String> {
    let cfg = get_provider_config(provider)?;
    let key = secrets::get(cfg.secret_key_name)
        .ok_or_else(|| format!("{} API key missing. Open settings.", cfg.name))?;

    let model_to_use = if model.trim().is_empty() {
        cfg.default_model
    } else {
        model.trim()
    };

    let mut user_content: Vec<Value> = Vec::new();

    if let Some(RouterContext::File { name, path }) = &context {
        if let Some(image_url) = image_block(path) {
            user_content.push(json!({
                "type": "text",
                "text": format!("File context (Image): {name}"),
            }));
            user_content.push(image_url);
        } else if let Some(text_content) = text_block(path) {
            user_content.push(json!({
                "type": "text",
                "text": format!("File: {name}\n\n{text_content}"),
            }));
        } else {
            user_content.push(json!({
                "type": "text",
                "text": format!("File context: {name} (binary attachment)"),
            }));
        }
    } else if chat.is_empty() {
        if let Some(RouterContext::Window { app_name, title, url }) = &context {
            let mut ctx_str = format!("Context — App: {app_name}, Window: {title}");
            if let Some(u) = url {
                ctx_str.push_str(&format!(", URL: {u}"));
            }
            user_content.push(json!({
                "type": "text",
                "text": ctx_str,
            }));
        }
    }

    user_content.push(json!({
        "type": "text",
        "text": query,
    }));

    // Build messages array starting with system prompt + history
    let mut messages: Vec<Value> = Vec::new();
    messages.push(json!({
        "role": "system",
        "content": SYSTEM_PROMPT,
    }));

    for prior in chat.snapshot() {
        messages.push(prior);
    }

    let user_turn = json!({
        "role": "user",
        "content": user_content,
    });
    messages.push(user_turn.clone());
    chat.push(user_turn);

    let body = json!({
        "model": model_to_use,
        "messages": messages,
        "max_tokens": 4096,
        "temperature": 0.7,
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(90))
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.post(cfg.endpoint)
        .header("Authorization", format!("Bearer {key}"))
        .header("Content-Type", "application/json");

    if provider.eq_ignore_ascii_case("openrouter") {
        req = req
            .header("HTTP-Referer", "https://powpow.app")
            .header("X-Title", "Powpow");
    }

    let response = req.json(&body).send().await.map_err(|e| {
        chat.pop();
        e.to_string()
    })?;

    let status = response.status();
    let text_res = response.text().await.map_err(|e| {
        chat.pop();
        e.to_string()
    })?;

    let json_res: Value = serde_json::from_str(&text_res).map_err(|_| {
        chat.pop();
        if !status.is_success() {
            format!("{} HTTP {}: {}", cfg.name, status, text_res)
        } else {
            format!("{} returned invalid JSON: {}", cfg.name, text_res)
        }
    })?;

    if !status.is_success() {
        chat.pop();
        if let Some(err) = json_res.get("error").and_then(|e| e.get("message")).and_then(Value::as_str) {
            return Err(format!("{}: {}", cfg.name, err));
        }
        return Err(format!("{} error (HTTP {}): {}", cfg.name, status, text_res));
    }

    let reply_text = json_res
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|c| c.first())
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string();

    if reply_text.is_empty() {
        chat.pop();
        if let Some(err) = json_res.get("error").and_then(|e| e.get("message")).and_then(Value::as_str) {
            return Err(format!("{}: {}", cfg.name, err));
        }
        return Err(format!("{} returned empty response.", cfg.name));
    }

    let input_tokens = json_res
        .get("usage")
        .and_then(|u| u.get("prompt_tokens"))
        .and_then(Value::as_u64)
        .map(|v| v as u32);
    let output_tokens = json_res
        .get("usage")
        .and_then(|u| u.get("completion_tokens"))
        .and_then(Value::as_u64)
        .map(|v| v as u32);
    let total_tokens = json_res
        .get("usage")
        .and_then(|u| u.get("total_tokens"))
        .and_then(Value::as_u64)
        .map(|v| v as u32)
        .or_else(|| match (input_tokens, output_tokens) {
            (Some(i), Some(o)) => Some(i + o),
            _ => None,
        });

    chat.push(json!({
        "role": "assistant",
        "content": reply_text.clone(),
    }));

    Ok(RouterReply {
        text: reply_text,
        input_tokens,
        output_tokens,
        total_tokens,
    })
}

fn image_block(path: &str) -> Option<Value> {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let media_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => return None,
    };

    if std::fs::metadata(path).ok()?.len() > 20_000_000 {
        return None;
    }
    let bytes = std::fs::read(path).ok()?;
    let b64 = crate::claude::base64_for(&bytes);
    let data_url = format!("data:{media_type};base64,{b64}");

    Some(json!({
        "type": "image_url",
        "image_url": {
            "url": data_url
        }
    }))
}

fn text_block(path: &str) -> Option<String> {
    let len = std::fs::metadata(path).ok()?.len();
    if len > MAX_INLINE_TEXT {
        return None;
    }
    std::fs::read_to_string(path).ok()
}
