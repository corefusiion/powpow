// The roaming pal — a window of its own that keeps the user company on the
// desktop while the island stays parked at the top. It walks with a purpose:
// it stands beside the cursor to watch what the user is doing, comes under the
// island when something needs attention, and only strolls on its own when
// nothing is happening. Transparent, frameless and click-through (Rust opens
// the mouse up only over the character or the menu card), clicking it offers a
// card of actions — the island owns what each one means.

import "./pal.css";
import { Bridge, IS_TAURI, onEvent, type BootInfo } from "./core/bridge";
import { PANEL_H, PANEL_W, type BotStateName } from "./core/layout";
import { PAL_EMOTE, PAL_H_RATIO, PAL_MID_RATIO, PAL_STATE } from "./island/palState";
import { BotEngine } from "./mochi/engine";
import { State, type Settings } from "./core/state";
import { t } from "./core/i18n";
import { h } from "./views/dom";
import { DotPal, registerCustom, type CustomPal } from "../../src/index.js";

// Window geometry — mirrors tauri.conf.json's "pal" entry. The body keeps the
// old 140x250 box at the window's left edge; the remaining width is the room
// the card opens into, so every position below is still a body position.
const WIN_W = 360;
const PAL_W = 140;
const PAL_H = 250;
// Mochi's canvas: the body is 60 % of it, so 130 px of canvas is the 78 px
// body the dot-pal wears too — both sit on the centre of the body's box.
const BOT_SIZE = 130;
const BOT_OVERHANG = 40;
const DP_SIZE = 106;

// The stroll: a walk, not a dash, with pauses long enough to read as standing.
const SPEED = 60;
let walkSpeed = SPEED;
const IDLE_MIN = 900;
const IDLE_MAX = 4200;
const SETTLE = 2;
// Clear of the screen edges, and of whatever sits along the bottom.
const PAD_X = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 64;
// The island owns the top centre; the pal never walks under it.
const KEEP_OUT = 24;
// Watching: follow the cursor only when it has clearly left, and only while
// it is still moving — a hand on the mouse must not make the pal creep.
const WATCH_STILL_MS = 6000;
const WATCH_FOLLOW = 40;
const ROUTE_EPS = 12;
// "Back to the island": steer there for a while, whatever else is going on.
const ESCORT_MS = 15000;
// The states that mean "come and tell me" — the pal stands under the island.
const NOTABLE = new Set<BotStateName>(["finished", "error", "approval", "question"]);

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
type Rule = "report" | "watch" | "tour";

const root = document.getElementById("pal-root")!;
const cardEl = document.getElementById("pal-card")!;
const searchWrap = document.getElementById("pal-search")!;
const searchOpenBtn = cardEl.querySelector<HTMLElement>('[data-action="search-open"]')!;
const searchInput = document.getElementById("pal-search-input") as HTMLInputElement;
const engine = new BotEngine();

// Mischievous features: sarcastic thoughts, close button biting, and splatters
const thoughtEl = document.getElementById("pal-thought");
const thoughtTextEl = document.getElementById("pal-thought-content");
const closeBiteEl = document.getElementById("pal-close-bite");
const splattersEl = document.getElementById("pal-splatters");

let lastPrankTime = 0;
const PRANK_INTERVAL_MS = 18000; // a random prank every ~18s

const SARCASTIC_THOUGHTS = [
  "Mais um bug que vai virar 'feature'...",
  "Ele realmente vai compilar isso sem testar? Coragem...",
  "git push --force na main numa terça-feira? Audacioso...",
  "Esse código funciona puramente por intervenção divina.",
  "Ctrl+C, Ctrl+V... a verdadeira arte da engenharia de software.",
  "A tela tá linda, pena que a lógica tá chorando.",
  "Fingindo que estou entendendo o que você tá digitando...",
  "Mais café ou mais paciência? Vai precisar dos dois.",
  "Quem precisa de documentação quando se tem fé e console.log?",
  "Se der tela azul, a culpa foi do reinício de ontem!",
  "Commit: 'ajustes finais agora vai final_mesmo_v2'...",
  "// TODO: tratar esse erro depois. (Nunca tratou).",
  "Olhando você debugar com print... que nostalgia dos anos 90!",
  "Será que a IA vai substituir quem copia código do StackOverflow?",
  "Respira fundo... falta pouco pro deploy dar ruim.",
];

