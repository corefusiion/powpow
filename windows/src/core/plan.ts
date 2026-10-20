// Plan usage gauges — Claude and Codex usage tracking.
// Numbers and limits displayed in the island header and card.

export interface PlanWindow {
  /** 0–100, clamped. */
  usedPct: number;
  /** Epoch milliseconds. */
  resetsAt: number;
}

export interface PlanUsage {
  fiveHour?: PlanWindow;
  sevenDay?: PlanWindow;
  /** When the numbers arrived (epoch ms). */
  updatedAt: number;
}

export interface CodexPlanUsage extends PlanUsage {
  /** Free full resets available. */
  resetCredits?: number;
  /** Soonest expiry among the available ones (epoch ms). */
  resetCreditExpiresAt?: number;
  planType?: string;
}

export interface GeminiPlanUsage extends PlanUsage {
  planType?: string;
  tier?: string;
  provider?: string;
  model?: string;
  rpm?: PlanWindow;
  rpd?: PlanWindow;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  sessionTokens?: number;
  requestsCount?: number;
  contextWindow?: number;
}

import { t } from "./i18n";
import { State } from "./state";

const DAY_MS = 86_400_000;

export const PLAN_TEXT = {
  get claudeTitle() { return t("Claude plan"); },
  get codexTitle() { return t("Codex plan"); },
  get geminiTitle() { return t("Gemini plan"); },
  get claudePillTitle() { return t("Claude plan usage"); },
  get codexPillTitle() { return t("Codex plan usage"); },
  get geminiPillTitle() { return t("Gemini plan usage"); },
  get waiting() { return t("Waiting for a response from Claude Code"); },
  get askingCodex() { return t("Asking Codex…"); },
  get askingGemini() { return t("Checking Gemini quota…"); },
  get dailyQuota() { return t("Daily quota"); },
  get requestsPerMin() { return t("Requests / min"); },
  get justNow() { return t("just now"); },
  minAgo: (n: number) => t("{n} min ago", { n }),
  hAgo: (n: number) => t("{n} h ago", { n }),
  get fiveHours() { return t("5 hours"); },
  get week() { return t("Week"); },
  get resets() { return t("Resets"); },
  get resetting() { return t("Resetting…"); },
  inHM: (h: number, m: number) => t("in {h} h {m}", { h, m }),
  inM: (m: number) => t("in {m} min", { m }),
  available: (n: number) => t("{n} available", { n }),
  until: (date: string) => t(" · until {date}", { date }),
  none: "—",
};

export function weekdayShort(day: number): string {
  const d = new Date(Date.UTC(2024, 0, 7 + day));
  const locale = State.settings.language === "pt-BR" ? "pt-BR" : "en-US";
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
}

export function dayMonth(month: number, day: number): string {
  const d = new Date(Date.UTC(2024, month, day));
  const locale = State.settings.language === "pt-BR" ? "pt-BR" : "en-US";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d);
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const asObj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

// ── Claude ────────────────────────────────────────────────────────────────────

function parseClaudeWindow(raw: unknown, now: number): PlanWindow | undefined {
  const w = asObj(raw);
  const pct = w?.used_percentage;
  const epoch = w?.resets_at;
  if (!isNum(pct) || !isNum(epoch)) return undefined;
  if (pct < 0 || pct > 200) return undefined;
  if (epoch <= 0 || epoch * 1000 > now + 400 * DAY_MS) return undefined;
  return { usedPct: Math.min(100, pct), resetsAt: epoch * 1000 };
}

export function parseClaudePlan(rateLimits: unknown, now = Date.now()): PlanUsage | null {
  const rl = asObj(rateLimits);
  const fiveHour = parseClaudeWindow(rl?.five_hour, now);
  const sevenDay = parseClaudeWindow(rl?.seven_day, now);
  if (!fiveHour && !sevenDay) return null;
  const usage: PlanUsage = { updatedAt: now };
  if (fiveHour) usage.fiveHour = fiveHour;
  if (sevenDay) usage.sevenDay = sevenDay;
  return usage;
}

// ── Codex ─────────────────────────────────────────────────────────────────────

