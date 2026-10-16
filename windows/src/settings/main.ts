// Settings window — the place where anything that writes to disk is confirmed.
// Preferences (character, language, theme, sound), the agent hook status and
// the integrations all live here; API keys go to the OS credential store.

import "./settings.css";
import "../avatar/mascot-selector.css";
import { MascotSelector } from "../avatar/MascotSelector";
import { MASCOTS_CATALOG } from "../avatar/mascotCatalog";
import { registerAllPageMascots } from "../avatar/registerMascots";

// Registra todos os mascotes do page-mascot no runtime
registerAllPageMascots();
import { Bridge, onEvent, type HookPreview, type HookStatus } from "../core/bridge";
import { DEFAULT_SETTINGS, type Settings, type PalPersonality } from "../core/state";
import { t } from "../core/i18n";
import { h, clear } from "../views/dom";
import { colorDot } from "./colors";
import { agentsSection } from "./agents";
import {
  MAX_DECLARED, PILL_CATEGORIES, availablePills, chooseMainPill, isComingSoon, mainPillChoices,
  sanitizeDeclared, toggleDeclared, type PillDefinition,
} from "../core/pills";
// Registers `dot-pal` so the character row can preview what it picks; the maker
// builds a custom spec with the very helpers the island uses to draw it.
import {
  CUSTOM_OPTIONS,
  DEFAULT_CUSTOM,
  DotPal,
  characters,
  cleanCustom,
  registerCustom,
  type CustomPal,
} from "../../../src/index.js";

let settings: Settings = { ...DEFAULT_SETTINGS };
let version = "";

const root = document.getElementById("settings-root")!;

async function save() {
  await Bridge.saveSettings(settings);
}

function pickColor(next: Record<string, string>) {
  settings.pillColors = next;
  void save();
}

// ── Reusable bits ─────────────────────────────────────────────────────────────

function toggle(on: boolean, onChange: (v: boolean) => void): HTMLElement {
  const el = h("button", { class: on ? "switch on" : "switch", "aria-pressed": on });
  el.addEventListener("click", () => {
    const next = !el.classList.contains("on");
    el.classList.toggle("on", next);
    onChange(next);
  });
  return el;
}

function statusDot(ok: boolean): HTMLElement {
  return h("i", { class: "dot", style: `background:${ok ? "#22c55e" : "#f4505e"}` });
}

function renderDiff(text: string): HTMLElement {
  const box = h("div", { class: "diff" });
  for (const line of text.split("\n")) {
    const cls = line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "ctx";
    box.append(h("div", { class: cls, text: line }));
  }
  return box;
}

// ── Claude Code section ───────────────────────────────────────────────────────

function claudeSection(status: HookStatus): HTMLElement {
  const body = h("div", { style: "display:flex;flex-direction:column;gap:12px" });
  const section = h(
    "section",
    {},
    h("h2", {}, statusDot(status.installed), h("span", { text: "Claude Code" })),
    body,
  );

  const rebuild = async () => {
    const fresh = await Bridge.hooksStatus();
    if (fresh) Object.assign(status, fresh);
    clear(body);
    draw();
    const head = section.querySelector("h2")!;
    clear(head);
    head.append(statusDot(status.installed), h("span", { text: "Claude Code" }));
  };

  function draw() {
    body.append(
      h("div", {
        class: "hint",
        text: status.installed
          ? t("Powpow is hooked into your Claude Code sessions. Tool calls, questions and permission requests show up in the island, and you can answer them there.")
          : t("Install the hooks to see your Claude Code sessions in the island and approve permissions without leaving what you are doing."),
      }),
      h("div", { class: "row" },
        h("label", { text: "settings.json" }),
        h("span", { class: "path", text: status.settingsPath }),
      ),
      h("div", { class: "row" },
        h("label", { text: t("Relay") }),
        h("span", { class: "path", text: status.hookPath }),
        statusDot(status.hookReady),
      ),
    );

    if (!status.hookReady) {
      body.append(h("div", {
        class: "notice warn",
        text: t("powpow-hook.exe is not in place yet. Restart Powpow; if it still fails, build it with `cargo build -p powpow-hook`."),
      }));
    }

    const actions = h("div", { class: "row" });
    const install = h("button", {
      class: "primary",
      text: status.installed ? t("Reinstall hooks…") : t("Install hooks…"),
      onclick: () => showPreview(true),
    });
    // Writing hook commands that point at a relay which isn't there would give
    // every Claude Code session a broken hook and nothing to show for it.
    if (!status.hookReady) {
      install.disabled = true;
      install.title = "The relay isn't installed yet.";
    }
    actions.append(install);
    if (status.installed) {
      actions.append(h("button", {
        class: "danger",
        text: t("Uninstall hooks…"),
        onclick: () => showPreview(false),
      }));
    }
    body.append(actions);
  }

  async function showPreview(install: boolean) {
    let preview;
    try {
      preview = await Bridge.hooksPreview(install);
    } catch (err) {
      // An unreadable or invalid settings.json stops here rather than being
      // treated as empty and written over.
      clear(body);
      body.append(
        h("div", { class: "notice err", text: String(err).replace(/^Error:\s*/, "") }),
        h("div", { class: "row" }, h("button", {
          text: t("Back"),
          onclick: () => { clear(body); draw(); },
        })),
      );
      return;
    }
    if (!preview) return;
    clear(body);
    body.append(
      h("div", {
        class: "hint",
        text: install
          ? t("This is exactly what will change in your settings.json. Your own hooks are left untouched.")
          : t("This removes Powpow's entries only. Your own hooks are left untouched."),
      }),
      renderDiff(preview.diff),
      h("div", { class: "row" },
        h("span", { class: "path", text: `Backup → ${preview.backup}` }),
      ),
    );
    const confirm = h("button", {
      class: install ? "primary" : "danger",
      text: install ? t("Back up and write") : t("Back up and remove"),
    });
    confirm.addEventListener("click", async () => {
      confirm.disabled = true;
      try {
        const backup = await Bridge.hooksApply(install, preview.fingerprint);
        clear(body);
        body.append(h("div", {
          class: "notice ok",
          text: `${t("Done. Previous settings saved as")} ${backup}. ${t("Open a new session to pick the hooks up.")}`,
        }));
        window.setTimeout(() => void rebuild(), 2600);
      } catch (err) {
        confirm.disabled = false;
        body.append(h("div", { class: "notice err", text: `${t("Could not write")}: ${String(err)}` }));
      }
    });
    body.append(h("div", { class: "row" }, confirm, h("button", {
      text: t("Cancel"),
      onclick: () => { clear(body); draw(); },
    })));
  }

  draw();
  return section;
}

// ── Claude API section ────────────────────────────────────────────────────────

const MODELS: [string, string][] = [
  ["claude-opus-5", "Claude Opus 5"],
  ["claude-sonnet-5", "Claude Sonnet 5"],
  ["claude-haiku-4-5", "Claude Haiku 4.5"],
];

const GEMINI_MODELS: [string, string][] = [
  ["gemini-3.5-flash", "Gemini 3.5 Flash"],
  ["gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite"],
  ["gemini-3.1-flash-lite", "Gemini 3.1 Flash-Lite"],
];

