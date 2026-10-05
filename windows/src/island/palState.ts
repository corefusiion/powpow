// What a bot state means to the `<dot-pal>` overlay and to Mochi's face. The
// island and the roaming pal window wear the same expression, so both read it
// from here.

import type { BotStateName } from "../core/layout";
import type { AgentState, Emote } from "../../../src/index.js";

/**
 * `<dot-pal>` host box, in bot-body diameters: full body height is ~1.95× the
 * width (the component clips everything below its bottom edge — the feet would
 * otherwise be cut off), and the body's centre sits 1.27 diameters below the
 * box top, which is where Mochi's centre sits (average over the eight built-ins).
 */
export const PAL_H_RATIO = 1.95;
export const PAL_MID_RATIO = 1.27;

/** Bot state → the agent state the `<dot-pal>` overlay shows for it. */
export const PAL_STATE: Record<BotStateName, AgentState> = {
  idle: "idle",
  working: "working",
  thinking: "thinking",
  // Looking for something reads as thinking (dots), not as running a command.
  searching: "thinking",
  approval: "waiting",
  question: "waiting",
  error: "error",
  finished: "done",
  // Backing off before a retry: still on it, so a bar, not the waiting "?".
  ratelimit: "working",
  sleeping: "sleeping",
  dizzy: "error",
};

/** The face that says what the state means, where the mood alone can't. */
export const PAL_EMOTE: Partial<Record<BotStateName, Emote>> = {
  approval: "wide",
  question: "hey",
  error: "oops",
  finished: "star",
  ratelimit: "sweat",
  // dizzy comes from handleDizzy(), which holds the face for the whole 3.3 s.
};
