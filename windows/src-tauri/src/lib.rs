// Powpow for Windows — app wiring and the commands the island calls.

mod claude;
mod capture;
mod codex_plan;
mod droptarget;
mod files;
mod gemini;
mod gmail;
mod jump;
mod mail;
mod media;
mod outlook;
mod hooks;
mod integrations;
mod island;
mod log;
mod pipe;
mod router;
mod secrets;
mod settings;
mod tray;
mod win_user;
mod system_agent;
mod hotkey;

use std::os::windows::process::CommandExt;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_autostart::{ManagerExt, MacosLauncher};

use claude::{Chat, ChatContext, ChatReply};
use gemini::GeminiChat;
use router::RouterChat;
use files::DroppedFile;
use hooks::{HookPreview, HookStatus};
use island::{PollGate, ScreenInfo};
use pipe::Pending;
use settings::Settings;

/// Keeps spawned helpers from flashing a console window.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub struct Shared {
    pub settings: Mutex<Settings>,
    pub gate: Arc<PollGate>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootInfo {
    settings: Settings,
    screen: ScreenInfo,
    version: String,
    hook_path: String,
}

#[tauri::command]
fn boot(app: AppHandle, shared: State<Shared>) -> BootInfo {
    let mut settings = shared.settings.lock().unwrap().clone();
    // The real state of ~/.claude/settings.json wins over whatever we stored.
    settings.hooks_installed = hooks::status().installed;
    let screen = island::screen_info(&app, &settings.screen);
    BootInfo {
        settings,
        screen,
        version: env!("CARGO_PKG_VERSION").to_string(),
        hook_path: settings::hook_exe_path().to_string_lossy().to_string(),
    }
}

#[tauri::command]
fn save_settings(app: AppHandle, shared: State<Shared>, settings: Settings) {
    let (screen_changed, autostart_changed) = {
        let mut current = shared.settings.lock().unwrap();
        let screen_changed = current.screen != settings.screen;
        let autostart_changed = current.autostart != settings.autostart;
        *current = settings.clone();
        (screen_changed, autostart_changed)
    };
    if let Err(err) = settings::save(&settings) {
        eprintln!("[powpow] could not save settings: {err}");
    }
    if autostart_changed {
        let manager = app.autolaunch();
        let result = if settings.autostart { manager.enable() } else { manager.disable() };
        if let Err(err) = result {
            eprintln!("[powpow] autostart: {err}");
        }
    }
    if screen_changed {
        let collapsed = shared.gate.collapsed.load(Ordering::Relaxed);
        island::apply_geometry(&app, &settings.screen, collapsed);
    }
    // Keep the other window in step (island ⇄ settings window).
    let _ = app.emit("settings-changed", settings);
}

/// Hidden island → shrink the window to the invisible wake strip and park the
/// cursor poll; anything else → full panel and 60 Hz polling.
#[tauri::command]
fn set_collapsed(app: AppHandle, shared: State<Shared>, collapsed: bool) {
    let pref = shared.settings.lock().unwrap().screen.clone();
    shared.gate.collapsed.store(collapsed, Ordering::Relaxed);
    island::apply_geometry(&app, &pref, collapsed);
    // The wake strip must always take the mouse, and a resize invalidates the flag.
    island::set_ignore_cursor(&app, false);
    shared.gate.forget_ignore_state();
    // Expanded → full poll; collapsed → slow strip watch (drops still land).
    shared.gate.set_collapsed(collapsed);
}

/// The front end pushes the island shape; Rust decides click-through from it.
#[tauri::command]
fn set_island_rect(shared: State<Shared>, x: f64, y: f64, width: f64, height: f64) {
    shared.gate.set_rect(island::IslandRect { x, y, w: width, h: height });
}

#[tauri::command]
fn focus_window(app: AppHandle, focused: bool) {
    let Some(win) = island::window(&app) else { return };
    island::set_activating(&win, focused);
    if focused {
        let _ = win.set_focus();
    }
}

#[tauri::command]
fn reposition(app: AppHandle, shared: State<Shared>) {
    let pref = shared.settings.lock().unwrap().screen.clone();
    let collapsed = shared.gate.collapsed.load(Ordering::Relaxed);
    island::apply_geometry(&app, &pref, collapsed);
}

