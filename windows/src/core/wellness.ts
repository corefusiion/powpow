// Metric-Driven Proactive Wellness & Ergonomics Suite.
// Monitors user productivity, active screen time, and continuous typing engagement
// to proactively recommend 5-minute hydration/movement breaks and anti-fatigue pauses.

import { Sound } from "./sound";
import { DailyRecap } from "./productivity";

export interface WellnessSettings {
  continuousWorkLimitMinutes: number; // e.g. 50 min of continuous typing/work before reminder
  eyeRestIntervalMinutes: number; // 20-20-20 rule
  workdayEndHour: number; // e.g. 18 for 18:00
  workdayEndMinute: number;
  antiBurnoutEnabled: boolean;
}

export interface WellnessState {
  continuousActiveMinutes: number;
  totalActiveMinutesToday: number;
  breaksTakenToday: number;
  activeAppName: string;
  isEyeRestActive: boolean;
  eyeRestSecondsLeft: number;
  isWorkdayEnded: boolean;
  activeStretchStep: number | null; // null or 0, 1, 2 (each 10s)
  stretchSecondsLeft: number;
  lastReminderMessage: string;
}

const DEFAULT_SETTINGS: WellnessSettings = {
  continuousWorkLimitMinutes: 45,
  eyeRestIntervalMinutes: 25,
  workdayEndHour: 18,
  workdayEndMinute: 0,
  antiBurnoutEnabled: true,
};

class WellnessManager {
  private settings: WellnessSettings = { ...DEFAULT_SETTINGS };
  private dateKey: string = "";

  private continuousActiveSeconds: number = 0;
  private totalActiveSecondsToday: number = 0;
  private breaksTakenToday: number = 0;
  private activeAppName: string = "";
  private lastActivityTimestamp: number = Date.now();
  private lastContinuousReminderMs: number = 0;
  private lastEyeRestReminderMs: number = Date.now();
  private lastReminderMessage: string = "";

  private isEyeRestActive: boolean = false;
  private eyeRestSecondsLeft: number = 20;
  private eyeRestTimer: number | null = null;

  private activeStretchStep: number | null = null;
  private stretchSecondsLeft: number = 30;
  private stretchTimer: number | null = null;

  private isWorkdayEndedNotified: boolean = false;
  private listeners: Set<(s: WellnessState) => void> = new Set();

  constructor() {
    this.checkDate();
    this.load();
    this.startTicker();
    this.listenToUserActivity();
  }

  private checkDate() {
    const today = new Date().toISOString().split("T")[0];
    if (this.dateKey !== today) {
      this.dateKey = today;
      this.continuousActiveSeconds = 0;
      this.totalActiveSecondsToday = 0;
      this.breaksTakenToday = 0;
      this.isWorkdayEndedNotified = false;
      this.load();
    }
  }