function apiSection(hasKey: boolean, hasGeminiKey: boolean): HTMLElement {
  const dot = statusDot(hasKey || hasGeminiKey);
  const state = h("span", {
    class: "hint",
    text: (hasKey || hasGeminiKey)
      ? t("Key saved in the Windows Credential Manager.")
      : t("No key yet — the chat needs one."),
  });

  const field = h("input", {
    type: "password",
    placeholder: hasKey ? "••••••••••••  (stored)" : "sk-ant-...",
    style: "flex:1 1 auto;min-width:0",
    autocomplete: "off",
    spellcheck: "false",
  }) as HTMLInputElement;

  const saveBtn = h("button", { class: "primary", text: t("Save key") });
  const clearBtn = h("button", { class: "danger", text: t("Remove") });
  const feedback = h("div", {});

  async function refresh() {
    const present = (await Bridge.secretPresent("anthropic-api-key")) ?? false;
    dot.style.background = present ? "#22c55e" : "#f4505e";
    state.textContent = present
      ? "Key saved in the Windows Credential Manager."
      : "No key yet — the chat needs one.";
    field.placeholder = present ? "••••••••••••  (stored)" : "sk-ant-...";
    clearBtn.style.display = present ? "" : "none";
  }

  saveBtn.addEventListener("click", async () => {
    const value = field.value.trim();
    if (!value) return;
    clear(feedback);
    try {
      await Bridge.secretSet("anthropic-api-key", value);
      field.value = "";
      feedback.append(h("div", { class: "notice ok", text: t("Saved. It never touches disk.") }));
      await refresh();
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: `${t("Could not save")}: ${String(err)}` }));
    }
  });

  clearBtn.addEventListener("click", async () => {
    clear(feedback);
    try {
      await Bridge.secretClear("anthropic-api-key");
      feedback.append(h("div", { class: "notice ok", text: t("Key removed.") }));
      await refresh();
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: `${t("Could not remove")}: ${String(err)}` }));
    }
  });

  const model = h("select", {}) as HTMLSelectElement;
  for (const [id, label] of MODELS) model.append(h("option", { value: id, text: label }));
  if (!MODELS.some(([id]) => id === settings.model)) {
    model.append(h("option", { value: settings.model, text: settings.model }));
  }
  model.value = settings.model;
  model.addEventListener("change", () => {
    settings.model = model.value;
    void save();
  });

  clearBtn.style.display = hasKey ? "" : "none";

  // Provider + Gemini model
  const provider = h("select", {}) as HTMLSelectElement;
  provider.append(h("option", { value: "claude", text: t("Claude (Anthropic)") }));
  provider.append(h("option", { value: "gemini", text: t("Gemini (Google)") }));
  provider.value = settings.chatProvider ?? "claude";
  const applyProvider = () => {
    const isGemini = provider.value === "gemini";
    claudeRows.style.display = isGemini ? "none" : "";
    geminiRows.style.display = isGemini ? "" : "none";
    geminiModelRow.style.display = isGemini ? "" : "none";
  };
  provider.addEventListener("change", () => {
    settings.chatProvider = provider.value;
    void save();
    applyProvider();
  });

  const geminiField = h("input", {
    type: "password",
    placeholder: hasGeminiKey ? "••••••••••••  (stored)" : "AIza…",
    style: "flex:1 1 auto;min-width:0",
    autocomplete: "off",
    spellcheck: "false",
  }) as HTMLInputElement;
  const geminiSave = h("button", { class: "primary", text: t("Save") });
  const geminiClear = h("button", { class: "danger", text: t("Remove") });
  geminiSave.addEventListener("click", async () => {
    const value = geminiField.value.trim();
    if (!value) return;
    try {
      await Bridge.secretSet("gemini-api-key", value);
      geminiField.value = "";
      feedback.append(h("div", { class: "notice ok", text: t("Gemini key saved.") }));
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: `${t("Could not save")}: ${String(err)}` }));
    }
  });
  geminiClear.addEventListener("click", async () => {
    try {
      await Bridge.secretClear("gemini-api-key");
      feedback.append(h("div", { class: "notice ok", text: t("Gemini key removed.") }));
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: `${t("Could not remove")}: ${String(err)}` }));
    }
  });

  const geminiModel = h("select", {}) as HTMLSelectElement;
  for (const [id, label] of GEMINI_MODELS) geminiModel.append(h("option", { value: id, text: label }));
  if (!GEMINI_MODELS.some(([id]) => id === settings.geminiModel)) {
    geminiModel.append(h("option", { value: settings.geminiModel, text: settings.geminiModel }));
  }
  geminiModel.value = settings.geminiModel ?? "gemini-3.5-flash";
  geminiModel.addEventListener("change", () => {
    settings.geminiModel = geminiModel.value;
    void save();
  });
  const geminiModelRow = h("div", { class: "row" }, h("label", { text: t("Gemini model") }), geminiModel);

  // Provider → model → key, one provider visible at a time.
  const claudeRows = h("div", { style: "display:flex;flex-direction:column;gap:12px" },
    h("div", { class: "row" }, h("label", { text: t("Model") }), model),
    h("div", { class: "row" }, h("label", { text: t("Claude key") }), field, saveBtn, clearBtn),
  );
  const geminiRows = h("div", { style: "display:flex;flex-direction:column;gap:12px" },
    geminiModelRow,
    h("div", { class: "row" }, h("label", { text: t("Gemini key") }), geminiField, geminiSave, geminiClear),
  );
  applyProvider();

  return h(
    "section",
    {},
    h("h2", {}, dot, h("span", { text: t("Chat AI") })),
    state,
    h("div", { class: "row" }, h("label", { text: t("Provider") }), provider),
    claudeRows,
    geminiRows,
    feedback,
  );
}

// ── External CLI hooks sections (Gemini CLI, Antigravity `agy`) ───────────────

interface CliHooksBackend {
  status: () => Promise<HookStatus | null>;
  preview: (install: boolean) => Promise<HookPreview>;
  apply: (install: boolean, fingerprint: string) => Promise<string>;
}