#[tauri::command]
fn open_url(url: String) {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return;
    }
    let _ = Command::new("rundll32.exe")
        .args(["url.dll,FileProtocolHandler", &url])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
}

/// "Open terminal" — best effort, in order:
/// 1. Focus the visible console whose title shows the project folder
///    (PowerShell/CMD/Windows Terminal all put cwd in the title).
/// 2. Open the folder in VS Code when `code` is on PATH.
/// 3. Fall back to Explorer.
#[tauri::command]
fn open_in_vscode(path: Option<String>) -> bool {
    if let Some(p) = path.as_deref().filter(|p| !p.is_empty()) {
        let folder = p.replace('/', "\\");
        let name = folder
            .trim_end_matches('\\')
            .rsplit('\\')
            .next()
            .unwrap_or("");
        if jump::focus_window_for_folder(name) {
            return true;
        }
    }
    // No `cmd /C` anywhere near this. The path is a project folder chosen by
    // whoever is using Claude Code, and cmd would happily read `&`, `^` and `%`
    // in a folder name as syntax. Finding the launcher ourselves and handing the
    // path over as a separate argument keeps it a path.
    if let Some(code) = find_on_path("code") {
        let mut cmd = Command::new(code);
        if let Some(p) = path.as_deref().filter(|p| !p.is_empty()) {
            cmd.arg(p);
        }
        if cmd.creation_flags(CREATE_NO_WINDOW).spawn().is_ok() {
            return true;
        }
    }
    if let Some(p) = path.as_deref().filter(|p| !p.is_empty()) {
        let _ = Command::new("explorer").arg(p).spawn();
    }
    false
}