  private load() {
    try {
      const stored = localStorage.getItem(`powpow_wellness_metrics_${this.dateKey}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.totalActiveSecondsToday = data.totalActiveSecondsToday ?? 0;
        this.breaksTakenToday = data.breaksTakenToday ?? 0;
      }
      const cfg = localStorage.getItem("powpow_wellness_config");
      if (cfg) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(cfg) };
      }
    } catch {
      // ignore
    }
  }

  private save() {
    try {
      localStorage.setItem(
        `powpow_wellness_metrics_${this.dateKey}`,
        JSON.stringify({
          totalActiveSecondsToday: this.totalActiveSecondsToday,
          breaksTakenToday: this.breaksTakenToday,
        }),
      );
      localStorage.setItem("powpow_wellness_config", JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  /** Hook window mouse & keyboard events to measure true active work engagement */
  private listenToUserActivity() {
    const onUserActive = () => {
      this.recordActivity();
    };

    window.addEventListener("pointermove", onUserActive, { passive: true });
    window.addEventListener("keydown", onUserActive, { passive: true });
    window.addEventListener("click", onUserActive, { passive: true });
  }

  public recordActivity(appName?: string) {
    const now = Date.now();
    this.lastActivityTimestamp = now;
    if (appName) this.activeAppName = appName;
  }

  private startTicker() {
    window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    const now = Date.now();
    this.checkDate();

    const timeSinceLastActivity = now - this.lastActivityTimestamp;
    const isUserCurrentlyEngaged = timeSinceLastActivity < 90000; // active in last 90s

    if (isUserCurrentlyEngaged) {
      this.continuousActiveSeconds++;
      this.totalActiveSecondsToday++;

      if (this.continuousActiveSeconds % 60 === 0) {
        this.save();
      }

      // 1. Continuous Work & Hydration Reminder (e.g. 45-50 min of nonstop work)
      const continuousMinutes = Math.floor(this.continuousActiveSeconds / 60);
      const limitMinutes = this.settings.continuousWorkLimitMinutes;

      if (continuousMinutes >= limitMinutes && now - this.lastContinuousReminderMs > limitMinutes * 60 * 1000) {
        this.lastContinuousReminderMs = now;
        this.triggerProductivityRestReminder(continuousMinutes);
      }

      // 2. 20-20-20 Eye Fatigue Reminder (e.g. 25 min of screen time)
      const eyeIntervalMs = this.settings.eyeRestIntervalMinutes * 60 * 1000;
      if (!this.isEyeRestActive && now - this.lastEyeRestReminderMs >= eyeIntervalMs) {
        this.lastEyeRestReminderMs = now;
        this.startEyeRest();
      }
    } else {
      // User has been idle for >= 4 minutes: counts as an organic break!
      if (timeSinceLastActivity >= 240000 && this.continuousActiveSeconds >= 600) {
        const breakAfterMinutes = Math.floor(this.continuousActiveSeconds / 60);
        this.breaksTakenToday++;
        this.continuousActiveSeconds = 0;
        this.save();
        DailyRecap.log("note", `☕ Pausa revigorante realizada após ${breakAfterMinutes} min de foco`);
        this.notify();
      }
    }

    // 3. Anti-Burnout / Workday End Check
    if (this.settings.antiBurnoutEnabled && !this.isWorkdayEndedNotified) {
      const d = new Date();
      if (
        d.getHours() > this.settings.workdayEndHour ||
        (d.getHours() === this.settings.workdayEndHour && d.getMinutes() >= this.settings.workdayEndMinute)
      ) {
        this.isWorkdayEndedNotified = true;
        this.triggerWorkdayEnd();
      }
    }
  }

  getState(): WellnessState {
    const d = new Date();
    const isAfterWork =
      d.getHours() > this.settings.workdayEndHour ||
      (d.getHours() === this.settings.workdayEndHour && d.getMinutes() >= this.settings.workdayEndMinute);

    return {
      continuousActiveMinutes: Math.floor(this.continuousActiveSeconds / 60),
      totalActiveMinutesToday: Math.floor(this.totalActiveSecondsToday / 60),
      breaksTakenToday: this.breaksTakenToday,
      activeAppName: this.activeAppName,
      isEyeRestActive: this.isEyeRestActive,
      eyeRestSecondsLeft: this.eyeRestSecondsLeft,
      isWorkdayEnded: isAfterWork,
      activeStretchStep: this.activeStretchStep,
      stretchSecondsLeft: this.stretchSecondsLeft,
      lastReminderMessage: this.lastReminderMessage,
    };
  }

  subscribe(fn: (s: WellnessState) => void): () => void {
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
        console.error("[wellness] listener error", err);
      }
    }
  }

  // ── Proactive Metric-Driven Reminders ──────────────────────────────────────

  private triggerProductivityRestReminder(minutesEngaged: number) {
    const appSnippet = this.activeAppName ? ` no ${this.activeAppName}` : "";
    const msg = `Você já digitou e trabalhou nos últimos ${minutesEngaged} minutos${appSnippet}! Que tal descansar 5 minutinhos, esticar as pernas e beber água? 💧`;
    this.lastReminderMessage = msg;
    this.notify();

    window.dispatchEvent(
      new CustomEvent("powpow-wellness-alert", {
        detail: {
          type: "rest_and_hydration",
          minutesEngaged,
          message: msg,
          appName: this.activeAppName,
        },
      }),
    );
  }

  startEyeRest() {
    if (this.isEyeRestActive) return;
    this.isEyeRestActive = true;
    this.eyeRestSecondsLeft = 20;
    this.notify();

    window.dispatchEvent(new CustomEvent("powpow-eye-rest-started"));

    if (this.eyeRestTimer != null) clearInterval(this.eyeRestTimer);
    this.eyeRestTimer = window.setInterval(() => {
      this.eyeRestSecondsLeft--;
      if (this.eyeRestSecondsLeft <= 0) {
        this.stopEyeRest();
      } else {
        this.notify();
      }
    }, 1000);
  }

  stopEyeRest() {
    this.isEyeRestActive = false;
    this.eyeRestSecondsLeft = 20;
    if (this.eyeRestTimer != null) {
      clearInterval(this.eyeRestTimer);
      this.eyeRestTimer = null;
    }
    this.lastEyeRestReminderMs = Date.now();
    Sound.play("finish");
    this.notify();
    window.dispatchEvent(new CustomEvent("powpow-eye-rest-completed"));
  }

  startMicroStretch() {
    if (this.activeStretchStep != null) return;
    this.activeStretchStep = 0;
    this.stretchSecondsLeft = 30;
    this.notify();

    window.dispatchEvent(new CustomEvent("powpow-stretch-started"));

    if (this.stretchTimer != null) clearInterval(this.stretchTimer);
    this.stretchTimer = window.setInterval(() => {
      this.stretchSecondsLeft--;
      // 3 steps: 0-10s (Pescoço), 10-20s (Ombros), 20-30s (Punhos)
      const elapsed = 30 - this.stretchSecondsLeft;
      if (elapsed < 10) {
        this.activeStretchStep = 0;
      } else if (elapsed < 20) {
        this.activeStretchStep = 1;
      } else if (elapsed < 30) {
        this.activeStretchStep = 2;
      } else {
        this.stopMicroStretch(true);
        return;
      }
      this.notify();
    }, 1000);
  }

  stopMicroStretch(completed: boolean = false) {
    this.activeStretchStep = null;
    this.stretchSecondsLeft = 30;
    if (this.stretchTimer != null) {
      clearInterval(this.stretchTimer);
      this.stretchTimer = null;
    }
    if (completed) {
      Sound.play("finish");
      DailyRecap.log("note", "🧘 Realizou micro-alongamento de alívio muscular (30 seg)");
    }
    this.notify();
    window.dispatchEvent(new CustomEvent("powpow-stretch-finished", { detail: { completed } }));
  }

  private triggerWorkdayEnd() {
    const totalHours = (this.totalActiveSecondsToday / 3600).toFixed(1);
    const msg = `Hora de encerrar o expediente! Você teve ~${totalHours}h de foco ativo hoje. Salve suas tarefas e bom descanso! 🌅`;
    this.lastReminderMessage = msg;
    this.notify();

    window.dispatchEvent(
      new CustomEvent("powpow-workday-end", {
        detail: {
          hour: this.settings.workdayEndHour,
          minute: this.settings.workdayEndMinute,
          totalHours,
          breaksTaken: this.breaksTakenToday,
          message: msg,
        },
      }),
    );
  }

  updateSettings(partial: Partial<WellnessSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.save();
    this.notify();
  }

  getSettings(): WellnessSettings {
    return { ...this.settings };
  }
}

export const Wellness = new WellnessManager();
