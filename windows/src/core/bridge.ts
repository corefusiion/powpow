// Thin wrapper over the Tauri commands/events. Every call is a no-op when the
// page is opened in a plain browser, so the island can be iterated on with
// `npm run dev` alone.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { Settings } from "./state";

export const IS_TAURI =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!IS_TAURI) return null;
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.error(`[powpow] ${cmd} failed`, err);
    return null;
  }
}

export interface BootInfo {
  settings: Settings;
  /** Logical screen rect of the monitor the island lives on. */
  screen: { x: number; y: number; width: number; height: number; scale: number };
  version: string;
  hookPath: string;
}

export const Bridge = {
  boot: () => call<BootInfo>("boot"),

  saveSettings: (settings: Settings) => call<void>("save_settings", { settings }),

  /** Shrink the window down to the invisible wake strip (hidden) or back to full. */
  setCollapsed: (collapsed: boolean) => call<void>("set_collapsed", { collapsed }),

  /**
   * Pushes the island shape in window coordinates. Rust flips click-through from
   * its own cursor poll, so the flag is never a frame behind a click.
   */
  setIslandRect: (x: number, y: number, width: number, height: number) =>
    call<void>("set_island_rect", { x, y, width, height }),

  /** Give the window keyboard focus (chat field) and take it away again. */
  focusWindow: (focused: boolean) => call<void>("focus_window", { focused }),

  reposition: () => call<void>("reposition"),

  openUrl: (url: string) => call<void>("open_url", { url }),

  /** "Open terminal" → opens the folder in VS Code when `code` is on PATH. */
  openInVSCode: (path: string | null) => call<boolean>("open_in_vscode", { path }),

  quit: () => call<void>("quit_app"),

  openSettingsWindow: () => call<void>("open_settings_window"),

  /** Writes to %LOCALAPPDATA%\Powpow\powpow.log, next to the Rust lines. */
  log: (message: string) => call<void>("log_line", { message }),

  // ── Claude Code hooks ─────────────────────────────────────────────────────
  hooksStatus: () => call<HookStatus>("hooks_status"),
  /** Diff to show before anything is written. `install: false` previews removal. */
  hooksPreview: (install: boolean) => callOrThrow<HookPreview>("hooks_preview", { install }),
  /**
   * Writes ~/.claude/settings.json — only ever after an explicit click, and only
   * when the file still matches the preview the user looked at.
   */
  hooksApply: (install: boolean, fingerprint: string) =>
    callOrThrow<string>("hooks_apply", { install, fingerprint }),

  geminiHooksStatus: () => call<HookStatus>("gemini_hooks_status"),
  geminiHooksPreview: (install: boolean) =>
    callOrThrow<HookPreview>("gemini_hooks_preview", { install }),
  geminiHooksApply: (install: boolean, fingerprint: string) =>
    callOrThrow<string>("gemini_hooks_apply", { install, fingerprint }),

  agyHooksStatus: () => call<HookStatus>("agy_hooks_status"),
  agyHooksPreview: (install: boolean) =>
    callOrThrow<HookPreview>("agy_hooks_preview", { install }),
  agyHooksApply: (install: boolean, fingerprint: string) =>
    callOrThrow<string>("agy_hooks_apply", { install, fingerprint }),

  agentHooksStatus: () => call<Record<string, boolean>>("agent_hooks_status"),
  agentHooksList: () => call<AgentHookStatus[]>("agent_hooks_list"),
  agentHooksPreview: (agent: string, install: boolean) =>
    callOrThrow<AgentHookPlan>("agent_hooks_preview", { agent, install }),
  agentHooksApply: (agent: string, install: boolean, fingerprint: string) =>
    callOrThrow<string>("agent_hooks_apply", { agent, install, fingerprint }),

  statusLinePreview: (install: boolean) => callOrThrow<HookPreview>("status_line_preview", { install }),
  statusLineApply: (install: boolean, fingerprint: string) =>
    callOrThrow<string>("status_line_apply", { install, fingerprint }),
  codexPlanUsage: () => call<unknown>("codex_plan_usage"),

  approvalDecision: (requestId: string, decision: "allow" | "deny" | "always") =>
    call<void>("approval_decision", { requestId, decision }),
  /** "The card is up" — until this lands the relay only waits a moment. */
  approvalAck: (requestId: string) => call<void>("approval_ack", { requestId }),
  /** "Nobody can act on this" — Claude Code asks in the terminal right away. */
  approvalDecline: (requestId: string) => call<void>("approval_decline", { requestId }),

  // ── Chat, files, secrets ──────────────────────────────────────────────────
  /** One chat turn. The API key and any file bytes never leave Rust. */
  chatSend: (query: string, context: ChatContext | null) =>
    callOrThrow<{ text: string }>("chat_send", { query, context }),
  chatReset: () => call<void>("chat_reset"),
  /** Copies a dropped file into the inbox. */
  ingestFile: (path: string) => callOrThrow<DroppedFile>("ingest_file", { path }),
  /** Stores a page-read file (base64) into the inbox. */
  ingestBytes: (name: string, base64Data: string) =>
    callOrThrow<DroppedFile>("ingest_bytes", { name, base64Data }),
  /** Captures the window under the cursor (Mochi drag-out). */
  attachWindow: () => callOrThrow<AttachedWindow>("attach_window"),
  /** Only ever tells you whether a key exists — never its value. */
  secretPresent: (key: string) => call<boolean>("secret_present", { key }),
  secretSet: (key: string, value: string) => callOrThrow<void>("secret_set", { key, value }),
  secretClear: (key: string) => callOrThrow<void>("secret_clear", { key }),

  // ── Integrations ──────────────────────────────────────────────────────────
  refreshIntegration: (id: string) => call<void>("refresh_integration", { id }),
  /** System-wide media key: playpause | next | prev. */
  mediaKey: (action: string) => call<void>("media_key", { action }),
  /** Gmail OAuth: opens the browser, waits for consent, returns the address. */
  gmailSignin: (clientId: string, clientSecret: string) =>
    callOrThrow<string>("gmail_signin", { clientId, clientSecret }),
  gmailSignout: () => callOrThrow<void>("gmail_signout"),
  /** Outlook device flow step 1: returns the code + URL to approve. */
  outlookDeviceBegin: (clientId: string) =>
    callOrThrow<{ userCode: string; verificationUrl: string }>("outlook_device_begin", { clientId }),
  /** Outlook device flow step 2: waits for the approval (up to ~3 min). */
  outlookDevicePoll: () => callOrThrow<void>("outlook_device_poll"),
  outlookSignout: () => callOrThrow<void>("outlook_signout"),
  /** Opens the configured n8n instance in the browser. */
  openN8n: () => call<void>("open_n8n"),

  /** Tray → Pause. Stops the integration pollers, not just the island. */
  setPaused: (paused: boolean) => call<void>("set_paused", { paused }),

  // ── The roaming pal (its own window, so the island never moves) ────────────
  /** Show the pal and let it walk, or park and hide it. */
  setPalWander: (on: boolean) => call<void>("set_pal_wander", { on }),
  /** What Rust last heard — asked once when the pal window loads. */
  palWanderState: () => call<boolean>("pal_wander_state"),
  /** Top-left of the pal window, logical pixels. */
  movePal: (x: number, y: number) => call<void>("move_pal", { x, y }),
  /** The island's state, so the roaming pal wears the same face. */
  setPalState: (state: string) => call<void>("set_pal_state", { state }),
  /** The face in effect right now — asked once when the pal window loads. */
  palState: () => call<string>("pal_state"),
  /** The window the user was working in - the pal's Screen analysis. */
  attachActiveWindow: () => callOrThrow<AttachedWindow>("attach_active_window"),
  /** Screen bounds of active window without screenshot overhead for perching. */
  activeWindowBounds: () => call<ActiveWindowBounds | null>("get_active_window_bounds"),
  /** A card button pressed on the pal; the island owns what it means. */
  palAction: (kind: string, query?: string) => call<void>("pal_action", { kind, query }),
  /** The pal's clickable area, window-local logical px (character + card). */
  setPalRect: (x: number, y: number, w: number, h: number) =>
    call<void>("set_pal_rect", { x, y, w, h }),
  /** Typing in the card: let the window take focus, then give it back. */
  setPalFocus: (focused: boolean) => call<void>("set_pal_focus", { focused }),

  // ── System Agent (Desktop Butler, Doc Creator, File Locator) ───────────────
  desktopOrganizePreview: (folderKind?: string) =>
    call<OrganizePreview>("desktop_organize_preview", { folderKind }),
  desktopOrganizeApply: (items: OrganizeItem[]) =>
    call<OrganizeResult>("desktop_organize_apply", { items }),
  desktopOrganizeUndo: () =>
    call<number>("desktop_organize_undo"),
  createSystemDoc: (docType: string, title: string, content: string, destFolder?: string) =>
    call<CreatedDocInfo>("create_system_doc", { docType, title, content, destFolder }),
  locateSystemFiles: (query: string, maxResults?: number) =>
    call<LocatedFile[]>("locate_system_files", { query, maxResults }),
  openSystemPath: (path: string) =>
    call<void>("open_system_path", { path }),
  revealInExplorer: (path: string) =>
    call<void>("reveal_in_explorer", { path }),
  systemControl: (action: string, value?: string) =>
    call<SystemControlResult>("system_control", { action, value }),
  injectText: (text: string) =>
    call<void>("inject_text", { text }),
  getActiveWindowContext: () =>
    call<WindowContextInfo>("get_active_window_context"),
};

