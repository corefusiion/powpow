// The roaming pal — a window of its own that strolls the desktop while the
// island stays parked at the top. Transparent, frameless and click-through
// (Rust sets that flag once and never hands it the cursor), the page only ever
// asks to be moved: every step goes through move_pal, and the island stays the
// source of truth for the face it wears.

import "./pal.css";
import { Bridge, IS_TAURI, onEvent, type BootInfo } from "./core/bridge";
import { PANEL_H, PANEL_W, type BotStateName } from "./core/layout";
import { PAL_EMOTE, PAL_H_RATIO, PAL_MID_RATIO, PAL_STATE } from "./island/palState";
import { BotEngine } from "./mochi/engine";
import type { Settings } from "./core/state";
import { h } from "./views/dom";
import { DotPal, registerCustom, type CustomPal } from "../../src/index.js";

// Window geometry — mirrors tauri.conf.json's "pal" entry.
const PAL_W = 140;
const PAL_H = 250;
// Mochi's canvas: the body is 60 % of it, so 130 px of canvas is the 78 px
// body the dot-pal wears too — both sit on the centre of the window.
const BOT_SIZE = 130;
const BOT_OVERHANG = 40;
const DP_SIZE = 78;

// The stroll: a walk, not a dash, with pauses long enough to read as standing.
const SPEED = 60;
const IDLE_MIN = 900;
const IDLE_MAX = 4200;
const SETTLE = 2;
// Clear of the screen edges, and of whatever sits along the bottom.
const PAD_X = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 64;
// The island owns the top centre; the pal never walks under it.
const KEEP_OUT = 24;

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface Pt {
  x: number;
  y: number;
}

const root = document.getElementById("pal-root")!;
const engine = new BotEngine();

let screenInfo = { x: 0, y: 0, width: 1920, height: 1080, scale: 1 };
let x = 0;
let y = 0;
let legs: Pt[] = [];
let idleUntil = 0;
let running = false;
let raf = 0;
let lastT = 0;
let frames = 0;
let pendingMove = false;
let faceDir = 1;

let charName = "mochi";
let customSpec: CustomPal | null = null;
let currentChar = "";
let canvas: HTMLCanvasElement | null = null;
let pal: DotPal | null = null;
let lastState: BotStateName = "idle";

/** Where the window may go: the screen, minus its own frame's padding. */
function screenRect(): Rect {
  return {
    x0: screenInfo.x + PAD_X,
    y0: screenInfo.y + PAD_TOP,
    x1: screenInfo.x + screenInfo.width - PAL_W - PAD_X,
    y1: screenInfo.y + screenInfo.height - PAL_H - PAD_BOTTOM,
  };
}

/**
 * The island's band at the top centre, plus a margin the pal keeps out of. It
 * never reaches the bottom of the walkable strip: some corridor to stroll in
 * must always survive, even on a screen where the island takes most of it.
 */
function islandRect(): Rect {
  const b = screenRect();
  const left = screenInfo.x + (screenInfo.width - PANEL_W) / 2;
  const bandBottom = screenInfo.y + PANEL_H + KEEP_OUT;
  const y1 = Math.max(screenInfo.y - KEEP_OUT + 1, Math.min(bandBottom, b.y1 - 40));
  return { x0: left - KEEP_OUT, x1: left + PANEL_W + KEEP_OUT, y0: screenInfo.y - KEEP_OUT, y1 };
}

/** Would the window, standing at (px, py), hide behind the island? */
function standsInBand(px: number, py: number): boolean {
  const k = islandRect();
  return px < k.x1 && px + PAL_W > k.x0 && py < k.y1 && py + PAL_H > k.y0;
}

/** Does the straight line from a to b cross the rectangle? (Liang–Barsky.) */
function segHitsRect(ax: number, ay: number, bx: number, by: number, r: Rect): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - r.x0, r.x1 - ax, ay - r.y0, r.y1 - ay];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
      continue;
    }
    const t = q[i] / p[i];
    if (p[i] < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  return t0 <= t1;
}