function cliHooksSection(opts: {
  title: string;
  fileLabel: string;
  hintOn: string;
  hintOff: string;
  previewHint: string;
  backend: CliHooksBackend;
  initial: HookStatus;
}): HTMLElement {
  const status = opts.initial;
  const body = h("div", { style: "display:flex;flex-direction:column;gap:12px" });
  const section = h(
    "section",
    {},
    h("h2", {}, statusDot(status.installed), h("span", { text: opts.title })),
    body,
  );

  function draw() {
    body.append(
      h("div", { class: "hint", text: status.installed ? opts.hintOn : opts.hintOff }),
      h("div", { class: "row" },
        h("label", { text: opts.fileLabel }),
        h("span", { class: "path", text: status.settingsPath }),
      ),
    );
    const actions = h("div", { class: "row" });
    actions.append(h("button", {
      class: "primary",
      text: status.installed ? t(`Reinstall ${opts.title} hooks…`) : t(`Install ${opts.title} hooks…`),
      onclick: () => showPreview(true),
    }));
    if (status.installed) {
      actions.append(h("button", {
        class: "danger",
        text: t("Uninstall…"),
        onclick: () => showPreview(false),
      }));
    }
    body.append(actions);
  }

  async function showPreview(install: boolean) {
    let preview;
    try {
      preview = await opts.backend.preview(install);
    } catch (err) {
      clear(body);
      body.append(h("div", { class: "notice err", text: String(err).replace(/^Error:\s*/, "") }));
      return;
    }
    if (!preview) return;
    clear(body);
    body.append(
      h("div", { class: "hint", text: opts.previewHint }),
      renderDiff(preview.diff),
      h("div", { class: "row" }, h("span", { class: "path", text: `Backup → ${preview.backup}` })),
    );
    const confirm = h("button", { class: install ? "primary" : "danger", text: install ? "Back up and write" : "Back up and remove" });
    confirm.addEventListener("click", async () => {
      confirm.disabled = true;
      try {
        const backup = await opts.backend.apply(install, preview.fingerprint);
        clear(body);
        body.append(h("div", { class: "notice ok", text: `${t("Done. Backup:")} ${backup}. ${t("Open a new session to pick the hooks up.")}` }));
        window.setTimeout(async () => {
          const fresh = await opts.backend.status();
          if (fresh) Object.assign(status, fresh);
          clear(body); draw();
        }, 2000);
      } catch (err) {
        confirm.disabled = false;
        body.append(h("div", { class: "notice err", text: `${t("Could not write")}: ${String(err)}` }));
      }
    });
    body.append(h("div", { class: "row" }, confirm, h("button", {
      text: t("Cancel"), onclick: () => { clear(body); draw(); },
    })));
  }

  draw();
  return section;
}

function geminiSection(status: HookStatus): HTMLElement {
  return cliHooksSection({
    title: "Gemini CLI",
    fileLabel: "settings.json",
    hintOn: t("Powpow is hooked into your Gemini CLI sessions (BeforeTool/AfterTool). Approvals stay in the terminal — activity shows in the island side by side with Claude."),
    hintOff: t("Install the hooks to see your Gemini CLI sessions in the island next to Claude Code. Note: since June 2026 new installs use Antigravity (`agy`) instead — see below."),
    previewHint: t("Gemini settings use timeouts in ms. Your own hooks are left untouched."),
    backend: {
      status: () => Bridge.geminiHooksStatus(),
      preview: (install) => Bridge.geminiHooksPreview(install),
      apply: (install, fp) => Bridge.geminiHooksApply(install, fp),
    },
    initial: status,
  });
}

function agySection(status: HookStatus): HTMLElement {
  return cliHooksSection({
    title: "Antigravity (agy)",
    fileLabel: "hooks.json",
    hintOn: t("Powpow is hooked into your Antigravity sessions (Pre/PostToolUse, invocations, Stop). Approvals stay in the terminal — activity shows in the island as pink agy pills."),
    hintOff: t("Install the hooks to see your `agy` sessions in the island. Writes to %USERPROFILE%\\.gemini\\config\\hooks.json under the \"powpow\" key."),
    previewHint: t("Antigravity timeouts are in seconds. Your other hooks are left untouched."),
    backend: {
      status: () => Bridge.agyHooksStatus(),
      preview: (install) => Bridge.agyHooksPreview(install),
      apply: (install, fp) => Bridge.agyHooksApply(install, fp),
    },
    initial: status,
  });
}

// ── Integrations section ──────────────────────────────────────────────────────

interface IntegrationDef {
  id: string;
  name: string;
  color: string;
  /** Credential Manager keys, in the order they are shown. */
  fields: { key: string; label: string; placeholder: string; secret: boolean }[];
}

const INTEGRATIONS: IntegrationDef[] = [
  { id: "integration_stripe", name: "Stripe", color: "#0570DE",
    fields: [{ key: "stripe-api-key", label: "Secret key", placeholder: "sk_live_…", secret: true }] },
  { id: "integration_github", name: "GitHub", color: "#F4505E",
    fields: [{ key: "github-token", label: "Token", placeholder: "ghp_…", secret: true }] },
  { id: "integration_vercel", name: "Vercel", color: "#7C5CFF",
    fields: [{ key: "vercel-token", label: "Token", placeholder: "…", secret: true }] },
  { id: "integration_n8n", name: "n8n", color: "#F29B38",
    fields: [
      { key: "n8n-url", label: "Instance URL", placeholder: "https://n8n.example.com", secret: false },
      { key: "n8n-api-key", label: "API key", placeholder: "…", secret: true },
    ] },
  { id: "integration_resend", name: "Resend", color: "#22C55E",
    fields: [{ key: "resend-api-key", label: "API key", placeholder: "re_…", secret: true }] },
  { id: "integration_notion", name: "Notion", color: "#8C8C8C",
    fields: [{ key: "notion-api-key", label: "Integration token", placeholder: "ntn_…", secret: true }] },
  { id: "integration_calcom", name: "Cal.com", color: "#C9956A",
    fields: [{ key: "calcom-api-key", label: "API key", placeholder: "cal_…", secret: true }] },
];

// ── Outlook section (OAuth device flow + IMAP fallback fields) ───────────────