export interface ActiveWindowBounds {
  appName: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IntegrationUpdate {
  id: string;
  data: Record<string, unknown>;
  error: string | null;
  event: { success: boolean; label: string; detail: string | null } | null;
}

export type ChatContext =
  | { kind: "file"; name: string; path: string }
  | { kind: "window"; appName: string; title: string; url?: string };

export interface DroppedFile {
  name: string;
  path: string;
  size: number;
}

export interface HookStatus {
  installed: boolean;
  planRelayInstalled?: boolean;
  settingsPath: string;
  hookPath: string;
  hookReady: boolean;
}

export interface AgentHookStatus {
  id: string;
  name: string;
  installed: boolean;
  path: string;
  hookReady: boolean;
  approvals: boolean;
  note: string;
}

export interface AgentHookPlan {
  diff: string;
  backup: string;
  path: string;
  fingerprint: string;
}

export interface HookPreview {
  diff: string;
  backup: string;
  settingsPath: string;
  /** Hand back to hooksApply so only the reviewed diff is ever written. */
  fingerprint: string;
}

/** Same as `call`, but surfaces the error so the UI can show what went wrong. */
async function callOrThrow<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!IS_TAURI) throw new Error("not running inside Powpow");
  return invoke<T>(cmd, args);
}

export type BridgeEvent =
  | { name: "cursor"; payload: { x: number; y: number; down: boolean } }
  | { name: "mouse-up"; payload: { x: number; y: number; down: boolean } }
  | { name: "tray"; payload: string }
  | { name: "hook"; payload: Record<string, unknown> }
  | { name: "screen-changed"; payload: null };

