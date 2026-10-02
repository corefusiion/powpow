// The activity feed behind the Story view and the live diff card.
//
// powpow-hook.exe forwards every Claude Code hook over the named pipe (see
// island/hooks.ts); here each event folds into the shared bridge/activity.js
// log, and bridge/ui/story.js + recap.js turn those entries into readable
// turns: one plain sentence per request, chapters, "Ready to merge?", today's
// tally and the Markdown recap.
//
// This is the pure half of bridge/adapters/claude.js: no fs, no transcripts —
// the relay drops transcript_path (hook/src/main.rs DROPPED_FIELDS), so hooks
// are the only source on Windows. It also decides approval risk (flags).

import {
  clip,
  clipEnds,
  clipText,
  createActivityLog,
  folderName,
  relative,
  toPatch,
} from "../../../bridge/activity.js";
import { buildTurns, facts, startOfDay, turnTime } from "../../../bridge/ui/recap.js";
import { flags } from "../../../bridge/ui/story.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActFile {
  path: string;
  change: string;
}

export interface ActEntry {
  id: string;
  session: string;
  harness?: string;
  label?: string;
  at: number;
  kind: string;
  tool?: string;
  title: string;
  detail?: string;
  files?: ActFile[];
  body?: { command?: string; patch?: string; output?: string; args?: string };
  status: string;
  startedAt?: number;
  ms?: number;
  error?: string;
  summary?: string;
}

export interface Turn {
  id: string;
  session: string;
  harness?: string;
  label?: string;
  at: number;
  prompt: ActEntry | null;
  steps: ActEntry[];
  end: ActEntry | null;
}

export interface RiskFlag {
  level: "warn" | "info";
  text: string;
}

/** What powpow-hook forwards: Claude Code's hook JSON, minus tool_response. */
export interface HookEvent {
  hook_event_name?: string;
  session_id?: string;
  cwd?: string;
  prompt?: string;
  message?: string;
  error?: unknown;
  tool_name?: string;
  tool_use_id?: string;
  tool_input?: Record<string, any>;
  tool_response?: unknown;
  last_assistant_message?: string;
  source?: string;
}

type ToolInput = Record<string, any>;

// ── The log ───────────────────────────────────────────────────────────────────

const log = createActivityLog({ limit: 600 });
const roots = new Map<string, string>(); // session → first cwd seen

/** The session an event belongs to; a CLI without one falls back to its folder. */
function sessionId(e: HookEvent): string {
  if (e.session_id && e.session_id !== "unknown") return e.session_id;
  const cwd = e.cwd ?? "";
  let h = 0;
  for (let i = 0; i < cwd.length; i++) h = (Math.imul(31, h) + cwd.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36).slice(0, 8) || "local";
}

/** Paths are read against the folder the session started in, not a later `cd`. */
const rootOf = (session: string, cwd?: string): string => {
  if (cwd && !roots.has(session)) roots.set(session, cwd);
  return roots.get(session) ?? cwd ?? "";
};

const HARNESS_BY_SOURCE: Record<string, string> = {
  claudeCode: "claude",
  geminiCli: "gemini",
  antigravity: "antigravity",
  opencode: "opencode",
  genericCli: "generic",
};

/** Claude Code injects these into the prompt stream; they aren't prompts. */
const notAPrompt = (text: string): boolean =>
  !text ||
  /^\s*<(task-notification|agent-message|teammate-message|system-reminder|command-|local-command|user-prompt-submit-hook)/.test(
    text,
  );