export function parseCodexPlan(result: unknown, now = Date.now()): CodexPlanUsage | null {
  const r = asObj(result);
  const limits = asObj(r?.rateLimits);
  if (!limits) return null;
  const usage: CodexPlanUsage = { updatedAt: now };
  if (typeof limits.planType === "string" && limits.planType) usage.planType = limits.planType;
  for (const key of ["primary", "secondary"]) {
    const w = asObj(limits[key]);
    if (!w || !isNum(w.usedPercent) || !isNum(w.resetsAt)) continue;
    const window: PlanWindow = {
      usedPct: Math.min(100, Math.max(0, w.usedPercent)),
      resetsAt: w.resetsAt * 1000,
    };
    if (Number.isInteger(w.windowDurationMins) && (w.windowDurationMins as number) <= 24 * 60) {
      usage.fiveHour = window;
    } else {
      usage.sevenDay = window;
    }
  }
  const credits = asObj(r?.rateLimitResetCredits);
  if (credits) {
    if (Number.isInteger(credits.availableCount)) usage.resetCredits = credits.availableCount as number;
    const expiries = (Array.isArray(credits.credits) ? credits.credits : [])
      .map(asObj)
      .filter((c) => c?.status === "available" && isNum(c.expiresAt))
      .map((c) => (c!.expiresAt as number) * 1000);
    if (expiries.length) usage.resetCreditExpiresAt = Math.min(...expiries);
  }
  return usage.fiveHour || usage.sevenDay ? usage : null;
}

// ── Shared ────────────────────────────────────────────────────────────────────

export const effectivePct = (w: PlanWindow, now = Date.now()): number => (w.resetsAt <= now ? 0 : w.usedPct);

export function dominantPct(u: PlanUsage | null | undefined, now = Date.now()): number | null {
  const pcts = [u?.fiveHour, u?.sevenDay].filter((w): w is PlanWindow => !!w).map((w) => effectivePct(w, now));
  return pcts.length ? Math.max(...pcts) : null;
}

export function planColor(pct: number | null): string {
  if (pct == null) return "#6B7079";
  if (pct < 50) return "#22C55E";
  if (pct < 80) return "#F59E0B";
  return "#F4505E";
}

export function pillLabel(name: "Claude" | "Codex" | "Gemini" | string, u: PlanUsage | null | undefined, now = Date.now()): string {
  const pct = dominantPct(u, now);
  return pct == null ? `${name} ${PLAN_TEXT.none}` : `${name} ${Math.round(pct)}%`;
}

export function ageLabel(updatedAt: number, now = Date.now()): string {
  const secs = (now - updatedAt) / 1000;
  if (secs < 60) return PLAN_TEXT.justNow;
  const mins = Math.floor(secs / 60);
  return mins < 60 ? PLAN_TEXT.minAgo(mins) : PLAN_TEXT.hAgo(Math.floor(mins / 60));
}