function showSarcasticThought() {
  if (!thoughtEl || !thoughtTextEl) return;
  const thought = SARCASTIC_THOUGHTS[Math.floor(Math.random() * SARCASTIC_THOUGHTS.length)];
  thoughtTextEl.textContent = thought;
  thoughtEl.hidden = false;
  engine.triggerEmote("wink");
  if (pal) void pal.emote("star");
  window.setTimeout(() => {
    if (thoughtEl) thoughtEl.hidden = true;
  }, 4800);
}

function biteCloseButton() {
  if (!closeBiteEl) return;
  closeBiteEl.classList.remove("is-chomped");
  closeBiteEl.hidden = false;
  engine.triggerEmote("surprised");
  if (pal) void pal.emote("wide");

  window.setTimeout(() => {
    if (closeBiteEl) {
      closeBiteEl.classList.add("is-chomped");
      engine.triggerEmote("happy");
      if (pal) void pal.emote("love");
      window.setTimeout(() => {
        if (closeBiteEl) closeBiteEl.hidden = true;
      }, 1500);
    }
  }, 600);
}

function throwSplatters() {
  if (!splattersEl) return;
  splattersEl.innerHTML = "";
  engine.triggerEmote("wink");
  if (pal) void pal.emote("oops");

  const colors = ["#452b14", "#2d4a22", "#0284c7", "#3b1a54", "#603813"];
  for (let i = 0; i < 5; i++) {
    const blob = document.createElement("div");
    blob.className = "pal-splatter-blob";
    const size = 12 + Math.random() * 20;
    const left = 20 + Math.random() * 90;
    const top = 30 + Math.random() * 100;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const rot = Math.random() * 360;

    blob.style.width = `${size}px`;
    blob.style.height = `${size * (0.8 + Math.random() * 0.4)}px`;
    blob.style.left = `${left}px`;
    blob.style.top = `${top}px`;
    blob.style.background = color;
    blob.style.setProperty("--rot", `${rot}deg`);

    splattersEl.appendChild(blob);
  }

  window.setTimeout(() => {
    if (splattersEl) splattersEl.innerHTML = "";
  }, 3600);
}

function maybeTriggerPrank(now: number) {
  if (now - lastPrankTime < PRANK_INTERVAL_MS) return;
  lastPrankTime = now;

  const choice = Math.floor(Math.random() * 3);
  if (choice === 0) {
    showSarcasticThought();
  } else if (choice === 1) {
    biteCloseButton();
  } else {
    throwSplatters();
  }
}

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

// Purpose: why it is walking right now.
let rule: Rule = "tour";
let routedTo: Pt | null = null;
let eyeTo: Pt | null = null;
let cursorPos: Pt = { x: 0, y: 0 };
let cursorAt = -1;
let tourIndex = -1;
let tourAt = 0;
let escortUntil = 0;
let hovered = false;

// The card.
let cardOpen = false;
let lastRect = { x: 0, y: 0, w: PAL_W, h: PAL_H };
let lastAction: { kind: string; query?: string } | null = null;

let charName = "mochi";
let customSpec: CustomPal | null = null;
let currentChar = "";
let canvas: HTMLCanvasElement | null = null;
let pal: DotPal | null = null;
let lastState: BotStateName = "idle";

/** Where the window may go: the screen, minus its frame's padding. The card
 *  opens to the right of the body, so the right edge reserves room for it. */
function screenRect(): Rect {
  return {
    x0: screenInfo.x + PAD_X,
    y0: screenInfo.y + PAD_TOP,
    x1: screenInfo.x + screenInfo.width - WIN_W - PAD_X,
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

/** Would the window, standing at (px, py), hide behind the island? The whole
 *  window counts — the card must not open over the island either. */
function standsInBand(px: number, py: number): boolean {
  const k = islandRect();
  return px < k.x1 && px + WIN_W > k.x0 && py < k.y1 && py + PAL_H > k.y0;
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
      if (t < t0) t0 = t;
      if (t < t1) t1 = t;
    }
  }
  return t0 <= t1;
}