function outlookSection(present: Record<string, boolean>): HTMLElement {
  const dotEl = statusDot(present["outlook-oauth"] || present["outlook-app-password"] || false);
  const state = h("span", {
    class: "hint",
    text: t("Sign in with Microsoft (works when app passwords are blocked), or use an app password."),
  });

  const email = h("input", {
    type: "text", placeholder: "you@outlook.com", autocomplete: "off", spellcheck: "false",
    style: "flex:1 1 auto;min-width:0",
  }) as HTMLInputElement;
  const appPass = h("input", {
    type: "password", placeholder: "••••••••", autocomplete: "off", spellcheck: "false",
    style: "flex:1 1 auto;min-width:0",
  }) as HTMLInputElement;
  const clientId = h("input", {
    type: "text", placeholder: t("Application (client) ID"), autocomplete: "off", spellcheck: "false",
    style: "flex:1 1 auto;min-width:0",
  }) as HTMLInputElement;
  const feedback = h("div", {});

  async function refresh() {
    const oauth = (await Bridge.secretPresent("outlook-oauth")) ?? false;
    const imap = (await Bridge.secretPresent("outlook-app-password")) ?? false;
    present["outlook-oauth"] = oauth;
    present["outlook-app-password"] = imap;
    dotEl.style.background = oauth || imap ? "#22c55e" : "#f4505e";
    state.textContent = oauth
      ? t("Signed in with Microsoft.")
      : imap
        ? t("App password saved (IMAP fallback).")
        : t("Sign in with Microsoft (works when app passwords are blocked), or use an app password.");
  }

  const saveMail = h("button", { text: t("Save") });
  saveMail.addEventListener("click", async () => {
    clear(feedback);
    try {
      if (email.value.trim()) await Bridge.secretSet("outlook-email", email.value.trim());
      if (appPass.value.trim()) await Bridge.secretSet("outlook-app-password", appPass.value.trim());
      email.value = "";
      appPass.value = "";
      feedback.append(h("div", { class: "notice ok", text: t("Saved. It never touches disk.") }));
      await refresh();
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: `${t("Could not save")}: ${String(err)}` }));
    }
  });

  const signin = h("button", { class: "primary", text: t("Sign in with Microsoft") });
  signin.addEventListener("click", async () => {
    clear(feedback);
    const id = clientId.value.trim();
    if (!id) {
      feedback.append(h("div", { class: "notice err", text: t("Paste the application (client) ID first.") }));
      return;
    }
    signin.disabled = true;
    try {
      const challenge = await Bridge.outlookDeviceBegin(id);
      feedback.append(h("div", {
        class: "notice",
        text: `${t("Approve in the browser with code")} ${challenge.userCode}`,
      }));
      void Bridge.openUrl(challenge.verificationUrl);
      await Bridge.outlookDevicePoll();
      clientId.value = "";
      feedback.append(h("div", { class: "notice ok", text: t("Signed in with Microsoft.") }));
      await refresh();
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: String(err).replace(/^Error:\s*/, "") }));
    } finally {
      signin.disabled = false;
    }
  });

  const signout = h("button", { class: "danger", text: t("Sign out") });
  signout.addEventListener("click", async () => {
    clear(feedback);
    try {
      await Bridge.outlookSignout();
      feedback.append(h("div", { class: "notice ok", text: t("Signed out.") }));
      await refresh();
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: `${t("Could not remove")}: ${String(err)}` }));
    }
  });

  const sw = h("button", { class: settings.activeIntegrations.includes("integration_outlook") ? "switch on" : "switch" });
  sw.addEventListener("click", () => {
    const on = settings.activeIntegrations.includes("integration_outlook");
    if (on) {
      settings.activeIntegrations = settings.activeIntegrations.filter((x) => x !== "integration_outlook");
    } else {
      if (settings.activeIntegrations.length >= MAX_ACTIVE) return;
      settings.activeIntegrations = [...settings.activeIntegrations, "integration_outlook"];
    }
    sw.classList.toggle("on", !on);
    void save();
  });

  return h("section", {},
    h("h2", {}, dotEl, h("span", { text: "Outlook" })),
    state,
    h("div", { style: "display:flex;gap:12px;align-items:flex-start" },
      h("div", { style: "display:flex;align-items:center;gap:8px;min-width:132px;padding-top:4px" },
        sw,
        h("i", { class: "dot", style: "background:#0078D4" }),
        h("span", { style: "font-size:12.5px", text: "Outlook" }),
      ),
      h("div", { style: "display:flex;flex-direction:column;gap:6px;flex:1 1 auto;min-width:0" },
        h("div", { class: "row" },
          h("label", { style: "min-width:104px", text: t("Email address") }), email,
          h("label", { style: "min-width:104px", text: t("App password") }), appPass, saveMail),
        h("div", { class: "row" },
          h("label", { style: "min-width:104px", text: t("Application (client) ID") }), clientId),
        h("div", { class: "row" }, signin, signout, feedback),
      ),
    ),
  );
}

function gmailSection(present: Record<string, boolean>): HTMLElement {
  const dotEl = statusDot(present["gmail-oauth"] || present["gmail-app-password"] || false);
  const state = h("span", { class: "hint", text: t("Sign in with Google (works behind firewalls), or use an app password.") });

  const email = h("input", {
    type: "text", placeholder: "you@gmail.com", autocomplete: "off", spellcheck: "false",
    style: "flex:1 1 auto;min-width:0",
  }) as HTMLInputElement;
  const appPass = h("input", {
    type: "password", placeholder: "xxxx xxxx xxxx xxxx", autocomplete: "off", spellcheck: "false",
    style: "flex:1 1 auto;min-width:0",
  }) as HTMLInputElement;
  const clientId = h("input", {
    type: "text", placeholder: t("OAuth client ID"), autocomplete: "off", spellcheck: "false",
    style: "flex:1 1 auto;min-width:0",
  }) as HTMLInputElement;
  const clientSecret = h("input", {
    type: "password", placeholder: t("OAuth client secret"), autocomplete: "off", spellcheck: "false",
    style: "flex:1 1 auto;min-width:0",
  }) as HTMLInputElement;
  const feedback = h("div", {});

  async function refresh() {
    const oauth = (await Bridge.secretPresent("gmail-oauth")) ?? false;
    const imap = (await Bridge.secretPresent("gmail-app-password")) ?? false;
    present["gmail-oauth"] = oauth;
    present["gmail-app-password"] = imap;
    dotEl.style.background = oauth || imap ? "#22c55e" : "#f4505e";
    state.textContent = oauth
      ? t("Signed in with Google.")
      : imap
        ? t("App password saved (IMAP fallback).")
        : t("Sign in with Google (works behind firewalls), or use an app password.");
  }

  const saveMail = h("button", { text: t("Save") });
  saveMail.addEventListener("click", async () => {
    clear(feedback);
    try {
      if (email.value.trim()) await Bridge.secretSet("gmail-email", email.value.trim());
      if (appPass.value.trim()) await Bridge.secretSet("gmail-app-password", appPass.value.trim());
      email.value = "";
      appPass.value = "";
      feedback.append(h("div", { class: "notice ok", text: t("Saved. It never touches disk.") }));
      await refresh();
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: `${t("Could not save")}: ${String(err)}` }));
    }
  });

  const signin = h("button", { class: "primary", text: t("Sign in with Google") });
  signin.addEventListener("click", async () => {
    clear(feedback);
    const id = clientId.value.trim();
    const secret = clientSecret.value.trim();
    if (!id || !secret) {
      feedback.append(h("div", { class: "notice err", text: t("Paste the OAuth client ID and secret first.") }));
      return;
    }
    signin.disabled = true;
    feedback.append(h("div", { class: "notice", text: t("Browser opened — approve, then come back.") }));
    try {
      const address = await Bridge.gmailSignin(id, secret);
      clientId.value = "";
      clientSecret.value = "";
      feedback.append(h("div", { class: "notice ok", text: `${t("Signed in as")} ${address}` }));
      await refresh();
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: String(err).replace(/^Error:\s*/, "") }));
    } finally {
      signin.disabled = false;
    }
  });

  const signout = h("button", { class: "danger", text: t("Sign out") });
  signout.addEventListener("click", async () => {
    clear(feedback);
    try {
      await Bridge.gmailSignout();
      feedback.append(h("div", { class: "notice ok", text: t("Signed out.") }));
      await refresh();
    } catch (err) {
      feedback.append(h("div", { class: "notice err", text: `${t("Could not remove")}: ${String(err)}` }));
    }
  });

  const sw = h("button", { class: settings.activeIntegrations.includes("integration_gmail") ? "switch on" : "switch" });
  sw.addEventListener("click", () => {
    const on = settings.activeIntegrations.includes("integration_gmail");
    if (on) {
      settings.activeIntegrations = settings.activeIntegrations.filter((x) => x !== "integration_gmail");
    } else {
      if (settings.activeIntegrations.length >= MAX_ACTIVE) return;
      settings.activeIntegrations = [...settings.activeIntegrations, "integration_gmail"];
    }
    sw.classList.toggle("on", !on);
    void save();
  });

  return h("section", {},
    h("h2", {}, dotEl, h("span", { text: "Gmail" })),
    state,
    h("div", { style: "display:flex;gap:12px;align-items:flex-start" },
      h("div", { style: "display:flex;align-items:center;gap:8px;min-width:132px;padding-top:4px" },
        sw,
        h("i", { class: "dot", style: "background:#EA4335" }),
        h("span", { style: "font-size:12.5px", text: "Gmail" }),
      ),
      h("div", { style: "display:flex;flex-direction:column;gap:6px;flex:1 1 auto;min-width:0" },
        h("div", { class: "row" },
          h("label", { style: "min-width:104px", text: t("Email address") }), email,
          h("label", { style: "min-width:104px", text: t("App password") }), appPass, saveMail),
        h("div", { class: "row" },
          h("label", { style: "min-width:104px", text: t("Client ID") }), clientId,
          h("label", { style: "min-width:104px", text: t("Client secret") }), clientSecret),
        h("div", { class: "row" }, signin, signout, feedback),
      ),
    ),
  );
}

