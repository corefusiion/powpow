// The roaming pal — a window of its own that keeps the user company on the
// desktop while the island stays parked at the top. It walks with a purpose:
// it stands beside the cursor to watch what the user is doing, comes under the
// island when something needs attention, and only strolls on its own when
// nothing is happening. Transparent, frameless and click-through (Rust opens
// the mouse up only over the character or the menu card), clicking it offers a
// card of actions — the island owns what each one means.

import "./pal.css";
import { Bridge, IS_TAURI, onEvent, type BootInfo } from "./core/bridge";
import { PANEL_H, PANEL_W, type BotStateName, type BotEmoteName } from "./core/layout";
import { PAL_EMOTE, PAL_H_RATIO, PAL_STATE } from "./island/palState";
import { BotEngine } from "./mochi/engine";
import { State, type Settings } from "./core/state";
import { t } from "./core/i18n";
import { h } from "./views/dom";
import { DotPal, registerCustom, type CustomPal, type Emote } from "../../src/index.js";
import { Sound } from "./core/sound";

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

// The stroll: a slow, natural, comfortable walk (52 px/s vs 110 px/s)
const SPEED = 52;
let walkSpeed = SPEED;
const ACCEL = 85; // px/s^2 smooth acceleration / deceleration
let currentVelocity = 0;
const IDLE_MIN = 28000;
const IDLE_MAX = 50000;
const SETTLE = 2;
// Clear of the screen edges, and of whatever sits along the bottom.
const PAD_X = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 64;
// The island owns the top centre; the pal never walks under it.
const KEEP_OUT = 24;
// Watching: consider user active if cursor moved in the last 8 seconds
const WATCH_STILL_MS = 8000;
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

// Attentive desktop companion thoughts and observation system
const thoughtEl = document.getElementById("pal-thought");
const thoughtTextEl = document.getElementById("pal-thought-content");

let thoughtTimer: number | null = null;
let lastObservationTime = 0;
const OBSERVATION_INTERVAL_MS = 48000; // minimum 48s between thoughts (anti-spam)

let lastAiInspectTime = 0;
const AI_INSPECT_COOLDOWN_MS = 120000; // 2 minutes cooldown (economical)
let lastInspectedApp = "";
let lastInspectedTitle = "";
let isAiInspectBusy = false;

type CompanionEmote = "happy" | "star" | "wink" | "love" | "surprised";

interface ContextObservation {
  text: string;
  emote?: CompanionEmote;
}

const CONTEXT_OBSERVATIONS: Record<string, ContextObservation[]> = {
  editor: [
    { text: "Esse texto ficou bem organizado.", emote: "star" },
    { text: "Acho que encontrei uma palavra digitada incorretamente.", emote: "surprised" },
    { text: "Estrutura de código bem definida.", emote: "happy" },
    { text: "Acompanhando com atenção essas linhas.", emote: "star" },
    { text: "Código limpo e bem modularizado.", emote: "happy" },
  ],
  terminal: [
    { text: "Esse comando parece ter terminado.", emote: "happy" },
    { text: "Tem bastante coisa acontecendo nesse terminal.", emote: "star" },
    { text: "Acho que esse processo está demorando um pouco.", emote: "surprised" },
    { text: "Parece que essa tarefa terminou.", emote: "happy" },
    { text: "Acompanhando a saída dos comandos...", emote: "wink" },
  ],
  explorer: [
    { text: "Essa pasta poderia ficar mais organizada.", emote: "wink" },
    { text: "Navegando pela estrutura de arquivos...", emote: "happy" },
    { text: "Mapeando os diretórios do projeto.", emote: "star" },
  ],
  browser: [
    { text: "Pesquisa focada para resolver a questão.", emote: "happy" },
    { text: "Bastante documentação relevante por aqui.", emote: "star" },
    { text: "Navegando em busca de boas referências.", emote: "wink" },
  ],
  error: [
    { text: "Tem um erro aparecendo aqui.", emote: "surprised" },
    { text: "Acho que algo retornou um erro nessa execução.", emote: "surprised" },
    { text: "Vale a pena dar uma olhada nesse aviso.", emote: "wink" },
  ],
  waiting: [
    { text: "Acho que esse processo está demorando um pouco.", emote: "surprised" },
    { text: "Aguardando a conclusão da tarefa...", emote: "wink" },
    { text: "Parece que essa tarefa terminou.", emote: "happy" },
  ],
  general: [
    { text: "Acompanhando o fluxo de trabalho.", emote: "happy" },
    { text: "Foco total na atividade!", emote: "star" },
    { text: "Tudo fluindo tranquilamente por aqui.", emote: "happy" },
  ],
};