/// Our own `where`: walks %PATH% against %PATHEXT%, no shell involved.
/// Rust quotes arguments correctly for `.cmd`/`.bat` targets since 1.77, so
/// spawning `code.cmd` directly is safe.
fn find_on_path(stem: &str) -> Option<std::path::PathBuf> {
    let exts = std::env::var("PATHEXT").unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".into());
    let dirs = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&dirs) {
        for ext in exts.split(';').filter(|e| !e.is_empty()) {
            let candidate = dir.join(format!("{stem}{}", ext.to_lowercase()));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// Tray → Pause. Paused means paused: the pollers stop talking to the network,
/// not just the island stopping showing things.
#[tauri::command]
fn set_paused(paused: bool) {
    integrations::set_paused(paused);
}

// ── The roaming pal (a window of its own, so the island never has to move) ────

/// Whether the pal is out walking. The island decides; the window asks once.
static PAL_WANDER: AtomicBool = AtomicBool::new(false);

/// The face the island last set. The pal asks for it when its page loads,
/// since the event that carried it may have raced the page.
static PAL_FACE: Mutex<String> = Mutex::new(String::new());

pub fn apply_pal_wander(app: &AppHandle, on: bool) {
    PAL_WANDER.store(on, Ordering::Relaxed);
    if let Some(win) = app.get_webview_window("pal") {
        if on {
            let _ = win.show();
            let _ = win.unminimize();
        } else {
            let _ = win.hide();
        }
    }
    let _ = app.emit_to("pal", "pal-wander", on);
    // Both windows are topmost, and showing one can drop the other down a step
    // inside that band: the island goes last, and is re-inserted so the pal can
    // never sit over the approval card or the chat.
    if let Some(island) = app.get_webview_window(island::WINDOW_LABEL) {
        let _ = island.set_always_on_top(false);
        let _ = island.set_always_on_top(true);
    }
}

#[tauri::command]
fn set_pal_wander(app: AppHandle, on: bool) {
    apply_pal_wander(&app, on);
}

#[tauri::command]
fn pal_wander_state() -> bool {
    PAL_WANDER.load(Ordering::Relaxed)
}

#[tauri::command]
fn move_pal(app: AppHandle, x: f64, y: f64) {
    if let Some(win) = app.get_webview_window("pal") {
        let _ = win.set_position(tauri::LogicalPosition::new(x, y));
    }
}

#[tauri::command]
fn set_pal_state(app: AppHandle, state: String) {
    if let Ok(mut face) = PAL_FACE.lock() {
        *face = state.clone();
    }
    let _ = app.emit_to("pal", "pal-state", state);
}

#[tauri::command]
fn pal_state() -> String {
    PAL_FACE
        .lock()
        .map(|f| f.clone())
        .unwrap_or_else(|_| String::new())
}

/// The pal's "Screen analysis": the window the user was working in, which the
/// click on the pal did not disturb (it never takes focus).
#[tauri::command]
fn attach_active_window(app: AppHandle) -> Result<capture::AttachedWindow, String> {
    capture::attach_active(&app)
}

#[tauri::command]
fn capture_screen_rect(x: i32, y: i32, width: i32, height: i32) -> Result<capture::AttachedWindow, String> {
    capture::capture_rect(x, y, width, height)
}

#[tauri::command]
fn resize_pal(app: AppHandle, width: f64, height: f64) {
    if let Some(win) = app.get_webview_window("pal") {
        let _ = win.set_size(tauri::LogicalSize::new(width, height));
    }
}

#[tauri::command]
fn set_pal_visible(app: AppHandle, visible: bool) {
    if let Some(win) = app.get_webview_window("pal") {
        if visible {
            let _ = win.show();
        } else {
            let _ = win.hide();
        }
    }
}

#[tauri::command]
fn get_active_window_bounds(app: AppHandle) -> Option<capture::ActiveWindowBounds> {
    capture::active_window_bounds(&app)
}

#[derive(Clone, Serialize)]
struct PalAction {
    kind: String,
    query: Option<String>,
}

/// A card button pressed on the pal. The island owns every action they mean.
#[tauri::command]
fn pal_action(app: AppHandle, kind: String, query: Option<String>) {
    let _ = app.emit_to(
        island::WINDOW_LABEL,
        "pal-action",
        PalAction { kind, query },
    );
}

/// The pal window's clickable area (character + card), window-local logical px.
#[tauri::command]
fn set_pal_rect(shared: State<'_, Shared>, x: f64, y: f64, w: f64, h: f64) {
    shared
        .gate
        .set_pal_rect(island::IslandRect { x, y, w, h });
}

/// Typing in the card needs the window activatable, same as focus_window.
#[tauri::command]
fn set_pal_focus(app: AppHandle, focused: bool) {
    if let Some(win) = app.get_webview_window("pal") {
        island::set_activating(&win, focused);
        if focused {
            let _ = win.set_focus();
        }
    }
}

#[tauri::command]
fn start_drag_follower(app: AppHandle) {
    island::DRAG_FOLLOWER_ACTIVE.store(true, Ordering::Relaxed);
    if let Some(pal) = app.get_webview_window("pal") {
        let _ = pal.set_always_on_top(true);
        let _ = pal.set_ignore_cursor_events(true);
        let _ = pal.show();
    }
    let _ = app.emit("drag-follower-start", ());
}

#[tauri::command]
fn stop_drag_follower(app: AppHandle) {
    island::DRAG_FOLLOWER_ACTIVE.store(false, Ordering::Relaxed);
    if let Some(pal) = app.get_webview_window("pal") {
        if !PAL_WANDER.load(Ordering::Relaxed) {
            let _ = pal.hide();
        }
    }
    let _ = app.emit("drag-follower-stop", ());
}

// ── Claude Code hooks ─────────────────────────────────────────────────────────

#[tauri::command]
fn hooks_status() -> HookStatus {
    hooks::status()
}

#[tauri::command]
fn gemini_hooks_status() -> HookStatus {
    hooks::gemini_status()
}

#[tauri::command]
fn gemini_hooks_preview(install: bool) -> Result<HookPreview, String> {
    hooks::gemini_preview(install)
}

#[tauri::command]
fn gemini_hooks_apply(install: bool, fingerprint: String) -> Result<String, String> {
    hooks::gemini_write(install, &fingerprint)
}

#[tauri::command]
fn agy_hooks_status() -> HookStatus {
    hooks::agy_status()
}

#[tauri::command]
fn agy_hooks_preview(install: bool) -> Result<HookPreview, String> {
    hooks::agy_preview(install)
}

#[tauri::command]
fn agy_hooks_apply(install: bool, fingerprint: String) -> Result<String, String> {
    hooks::agy_write(install, &fingerprint)
}
/// Returns the diff the user has to look at before anything is written.
#[tauri::command]
fn hooks_preview(install: bool) -> Result<HookPreview, String> {
    hooks::preview(install)
}

/// Only ever called from an explicit click in the settings window.
#[tauri::command]
fn hooks_apply(
    app: AppHandle,
    shared: State<Shared>,
    install: bool,
    fingerprint: String,
) -> Result<String, String> {
    // The fingerprint comes from the preview the user actually looked at, so a
    // settings.json that changed in between is refused rather than overwritten.
    let backup = hooks::write(install, &fingerprint)?;
    let updated = {
        let mut current = shared.settings.lock().unwrap();
        current.hooks_installed = install;
        let _ = settings::save(&current);
        current.clone()
    };
    let _ = app.emit("settings-changed", updated);
    Ok(backup)
}

#[tauri::command]
fn codex_plan_usage() -> Option<serde_json::Value> {
    codex_plan::read()
}

#[tauri::command]
fn approval_decision(app: AppHandle, request_id: String, decision: String) {
    pipe::answer(&app, &request_id, &decision);
}

/// The island has the card on screen, so the long wait for a human may begin.
/// Until this arrives the relay only waits a few hundred milliseconds, which is
/// what stops a paused or unresponsive island from freezing Claude Code.
#[tauri::command]
fn approval_ack(app: AppHandle, request_id: String) {
    pipe::acknowledge(&app, &request_id);
}

/// Nobody can act on this request — the island is paused, or another card is
/// already up. Claude Code falls back to asking in the terminal immediately.
#[tauri::command]
fn approval_decline(app: AppHandle, request_id: String) {
    pipe::decline(&app, &request_id);
}

// ── Chat, files and secrets ───────────────────────────────────────────────────

/// One chat turn. The API key and any file bytes stay on the Rust side.
/// Routes to Claude, Gemini, OpenRouter, OrcaRouter, or TokenRouter based on settings.chat_provider.
#[tauri::command]
async fn chat_send(
    shared: State<'_, Shared>,
    chat: State<'_, Chat>,
    gchat: State<'_, GeminiChat>,
    rchat: State<'_, RouterChat>,
    query: String,
    context: Option<ChatContext>,
) -> Result<ChatReply, String> {
    let (provider, model, gemini_model, openrouter_model, orcarouter_model, tokenrouter_model) = {
        let s = shared.settings.lock().unwrap();
        (
            s.chat_provider.clone(),
            s.model.clone(),
            s.gemini_model.clone(),
            s.openrouter_model.clone(),
            s.orcarouter_model.clone(),
            s.tokenrouter_model.clone(),
        )
    };
    if provider == "gemini" {
        let gctx = context.map(|c| match c {
            ChatContext::File { name, path } => gemini::GeminiContext::File { name, path },
            ChatContext::Window { app_name, title, url } => {
                gemini::GeminiContext::Window { app_name, title, url }
            }
        });
        let reply = gemini::send(&gchat, &gemini_model, query, gctx).await?;
        Ok(ChatReply {
            text: reply.text,
            input_tokens: reply.input_tokens,
            output_tokens: reply.output_tokens,
            total_tokens: reply.total_tokens,
            model: Some(gemini_model),
            provider: Some("Gemini".to_string()),
        })
    } else if provider == "openrouter" || provider == "orcarouter" || provider == "tokenrouter" {
        let chosen_model = match provider.as_str() {
            "openrouter" => openrouter_model,
            "orcarouter" => orcarouter_model,
            "tokenrouter" => tokenrouter_model,
            _ => String::new(),
        };
        let prov_name = match provider.as_str() {
            "openrouter" => "OpenRouter",
            "orcarouter" => "OrcaRouter",
            "tokenrouter" => "TokenRouter",
            _ => "Router",
        };
        let rctx = context.map(|c| match c {
            ChatContext::File { name, path } => router::RouterContext::File { name, path },
            ChatContext::Window { app_name, title, url } => {
                router::RouterContext::Window { app_name, title, url }
            }
        });
        let reply = router::send(&rchat, &provider, &chosen_model, query, rctx).await?;
        Ok(ChatReply {
            text: reply.text,
            input_tokens: reply.input_tokens,
            output_tokens: reply.output_tokens,
            total_tokens: reply.total_tokens,
            model: Some(chosen_model),
            provider: Some(prov_name.to_string()),
        })
    } else {
        claude::send(&chat, &model, query, context).await
    }
}

#[tauri::command]
fn chat_reset(chat: State<Chat>, gchat: State<GeminiChat>, rchat: State<RouterChat>) {
    chat.reset();
    gchat.reset();
    rchat.reset();
}

/// Gmail OAuth sign-in: opens the browser, waits for consent, stores tokens.
/// Returns the account address on success.
#[tauri::command]
async fn gmail_signin(client_id: String, client_secret: String) -> Result<String, String> {
    gmail::signin(client_id, client_secret).await
}

/// Forgets the Gmail OAuth tokens (IMAP fallback keeps working if set).
#[tauri::command]
fn gmail_signout() -> Result<(), String> {
    gmail::signout()
}

/// Outlook device-flow step 1: returns the user code + URL to approve.
#[tauri::command]
async fn outlook_device_begin(client_id: String) -> Result<outlook::DeviceChallenge, String> {
    outlook::begin_device(client_id).await
}

/// Outlook device-flow step 2: waits for the approval, stores the tokens.
#[tauri::command]
async fn outlook_device_poll() -> Result<(), String> {
    outlook::poll_device().await
}

/// Forgets the Outlook OAuth tokens (IMAP fallback keeps working if set).
#[tauri::command]
fn outlook_signout() -> Result<(), String> {
    outlook::signout()
}

/// Copies a dropped file into the inbox and reports its name back.
#[tauri::command]
fn ingest_file(path: String) -> Result<DroppedFile, String> {
    files::ingest(&path)
}

/// DOM-drop fallback: the page read the file itself (base64) because the
/// OS-level drop target never delivered. Same inbox, same shape back.
#[tauri::command]
fn ingest_bytes(name: String, base64_data: String) -> Result<DroppedFile, String> {
    files::ingest_bytes(&name, &base64_data)
}

/// Mochi drag-out: captures the window under the cursor into the inbox.
/// The cursor is read server-side — the release happens outside our window.
#[tauri::command]
fn attach_window(app: AppHandle) -> Result<capture::AttachedWindow, String> {
    capture::attach(&app)
}

/// The island may only ask whether a key exists — never read it.
#[tauri::command]
fn secret_present(key: String) -> bool {
    secrets::present(&key)
}

#[tauri::command]
fn secret_set(key: String, value: String) -> Result<(), String> {
    secrets::set(&key, &value)
}

#[tauri::command]
fn secret_clear(key: String) -> Result<(), String> {
    secrets::clear(&key)
}

/// Opens the configured n8n instance — the URL lives in the Credential Manager.
#[tauri::command]
fn open_n8n() {
    if let Some(url) = secrets::get("n8n-url") {
        open_url(url);
    }
}

/// Refresh buttons in the integration cards.
#[tauri::command]
async fn refresh_integration(app: AppHandle, id: String) {
    integrations::poll_once(app, &id).await;
}

/// Media keys for the Spotify card (play/pause/next/prev). System-wide: they
/// reach the desktop app or a browser tab, whichever is playing.
#[tauri::command]
fn media_key(action: String) -> Result<(), String> {
    media::press(&action)
}

/// Lets the island write to the same log as the Rust side.
#[tauri::command]
fn log_line(message: String) {
    log::line(format!("ui  {message}"));
}

// ── System Agent (Desktop Butler, Doc Creator, File Locator) ──────────────────

#[tauri::command]
fn desktop_organize_preview(folder_kind: Option<String>) -> Result<system_agent::OrganizePreview, String> {
    system_agent::desktop_organize_preview(folder_kind)
}

#[tauri::command]
fn desktop_organize_apply(items: Vec<system_agent::OrganizeItem>) -> Result<system_agent::OrganizeResult, String> {
    system_agent::desktop_organize_apply(items)
}

#[tauri::command]
fn desktop_organize_undo() -> Result<usize, String> {
    system_agent::desktop_organize_undo()
}

#[tauri::command]
fn create_system_doc(
    doc_type: String,
    title: String,
    content: String,
    dest_folder: Option<String>,
) -> Result<system_agent::CreatedDocInfo, String> {
    system_agent::create_system_doc(doc_type, title, content, dest_folder)
}

#[tauri::command]
fn locate_system_files(query: String, max_results: Option<usize>) -> Result<Vec<system_agent::LocatedFile>, String> {
    system_agent::locate_system_files(query, max_results)
}

#[tauri::command]
fn open_system_path(path: String) -> Result<(), String> {
    system_agent::open_system_path(path)
}

#[tauri::command]
fn reveal_in_explorer(path: String) -> Result<(), String> {
    system_agent::reveal_in_explorer(path)
}

#[tauri::command]
fn system_control(action: String, value: Option<String>) -> Result<system_agent::SystemControlResult, String> {
    system_agent::system_control(action, value)
}

#[tauri::command]
fn inject_text(
    app: AppHandle,
    text: String,
    target_field: Option<String>,
    subject: Option<String>,
) -> Result<(), String> {
    system_agent::inject_text(&app, text, target_field, subject)
}

#[tauri::command]
fn get_active_window_context(app: AppHandle) -> Result<system_agent::WindowContextInfo, String> {
    system_agent::get_active_window_context(&app)
}

#[tauri::command]
async fn send_email_reply(
    service: String,
    to: String,
    subject: String,
    body: String,
) -> Result<String, String> {
    let clean_to = to.trim();
    let clean_subj = subject.trim();
    let clean_body = body.trim();
    if clean_to.is_empty() || clean_body.is_empty() {
        return Err("Recipient or message is empty".into());
    }

    fn simple_url_encode(s: &str) -> String {
        let mut out = String::with_capacity(s.len());
        for b in s.bytes() {
            if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
                out.push(b as char);
            } else {
                out.push_str(&format!("%{b:02X}"));
            }
        }
        out
    }

    if service.eq_ignore_ascii_case("gmail") {
        if gmail::has_oauth() {
            if let Ok(()) = gmail::send_reply(clean_to, clean_subj, clean_body).await {
                return Ok("sent".into());
            }
        }
        let url = format!(
            "https://mail.google.com/mail/?view=cm&fs=1&to={}&su={}&body={}",
            simple_url_encode(clean_to),
            simple_url_encode(clean_subj),
            simple_url_encode(clean_body)
        );
        open_url(url);
        return Ok("opened_in_browser".into());
    }

    if service.eq_ignore_ascii_case("outlook") {
        if outlook::has_oauth() {
            if let Ok(()) = outlook::send_reply(clean_to, clean_subj, clean_body).await {
                return Ok("sent".into());
            }
        }
        let url = format!(
            "https://outlook.live.com/mail/0/deeplink/compose?to={}&subject={}&body={}",
            simple_url_encode(clean_to),
            simple_url_encode(clean_subj),
            simple_url_encode(clean_body)
        );
        open_url(url);
        return Ok("opened_in_browser".into());
    }

    let url = format!(
        "mailto:{}?subject={}&body={}",
        simple_url_encode(clean_to),
        simple_url_encode(clean_subj),
        simple_url_encode(clean_body)
    );
    let _ = Command::new("rundll32.exe")
        .args(["url.dll,FileProtocolHandler", &url])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
    Ok("opened_in_browser".into())
}

// ── Settings window ───────────────────────────────────────────────────────────

/// WebView2 allows exactly one browser environment per app, and its options are
/// fixed by whichever webview is created first. Every window must therefore ask
/// for the *same* arguments as the island (see `additionalBrowserArgs` in
/// tauri.conf.json) — a mismatch makes the second window come up blank, with no
/// error anywhere.
const BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required";

/// In a dev build the pages are served by Vite, so the second window needs the
/// absolute dev URL; a bundled build resolves it inside the app bundle.
fn settings_page_url(app: &AppHandle) -> WebviewUrl {
    #[cfg(dev)]
    if let Some(mut base) = app.config().build.dev_url.clone() {
        base.set_path("/settings.html");
        return WebviewUrl::External(base);
    }
    let _ = app;
    WebviewUrl::App("settings.html".into())
}

/// The settings window is created hidden at launch and only ever shown and
/// hidden afterwards. A WebView2 window created later — on the main thread or
/// not — silently comes up blank in this app, so the window that works is the
/// one that exists before the island's webview does.
fn create_settings_window(app: &AppHandle) {
    let url = settings_page_url(app);
    match WebviewWindowBuilder::new(app, "settings", url)
        .additional_browser_args(BROWSER_ARGS)
        .title("Settings — Powpow")
        .inner_size(560.0, 680.0)
        .min_inner_size(460.0, 480.0)
        .resizable(true)
        .visible(false)
        .center()
        .build()
    {
        Ok(win) => {
            // Closing it must only hide it, or it could never be reopened.
            let hidden = win.clone();
            win.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = hidden.hide();
                }
            });
        }
        Err(err) => log::line(format!("settings window failed: {err}")),
    }
}