export interface AttachedWindow {
  name: string;
  path: string;
  size: number;
  appName: string;
  title: string;
}

export interface DragDropPayload {
  type: "enter" | "over" | "drop" | "leave";
  paths?: string[];
}

/** Files dragged onto the island. Only reaches us when the window takes the mouse. */
export async function onDragDrop(handler: (e: DragDropPayload) => void) {
  if (!IS_TAURI) return () => {};
  return getCurrentWebview().onDragDropEvent((event) => {
    handler(event.payload as DragDropPayload);
  });
}

export async function onEvent<T>(name: string, handler: (payload: T) => void) {
  if (!IS_TAURI) return () => {};
  return listen<T>(name, (e) => handler(e.payload));
}

// ── System Agent Types ────────────────────────────────────────────────────────

export interface OrganizeItem {
  originalPath: string;
  fileName: string;
  category: string;
  targetFolder: string;
  targetPath: string;
  size: number;
}

export interface OrganizePreview {
  basePath: string;
  folderName: string;
  totalFiles: number;
  categories: Record<string, number>;
  items: OrganizeItem[];
}

export interface OrganizeResult {
  movedCount: number;
  basePath: string;
  targetFolders: string[];
}

export interface CreatedDocInfo {
  fileName: string;
  path: string;
  size: number;
  docType: string;
  opened: boolean;
}

export interface LocatedFile {
  name: string;
  path: string;
  folder: string;
  size: number;
  modifiedSecsAgo: number;
  extension: string;
}

export interface SystemControlResult {
  success: boolean;
  action: string;
  message: string;
}

export interface WindowContextInfo {
  appName: string;
  title: string;
  isAvailable: boolean;
}