function clampTo(p: Pt): Pt {
  const b = screenRect();
  return {
    x: Math.min(Math.max(p.x, b.x0), b.x1),
    y: Math.min(Math.max(p.y, b.y0), b.y1),
  };
}

/** Route to a spot: straight when nothing is in the way, otherwise drop below
 *  the island's band, cross there and climb back up. Never a random detour. */
function routeTo(tx: number, ty: number): Pt[] {
  const k = islandRect();
  if (!segHitsRect(x, y, tx, ty, k)) return [{ x: tx, y: ty }];
  const b = screenRect();
  const detour = Math.min(b.y1, Math.max(k.y1 + 8, b.y0));
  const out: Pt[] = [];
  if (y < detour - SETTLE) out.push({ x, y: detour });
  out.push({ x: tx, y: detour });
  if (Math.abs(ty - detour) > SETTLE) out.push({ x: tx, y: ty });
  return out;
}

/** Under the island: close enough to be noticed, clear of the band. */
function postIsland(): Pt {
  const k = islandRect();
  const b = screenRect();
  return clampTo({
    x: screenInfo.x + (screenInfo.width - PAL_W) / 2,
    y: Math.max(k.y1 + 8, b.y0),
  });
}

/** Beside the cursor: standing where the user is working, just below it. */
function postWatch(): Pt {
  if (cursorAt < 0) return postIsland();
  const k = islandRect();
  const spot = clampTo({ x: cursorPos.x - PAL_W / 2 - 20, y: cursorPos.y + 56 });
  // A cursor parked on the island itself must not put the pal inside the band.
  if (standsInBand(spot.x, spot.y)) spot.y = Math.max(spot.y, k.y1 + 8);
  return spot;
}

/** The quiet tour: three spots, taken in order while nothing is happening. */
function tourPosts(): Pt[] {
  const b = screenRect();
  const midY = b.y0 + (b.y1 - b.y0) * 0.7;
  return [
    { x: b.x0, y: midY },
    // Pousa na parte superior da tela (olhando o que digitamos)
    clampTo({ x: screenInfo.x + (screenInfo.width - PAL_W) * 0.22, y: b.y0 + 4 }),
    clampTo({ x: screenInfo.x + (screenInfo.width - PAL_W) / 2, y: b.y1 - 24 }),
    clampTo({ x: screenInfo.x + (screenInfo.width - PAL_W) * 0.78, y: b.y0 + 4 }),
    { x: b.x1, y: midY },
  ];
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
  if (hovered) return; // the pointer is on the pal: it stays put for the click

  const notable = NOTABLE.has(lastState) || now < escortUntil;
  const watching = cursorAt >= 0 && now - cursorAt < WATCH_STILL_MS;
  const next: Rule = notable ? "report" : watching ? "watch" : "tour";
  if (next !== rule) {
    rule = next;
    legs = [];
    idleUntil = 0;
    routedTo = null;
    if (next === "tour") tourAt = now;
  }
  if (now < idleUntil) return;

  // Where it should be standing now.
  let target: Pt | null = null;
  if (rule === "report") {
    target = postIsland();
    eyeTo = { x: screenInfo.x + screenInfo.width / 2, y: screenInfo.y + PANEL_H / 2 };
  } else if (rule === "watch") {
    target = postWatch();
    eyeTo = cursorAt >= 0 ? cursorPos : null;
  } else {
    eyeTo = null;
    if (!legs.length && now >= tourAt) {
      const spots = tourPosts();
      tourIndex = (tourIndex + 1) % spots.length;
      target = spots[tourIndex];
    }
  }

  if (target) {
    const follow = rule === "watch" ? WATCH_FOLLOW : ROUTE_EPS;
    const drift = routedTo
      ? Math.hypot(target.x - routedTo.x, target.y - routedTo.y)
      : Number.POSITIVE_INFINITY;
    const needWalk = !legs.length && Math.hypot(target.x - x, target.y - y) > follow;
    if (drift > follow || needWalk) {
      legs = routeTo(target.x, target.y);
      routedTo = { ...target };
    }
  }
  if (!legs.length) return;

  const ox = x;
  const oy = y;
  const t = legs[0];
  const dx = t.x - x;
  const dy = t.y - y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0) {
    if (dx !== 0) faceDir = Math.sign(dx);
    const stride = Math.min(dist, walkSpeed * dt);
    x += (dx / dist) * stride;
    y += (dy / dist) * stride;
  }
  if (Math.abs(t.x - x) <= SETTLE && Math.abs(t.y - y) <= SETTLE) {
    x = t.x;
    y = t.y;
    legs.shift();
    if (!legs.length && rule === "tour") {
      // The only randomness left: how long it lingers between the posts.
      idleUntil = now + IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);
      tourAt = idleUntil;
      maybeTriggerPrank(now);
    }
  }
  if (x !== ox || y !== oy) send();
}

