// Productivity Suite: Pomodoro Timer, Quick Math/Unit Converter, and Daily Recap logger.

import { Sound } from "./sound";

// ── 1. Pomodoro Timer ────────────────────────────────────────────────────────

export type PomodoroMode = "focus" | "shortBreak" | "longBreak";

export interface PomodoroState {
  mode: PomodoroMode;
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  completedCycles: number;
}

const POMODORO_TIMES: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

class PomodoroManager {
  private mode: PomodoroMode = "focus";
  private isRunning: boolean = false;
  private remainingSeconds: number = POMODORO_TIMES.focus;
  private totalSeconds: number = POMODORO_TIMES.focus;
  private completedCycles: number = 0;
  private timer: number | null = null;
  private listeners: Set<(s: PomodoroState) => void> = new Set();

  getState(): PomodoroState {
    return {
      mode: this.mode,
      isRunning: this.isRunning,
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      completedCycles: this.completedCycles,
    };
  }

  subscribe(fn: (s: PomodoroState) => void): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  private notify() {
    const s = this.getState();
    for (const l of this.listeners) {
      try {
        l(s);
      } catch (err) {
        console.error("[pomodoro] listener error", err);
      }
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    Sound.play("start");
    this.notify();

    this.timer = window.setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.notify();
      } else {
        this.onFinish();
      }
    }, 1000);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    Sound.play("blip");
    this.notify();
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  reset() {
    this.pause();
    this.remainingSeconds = POMODORO_TIMES[this.mode];
    this.totalSeconds = this.remainingSeconds;
    this.notify();
  }

  setMode(m: PomodoroMode) {
    this.pause();
    this.mode = m;
    this.remainingSeconds = POMODORO_TIMES[m];
    this.totalSeconds = this.remainingSeconds;
    this.notify();
  }

  private onFinish() {
    this.pause();
    Sound.play("finish");

    if (this.mode === "focus") {
      this.completedCycles++;
      DailyRecap.log("pomodoro", `Ciclo de foco #${this.completedCycles} concluído (25 min)`);

      if (this.completedCycles % 4 === 0) {
        this.setMode("longBreak");
      } else {
        this.setMode("shortBreak");
      }
    } else {
      this.setMode("focus");
    }

    // Dispatch custom event for mascot reaction and notifications
    window.dispatchEvent(
      new CustomEvent("powpow-pomodoro-finished", {
        detail: {
          cycles: this.completedCycles,
          nextMode: this.mode,
        },
      }),
    );
  }

  formatTime(): string {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
}

export const Pomodoro = new PomodoroManager();

// ── 2. Quick Math & Unit Converter ──────────────────────────────────────────

export interface MathEvalResult {
  isExpression: boolean;
  result: string;
  expression: string;
  type: "math" | "currency" | "unit" | "percentage";
}