/** A legal spot at random, reached without ever crossing the island's band. */
function pickRoute(): Pt[] {
  const b = screenRect();
  const k = islandRect();
  for (let i = 0; i < 10; i++) {
    const tx = b.x0 + Math.random() * (b.x1 - b.x0);
    const ty = b.y0 + Math.random() * (b.y1 - b.y0);
    if (standsInBand(tx, ty)) continue;
    if (segHitsRect(x, y, tx, ty, k)) continue;
    return [{ x: tx, y: ty }];
  }
  // Nothing nearby is clear: drop below the island's band and cross there.
  const detour = Math.min(b.y1, Math.max(k.y1 + 8, b.y0));
  const tx = b.x0 + Math.random() * (b.x1 - b.x0);
  let ty = b.y0 + Math.random() * (b.y1 - b.y0);
  if (tx >= k.x0 && tx <= k.x1 && ty < k.y1) ty = detour;
  const out: Pt[] = [];
  if (y < detour - SETTLE) out.push({ x, y: detour });
  out.push({ x: tx, y: detour });
  out.push({ x: tx, y: ty });
  return out;
}

/** One request in flight at a time; the next frame overwrites nothing. */
function send() {
  if (pendingMove) return;
  pendingMove = true;
  void Bridge.movePal(x, y).finally(() => {
    pendingMove = false;
  });
}

function step(dt: number, now: number) {
  if (now < idleUntil) return;
  if (!legs.length) legs = pickRoute();
  const t = legs[0];
  const dx = t.x - x;
  const dy = t.y - y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0) {
    if (dx !== 0) faceDir = Math.sign(dx);
    const move = Math.min(dist, SPEED * dt);
    x += (dx / dist) * move;
    y += (dy / dist) * move;
  }
  if (Math.abs(t.x - x) <= SETTLE && Math.abs(t.y - y) <= SETTLE) {
    x = t.x;
    y = t.y;
    legs.shift();
    if (!legs.length) idleUntil = now + IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);
  }
  send();
}

function drawMochi(dt: number) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const hCss = BOT_SIZE + BOT_OVERHANG;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  engine.particleOverhang = BOT_OVERHANG;
  engine.lookX = faceDir * 0.6;
  engine.lookY = 0;
  engine.slotHTarget = 0;
  engine.update(dt);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, BOT_SIZE, hCss);
  engine.draw(ctx, BOT_SIZE, hCss);
}

function tick(t: number) {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(0.1, Math.max(0, (t - lastT) / 1000));
  lastT = t;
  frames++;
  step(dt, t);
  if (currentChar === "mochi") drawMochi(dt);
}

