// Plan usage in the island: Claude, Codex and Gemini rate limit pills and cards.
// Displays 5-hour, 7-day and daily windows and reset countdowns.

import { Bridge } from "../core/bridge";
import {
  PLAN_TEXT, claudeSubtitle, codexIsStale, codexResetsLabel, codexSubtitle, dominantPct,
  effectivePct, getGeminiPlanUsage, geminiSubtitle, parseCodexPlan, pillLabel, planColor, resetLabel,
  type CodexPlanUsage, type GeminiPlanUsage, type PlanUsage, type PlanWindow,
} from "../core/plan";
import { State } from "../core/state";
import { clear, dot, h, svg } from "./dom";
import { ICONS } from "./icons";

/** The Claude pill is in the header: overview, turned on, relay in. */
export function claudePillVisible(): boolean {
  const s = State.settings;
  return State.view === "overview" && s.showPlanInNotch && s.planRelayInstalled;
}

/** The Codex pill is in the header: overview, turned on (nothing to install). */
export function codexPillVisible(): boolean {
  return State.view === "overview" && State.settings.showCodexPlanInNotch;
}

/** The Gemini pill is in the header: overview, turned on. */
export function geminiPillVisible(): boolean {
  return State.view === "overview" && State.settings.showGeminiPlanInNotch;
}

/** A plan card is open and its pill is still there. */
export function planCardOpen(): boolean {
  if (!State.showingPlanDetail) return false;
  if (State.planDetailKind === "gemini") return geminiPillVisible();
  if (State.planDetailKind === "codex") return codexPillVisible();
  return claudePillVisible();
}

const claudeColor = (now = Date.now()) => planColor(dominantPct(State.planUsage, now));
const codexColor = (now = Date.now()) => planColor(dominantPct(State.codexPlanUsage, now));
const geminiColor = (now = Date.now()) => planColor(dominantPct(getGeminiPlanUsage(now), now));

/** The colour of the open card's plan. */
export function openPlanColor(): string {
  if (State.planDetailKind === "gemini") return geminiColor();
  if (State.planDetailKind === "codex") return codexColor();
  return claudeColor();
}

/** Closes the plan card (view, mode or focus changed). */
export function closePlanCard(): void {
  State.showingPlanDetail = false;
}

// ── Claude numbers ────────────────────────────────────────────────────────────

const STORE_KEY = "powpow.claudePlanUsage";

export function setClaudePlanUsage(usage: PlanUsage): void {
  const prev = State.planUsage;
  const same = JSON.stringify([prev?.fiveHour, prev?.sevenDay]) === JSON.stringify([usage.fiveHour, usage.sevenDay]);
  State.planUsage = usage;
  if (!same) {
    try {
      window.localStorage?.setItem(STORE_KEY, JSON.stringify(usage));
    } catch {
      // Storage off or full
    }
  }
  if (!same || State.mode === "expanded") State.notify();
}

export function storedClaudePlanUsage(): string | null {
  try {
    return window.localStorage?.getItem(STORE_KEY) ?? null;
  } catch {
    return null;
  }
}

// ── Codex numbers ─────────────────────────────────────────────────────────────

let codexInFlight = false;

export function refreshCodexPlanUsage(): void {
  if (codexInFlight || State.paused || !codexIsStale(State.codexPlanUsage)) return;
  codexInFlight = true;
  void Bridge.codexPlanUsage()
    .then((result) => {
      const usage = parseCodexPlan(result);
      if (usage) {
        State.codexPlanUsage = usage;
        State.notify();
      }
    })
    .finally(() => {
      codexInFlight = false;
    });
}

// ── Pill ──────────────────────────────────────────────────────────────────────

export type PlanKind = "claude" | "codex" | "gemini";

export interface PlanPill {
  el: HTMLElement;
  sync(): void;
}

export function buildPlanPill(kind: PlanKind | boolean): PlanPill {
  const planKind: PlanKind = typeof kind === "boolean" ? (kind ? "codex" : "claude") : kind;
  const label = h("span", { class: "plan-pill-label" });
  const dotEl = h("i", { class: "plan-pill-dot" });
  const isOpen = () => State.showingPlanDetail && State.planDetailKind === planKind;
  const pillTitle = planKind === "gemini"
    ? PLAN_TEXT.geminiPillTitle
    : planKind === "codex"
    ? PLAN_TEXT.codexPillTitle
    : PLAN_TEXT.claudePillTitle;
  const el = h("button", {
    class: "plan-pill",
    title: pillTitle,
    onclick: () => {
      const open = isOpen();
      State.planDetailKind = planKind;
      State.planDetailIsCodex = planKind === "codex";
      State.showingPlanDetail = !open;
      if (planKind === "codex") refreshCodexPlanUsage();
      State.notify();
    },
  }, dotEl, label);
  return {
    el,
    sync() {
      const color = planKind === "gemini" ? geminiColor() : planKind === "codex" ? codexColor() : claudeColor();
      el.style.setProperty("--plan", color);
      el.classList.toggle("active", isOpen());
      dotEl.style.background = color;
      if (planKind === "gemini") {
        const u = getGeminiPlanUsage();
        const prov = u.provider || (
          State.settings.chatProvider === "openrouter" ? "OpenRouter" :
          State.settings.chatProvider === "orcarouter" ? "OrcaRouter" :
          State.settings.chatProvider === "tokenrouter" ? "TokenRouter" :
          State.settings.chatProvider === "claude" ? "Claude" : "Gemini"
        );
        label.textContent = pillLabel(prov, u);
      } else if (planKind === "codex") {
        label.textContent = pillLabel("Codex", State.codexPlanUsage);
      } else {
        label.textContent = pillLabel("Claude", State.planUsage);
      }
    },
  };
}