const MAX_ACTIVE = 4;

function integrationsSection(present: Record<string, boolean>): HTMLElement {
  const note = h("div", { class: "hint" });
  const list = h("div", { style: "display:flex;flex-direction:column;gap:14px" });

  function updateNote() {
    const used = settings.activeIntegrations.length;
    note.textContent = t("Pick up to {n} pills to show next to Mochi — {used}/{n} in use. Keys are stored in the Windows Credential Manager, never on disk.")
      .replaceAll("{n}", String(MAX_ACTIVE))
      .replace("{used}", String(used));
  }

  for (const def of INTEGRATIONS) {
    const active = settings.activeIntegrations.includes(def.id);
    const sw = h("button", { class: active ? "switch on" : "switch" });
    sw.addEventListener("click", () => {
      const on = settings.activeIntegrations.includes(def.id);
      if (on) {
        settings.activeIntegrations = settings.activeIntegrations.filter((x) => x !== def.id);
      } else {
        if (settings.activeIntegrations.length >= MAX_ACTIVE) return;
        settings.activeIntegrations = [...settings.activeIntegrations, def.id];
      }
      sw.classList.toggle("on", !on);
      updateNote();
      void save();
    });

    const rows = h("div", { style: "display:flex;flex-direction:column;gap:6px;flex:1 1 auto;min-width:0" });
    for (const field of def.fields) {
      const input = h("input", {
        type: field.secret ? "password" : "text",
        placeholder: present[field.key] ? "••••••••  (stored)" : field.placeholder,
        autocomplete: "off",
        spellcheck: "false",
        style: "flex:1 1 auto;min-width:0",
      }) as HTMLInputElement;
      const saveBtn = h("button", { text: t("Save") });
      const dotEl = statusDot(present[field.key] ?? false);
      saveBtn.addEventListener("click", async () => {
        const value = input.value.trim();
        try {
          await Bridge.secretSet(field.key, value);
          present[field.key] = value.length > 0;
          input.value = "";
          input.placeholder = value ? "••••••••  (stored)" : field.placeholder;
          dotEl.style.background = value ? "#22c55e" : "#f4505e";
        } catch {
          dotEl.style.background = "#f5a524";
        }
      });
      rows.append(
        h("div", { class: "row" },
          h("label", { style: "min-width:104px", text: t(field.label) }),
          input, saveBtn, dotEl,
        ),
      );
    }

    list.append(
      h("div", { style: "display:flex;gap:12px;align-items:flex-start" },
        h("div", { style: "display:flex;align-items:center;gap:8px;min-width:132px;padding-top:4px" },
          sw,
          h("i", { class: "dot", style: `background:${def.color}` }),
          h("span", { style: "font-size:12.5px", text: def.name }),
        ),
        rows,
      ),
    );
  }

  updateNote();
  return h("section", {}, h("h2", {}, h("span", { text: t("Integrations") })), note, list);
}

// ── Character ─────────────────────────────────────────────────────────────────

/** Swatch palette of the maker — the same ten the dotpals dashboard ships. */
const MAKER_COLORS = [
  "#1e88ff", "#8be22e", "#ffc21a", "#ff2fc4", "#9d6bff",
  "#ff7a2f", "#16c6ae", "#ef4444", "#4c5566", "#f2efe9",
];

/**
 * "Make your own pal": a draft spec rendered live as `character="draft"`;
 * "Use this pal" cleans it up and hands it back for saving as "custom".
 */
function buildMaker(onUse: (spec: Required<CustomPal>) => void): HTMLElement {
  const draft: Required<CustomPal> = cleanCustom(settings.custom ?? null) ?? { ...DEFAULT_CUSTOM };

  const maker = h("dot-pal", { size: "96", idle: "float", style: "width:96px;height:168px" });
  maker.character = "draft";
  const name = h("input", { type: "text", maxlength: "24", style: "width:150px" });
  const furSwitch = toggle(draft.fur, (v) => {
    draft.fur = v;
    render();
  });

  // Body, eyes and top: one row of pressed buttons each.
  const groups: Record<"shape" | "eyes" | "top", HTMLButtonElement[]> = { shape: [], eyes: [], top: [] };
  const boxes: Record<"shape" | "eyes" | "top", HTMLElement> = { shape: h("div"), eyes: h("div"), top: h("div") };
  for (const key of ["shape", "eyes", "top"] as const) {
    boxes[key].className = "opts";
    for (const [value, label] of Object.entries(CUSTOM_OPTIONS[key])) {
      const b = h("button", { class: "opt", text: t(label) });
      b.type = "button";
      b.dataset.value = value;
      b.addEventListener("click", () => {
        (draft as unknown as Record<string, string>)[key] = value;
        render();
        void maker.play("squish");
      });
      boxes[key].append(b);
      groups[key].push(b);
    }
  }

  // Ten swatches plus "any color".
  const colorBox = h("div", { class: "opts colors" });
  const swatches = MAKER_COLORS.map((c) => {
    const b = h("button", { class: "swatch" });
    b.type = "button";
    b.dataset.value = c;
    b.style.setProperty("--c", c);
    b.setAttribute("aria-label", c);
    b.addEventListener("click", () => {
      draft.color = c;
      render();
      void maker.play("squish");
    });
    colorBox.append(b);
    return b;
  });
  const anyColor = h("input", { type: "color", title: t("Any color") });
  anyColor.addEventListener("input", () => {
    draft.color = anyColor.value;
    render();
  });
  colorBox.append(anyColor);

  name.addEventListener("input", () => {
    draft.name = name.value || DEFAULT_CUSTOM.name;
    registerCustom(draft, "draft");
    DotPal.refresh("draft");
  });

  const random = h("button", { text: t("Random") });
  random.type = "button";
  random.addEventListener("click", () => {
    const any = (o: Record<string, string>) => {
      const keys = Object.keys(o);
      return keys[Math.floor(Math.random() * keys.length)];
    };
    const set = (key: "shape" | "eyes" | "top", value: string) => {
      (draft as unknown as Record<string, string>)[key] = value;
    };
    set("shape", any(CUSTOM_OPTIONS.shape));
    set("eyes", any(CUSTOM_OPTIONS.eyes));
    set("top", any(CUSTOM_OPTIONS.top));
    draft.color = MAKER_COLORS[Math.floor(Math.random() * MAKER_COLORS.length)];
    draft.fur = Math.random() > 0.25;
    render();
    void maker.play("jump");
  });

  const use = h("button", { class: "primary", text: t("Use this pal") });
  use.addEventListener("click", () => {
    const spec = cleanCustom(draft);
    if (!spec) return;
    onUse(spec);
    void maker.play("jump");
  });

  function render() {
    registerCustom(draft, "draft");
    DotPal.refresh("draft");
    name.value = draft.name;
    furSwitch.classList.toggle("on", draft.fur);
    furSwitch.setAttribute("aria-pressed", String(draft.fur));
    for (const key of ["shape", "eyes", "top"] as const) {
      for (const b of groups[key]) b.setAttribute("aria-pressed", String(b.dataset.value === draft[key]));
    }
    for (const b of swatches) b.setAttribute("aria-pressed", String(b.dataset.value === draft.color));
    if (anyColor.value !== draft.color) anyColor.value = draft.color;
  }

  render();

  return h(
    "div",
    { class: "maker" },
    h("div", { class: "maker-pal" }, maker),
    h(
      "div",
      { class: "maker-form" },
      h(
        "div",
        { class: "row maker-row" },
        h("label", { text: t("Name") }),
        name,
        h("label", { text: t("Fur") }),
        furSwitch,
      ),
      h("div", { class: "maker-group" }, h("span", { class: "cap", text: t("Body") }), boxes.shape),
      h("div", { class: "maker-group" }, h("span", { class: "cap", text: t("Eyes") }), boxes.eyes),
      h("div", { class: "maker-group" }, h("span", { class: "cap", text: t("Top") }), boxes.top),
      h("div", { class: "maker-group" }, h("span", { class: "cap", text: t("Color") }), colorBox),
      h("div", { class: "maker-actions" }, random, use),
    ),
  );
}

