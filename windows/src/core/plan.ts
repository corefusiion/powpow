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

import { t } from "./i18n";
import { State } from "./state";

const DAY_MS = 86_400_000;

export const PLAN_TEXT = {
  get claudeTitle() { return t("Claude plan"); },
  get codexTitle() { return t("Codex plan"); },
  get claudePillTitle() { return t("Claude plan usage"); },
  get codexPillTitle() { return t("Codex plan usage"); },
  get waiting() { return t("Waiting for a response from Claude Code"); },
  get askingCodex() { return t("Asking Codex…"); },
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

export function pillLabel(name: "Claude" | "Codex", u: PlanUsage | null | undefined, now = Date.now()): string {
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
