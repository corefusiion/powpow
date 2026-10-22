// Wellness & Ergonomics Suite: Hydration, 20-20-20 Eye Rest, Anti-Burnout, 30s Guided Micro-Stretch.

import { Sound } from "./sound";
import { DailyRecap } from "./productivity";

export interface WellnessSettings {
  waterIntervalMinutes: number;
  waterGoalGlasses: number;
  eyeRestIntervalMinutes: number;
  workdayEndHour: number; // e.g. 18 for 18:00
  workdayEndMinute: number;
  antiBurnoutEnabled: boolean;
}

export interface WellnessState {
  glassesDrankToday: number;
  goalGlasses: number;
  nextWaterTimeMs: number;
  nextEyeRestTimeMs: number;
  isEyeRestActive: boolean;
  eyeRestSecondsLeft: number;
  isWorkdayEnded: boolean;
  activeStretchStep: number | null; // null or 0, 1, 2 (each 10s)
  stretchSecondsLeft: number;
}

const DEFAULT_SETTINGS: WellnessSettings = {
  waterIntervalMinutes: 45,
  waterGoalGlasses: 8,
  eyeRestIntervalMinutes: 20,
  workdayEndHour: 18,
  workdayEndMinute: 0,
  antiBurnoutEnabled: true,
};

class WellnessManager {
  private settings: WellnessSettings = { ...DEFAULT_SETTINGS };
  private glassesToday: number = 0;
  private dateKey: string = "";

  private lastWaterReminderMs: number = Date.now();
  private lastEyeRestReminderMs: number = Date.now();

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
  }

  private checkDate() {
    const today = new Date().toISOString().split("T")[0];
    if (this.dateKey !== today) {
      this.dateKey = today;
      this.glassesToday = 0;
      this.isWorkdayEndedNotified = false;
      this.load();
    }
  }

  private load() {
    try {
      const stored = localStorage.getItem(`powpow_wellness_${this.dateKey}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.glassesToday = data.glassesToday ?? 0;
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
        `powpow_wellness_${this.dateKey}`,
        JSON.stringify({ glassesToday: this.glassesToday }),
      );
      localStorage.setItem("powpow_wellness_config", JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  private startTicker() {
    window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    const now = Date.now();
    this.checkDate();

    // 1. Check Hydration interval
    const waterIntervalMs = this.settings.waterIntervalMinutes * 60 * 1000;
    if (now - this.lastWaterReminderMs >= waterIntervalMs) {
      this.lastWaterReminderMs = now;
      this.triggerWaterReminder();
    }

    // 2. Check 20-20-20 Eye Rest interval
    const eyeIntervalMs = this.settings.eyeRestIntervalMinutes * 60 * 1000;
    if (!this.isEyeRestActive && now - this.lastEyeRestReminderMs >= eyeIntervalMs) {
      this.lastEyeRestReminderMs = now;
      this.startEyeRest();
    }

    // 3. Check Anti-Burnout / Workday End
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
    const waterIntervalMs = this.settings.waterIntervalMinutes * 60 * 1000;
    const eyeIntervalMs = this.settings.eyeRestIntervalMinutes * 60 * 1000;

    const d = new Date();
    const isAfterWork =
      d.getHours() > this.settings.workdayEndHour ||
      (d.getHours() === this.settings.workdayEndHour && d.getMinutes() >= this.settings.workdayEndMinute);

    return {
      glassesDrankToday: this.glassesToday,
      goalGlasses: this.settings.waterGoalGlasses,
      nextWaterTimeMs: this.lastWaterReminderMs + waterIntervalMs,
      nextEyeRestTimeMs: this.lastEyeRestReminderMs + eyeIntervalMs,
      isEyeRestActive: this.isEyeRestActive,
      eyeRestSecondsLeft: this.eyeRestSecondsLeft,
      isWorkdayEnded: isAfterWork,
      activeStretchStep: this.activeStretchStep,
      stretchSecondsLeft: this.stretchSecondsLeft,
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

  // ── Actions ───────────────────────────────────────────────────────────────

  drinkGlass() {
    this.glassesToday++;
    this.save();
    Sound.play("finish");
    DailyRecap.log("note", `💧 Bebeu 1 copo de água (${this.glassesToday}/${this.settings.waterGoalGlasses})`);
    this.notify();

    window.dispatchEvent(
      new CustomEvent("powpow-water-drank", {
        detail: { total: this.glassesToday, goal: this.settings.waterGoalGlasses },
      }),
    );
  }

  triggerWaterReminder() {
    window.dispatchEvent(
      new CustomEvent("powpow-water-reminder", {
        detail: {
          current: this.glassesToday,
          goal: this.settings.waterGoalGlasses,
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
      DailyRecap.log("note", "🧘 Realizou micro-alongamento guiado (30 seg)");
    }
    this.notify();
    window.dispatchEvent(new CustomEvent("powpow-stretch-finished", { detail: { completed } }));
  }

  triggerWorkdayEnd() {
    window.dispatchEvent(
      new CustomEvent("powpow-workday-end", {
        detail: {
          hour: this.settings.workdayEndHour,
          minute: this.settings.workdayEndMinute,
          glassesDrank: this.glassesToday,
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