export function resetLabel(w: PlanWindow, weekly: boolean, now = Date.now()): string {
  const secs = (w.resetsAt - now) / 1000;
  if (secs <= 0) return PLAN_TEXT.resetting;
  if (weekly) {
    const d = new Date(w.resetsAt);
    return `${weekdayShort(d.getDay())} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  return hours > 0 ? PLAN_TEXT.inHM(hours, mins) : PLAN_TEXT.inM(mins);
}

export function claudeSubtitle(u: PlanUsage | null, now = Date.now()): string {
  return u ? ageLabel(u.updatedAt, now) : PLAN_TEXT.waiting;
}

export function codexSubtitle(u: CodexPlanUsage | null, now = Date.now()): string {
  if (!u) return PLAN_TEXT.askingCodex;
  return (u.planType ? `${u.planType} · ` : "") + ageLabel(u.updatedAt, now);
}

const TOKEN_USAGE_KEY = "powpow.llmTokenUsage";

interface StoredTokenStats {
  updatedAt: number;
  model: string;
  provider: string;
  lastInputTokens: number;
  lastOutputTokens: number;
  lastTotalTokens: number;
  sessionTokens: number;
  requestsCount: number;
  dayStart: number;
}

function loadTokenStats(): StoredTokenStats {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  try {
    const raw = localStorage.getItem(TOKEN_USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.sessionTokens === "number") {
        if (parsed.dayStart && parsed.dayStart === todayStart) {
          return parsed;
        }
        return {
          ...parsed,
          requestsCount: 0,
          sessionTokens: 0,
          lastTotalTokens: 0,
          lastInputTokens: 0,
          lastOutputTokens: 0,
          dayStart: todayStart,
        };
      }
    }
  } catch {}
  return {
    updatedAt: Date.now(),
    model: State.settings.geminiModel || "gemini-2.5-flash",
    provider: "Gemini",
    lastInputTokens: 0,
    lastOutputTokens: 0,
    lastTotalTokens: 0,
    sessionTokens: 0,
    requestsCount: 0,
    dayStart: todayStart,
  };
}

function saveTokenStats(s: StoredTokenStats) {
  try {
    localStorage.setItem(TOKEN_USAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function recordTokenUsage(info: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  provider?: string;
}) {
  const now = Date.now();
  const stats = loadTokenStats();

  const inTok = info.inputTokens ?? 0;
  const outTok = info.outputTokens ?? 0;
  const totTok = info.totalTokens ?? (inTok + outTok);

  stats.updatedAt = now;
  stats.lastInputTokens = inTok;
  stats.lastOutputTokens = outTok;
  stats.lastTotalTokens = totTok;
  stats.sessionTokens += totTok;
  stats.requestsCount += 1;
  if (info.model) stats.model = info.model;
  if (info.provider) stats.provider = info.provider;

  saveTokenStats(stats);
  buildUsageFromStats(stats, now);
  State.notify();
}

function buildUsageFromStats(s: StoredTokenStats, now = Date.now()): GeminiPlanUsage {
  const midnightUtc = new Date();
  midnightUtc.setUTCHours(24, 0, 0, 0);
  const oneHourLater = now + 3600_000;

  // Context window capacity: 1,000,000 for Gemini Flash, 128,000 for standard LLMs
  const isGemini = (s.provider || "").toLowerCase().includes("gemini");
  const contextWindow = isGemini ? 1_000_000 : 128_000;

  const activeTokens = s.lastTotalTokens > 0 ? s.lastTotalTokens : s.sessionTokens;
  const usedPct = activeTokens === 0 ? 0 : Math.min(100, Math.max(1, Math.round((activeTokens / contextWindow) * 100)));
  const dailyPct = Math.min(100, Math.round((s.requestsCount / 1500) * 100));

  const usage: GeminiPlanUsage = {
    updatedAt: s.updatedAt,
    model: s.model || State.settings.geminiModel || "gemini-2.5-flash",
    provider: s.provider || "Gemini",
    tier: s.provider || "Google AI",
    fiveHour: { usedPct, resetsAt: oneHourLater },
    sevenDay: { usedPct: dailyPct, resetsAt: midnightUtc.getTime() },
    rpm: { usedPct, resetsAt: now + 60_000 },
    rpd: { usedPct: dailyPct, resetsAt: midnightUtc.getTime() },
    inputTokens: s.lastInputTokens,
    outputTokens: s.lastOutputTokens,
    totalTokens: s.lastTotalTokens,
    sessionTokens: s.sessionTokens,
    requestsCount: s.requestsCount,
    contextWindow,
  };

  State.geminiPlanUsage = usage;
  return usage;
}

export function geminiSubtitle(u: GeminiPlanUsage | null, now = Date.now()): string {
  const model = u?.model || State.settings.geminiModel || "gemini-2.5-flash";
  const prov = u?.provider || "Gemini";
  if (!u) return `${prov} (${model}) · ${PLAN_TEXT.justNow}`;
  return `${prov} (${model}) · ` + ageLabel(u.updatedAt, now);
}

export function getGeminiPlanUsage(now = Date.now()): GeminiPlanUsage {
  if (State.geminiPlanUsage) return State.geminiPlanUsage;
  return buildUsageFromStats(loadTokenStats(), now);
}

export function codexResetsLabel(u: CodexPlanUsage | null): string {
  if (u?.resetCredits == null) return PLAN_TEXT.none;
  let text = PLAN_TEXT.available(u.resetCredits);
  if (u.resetCredits > 0 && u.resetCreditExpiresAt != null) {
    const d = new Date(u.resetCreditExpiresAt);
    text += PLAN_TEXT.until(dayMonth(d.getMonth(), d.getDate()));
  }
  return text;
}

export const CODEX_STALE_MS = 60_000;

export const codexIsStale = (u: CodexPlanUsage | null, now = Date.now()): boolean =>
  !u || now - u.updatedAt >= CODEX_STALE_MS;

export function restorePlanUsage(raw: string | null): PlanUsage | null {
  if (!raw) return null;
  try {
    const v = asObj(JSON.parse(raw));
    if (!v || !isNum(v.updatedAt)) return null;
    const win = (w: unknown): PlanWindow | undefined => {
      const o = asObj(w);
      return o && isNum(o.usedPct) && isNum(o.resetsAt) && o.usedPct >= 0 && o.usedPct <= 100
        ? { usedPct: o.usedPct, resetsAt: o.resetsAt }
        : undefined;
    };
    const usage: PlanUsage = { updatedAt: v.updatedAt };
    const fh = win(v.fiveHour);
    const sd = win(v.sevenDay);
    if (fh) usage.fiveHour = fh;
    if (sd) usage.sevenDay = sd;
    return fh || sd ? usage : null;
  } catch {
    return null;
  }
}
