// Powpow plugin for opencode — forwards session/tool events to the Powpow
// island on Windows via the same named pipe powpow-hook.exe uses.
//
// Install:
//   1. Copy this file to ~/.config/opencode/plugins/powpow.ts
//      (or <project>/.opencode/plugins/powpow.ts for project-only)
//   2. Restart opencode. No config needed — fire-and-forget, never blocks.
//
// How it works:
// - opencode 1.18 delivers tool hooks under their own names (tool.execute.*,
//   permission.asked) and everything else on one `event` bus whose payload is
//   `{ type, properties }`. The two sets never overlap, so one plugin listens
//   to both and no event is ever forwarded twice.
// - Events are normalized to the Claude-like names the island already
//   understands (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop,
//   SessionEnd) and written as one JSON line to \\.\pipe\powpow-<sid>.
// - If Powpow is closed the pipe doesn't exist - we swallow the error and the
//   session continues untouched (same rule as powpow-hook: never block).
// - Approvals (permission.asked) are reported as activity only. Blocking
//   approval from the island is Claude-only for now.

import type { Plugin } from "@opencode-ai/plugin";
import * as net from "node:net";
import { execFileSync } from "node:child_process";

let resolved: string | null = null;

/** The account's `S-1-5-21-…`: what `pipe::pipe_name()` keys the pipe on. */
function sid(): string | null {
  try {
    // One cheap call at load. A username never matches the SID the server
    // uses, and guessing wrong is how this plugin used to talk to nobody.
    const out = execFileSync("whoami", ["/user", "/fo", "csv", "/nh"], {
      encoding: "utf8",
      timeout: 2000,
      windowsHide: true,
    });
    const value = out.split(",")[1]?.trim().replace(/^"|"$/g, "") ?? "";
    return /^S-\d+(-\d+)+$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

function pipeName(): string {
  if (resolved) return resolved;
  if (process.env.POWPOW_PIPE) return (resolved = process.env.POWPOW_PIPE);
  const key = sid() ?? process.env.USERNAME ?? process.env.USER ?? "user";
  return (resolved = `\\\\.\\pipe\\powpow-${key}`);
}

function send(payload: Record<string, unknown>) {
  try {
    const line = JSON.stringify({ source: "opencode", ...payload }) + "\n";
    const client = net.createConnection(pipeName());
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        try { client.destroy(); } catch { /* noop */ }
      }
    };
    client.on("error", done);
    client.on("connect", () => {
      client.write(line, () => done());
    });
    // Never hold the session: 300ms like powpow-hook's CONNECT_TIMEOUT.
    setTimeout(done, 300).unref?.();
  } catch {
    // Never block opencode.
  }
}

export const PowpowPlugin: Plugin = async () => {
  // Resolve the pipe before the first event: the lookup must not be the reason
  // an event misses the 300ms connect window.
  pipeName();

  // Tool hooks carry no directory, so the session's cwd is remembered from the
  // moment it is created. A user message is forwarded once, from its first
  // text part - `message.updated` itself has no text in 1.18.
  const cwdBySession = new Map<string, string>();
  const userMessages = new Set<string>();
  const sessionID = (v: unknown) => String(v ?? "unknown");
  const cwdOf = (id: string) => cwdBySession.get(id) ?? process.cwd?.() ?? "";

  return {
    event: async ({ event }: any) => {
      const props = event?.properties ?? {};
      const sid_ = sessionID(props.sessionID ?? props.info?.id);
      switch (event?.type) {
        case "session.created": {
          const id = sessionID(props.info?.id ?? props.sessionID);
          const dir = String(props.info?.directory ?? "");
          if (dir) cwdBySession.set(id, dir);
          send({ hook_event_name: "SessionStart", session_id: id, cwd: dir });
          break;
        }
        case "session.deleted":
          send({ hook_event_name: "SessionEnd", session_id: sid_, cwd: cwdOf(sid_) });
          break;
        case "session.idle":
          // Stop: the island shows the finished face and offers its chips.
          send({ hook_event_name: "Stop", session_id: sid_, cwd: cwdOf(sid_), message: "opencode idle" });
          break;
        case "session.error":
          send({
            hook_event_name: "StopFailure",
            session_id: sid_,
            cwd: cwdOf(sid_),
            message: String(props.error ?? props.message ?? "error").slice(0, 200),
          });
          break;
        case "message.updated":
          if (props.info?.role === "user" && props.info?.id) userMessages.add(String(props.info.id));
          break;
        case "message.part.updated": {
          const part = props.part;
          const id = String(part?.messageID ?? "");
          if (part?.type !== "text" || !userMessages.has(id)) break;
          userMessages.delete(id); // one prompt, one line
          const prompt = String(part.text ?? "").trim().replace(/^"([\s\S]*)"$/, "$1");
          if (!prompt) break;
          send({
            hook_event_name: "UserPromptSubmit",
            session_id: sid_,
            cwd: cwdOf(sid_),
            prompt: prompt.slice(0, 400),
          });
          break;
        }
      }
    },
    "tool.execute.before": async (input: any, output: any) => {
      // The arguments live on `output`, not on `input` - reading `input.args`
      // is what used to make every step label come out without its command.
      const args = output?.args ?? {};
      const sid_ = sessionID(input?.sessionID);
      send({
        hook_event_name: "PreToolUse",
        session_id: sid_,
        cwd: cwdOf(sid_),
        tool_name: String(input?.tool ?? "Tool"),
        tool_input: {
          command: args.command,
          file_path: args.file ?? args.file_path ?? args.path,
          path: args.path,
          query: args.query,
        },
      });
    },
    "tool.execute.after": async (input: any) => {
      const sid_ = sessionID(input?.sessionID);
      send({
        hook_event_name: input?.error ? "PostToolUseFailure" : "PostToolUse",
        session_id: sid_,
        cwd: cwdOf(sid_),
        tool_name: String(input?.tool ?? "Tool"),
      });
    },
    "permission.asked": async (input: any) => {
      // Fire-and-forget activity (no blocking approval yet).
      const sid_ = sessionID(input?.sessionID);
      send({
        hook_event_name: "PreToolUse",
        session_id: sid_,
        cwd: cwdOf(sid_),
        tool_name: String(input?.tool ?? "Tool"),
        tool_input: { command: String(input?.action ?? input?.request ?? "").slice(0, 200) },
      });
    },
  };
};

export default PowpowPlugin;