function triggerEmote(emote: CompanionEmote) {
  const engineEmote: BotEmoteName = emote === "star" ? "happy" : emote;
  const palEmote: Emote =
    emote === "surprised" ? "wide" : emote === "wink" ? "happy" : emote;
  engine.triggerEmote(engineEmote);
  if (pal) void pal.emote(palEmote);
}

function showThought(text: string, emote: CompanionEmote = "happy") {
  if (!thoughtEl || !thoughtTextEl) return;
  if (thoughtTimer != null) {
    window.clearTimeout(thoughtTimer);
    thoughtTimer = null;
  }
  thoughtTextEl.textContent = text;
  thoughtEl.hidden = false;
  Sound.play("peek");
  triggerEmote(emote);

  thoughtTimer = window.setTimeout(() => {
    if (thoughtEl) thoughtEl.hidden = true;
    thoughtTimer = null;
  }, 4800);
}

function classifyContext(appName: string, title: string): string {
  const s = `${appName} ${title}`.toLowerCase();
  if (
    s.includes("error") ||
    s.includes("falha") ||
    s.includes("exception") ||
    s.includes("failed") ||
    s.includes("warning") ||
    s.includes("erro ") ||
    s.includes("panic")
  ) {
    return "error";
  }
  if (
    s.includes("terminal") ||
    s.includes("powershell") ||
    s.includes("cmd") ||
    s.includes("bash") ||
    s.includes("zsh") ||
    s.includes("git") ||
    s.includes("console")
  ) {
    if (
      s.includes("wait") ||
      s.includes("sleep") ||
      s.includes("running") ||
      s.includes("build") ||
      s.includes("install") ||
      s.includes("compil")
    ) {
      return "waiting";
    }
    return "terminal";
  }
  if (
    s.includes("code") ||
    s.includes("cursor") ||
    s.includes("visual studio") ||
    s.includes("sublime") ||
    s.includes("intellij") ||
    s.includes("pycharm") ||
    s.includes("webstorm") ||
    s.includes("nvim") ||
    s.includes("vim") ||
    s.includes("notepad") ||
    s.includes("rust") ||
    s.includes("python") ||
    s.includes("editor")
  ) {
    return "editor";
  }
  if (
    s.includes("explorer") ||
    s.includes("arquivos") ||
    s.includes("files") ||
    s.includes("pasta") ||
    s.includes("folder") ||
    s.includes("diretório")
  ) {
    return "explorer";
  }
  if (
    s.includes("chrome") ||
    s.includes("edge") ||
    s.includes("firefox") ||
    s.includes("brave") ||
    s.includes("arc") ||
    s.includes("github") ||
    s.includes("stackoverflow")
  ) {
    return "browser";
  }
  return "general";
}