function drawMochi(dt: number) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const hCss = BOT_SIZE + BOT_OVERHANG;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  engine.particleOverhang = BOT_OVERHANG;
  if (y <= screenRect().y0 + 16) {
    // Pousado no topo da tela: olha para baixo acompanhando a tela e o que digitamos
    engine.lookX = Math.max(-0.6, Math.min(0.6, (cursorPos.x - (x + PAL_W / 2)) / 300));
    engine.lookY = 1.0;
  } else if (eyeTo) {
    const dx = eyeTo.x - (x + PAL_W / 2);
    const dy = eyeTo.y - (y + PAL_H / 2);
    const m = Math.max(40, Math.hypot(dx, dy));
    engine.lookX = Math.max(-1, Math.min(1, (dx / m) * 1.4));
    engine.lookY = Math.max(-1, Math.min(1, (dy / m) * 1.4));
  } else {
    engine.lookX = faceDir * 0.6;
    engine.lookY = 0;
  }
  engine.slotHTarget = 0;
  engine.update(dt);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, BOT_SIZE, hCss);
  engine.draw(ctx, BOT_SIZE, hCss);
}

function updatePalGaze() {
  if (!pal) return;
  if (cursorAt >= 0) {
    const eyeX = x + PAL_W / 2;
    const eyeY = y + PAL_H / 2;
    const dx = cursorPos.x - eyeX;
    const dy = cursorPos.y - eyeY;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      const s = Math.tanh(dist / 220);
      const gx = Math.max(-1, Math.min(1, (dx / dist) * s));
      const gy = Math.max(-1, Math.min(1, (dy / dist) * s));
      pal.lookAt(gx, gy);
    } else {
      pal.lookAt(0, 0);
    }
  } else {
    pal.lookAt(faceDir * 0.5, 0);
  }
}

function tick(t: number) {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(0.1, Math.max(0, (t - lastT) / 1000));
  lastT = t;
  frames++;
  step(dt, t);
  if (currentChar === "mochi") drawMochi(dt);
  else if (pal) updatePalGaze();
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
    setCard(false);
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

// ── The card ────────────────────────────────────────────────────────────────
/** Tell Rust which part of the window takes the mouse: the body, plus the
 *  card when it is open — the transparent rest stays click-through. */
function pushRect() {
  lastRect = { x: 0, y: 0, w: cardOpen ? WIN_W : PAL_W, h: PAL_H };
  void Bridge.setPalRect(lastRect.x, lastRect.y, lastRect.w, lastRect.h);
}

function setCard(open: boolean) {
  if (open === cardOpen) return;
  cardOpen = open;
  cardEl.hidden = !open;
  if (!open) {
    searchWrap.hidden = true;
    searchOpenBtn.hidden = false;
    if (document.activeElement === searchInput) searchInput.blur();
  }
  pushRect();
}

function callPal(kind: string, query?: string) {
  lastAction = query === undefined ? { kind } : { kind, query };
  void Bridge.palAction(kind, query);
}

function sendSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  searchInput.value = "";
  setCard(false);
  callPal("search", q);
}

/** Pointer arrived or left: freeze for the click, close the card on leaving
 *  (unless the user is typing a search in it). */
function setHovered(on: boolean) {
  hovered = on;
  if (!hovered && document.activeElement !== searchInput) setCard(false);
}