/** Show the pal and let it walk, or park it and stop costing anything. */
function setWander(on: boolean) {
  if (on === running) return;
  running = on;
  if (on) {
    lastT = performance.now();
    raf = requestAnimationFrame(tick);
  } else if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

function applyState(s: BotStateName) {
  lastState = s;
  engine.setState(s);
  if (!pal) return;
  pal.setState(PAL_STATE[s] ?? "idle");
  const emote = PAL_EMOTE[s];
  if (emote) void pal.emote(emote);
}

/** The island's character, mirrored: Mochi on canvas, or the same `<dot-pal>`. */
function syncCharacter() {
  const want = charName || "mochi";
  if (want === "custom" && customSpec) registerCustom(customSpec);
  if (want === currentChar) {
    if (want === "custom") DotPal.refresh("custom");
    return;
  }
  currentChar = want;
  canvas?.remove();
  canvas = null;
  pal?.remove();
  pal = null;
  if (want === "mochi") {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const hCss = BOT_SIZE + BOT_OVERHANG;
    const el = h("canvas", { id: "pal-bot" });
    el.width = Math.round(BOT_SIZE * dpr);
    el.height = Math.round(hCss * dpr);
    el.style.width = `${BOT_SIZE}px`;
    el.style.height = `${hCss}px`;
    // Same seating as the island: the body's centre is the window's centre.
    el.style.left = `${Math.round((PAL_W - BOT_SIZE) / 2)}px`;
    el.style.top = `${Math.round((PAL_H - hCss) / 2 - BOT_OVERHANG / 2)}px`;
    root.append(el);
    canvas = el;
  } else {
    // bubble="none": the roaming pal carries no speech; the island has it.
    const el = h("dot-pal", { id: "pal-overlay", bubble: "none", size: String(DP_SIZE) });
    el.style.height = `${Math.round(DP_SIZE * PAL_H_RATIO)}px`;
    el.style.left = `${Math.round((PAL_W - DP_SIZE) / 2)}px`;
    el.style.top = `${Math.round(PAL_H / 2 - DP_SIZE * PAL_MID_RATIO)}px`;
    el.character = want;
    root.append(el);
    pal = el;
  }
  applyState(lastState);
}

async function main() {
  const info: BootInfo | null = await Bridge.boot();
  if (info) {
    screenInfo = info.screen;
    charName = info.settings.character || "mochi";
    customSpec = (info.settings.custom as CustomPal | null) ?? null;
  } else {
    const s = window.screen as Screen & { availLeft?: number; availTop?: number };
    screenInfo = {
      x: s.availLeft ?? 0,
      y: s.availTop ?? 0,
      width: s.availWidth,
      height: s.availHeight,
      scale: 1,
    };
  }
  syncCharacter();

  // Park somewhere legal while hidden, so the first step out is never across
  // the island or off the edge.
  const b = screenRect();
  x = b.x0 + (b.x1 - b.x0) / 2;
  y = b.y1 - 40;
  const first = pickRoute()[0];
  x = first.x;
  y = first.y;
  send();

  // The island may have spoken before this page loaded: ask for the face.
  const face = await Bridge.palState();
  if (face) applyState(face as BotStateName);
  setWander((await Bridge.palWanderState()) === true);

  await onEvent<boolean>("pal-wander", (on) => setWander(on === true));
  await onEvent<string>("pal-state", (s) => applyState(s as BotStateName));
  await onEvent<Settings>("settings-changed", (s) => {
    if (s.character != null) charName = s.character || "mochi";
    if (s.custom !== undefined) customSpec = s.custom as CustomPal | null;
    syncCharacter();
  });
  await onEvent<null>("screen-changed", async () => {
    const i = await Bridge.boot();
    if (i) screenInfo = i.screen;
    const r = screenRect();
    x = Math.min(Math.max(x, r.x0), r.x1);
    y = Math.min(Math.max(y, r.y0), r.y1);
    legs = [];
    idleUntil = 0;
  });

  if (import.meta.env.DEV && !IS_TAURI) {
    (window as unknown as { __pal?: unknown }).__pal = {
      pos: () => ({ x, y }),
      bounds: () => screenRect(),
      keepOut: () => islandRect(),
      legs: () => legs.map((p) => ({ ...p })),
      running: () => running,
      frames: () => frames,
      screen: () => ({ ...screenInfo }),
      setScreen: (r: { x: number; y: number; width: number; height: number; scale: number }) => {
        screenInfo = r;
        const b = screenRect();
        x = Math.min(Math.max(x, b.x0), b.x1);
        y = Math.min(Math.max(y, b.y0), b.y1);
        legs = [];
        idleUntil = 0;
      },
      start: () => setWander(true),
      stop: () => setWander(false),
      char: (name: string, spec?: CustomPal | null) => {
        charName = name;
        customSpec = spec ?? null;
        syncCharacter();
      },
      face: (s: string) => applyState(s as BotStateName),
      character: () => currentChar,
      crossing: (ax: number, ay: number, bx: number, by: number) =>
        segHitsRect(ax, ay, bx, by, islandRect()),
    };
  }
}

void main();