/** A prompt's text; slash commands (skills, plugin commands) read as "/name args". */
function promptText(raw?: string): string | null {
  let text = raw ?? "";
  // IDE context the editor adds ("the user opened file X"), not what was typed.
  text = text.replace(/<(ide_[a-z_]+|system-reminder)>[\s\S]*?<\/\1>/g, "").trim();
  if (!text) return null;
  // Text the user pasted (wrapped in <pasted_content id="…">): what they typed
  // leads, the paste is a "[pasted text]" placeholder after it. Only a paste: its first line.
  const PASTE = /<pasted_content\b[^>]*>([\s\S]*?)(?:<\/pasted_content\b[^>]*>|$)/g;
  if (/<pasted_content\b/.test(text)) {
    const tidy = (s: string) =>
      s
        .replace(/<\\?\/?pasted_content\b[^>]*>/g, " ")
        .replace(/(^|\s)#{1,6}(?=\s)/g, "$1")
        .replace(/^\s*(?:[-*•]|\d+\.)\s+/, "")
        .replace(/\s+/g, " ")
        .trim();
    const typed = tidy(text.replace(PASTE, "\n"));
    const first = [...text.matchAll(PASTE)]
      .map((m) => m[1])
      .join("\n")
      .split("\n")
      .map(tidy)
      .find(Boolean);
    text = typed ? `${typed} [pasted text]` : `Pasted: ${first ?? "some text"}`;
  }
  const cmd = /<command-name>\s*([^<]+?)\s*<\/command-name>/.exec(text);
  if (cmd) {
    const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(text)?.[1]?.trim();
    return `${cmd[1].startsWith("/") ? "" : "/"}${cmd[1]}${args ? ` ${args}` : ""}`;
  }
  return notAPrompt(text) ? null : text;
}

/** Skip a prompt already in the log (the same prompt can arrive twice). */
const seenPrompt = (session: string, title: string, at: number): boolean => {
  const found = log.findLast(
    session,
    (x: ActEntry) => x.kind === "prompt" && x.title === title && Math.abs(at - x.at) < 120_000,
  );
  return !!found;
};

/** What a tool call did, as activity fields. */
export function describeTool(name = "", input: ToolInput = {}, cwd = ""): Partial<ActEntry> {
  const file = input.file_path || input.notebook_path;
  const rel = (p: unknown) => relative(p, cwd);
  switch (name) {
    case "Read":
      return { kind: "read", title: rel(file), files: [{ path: file, change: "read" }] };
    case "Edit":
      return {
        kind: "edit",
        title: rel(file),
        files: [{ path: file, change: "edit" }],
        body: { patch: toPatch(input.old_string, input.new_string) },
      };
    case "MultiEdit":
      return {
        kind: "edit",
        title: rel(file),
        files: [{ path: file, change: "edit" }],
        body: {
          patch: clipText(
            (input.edits ?? []).map((e: ToolInput) => toPatch(e.old_string, e.new_string, 2000)).join("\n@@\n"),
            6000,
          ),
        },
      };
    case "NotebookEdit":
      return {
        kind: "edit",
        title: rel(file),
        files: [{ path: file, change: "edit" }],
        body: { patch: toPatch("", input.new_source) },
      };
    case "Write":
      return {
        kind: "write",
        title: rel(file),
        files: [{ path: file, change: "write" }],
        body: { patch: toPatch("", input.content) },
      };
    case "Bash":
    case "PowerShell":
      return {
        kind: "run",
        title: clip(input.description || input.command, 80),
        detail: clip(input.command, 160),
        body: { command: clipEnds(input.command, 4000) },
      };
    case "Grep":
      return {
        kind: "search",
        title: clip(input.pattern, 80),
        detail: [input.glob || input.type, rel(input.path)].filter(Boolean).join(" in "),
      };
    case "Glob":
      return { kind: "search", title: clip(input.pattern, 80), detail: rel(input.path) };
    case "WebSearch":
      return { kind: "web", title: clip(input.query, 80) };
    case "WebFetch":
      return { kind: "web", title: clip(input.url, 80), detail: clip(input.prompt, 160) };
    case "Agent":
    case "Task":
      return {
        kind: "agent",
        title: clip(input.description || "Subagent", 80),
        detail: input.subagent_type,
        body: { args: clipText(input.prompt, 3000) },
      };
    case "Skill":
      return { kind: "skill", title: clip(input.skill, 80), detail: clip(input.args, 160) };
    case "TodoWrite":
      return {
        kind: "plan",
        title: "Updated the plan",
        body: {
          args: (input.todos ?? [])
            .map(
              (t: ToolInput) =>
                `${t.status === "completed" ? "✓" : t.status === "in_progress" ? "▸" : "·"} ${t.content}`,
            )
            .join("\n"),
        },
      };
  }
  const args = clipText(JSON.stringify(input, null, 2), 3000);
  if (name.startsWith("mcp__")) {
    const [, server = "", tool = name] = name.split("__");
    return {
      kind: "mcp",
      title: tool.replace(/_/g, " "),
      detail: server.replace(/^claude_ai_/, "").replace(/_/g, " "),
      body: { args },
    };
  }
  return { kind: "tool", title: name, body: { args } };
}

/** A tool's result as text for the details panel (file contents aren't kept). */
function resultText(name: string, result: unknown): string | undefined {
  if (result == null || name === "Read" || name === "Write") return undefined;
  if (typeof result === "string") return clipEnds(result, 3000);
  if (Array.isArray(result)) return clipEnds(result.map((b: any) => b?.text ?? "").join("\n"), 3000);
  const r = result as ToolInput;
  if (name === "Bash" || name === "PowerShell") {
    return clipEnds([r.stdout, r.stderr].filter(Boolean).join("\n"), 3000) || undefined;
  }
  if (name === "Edit" || name === "MultiEdit") return undefined;
  if (name === "Grep" || name === "Glob") {
    const files = r.filenames ?? [];
    return clipText(r.content || `${r.numFiles ?? files.length} files\n${files.join("\n")}`, 3000);
  }
  if (Array.isArray(r.content)) return clipEnds(r.content.map((b: any) => b?.text ?? "").join("\n"), 3000);
  return clipText(JSON.stringify(r, null, 2), 3000);
}

// ── Feeding the log ───────────────────────────────────────────────────────────

let dirty = true;
let cachedTurns: Turn[] = [];

/** Fold one hook event into the log. Every payload shape powpow-hook forwards. */
export function applyHookEvent(e: HookEvent): void {
  const name = e.hook_event_name ?? "";
  const session = sessionId(e);
  const at = Date.now();
  const harness = HARNESS_BY_SOURCE[e.source ?? "claudeCode"] ?? (e.source ?? "claude").toLowerCase();
  const base = { session, label: folderName(e.cwd) ?? "Session", harness, at };
  const tool = e.tool_name ?? "";
  const id = e.tool_use_id ? `${session}:${e.tool_use_id}` : null;

  switch (name) {
    case "UserPromptSubmit": {
      const text = promptText(e.prompt ?? e.message);
      if (!text) break;
      const title = clip(text, 300);
      if (!seenPrompt(session, title, at)) {
        log.upsert({ ...base, id: `${session}:p:${at}`, kind: "prompt", title, status: "info" });
      }
      break;
    }
    case "PreToolUse":
      log.upsert({
        ...base,
        id: id ?? `${session}:t:${at}`,
        tool,
        ...describeTool(tool, e.tool_input ?? {}, rootOf(session, e.cwd)),
        status: "running",
        startedAt: at,
      });
      break;
    case "PostToolUse":
    case "PostToolUseFailure": {
      const ok = name === "PostToolUse";
      const entry =
        (id && log.get(id)) || log.findLast(session, (x: ActEntry) => x.tool === tool && x.status === "running");
      const output = resultText(tool, e.tool_response);
      log.upsert({
        ...base,
        id: entry?.id ?? id ?? `${session}:t:${at}`,
        tool,
        ...(entry ? {} : describeTool(tool, e.tool_input ?? {}, rootOf(session, e.cwd))),
        status: ok ? "ok" : "failed",
        ...(entry?.startedAt ? { ms: at - entry.startedAt } : {}),
        ...(output ? { body: { output } } : {}),
        ...(!ok && e.error
          ? { error: clip(typeof e.error === "string" ? e.error : ((e.error as ToolInput)?.message ?? ""), 300) }
          : {}),
      });
      break;
    }
    case "PermissionRequest": {
      const entry = log.findLast(
        session,
        (x: ActEntry) => x.tool === tool && (x.status === "running" || x.status === "waiting"),
      );
      if (entry) log.upsert({ id: entry.id, status: "waiting" });
      break;
    }
    case "PreCompact":
      log.upsert({
        ...base,
        id: `${session}:c:${at}`,
        kind: "compact",
        title: "Compacting the conversation",
        status: "info",
      });
      break;
    case "Stop": {
      const raw = e.last_assistant_message;
      const summary = typeof raw === "string" ? clipText(raw, 2000) : undefined;
      log.upsert({ ...base, id: `${session}:s:${at}`, kind: "done", title: "Finished", status: "ok", summary });
      break;
    }
    case "StopFailure": {
      const msg = typeof e.error === "string" ? e.error : ((e.error as ToolInput)?.message as string) ?? e.message;
      log.upsert({
        ...base,
        id: `${session}:s:${at}`,
        kind: "error",
        title: clip(msg ?? "Something went wrong", 160),
        status: "failed",
      });
      break;
    }
    default:
      break;
  }
  if (name === "Stop" || name === "StopFailure" || name === "SessionEnd") log.settle(session);
  dirty = true;
}

// ── What the views read ───────────────────────────────────────────────────────

/** Every session's requests as turns (oldest first), cached until the next event. */
export function activityTurns(): Turn[] {
  if (dirty) {
    cachedTurns = (buildTurns(log.all()) as unknown) as Turn[];
    dirty = false;
  }
  return cachedTurns;
}

/** Turns that are worth showing: have a prompt or did something. */
export function storyTurns(max = 6): Turn[] {
  return activityTurns()
    .filter((t) => t.prompt || t.steps.length)
    .slice(-max)
    .reverse();
}

/** One session's entries, oldest first (the test note reads the newest session). */
export function sessionSteps(session: string): ActEntry[] {
  const all: ActEntry[] = log.all();
  return all.filter((e) => e.session === session);
}

export interface TodayTally {
  requests: number;
  files: number;
  commands: number;
  ms: number;
}

/** Today's work, counted the way the Story tab counts it. */
export function todayTally(turns: Turn[] = activityTurns()): TodayTally {
  const today = turns.filter((t) => t.at >= startOfDay());
  // recap.js adds these with Object.assign, which the inferred JS type misses.
  const f = facts(today.flatMap((t) => t.steps)) as unknown as {
    runs: number;
    changed: unknown[];
    wrote: unknown[];
    deleted: unknown[];
  };
  return {
    requests: today.filter((t) => t.prompt).length,
    files: f.changed.length + f.wrote.length + f.deleted.length,
    commands: f.runs,
    ms: today.reduce((sum, t) => sum + turnTime(t), 0),
  };
}

/** The newest edit/write with a patch: what the live diff card shows. */
export function latestDiff(): ActEntry | null {
  const all: ActEntry[] = log.all();
  for (let i = all.length - 1; i >= 0; i--) {
    const e = all[i];
    if ((e.kind === "edit" || e.kind === "write") && e.body?.patch && e.status !== "failed") return e;
  }
  return null;
}

/** Still editing, or fresh enough to show (the same rule the notch uses). */
export function diffIsFresh(e: ActEntry): boolean {
  return e.status === "running" || e.status === "waiting" || Date.now() - e.at < 15_000;
}

/** Risk lines for a command/file about to run — what the approval card warns. */
export function pendingFlags(tool: string, input: ToolInput, cwd: string): RiskFlag[] {
  const entry: ActEntry = {
    id: "pending",
    session: "pending",
    at: Date.now(),
    kind: "run",
    tool,
    title: "",
    status: "waiting",
    ...describeTool(tool, input, cwd),
  } as ActEntry;
  const out: RiskFlag[] = (flags([entry], { before: true }) as unknown) as RiskFlag[];
  return out.map((f) => ({ level: f.level, text: f.text }));
}