/**
 * Which character the island draws instead of Mochi, with a live preview at the
 * same proportions the island uses (width = body diameter, height taller so the
 * component's bottom-edge clip doesn't cut the feet). The maker below builds
 * your own pal and swaps it in as "custom".
 */
function characterRow(): HTMLElement {
  const preview = h("dot-pal", {
    size: "64",
    style: "width:64px;height:120px;pointer-events:none;flex:0 0 auto",
  });
  const select = h("select", {}) as HTMLSelectElement;
  // 1. Grupo Oficial Embasa
  const groupEmbasa = h("optgroup", { label: "💧 " + t("Mascote Oficial Embasa") }) as HTMLOptGroupElement;
  groupEmbasa.append(h("option", { value: "embasa", text: "Gota Embasa (Oficial 3D)" }));
  select.append(groupEmbasa);

  // 2. Grupo Clássicos Powpow
  const groupClassics = h("optgroup", { label: "🌟 " + t("Clássicos Powpow") }) as HTMLOptGroupElement;
  groupClassics.append(h("option", { value: "mochi", text: t("Mochi (notch original)") }));
  const classicIds = ["blu", "hop", "sunny", "lovi", "muse", "grok", "nova", "byte"];
  for (const cid of classicIds) {
    const cdef = (characters as Record<string, any>)[cid];
    groupClassics.append(h("option", { value: cid, text: cdef?.label ?? cid }));
  }
  select.append(groupClassics);

  // 3. Grupo Animais
  const groupAnimals = h("optgroup", { label: "🐾 " + t("Novos Mascotes: Animais") }) as HTMLOptGroupElement;
  for (const m of MASCOTS_CATALOG.filter((m) => m.category === "animals")) {
    groupAnimals.append(h("option", { value: m.id, text: m.name }));
  }
  select.append(groupAnimals);

  // 4. Grupo Personagens
  const groupPeople = h("optgroup", { label: "👤 " + t("Novos Mascotes: Personagens") }) as HTMLOptGroupElement;
  for (const m of MASCOTS_CATALOG.filter((m) => m.category === "people")) {
    groupPeople.append(h("option", { value: m.id, text: m.name }));
  }
  select.append(groupPeople);

  // 5. Grupo Robôs & Criaturas
  const groupRobots = h("optgroup", { label: "🤖 " + t("Novos Mascotes: Robôs & Criaturas") }) as HTMLOptGroupElement;
  for (const m of MASCOTS_CATALOG.filter((m) => m.category === "robots")) {
    groupRobots.append(h("option", { value: m.id, text: m.name }));
  }
  select.append(groupRobots);

  // Your own pal: the option only exists once a spec has been saved (dotpals
  // does the same), and the spec itself is registered for the preview.
  const saved = cleanCustom(settings.custom ?? null);
  const customLabel = (spec: Required<CustomPal> | null) =>
    spec ? `${spec.name} (${t("yours")})` : t("Custom");
  const ensureOption = (spec: Required<CustomPal> | null) => {
    let opt = Array.from(select.options).find((o) => o.value === "custom");
    if (!opt) {
      opt = h("option", { value: "custom", text: customLabel(spec) }) as HTMLOptionElement;
      select.prepend(opt);
    } else opt.textContent = customLabel(spec);
    return opt;
  };
  if (saved) {
    ensureOption(saved);
    registerCustom(saved);
  } else if (settings.character === "custom") {
    // A spec that never made it to disk: fall back to a built-in.
    settings.character = "mochi";
  }
  select.value = settings.character ?? "mochi";

  const panel = h("div", { class: "maker-wrap" });
  const maker = buildMaker((spec) => {
    settings.custom = spec;
    settings.character = "custom";
    registerCustom(spec);
    DotPal.refresh("custom");
    ensureOption(spec);
    select.value = "custom";
    preview.character = "custom";
    panel.hidden = false;
    void save();
  });
  panel.append(maker);
  panel.hidden = settings.character !== "custom";

  const galleryPanel = h("div", { class: "gallery-wrap", style: "margin-top: 16px; width: 100%;" });
  galleryPanel.hidden = true;

  const selector = new MascotSelector({
    currentMascot: settings.character ?? "embasa",
    onSelect: (id) => {
      let opt = Array.from(select.options).find((o) => o.value === id);
      if (!opt) {
        opt = h("option", { value: id, text: id });
        select.append(opt);
      }
      select.value = id;
      settings.character = id;
      preview.character = id;
      panel.hidden = settings.character !== "custom";
      void save();
    },
  });
  galleryPanel.append(selector.container);

  const galleryToggle = h("button", {
    style: "background: rgba(4, 149, 244, 0.2); border-color: rgba(4, 149, 244, 0.5); color: #38bdf8;",
    text: "🎨 " + t("Galeria de Mascotes (53)"),
  });
  galleryToggle.addEventListener("click", () => {
    galleryPanel.hidden = !galleryPanel.hidden;
    if (!galleryPanel.hidden) panel.hidden = true;
  });

  const makerToggle = h("button", { text: t("Make your own pal") });
  makerToggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });

  select.addEventListener("change", () => {
    settings.character = select.value;
    preview.character = settings.character;
    panel.hidden = settings.character !== "custom";
    void save();
  });
  preview.character = select.value;

  return h(
    "div",
    { class: "char-block" },
    h(
      "div",
      { class: "row" },
      h("label", { text: t("Character") }),
      select,
      galleryToggle,
      makerToggle,
      preview,
    ),
    galleryPanel,
    panel,
  );
}