async function tryAiAutonomousObservation(): Promise<boolean> {
  const now = performance.now();
  if (now - lastAiInspectTime < AI_INSPECT_COOLDOWN_MS || isAiInspectBusy) return false;

  let hasKey = false;
  try {
    const hasGemini = (await Bridge.secretPresent("gemini-api-key")) ?? false;
    const hasClaude = (await Bridge.secretPresent("anthropic-api-key")) ?? false;
    hasKey = hasGemini || hasClaude;
  } catch {
    return false;
  }
  if (!hasKey) return false;

  isAiInspectBusy = true;
  lastAiInspectTime = now;

  try {
    const attached = await Bridge.attachActiveWindow();
    if (!attached || !attached.path) {
      isAiInspectBusy = false;
      return false;
    }

    const app = (attached.appName || "").toLowerCase();
    const title = (attached.title || "").toLowerCase();
    if (app === lastInspectedApp && title === lastInspectedTitle) {
      // Screen context hasn't changed apps/tasks: skip to save API tokens
      isAiInspectBusy = false;
      return false;
    }
    lastInspectedApp = app;
    lastInspectedTitle = title;

    const prompt =
      "Você é um mascote assistente atento que acompanha o trabalho do usuário. Observe a tela anexada e retorne apenas UMA frase curta e natural (máximo 8 a 10 palavras em português, sem aspas, sem introdução) observando o que está acontecendo (ex: 'Esse texto ficou bem organizado.', 'Esse comando parece ter terminado.', 'Tem bastante coisa acontecendo nesse terminal.', 'Essa pasta poderia ficar mais organizada.', etc.).";

    const reply = await Bridge.chatSend(prompt, {
      kind: "file",
      name: attached.name,
      path: attached.path,
    });

    if (reply?.text) {
      let text = reply.text
        .replace(/^["'«“]|["'»”]$/g, "")
        .replace(/\n.*/s, "")
        .trim();
      if (text.length > 70) text = text.slice(0, 68) + "…";

      if (text) {
        showThought(text, "star");
        isAiInspectBusy = false;
        return true;
      }
    }
  } catch {
    // Graceful fallback to contextual observations
  } finally {
    isAiInspectBusy = false;
  }
  return false;
}

async function triggerContextualObservation(now: number, force = false) {
  if (!force && now - lastObservationTime < OBSERVATION_INTERVAL_MS) return;
  lastObservationTime = now;

  // 1. Try smart economical AI visual observation first if API key is configured
  const aiHandled = await tryAiAutonomousObservation();
  if (aiHandled) return;

  // 2. Fallback to realistic contextual thoughts
  let appName = "";
  let title = "";
  try {
    const attached = await Bridge.attachActiveWindow();
    if (attached) {
      appName = attached.appName || "";
      title = attached.title || "";
    }
  } catch {
    // Ignore error
  }

  const category = classifyContext(appName, title);
  const pool = CONTEXT_OBSERVATIONS[category] ?? CONTEXT_OBSERVATIONS.general;
  const item = pool[Math.floor(Math.random() * pool.length)];
  showThought(item.text, item.emote ?? "happy");
}

function onPalSummoned() {
  showThought("Aqui para acompanhar! 👀", "star");
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

let stationCursor: Pt = { x: -9999, y: -9999 };
let stationShiftStart = 0;
const SHIFT_THRESHOLD = 150; // Cursor must move >150px away from current station
const SHIFT_SUSTAIN_MS = 2200; // Must stay in new area for 2.2s before moving
let microPauseUntil = 0;
let distanceWalkedInLeg = 0;
let lastGazeAdjust = 0;

/**
 * Comfortable vantage point beside the active typing / work area.
 * Keeps an intermediate, comfortable distance (~110-130px laterally, ~20px vertically).
 * Never on top of the cursor or text, never too far away.
 */
function postWatch(): Pt {
  if (cursorAt < 0) return postIsland();
  const k = islandRect();
  const b = screenRect();

  // Try placing to the right first; if not enough room, place to the left
  const rightSpace = b.x1 - (cursorPos.x + 110 + PAL_W);
  const leftSpace = cursorPos.x - 110 - PAL_W - b.x0;

  let targetX = 0;
  if (rightSpace >= 0 && (rightSpace >= leftSpace || leftSpace < 0)) {
    targetX = cursorPos.x + 110;
  } else if (leftSpace >= 0) {
    targetX = cursorPos.x - 110 - PAL_W;
  } else {
    targetX = rightSpace >= leftSpace ? cursorPos.x + 80 : cursorPos.x - 80 - PAL_W;
  }

  // Vertical placement: line of sight slightly above or level with work area (-30px)
  let targetY = cursorPos.y - 30;

  const spot = clampTo({ x: targetX, y: targetY });
  // Never stand in the Island's keep-out band
  if (standsInBand(spot.x, spot.y)) {
    spot.y = Math.max(spot.y, k.y1 + 8);
  }
  return spot;
}

/** The quiet tour: resting vantage points when no activity is detected for a long time. */
function tourPosts(): Pt[] {
  const b = screenRect();
  return [
    clampTo({ x: b.x1 - 24, y: b.y1 - 10 }),
    clampTo({ x: screenInfo.x + (screenInfo.width - PAL_W) * 0.82, y: b.y0 + 8 }),
    clampTo({ x: b.x0 + 24, y: b.y1 - 10 }),
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
  if (hovered) return; // pointer on the pal: stay put for the click
  if (now < microPauseUntil) return; // natural micro-pause during walk

  const notable = NOTABLE.has(lastState) || now < escortUntil;
  const watching = cursorAt >= 0 && now - cursorAt < WATCH_STILL_MS;
  const next: Rule = notable ? "report" : watching ? "watch" : "tour";

  if (next !== rule) {
    rule = next;
    legs = [];
    currentVelocity = 0;
    idleUntil = 0;
    routedTo = null;
    stationCursor = { x: -9999, y: -9999 };
    stationShiftStart = 0;
    if (next === "tour") tourAt = now;
  }

  // If in watch mode and stationed, allow occasional contextual observations
  if (rule === "watch" && !legs.length && now >= idleUntil) {
    if (now - lastObservationTime > OBSERVATION_INTERVAL_MS && Math.random() < 0.4) {
      void triggerContextualObservation(now);
    }
  }

  // Micro adjustments while observing: subtle blink or gentle reaction
  if (rule === "watch" && !legs.length && now - lastGazeAdjust > 8000) {
    lastGazeAdjust = now;
    if (Math.random() < 0.35) {
      if (pal) pal.blink();
      engine.blink();
    }
  }

  if (now < idleUntil) return;

  // Where it should be standing now
  let target: Pt | null = null;
  if (rule === "report") {
    target = postIsland();
    eyeTo = { x: screenInfo.x + screenInfo.width / 2, y: screenInfo.y + PANEL_H / 2 };
  } else if (rule === "watch") {
    eyeTo = cursorAt >= 0 ? cursorPos : null;
    const distFromStation = Math.hypot(cursorPos.x - stationCursor.x, cursorPos.y - stationCursor.y);
    if (stationCursor.x === -9999 || distFromStation > SHIFT_THRESHOLD) {
      // Activity moved to a noticeably different screen area (>150px away)
      if (stationShiftStart === 0) {
        stationShiftStart = now;
      } else if (now - stationShiftStart >= SHIFT_SUSTAIN_MS) {
        // Sustained activity in new area: update station and route
        stationCursor = { ...cursorPos };
        stationShiftStart = 0;
        target = postWatch();
      }
    } else {
      // User is continuing work within the same regional station: stay comfortably still!
      stationShiftStart = 0;
    }
  } else {
    eyeTo = null;
    if (!legs.length && now >= tourAt) {
      const spots = tourPosts();
      tourIndex = (tourIndex + 1) % spots.length;
      target = spots[tourIndex];
    }
  }

  if (target) {
    const follow = rule === "watch" ? 140 : ROUTE_EPS;
    const drift = routedTo
      ? Math.hypot(target.x - routedTo.x, target.y - routedTo.y)
      : Number.POSITIVE_INFINITY;
    const needWalk = !legs.length && Math.hypot(target.x - x, target.y - y) > follow;
    if (drift > follow || needWalk) {
      legs = routeTo(target.x, target.y);
      routedTo = { ...target };
      currentVelocity = 0;
      distanceWalkedInLeg = 0;
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

    // Smooth acceleration and deceleration curve
    const maxSpeed = walkSpeed;
    const targetVel = dist < 50 ? Math.max(16, maxSpeed * (dist / 50)) : maxSpeed;
    if (currentVelocity < targetVel) {
      currentVelocity = Math.min(targetVel, currentVelocity + ACCEL * dt);
    } else {
      currentVelocity = Math.max(targetVel, currentVelocity - ACCEL * dt);
    }

    const stride = Math.min(dist, currentVelocity * dt);
    x += (dx / dist) * stride;
    y += (dy / dist) * stride;

    // Organic micro-pause during longer walks
    distanceWalkedInLeg += stride;
    if (distanceWalkedInLeg > 220 && dist > 70 && Math.random() < 0.2) {
      distanceWalkedInLeg = 0;
      microPauseUntil = now + 420;
      currentVelocity = 0;
      if (pal) pal.lookAt(0, 0);
    }
  }

  if (Math.abs(t.x - x) <= SETTLE && Math.abs(t.y - y) <= SETTLE) {
    x = t.x;
    y = t.y;
    legs.shift();
    currentVelocity = 0;
    distanceWalkedInLeg = 0;
    if (!legs.length) {
      // Arrived at destination!
      if (rule === "watch") {
        // Stationed observing for 16-28 seconds
        idleUntil = now + 16000 + Math.random() * 12000;
        void triggerContextualObservation(now);
      } else if (rule === "tour") {
        // Quiet resting station for 28-50 seconds
        idleUntil = now + IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);
        tourAt = idleUntil;
      }
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
  if (y <= screenRect().y0 + 16) {
    // Pousado no topo da tela: olha para baixo acompanhando a tela e o que digitamos
    const gx = Math.max(-0.6, Math.min(0.6, (cursorPos.x - (x + PAL_W / 2)) / 300));
    pal.lookAt(gx, 0.85);
    return;
  }
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
  const wasRunning = running;
  running = on;
  if (on) {
    lastT = performance.now();
    raf = requestAnimationFrame(tick);
    if (!wasRunning) onPalSummoned();
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
    el.style.top = `${Math.round(PAL_H / 2 - DP_SIZE * 0.65)}px`;
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
      setCard(false);
      if (thoughtEl && thoughtTextEl) {
        thoughtTextEl.textContent = "📸 Tirando print e analisando a tela...";
        thoughtEl.hidden = false;
        Sound.play("attach");
        if (pal) void pal.emote("wide");
        window.setTimeout(() => {
          if (thoughtEl) thoughtEl.hidden = true;
        }, 3200);
      }
      callPal(action);
      return;
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
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "8" || e.code === "Digit8")) {
      e.preventDefault();
      callPal("pause");
    }
  });

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