pub fn show_settings_window(app: &AppHandle) {
    let focus_win = |win: &tauri::WebviewWindow| {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_always_on_top(true);
        let _ = win.set_focus();
        let _ = win.set_always_on_top(false);
    };

    if let Some(win) = app.get_webview_window("settings") {
        focus_win(&win);
    } else {
        create_settings_window(app);
        if let Some(win) = app.get_webview_window("settings") {
            focus_win(&win);
        } else {
            log::line("settings window missing and could not be created");
        }
    }
}

#[tauri::command]
fn open_settings_window(app: AppHandle) {
    show_settings_window(&app);
}

pub fn run() {
    let loaded = settings::load();
    let gate = Arc::new(PollGate::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            let _ = app.emit_to(island::WINDOW_LABEL, "tray", "open".to_string());
        }))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(Shared {
            settings: Mutex::new(loaded.clone()),
            gate: gate.clone(),
        })
        .manage(Pending::default())
        .manage(Chat::default())
        .manage(GeminiChat::default())
        .manage(RouterChat::default())
        .invoke_handler(tauri::generate_handler![
            boot,
            save_settings,
            set_collapsed,
            set_island_rect,
            focus_window,
            reposition,
            open_url,
            open_in_vscode,
            quit_app,
            hooks_status,
            hooks_preview,
            hooks_apply,
            gemini_hooks_status,
            gemini_hooks_preview,
            gemini_hooks_apply,
            agy_hooks_status,
            agy_hooks_preview,
            agy_hooks_apply,
            codex_plan_usage,
            approval_decision,
            approval_ack,
            approval_decline,
            log_line,
            chat_send,
            chat_reset,
            ingest_file,
            ingest_bytes,
            gmail_signin,
            gmail_signout,
            outlook_device_begin,
            outlook_device_poll,
            outlook_signout,
            attach_window,
            secret_present,
            secret_set,
            secret_clear,
            refresh_integration,
            media_key,
            open_n8n,
            open_settings_window,
            set_paused,
            set_pal_wander,
            pal_wander_state,
            move_pal,
            set_pal_state,
            pal_state,
            attach_active_window,
            capture_screen_rect,
            resize_pal,
            set_pal_visible,
            get_active_window_bounds,
            pal_action,
            set_pal_rect,
            set_pal_focus,
            start_drag_follower,
            stop_drag_follower,
            desktop_organize_preview,
            desktop_organize_apply,
            desktop_organize_undo,
            create_system_doc,
            locate_system_files,
            open_system_path,
            reveal_in_explorer,
            system_control,
            inject_text,
            get_active_window_context,
            send_email_reply,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            tray::build(&handle)?;
            // Before the island: see create_settings_window.
            create_settings_window(&handle);

            if let Some(win) = island::window(&handle) {
                island::make_non_activating(&win);
                island::apply_geometry(&handle, &loaded.screen, false);
                let _ = win.show();
            }
            // The pal roams under the cursor without ever taking it: clicks
            // fall through to whatever is really beneath it — except inside
            // the character/card, which the cursor poll opens up. Never let it
            // steal focus either: clicking it must not change which window is
            // in front (the Screen analysis captures that window).
            if let Some(pal) = handle.get_webview_window("pal") {
                island::make_non_activating(&pal);
                let _ = pal.set_ignore_cursor_events(true);
            }
            gate.collapsed.store(false, Ordering::Relaxed);
            gate.set_collapsed(false);
            island::spawn_cursor_poll(handle.clone(), gate.clone());

            log::line(format!("--- Powpow {} started ---", env!("CARGO_PKG_VERSION")));
            hooks::ensure_hook_exe(&handle);
            // Own the drop targets early (the poll refresh keeps them ours as
            // late WebView2 widgets appear).
            crate::droptarget::ensure_all(&handle);
            pipe::start(handle.clone());
            integrations::start(handle.clone());
            hotkey::spawn(handle.clone());



            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Powpow");
}