function personalityRow(): HTMLElement {
  const select = h("select", {}) as HTMLSelectElement;
  const options: [PalPersonality, string][] = [
    ["sarcastic", t("Sarcastic & Witty")],
    ["friendly", t("Friendly & Caring")],
    ["coach", t("Focused & Coach")],
    ["philosophical", t("Wise & Philosophical")],
    ["chaotic", t("Goofy & Chaotic")],
  ];
  for (const [val, label] of options) {
    const opt = h("option", { value: val, text: label }) as HTMLOptionElement;
    if (val === (settings.personality ?? "sarcastic")) opt.selected = true;
    select.append(opt);
  }

  select.addEventListener("change", () => {
    settings.personality = select.value as PalPersonality;
    void save();
  });

  return h(
    "div",
    { class: "row" },
    h("label", { text: t("Agent Personality") }),
    select,
    h("span", { class: "hint", text: t("How the companion behaves, comments and reacts") }),
  );
}

// ── Active pills section ──────────────────────────────────────────────────────

function activePillsSection(connected: Record<string, boolean>): HTMLElement {
  const slots = h("div", { class: "hint" });
  const main = h("select", {}) as HTMLSelectElement;
  for (const def of mainPillChoices()) main.append(h("option", { value: def.id, text: def.name }));
  main.addEventListener("change", () => {
    const next = chooseMainPill(settings, main.value);
    if (!next) return;
    settings.mainPill = next.mainPill;
    settings.activeIntegrations = next.activeIntegrations;
    void save();
    draw();
  });
  const groups = h("div", { style: "display:flex;flex-direction:column;gap:12px" });

  function hint(def: PillDefinition): string | null {
    if (isComingSoon(def.id)) return t("Coming soon");
    if (def.connect.kind === "hooks" && !connected[def.id]) return t("Hooks not installed");
    if (def.connect.kind === "key" && !connected[def.id]) return t("Key not configured");
    if (def.connect.kind === "server" && !settings[def.connect.field]) return t("Not connected");
    return null;
  }

  function row(def: PillDefinition): HTMLElement {
    const isMain = def.id === settings.mainPill;
    const on = settings.activeIntegrations.includes(def.id);
    const full = !isMain && !on && settings.activeIntegrations.length >= MAX_DECLARED;
    const el = h("div", { class: full ? "pill-row full" : "pill-row" },
      colorDot(def, "width:10px;height:10px", () => settings.pillColors, pickColor),
      h("span", { class: "name", text: def.name }),
    );
    if (isMain) {
      el.append(h("span", { class: "state", text: t("Principal") }));
      return el;
    }
    const why = hint(def);
    el.append(h("span", { class: "state", text: why ?? "" }));
    const sw = h("button", { class: on ? "switch on" : "switch" }) as HTMLButtonElement;
    sw.disabled = full;

    const togglePill = () => {
      if (isMain) return;
      const next = toggleDeclared(settings, def.id);
      if (!next) {
        if (!on && settings.activeIntegrations.length >= MAX_DECLARED) {
          slots.textContent = t("Limite de {max} pílulas atingido! Desative uma antes de ativar outra.", { max: MAX_DECLARED });
          slots.classList.add("full");
        }
        return;
      }
      settings.activeIntegrations = next;
      void save();
      draw();
    };

    sw.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePill();
    });

    el.style.cursor = isMain ? "default" : "pointer";
    el.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".color-dot") || (e.target as HTMLElement).closest(".palette")) return;
      togglePill();
    });

    el.append(sw);
    return el;
  }

  function draw() {
    const used = settings.activeIntegrations.length;
    slots.textContent = t("{used}/{max} slots em uso — a ferramenta principal é fixa.", { used, max: MAX_DECLARED });
    slots.classList.toggle("full", used >= MAX_DECLARED);
    main.value = settings.mainPill;
    clear(groups);
    for (const cat of PILL_CATEGORIES) {
      const pills = availablePills().filter((p) => p.category === cat.id);
      if (pills.length === 0) continue;
      groups.append(h("div", { class: "pill-group" }, h("h3", { text: t(cat.title) }), ...pills.map(row)));
    }
  }
  draw();

  return h(
    "section",
    {},
    h("h2", {}, h("span", { text: t("Pílulas Ativas") })),
    h("div", { class: "hint", text: t("Escolha as ferramentas e agentes que você usa. Clique na opção para ativar/desativar ou no ponto colorido para personalizar a cor.") }),
    slots,
    h("div", { class: "row" }, h("label", { text: t("Ferramenta principal") }), main),
    groups,
  );
}

// ── General section ───────────────────────────────────────────────────────────