async function press(action: string) {
  switch (action) {
    case "search-open":
      searchOpenBtn.hidden = true;
      searchWrap.hidden = false;
      void Bridge.setPalFocus(true);
      searchInput.focus();
      return;
    case "search-send":
      sendSearch();
      return;
    case "home":
      setCard(false);
      escortUntil = performance.now() + ESCORT_MS;
      legs = [];
      idleUntil = 0;
      return;
    case "analyze":
    case "pause":
    case "new-chat":
    case "settings":
      setCard(false);
      callPal(action);
      return;
  }
}

function applyLabels() {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-label]"))) {
    el.textContent = t(el.dataset.label ?? "");
  }
  searchInput.placeholder = t("Search the web…");
}

async function main() {
  const info: BootInfo | null = await Bridge.boot();
  if (info) {
    screenInfo = info.screen;
    State.settings = { ...State.settings, ...info.settings };
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
  applyLabels();
  syncCharacter();

  // Park somewhere legal while hidden, so the first step out is never across
  // the island or off the edge.
  const b = screenRect();
  x = b.x0 + (b.x1 - b.x0) / 2;
  y = b.y1 - 40;
  send();
  pushRect();

  // The island may have spoken before this page loaded: ask for the face.
  const face = await Bridge.palState();
  if (face) applyState(face as BotStateName);
  setWander((await Bridge.palWanderState()) === true);

  await onEvent<boolean>("pal-wander", (on) => setWander(on === true));
  await onEvent<string>("pal-state", (s) => applyState(s as BotStateName));
  // Pointer over the character or its card: stand still while it is there,
  // and close the card when it leaves (unless the user is typing in it).
  await onEvent<boolean>("pal-hover", (on) => setHovered(on === true));
  // Where the user's hand is: the watch post is built from this.
  await onEvent<{ x: number; y: number; down: boolean }>("pal-cursor", (c) => {
    cursorPos = { x: c.x, y: c.y };
    cursorAt = performance.now();
    updatePalGaze();
  });
  await onEvent<Settings>("settings-changed", (s) => {
    State.settings = { ...State.settings, ...s };
    if (s.character != null) charName = s.character || "mochi";
    if (s.custom !== undefined) customSpec = s.custom as CustomPal | null;
    applyLabels();
    syncCharacter();
  });
  await onEvent<null>("screen-changed", async () => {
    const i = await Bridge.boot();
    if (i) screenInfo = i.screen;
    const r = screenRect();
    x = Math.min(Math.max(x, r.x0), r.x1);
    y = Math.min(Math.max(y, r.y0), r.y1);
    legs = [];
    routedTo = null;
    idleUntil = 0;
  });

  // On the body: the card. On a button: its action, owned by the island.
  root.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
    if (el?.dataset.action) {
      void press(el.dataset.action);
      return;
    }
    if ((e.target as HTMLElement).closest("#pal-card")) return; // a gap, not a button
    if (e.clientX <= PAL_W) setCard(!cardOpen);
  });
  searchInput.addEventListener("focus", () => void Bridge.setPalFocus(true));
  searchInput.addEventListener("blur", () => void Bridge.setPalFocus(false));
  searchInput.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      sendSearch();
    }
    e.stopPropagation();
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
        routedTo = null;
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
      // Purpose seams: rule, posts and the card, without touching Rust.
      rule: () => rule,
      posts: () => ({ island: postIsland(), watch: postWatch(), tour: tourPosts() }),
      cursor: (cx: number, cy: number) => {
        cursorPos = { x: cx, y: cy };
        cursorAt = performance.now();
      },
      hover: (on?: boolean) => {
        if (on !== undefined) setHovered(on);
        return hovered;
      },
      card: () => cardOpen,
      rect: () => ({ ...lastRect }),
      press: (action: string, query?: string) => {
        if (query !== undefined) {
          searchInput.value = query;
          sendSearch();
        } else {
          void press(action);
        }
      },
      lastAction: () => (lastAction ? { ...lastAction } : null),
      escort: (ms: number) => {
        escortUntil = performance.now() + ms;
        legs = [];
        idleUntil = 0;
      },
      tourNow: () => {
        idleUntil = 0;
        tourAt = 0;
      },
      speed: (v: number) => {
        walkSpeed = v;
      },
      eyes: () => (eyeTo ? { ...eyeTo } : null),
    };
  }
}

void main();