// ── Card ──────────────────────────────────────────────────────────────────────

function gaugeRow(label: string, w: PlanWindow | undefined, weekly: boolean, now: number): HTMLElement {
  const row = h("div", { class: "plan-row" }, h("span", { class: "plan-label", text: label }));
  if (!w) {
    row.append(h("span", { class: "plan-none", text: PLAN_TEXT.none }));
    return row;
  }
  const pct = effectivePct(w, now);
  const fill = h("i", { class: "plan-fill" });
  fill.style.width = `${pct}%`;
  fill.style.background = planColor(pct);
  row.append(
    h("span", { class: "plan-bar" }, fill),
    h("span", { class: "plan-pct", text: `${Math.round(pct)}%` }),
    h("span", { class: "plan-reset-icon" }, svg(ICONS.arrowClockwise, 8, { stroke: 2.6 })),
    h("span", { class: "plan-reset", text: resetLabel(w, weekly, now) }),
  );
  return row;
}

function head(color: string, title: string, subtitle: string): HTMLElement {
  return h("div", { class: "plan-head" },
    dot(color, 7),
    h("span", { class: "plan-title", text: title }),
    h("span", { class: "plan-sub", text: subtitle }),
  );
}

export class PlanCard {
  readonly el = h("div", { class: "plan-card" });
  private key = "";

  sync(now = Date.now()) {
    const kind = State.planDetailKind;
    let u: PlanUsage | null = null;
    if (kind === "gemini") u = getGeminiPlanUsage(now);
    else if (kind === "codex") u = State.codexPlanUsage;
    else u = State.planUsage;

    const key = `${kind}|${JSON.stringify(u)}|${Math.floor(now / 30_000)}`;
    if (key === this.key) return;
    this.key = key;
    clear(this.el);
    if (kind === "gemini") this.drawGemini(u as GeminiPlanUsage, now);
    else if (kind === "codex") this.drawCodex(State.codexPlanUsage, now);
    else this.drawClaude(State.planUsage, now);
  }

  private drawClaude(u: PlanUsage | null, now: number) {
    this.el.append(
      head(claudeColor(now), PLAN_TEXT.claudeTitle, claudeSubtitle(u, now)),
      h("div", { class: "plan-rows" },
        gaugeRow(PLAN_TEXT.fiveHours, u?.fiveHour, false, now),
        gaugeRow(PLAN_TEXT.week, u?.sevenDay, true, now),
      ),
    );
  }

  private drawCodex(u: CodexPlanUsage | null, now: number) {
    const rows = h("div", { class: "plan-rows" });
    if (u?.fiveHour) rows.append(gaugeRow(PLAN_TEXT.fiveHours, u.fiveHour, false, now));
    rows.append(
      gaugeRow(PLAN_TEXT.week, u?.sevenDay, true, now),
      h("div", { class: "plan-row" },
        h("span", { class: "plan-label", text: PLAN_TEXT.resets }),
        h("span", { class: "plan-credits", text: codexResetsLabel(u) }),
      ),
    );
    this.el.append(head(codexColor(now), PLAN_TEXT.codexTitle, codexSubtitle(u, now)), rows);
  }

  private drawGemini(u: GeminiPlanUsage | null, now: number) {
    const rows = h("div", { class: "plan-rows" });
    const prov = u?.provider || (
      State.settings.chatProvider === "openrouter" ? "OpenRouter" :
      State.settings.chatProvider === "orcarouter" ? "OrcaRouter" :
      State.settings.chatProvider === "tokenrouter" ? "TokenRouter" :
      State.settings.chatProvider === "claude" ? "Claude" : "Gemini"
    );
    const model = u?.model || State.settings.geminiModel || "gemini-2.5-flash";
    const lastTot = u?.totalTokens ?? 0;
    const inTok = u?.inputTokens ?? 0;
    const outTok = u?.outputTokens ?? 0;
    const sessTot = u?.sessionTokens ?? 0;
    const reqCount = u?.requestsCount ?? 0;
    const tokenFmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

    rows.append(
      h("div", { class: "plan-row" },
        h("span", { class: "plan-label", text: "Última Resposta" }),
        h("span", { class: "plan-credits", text: lastTot > 0 ? `${tokenFmt(lastTot)} tok (${tokenFmt(inTok)} in / ${tokenFmt(outTok)} out)` : "Aguardando consulta" }),
      ),
      h("div", { class: "plan-row" },
        h("span", { class: "plan-label", text: "Total da Sessão" }),
        h("span", { class: "plan-credits", text: `${tokenFmt(sessTot)} tokens (${reqCount} reqs)` }),
      ),
      gaugeRow("Cota / Janela", u?.fiveHour, false, now),
      gaugeRow(PLAN_TEXT.dailyQuota, u?.rpd ?? u?.sevenDay, true, now),
    );
    this.el.append(head(geminiColor(now), `${prov} · ${model}`, geminiSubtitle(u, now)), rows);
  }
}