function generalSection(): HTMLElement {
  const volume = h("input", {
    type: "range", min: "0", max: "0.2", step: "0.005",
    value: String(settings.soundVolume),
  }) as HTMLInputElement;
  volume.addEventListener("input", () => {
    settings.soundVolume = Number(volume.value);
    void save();
  });

  const autoClose = h("input", {
    type: "number", min: "5", max: "120", step: "1",
    value: String(Math.round(settings.autoCloseInterval)),
    style: "width:72px",
  }) as HTMLInputElement;
  autoClose.addEventListener("change", () => {
    settings.autoCloseInterval = Math.max(5, Math.min(120, Number(autoClose.value) || 15));
    autoClose.value = String(settings.autoCloseInterval);
    void save();
  });

  const screen = h("select", {}) as HTMLSelectElement;
  screen.append(
    h("option", { value: "primary", text: t("Main display") }),
    h("option", { value: "cursor", text: t("Display under the cursor") }),
  );
  screen.value = settings.screen;
  screen.addEventListener("change", () => {
    settings.screen = screen.value as Settings["screen"];
    void save();
  });

  const language = h("select", {}) as HTMLSelectElement;
  language.append(
    h("option", { value: "en", text: t("English") }),
    h("option", { value: "pt-BR", text: t("Portuguese (Brazil)") }),
  );
  language.value = settings.language ?? "en";
  language.addEventListener("change", async () => {
    settings.language = language.value as Settings["language"];
    await save();
    // Static labels are built once: reload so the whole window speaks it.
    // The island rebuilds live via settings-changed, no restart needed there.
    location.reload();
  });

  const THEME_OPTIONS: { id: Settings["theme"]; name: string; desc: string; previewClass: string; dotColor: string }[] = [
    {
      id: "onyx",
      name: t("Onyx Black"),
      desc: t("Classic dark island with high contrast and stealth aesthetics"),
      previewClass: "theme-preview-onyx",
      dotColor: "#38bdf8",
    },
    {
      id: "ice",
      name: t("Ice White"),
      desc: t("Clean, bright frosted surface inspired by crisp snow and ice"),
      previewClass: "theme-preview-ice",
      dotColor: "#0284c7",
    },
    {
      id: "frost",
      name: t("Frost Blue"),
      desc: t("Translucent deep blue glass with atmospheric frosty glow"),
      previewClass: "theme-preview-frost",
      dotColor: "#7dd3fc",
    },
    {
      id: "glass",
      name: t("Glassmorphism"),
      desc: t("Dark smoked glass with delicate blur and illuminated specular borders"),
      previewClass: "theme-preview-glass",
      dotColor: "#67e8f9",
    },
    {
      id: "aqua",
      name: t("Aqua Liquid"),
      desc: t("Living liquid surface with deep oceanic gradients and aquatic sheen"),
      previewClass: "theme-preview-aqua",
      dotColor: "#2dd4bf",
    },
  ];

  const themeGrid = h("div", { class: "theme-grid" });
  const themeCards: HTMLElement[] = [];

  for (const opt of THEME_OPTIONS) {
    const isCur = (settings.theme ?? "onyx") === opt.id;
    const miniDot = h("i", { class: "mini-dot", style: `background:${opt.dotColor};box-shadow:0 0 6px ${opt.dotColor}` });
    const miniPill1 = h("div", { class: "mini-pill" });
    const miniPill2 = h("div", { class: "mini-pill", style: "width:16px" });
    const miniIsland = h("div", { class: "mini-island" }, miniDot, miniPill1, miniPill2);
    const previewBox = h("div", { class: `theme-preview-box ${opt.previewClass}` }, miniIsland);

    const title = h("span", { class: "theme-card-title", text: opt.name });
    const badge = h("span", { class: "theme-card-badge", text: t("✓ Selecionado") });
    const titleRow = h("div", { class: "theme-card-title-row" }, title, badge);
    const desc = h("span", { class: "theme-card-desc", text: opt.desc });
    const info = h("div", { class: "theme-card-info" }, titleRow, desc);

    const card = h("div", { class: `theme-card${isCur ? " is-active" : ""}` }, previewBox, info);
    card.addEventListener("click", () => {
      settings.theme = opt.id;
      document.documentElement.dataset.theme = settings.theme;
      themeCards.forEach((c) => c.classList.remove("is-active"));
      card.classList.add("is-active");
      void save();
    });

    themeCards.push(card);
    themeGrid.append(card);
  }

  return h(
    "section",
    {},
    h("h2", {}, h("span", { text: t("General") })),
    h("div", { class: "row" },
      h("label", { text: t("Language") }),
      language,
    ),
    h("div", { style: "display:flex;flex-direction:column;gap:6px;width:100%" },
      h("label", { style: "color:var(--dim);font-size:12.5px;font-weight:600", text: t("Theme") }),
      themeGrid,
    ),
    characterRow(),
    personalityRow(),
    h("div", { class: "row" },
      h("label", { text: t("Sound") }),
      toggle(settings.soundEnabled, (v) => { settings.soundEnabled = v; void save(); }),
      volume,
    ),
    h("div", { class: "row" },
      h("label", { text: t("Voice") }),
      toggle(settings.voiceEnabled, (v) => { settings.voiceEnabled = v; void save(); }),
      h("span", { class: "hint", text: t("the pal says the alerts out loud") }),
    ),
    h("div", { class: "row" },
      h("label", { text: t("Auto-close") }),
      autoClose,
      h("span", { class: "hint", text: t("seconds after you leave the island") }),
    ),
    h("div", { class: "row" },
      h("label", { text: t("Island lives on") }),
      screen,
    ),
    h("div", { class: "row" },
      h("label", { text: t("Walk around") }),
      toggle(settings.wander, (v) => { settings.wander = v; void save(); }),
      h("span", { class: "hint", text: t("the pal strolls across the screen") }),
    ),
    h("div", { class: "row" },
      h("label", { text: t("Open on hover") }),
      toggle(settings.openOnHover, (v) => { settings.openOnHover = v; void save(); }),
      h("span", { class: "hint", text: t("the island expands when you hover near it") }),
    ),
    h("div", { class: "row" },
      h("label", { text: t("Claude plan usage") }),
      toggle(settings.showPlanInNotch, (v) => { settings.showPlanInNotch = v; void save(); }),
      h("span", { class: "hint", text: t("shows 5-hour and 7-day limits in the island header") }),
    ),
    h("div", { class: "row" },
      h("label", { text: t("Codex plan usage") }),
      toggle(settings.showCodexPlanInNotch, (v) => { settings.showCodexPlanInNotch = v; void save(); }),
      h("span", { class: "hint", text: t("shows Codex credits and rate limits in header") }),
    ),
    h("div", { class: "row" },
      h("label", { text: t("Gemini plan usage") }),
      toggle(settings.showGeminiPlanInNotch, (v) => { settings.showGeminiPlanInNotch = v; void save(); }),
      h("span", { class: "hint", text: t("shows Gemini rate limits and daily quota in header") }),
    ),
    h("div", { class: "row" },
      h("label", { text: t("Launch at startup") }),
      toggle(settings.autostart, (v) => { settings.autostart = v; void save(); }),
    ),
    h("div", { class: "row" },
      h("label", { text: t("Allowed tools") }),
      h("span", {
        class: "hint",
        text: settings.approvedTools.length === 0
          ? t("None remembered yet — answer Always on a card.")
          : settings.approvedTools.join(", "),
      }),
      h("button", {
        text: t("Clear"),
        onclick: () => {
          settings.approvedTools = [];
          void save();
          clear(root);
          void main();
        },
      }),
    ),
  );
}

// ── Boot ──────────────────────────────────────────────────────────────────────

async function main() {
  const boot = await Bridge.boot();
  if (boot) {
    settings = { ...settings, ...boot.settings };
    version = boot.version;
  }
  document.documentElement.dataset.theme = settings.theme ?? "onyx";
  const status = (await Bridge.hooksStatus()) ?? {
    installed: false, settingsPath: "", hookPath: "", hookReady: false,
  };

  const hasKey = (await Bridge.secretPresent("anthropic-api-key")) ?? false;
  const hasGeminiKey = (await Bridge.secretPresent("gemini-api-key")) ?? false;
  const geminiStatus = (await Bridge.geminiHooksStatus()) ?? {
    installed: false, settingsPath: "", hookPath: "", hookReady: false,
  };
  const agyStatus = (await Bridge.agyHooksStatus()) ?? {
    installed: false, settingsPath: "", hookPath: "", hookReady: false,
  };

  const keys = [
    "stripe-api-key", "github-token", "vercel-token",
    "n8n-url", "n8n-api-key", "resend-api-key", "notion-api-key", "calcom-api-key",
    "gmail-email", "gmail-app-password", "gmail-oauth",
    "outlook-email", "outlook-app-password", "outlook-oauth",
  ];
  const present: Record<string, boolean> = {};
  for (const k of keys) present[k] = (await Bridge.secretPresent(k)) ?? false;

  const agents = await Bridge.agentHooksList();
  settings = { ...settings, ...sanitizeDeclared(settings) };
  const connected: Record<string, boolean> = { ...((await Bridge.agentHooksStatus()) ?? {}) };
  for (const def of availablePills()) {
    if (def.connect.kind === "key") {
      connected[def.id] = present[def.connect.key] ?? (await Bridge.secretPresent(def.connect.key)) ?? false;
    }
  }

  clear(root);
  root.append(
    h("h1", {}, h("span", { text: "Powpow" }), h("span", { class: "version", text: version })),
    claudeSection(status),
    geminiSection(geminiStatus),
    agySection(agyStatus),
    agentsSection(agents),
    activePillsSection(connected),
    apiSection(hasKey, hasGeminiKey),
    gmailSection(present),
    outlookSection(present),
    integrationsSection(present),
    generalSection(),
    h("div", {
      class: "hint",
      text: t("No telemetry. Network requests only go to the services you configure yourself."),
    }),
  );

  void onEvent<Settings>("settings-changed", (s) => {
    settings = { ...settings, ...s };
  });
}

void main();