export function evaluateQuickMathOrUnit(input: string): MathEvalResult | null {
  const raw = input.trim();
  if (!raw || raw.length > 100) return null;

  // Percentage calculations like "15% de 800" or "20% of 1500"
  const pctMatch = raw.match(/^(\d+(?:[.,]\d+)?)\s*%\s*(?:de|of)\s*(\d+(?:[.,]\d+)?)$/i);
  if (pctMatch) {
    const p = parseFloat(pctMatch[1].replace(",", "."));
    const v = parseFloat(pctMatch[2].replace(",", "."));
    const res = (p / 100) * v;
    return {
      isExpression: true,
      expression: `${p}% de ${v}`,
      result: Number.isInteger(res) ? res.toString() : res.toFixed(2),
      type: "percentage",
    };
  }

  // Unit conversions (distance, weight, storage, temp, time)
  const unitMatch = raw.match(
    /^(\d+(?:[.,]\d+)?)\s*([a-zA-ZçÇº°]+)\s*(?:para|em|to|in|=)\s*([a-zA-ZçÇº°]+)$/i,
  );
  if (unitMatch) {
    const val = parseFloat(unitMatch[1].replace(",", "."));
    const from = unitMatch[2].toLowerCase();
    const to = unitMatch[3].toLowerCase();

    // Km <-> Miles
    if (from === "km" && (to === "milhas" || to === "mi")) {
      return {
        isExpression: true,
        expression: raw,
        result: `${(val * 0.621371).toFixed(2)} milhas`,
        type: "unit",
      };
    }
    if ((from === "milhas" || from === "mi") && to === "km") {
      return {
        isExpression: true,
        expression: raw,
        result: `${(val * 1.60934).toFixed(2)} km`,
        type: "unit",
      };
    }

    // Kg <-> Libras (lbs)
    if (from === "kg" && (to === "libras" || to === "lbs" || to === "lb")) {
      return {
        isExpression: true,
        expression: raw,
        result: `${(val * 2.20462).toFixed(2)} lbs`,
        type: "unit",
      };
    }
    if ((from === "libras" || from === "lbs" || from === "lb") && to === "kg") {
      return {
        isExpression: true,
        expression: raw,
        result: `${(val * 0.453592).toFixed(2)} kg`,
        type: "unit",
      };
    }

    // Celsius <-> Fahrenheit
    if ((from === "c" || from === "°c" || from === "celsius") && (to === "f" || to === "°f" || to === "fahrenheit")) {
      return {
        isExpression: true,
        expression: raw,
        result: `${((val * 9) / 5 + 32).toFixed(1)} °F`,
        type: "unit",
      };
    }
    if ((from === "f" || from === "°f" || from === "fahrenheit") && (to === "c" || to === "°c" || to === "celsius")) {
      return {
        isExpression: true,
        expression: raw,
        result: `${(((val - 32) * 5) / 9).toFixed(1)} °C`,
        type: "unit",
      };
    }

    // Storage: MB <-> GB, GB <-> TB
    if (from === "mb" && to === "gb") {
      return { isExpression: true, expression: raw, result: `${(val / 1024).toFixed(2)} GB`, type: "unit" };
    }
    if (from === "gb" && to === "mb") {
      return { isExpression: true, expression: raw, result: `${(val * 1024).toFixed(0)} MB`, type: "unit" };
    }
    if (from === "gb" && to === "tb") {
      return { isExpression: true, expression: raw, result: `${(val / 1024).toFixed(2)} TB`, type: "unit" };
    }
    if (from === "tb" && to === "gb") {
      return { isExpression: true, expression: raw, result: `${(val * 1024).toFixed(0)} GB`, type: "unit" };
    }

    // Currency quick estimate (USD/EUR to BRL approximations or vice-versa)
    if (from === "usd" && (to === "brl" || to === "reais")) {
      const rate = 5.50; // estimated exchange rate
      return { isExpression: true, expression: raw, result: `R$ ${(val * rate).toFixed(2)} (est.)`, type: "currency" };
    }
    if (from === "eur" && (to === "brl" || to === "reais")) {
      const rate = 6.00;
      return { isExpression: true, expression: raw, result: `R$ ${(val * rate).toFixed(2)} (est.)`, type: "currency" };
    }
  }

  // Pure mathematical expressions: numbers and operators only
  // E.g., "120 * 1.15", "(400 + 250) / 2", "2^8", "sqrt(144)"
  const cleanMath = raw.replace(/,/g, ".").replace(/\s+/g, "");
  // Check if expression contains only valid math chars and at least one operator
  if (/^[0-9+\-*/().^%]+$/.test(cleanMath) && /[+\-*/^%]/.test(cleanMath)) {
    try {
      // Replace ^ with ** for JS eval
      const sanitized = cleanMath.replace(/\^/g, "**");
      // Prevent arbitrary code injection using Function with strict math grammar
      if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) return null;
      const calc = new Function(`return (${sanitized});`)();
      if (typeof calc === "number" && Number.isFinite(calc)) {
        const formatted = Number.isInteger(calc) ? calc.toString() : calc.toFixed(4).replace(/\.?0+$/, "");
        return {
          isExpression: true,
          expression: raw,
          result: formatted,
          type: "math",
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

// ── 3. Daily Recap / "O que eu fiz hoje?" ────────────────────────────────────

export interface DailyActivityItem {
  id: string;
  timestamp: number;
  category: "pomodoro" | "document" | "window" | "task" | "note";
  text: string;
}

class DailyRecapLogger {
  private items: DailyActivityItem[] = [];
  private dateKey: string = "";

  constructor() {
    this.checkDay();
    this.load();
  }

  private checkDay() {
    const today = new Date().toISOString().split("T")[0];
    if (this.dateKey !== today) {
      this.dateKey = today;
      this.load();
    }
  }

  private load() {
    try {
      const raw = localStorage.getItem(`powpow_recap_${this.dateKey}`);
      if (raw) {
        this.items = JSON.parse(raw);
      } else {
        this.items = [];
      }
    } catch {
      this.items = [];
    }
  }

  private save() {
    try {
      localStorage.setItem(`powpow_recap_${this.dateKey}`, JSON.stringify(this.items));
    } catch {
      // ignore
    }
  }

  log(category: DailyActivityItem["category"], text: string) {
    this.checkDay();
    const item: DailyActivityItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      category,
      text,
    };
    this.items.unshift(item);
    if (this.items.length > 50) this.items.pop();
    this.save();
  }

  getItems(): DailyActivityItem[] {
    this.checkDay();
    return [...this.items];
  }

  generateStandupMarkdown(): string {
    this.checkDay();
    const todayFormatted = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const pomodoros = this.items.filter((i) => i.category === "pomodoro");
    const docs = this.items.filter((i) => i.category === "document");
    const tasks = this.items.filter((i) => i.category === "task");
    const general = this.items.filter((i) => i.category === "window" || i.category === "note");

    const lines: string[] = [];
    lines.push(`📋 *Resumo de Atividades do Dia* (${todayFormatted})`);
    lines.push("");

    if (pomodoros.length > 0) {
      lines.push(`🍅 *Foco & Produtividade:*`);
      lines.push(`• ${pomodoros.length} ciclos de foco Pomodoro concluídos (~${pomodoros.length * 25} min)`);
    }

    if (docs.length > 0) {
      lines.push(`📄 *Documentos & Arquivos Trabalhados:*`);
      for (const d of docs.slice(0, 5)) {
        lines.push(`• ${d.text}`);
      }
    }

    if (tasks.length > 0) {
      lines.push(`✅ *Entregas & Tarefas Realizadas:*`);
      for (const t of tasks) {
        lines.push(`• ${t.text}`);
      }
    }

    if (general.length > 0 && tasks.length === 0 && docs.length === 0) {
      lines.push(`📌 *Principais Frentes:*`);
      for (const g of general.slice(0, 5)) {
        lines.push(`• ${g.text}`);
      }
    }

    if (lines.length <= 2) {
      lines.push("• Atividades e reuniões rotineiras concluídas no sistema.");
    }

    lines.push("");
    lines.push(`_Gerado pelo Powpow Assistente_ ✨`);
    return lines.join("\n");
  }
}

export const DailyRecap = new DailyRecapLogger();
