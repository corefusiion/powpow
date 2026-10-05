// Wandering: the pal strolling to random corners of the screen while the island
// sits compact. Anything that wants the user's eyes or hands (open island, the
// pointer on it, an approval waiting) parks it where it stands.

import { LogicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Bridge, IS_TAURI } from "../core/bridge";
import { PANEL_H, PANEL_W } from "../core/layout";

/** Logical px per second — a stroll, not a sprint. */
const SPEED = 60;
/** Closer than this counts as arrived. */
const SETTLE = 2;
/** Pause between two walks, ms. */
const IDLE_MIN = 900;
const IDLE_MAX = 4200;
/** Off the screen edge, and off the taskbar at the bottom. */
const PAD_X = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 64;
/** Longest frame it will act on: a resume after a stall must not leap. */
const MAX_DT = 0.1;

type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** The monitor rect in a plain browser (dev), shaped like the one `boot` gives. */
function browserRect(): Rect {
  const s = window.screen as Screen & { availLeft?: number; availTop?: number };
  return {
    x: s.availLeft ?? 0,
    y: s.availTop ?? 0,
    width: s.availWidth,
    height: s.availHeight,
  };
}

export class Walker {
  private raf: number | null = null;
  private enabled = false;
  private last = 0;
  private pos: Point | null = null;
  private target: Point | null = null;
  private nextAt = 0;
  private rect: Rect | null = null;
  private loading = false;
  private placing = false;
  /** Until the first frame Rust owns the position: it centres the window. */
  private rustMoved = true;
  /** Diagnostics: is the loop alive, and what is the last frame doing. */
  private frames = 0;
  private lastReason = "never";

  constructor(private readonly isBlocked: () => boolean) {}

  /** The island calls this whenever wandering may start or has to stop. */
  setEnabled(on: boolean) {
    if (on === this.enabled) return;
    this.enabled = on;
    if (on) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    } else if (this.raf != null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  /**
   * Rust put the window somewhere else — display change, wake from the strip,
   * screen preference. Forget our own idea of where it is: the next step would
   * otherwise snap it back to where it was, possibly off the new display.
   */
  reanchor() {
    this.rustMoved = true;
    this.rect = null;
    this.target = null;
    this.nextAt = 0;
  }

  /**
   * Where the walker believes the window is. Copies, so a snapshot taken for a
   * probe cannot be rewritten by the next frame.
   */
  get where(): {
    enabled: boolean;
    pos: Point | null;
    target: Point | null;
    rect: Rect | null;
    frames: number;
    reason: string;
    until: number;
  } {
    return {
      enabled: this.enabled,
      pos: this.pos ? { x: this.pos.x, y: this.pos.y } : null,
      target: this.target ? { x: this.target.x, y: this.target.y } : null,
      rect: this.rect ? { ...this.rect } : null,
      frames: this.frames,
      reason: this.lastReason,
      until: Math.max(0, Math.round(this.nextAt - performance.now())),
    };
  }

  private tick = (t: number) => {
    this.raf = this.enabled ? requestAnimationFrame(this.tick) : null;
    // dt is measured even while paused, so a long hover never turns into a leap.
    const dt = Math.min(MAX_DT, Math.max(0, (t - this.last) / 1000));
    this.last = t;
    this.frames++;
    if (!this.enabled) {
      this.lastReason = "disabled";
      return;
    }
    if (this.isBlocked()) {
      this.lastReason = "blocked";
      return;
    }

    if (!this.rect) {
      if (!this.loading) void this.loadRect();
      this.lastReason = "loading";
      return;
    }

    if (this.rustMoved || !this.pos) {
      // Where Rust leaves it: centred on the top edge of the monitor.
      this.pos = { x: this.rect.x + (this.rect.width - PANEL_W) / 2, y: this.rect.y };
      this.rustMoved = false;
      this.target = null;
      this.nextAt = t;
      this.lastReason = "home";
      return;
    }

    const pos = this.pos;
    if (!this.target) {
      if (t < this.nextAt) {
        this.lastReason = "idle";
        return;
      }
      this.target = this.pick();
      this.lastReason = "pick";
    }

    const dx = this.target.x - pos.x;
    const dy = this.target.y - pos.y;
    const d = Math.hypot(dx, dy);
    if (d <= SETTLE) {
      this.target = null;
      this.nextAt = t + rand(IDLE_MIN, IDLE_MAX);
      this.lastReason = "arrived";
      return;
    }

    const step = Math.min(d, SPEED * dt);
    pos.x += (dx / d) * step;
    pos.y += (dy / d) * step;
    this.clampToScreen();
    this.lastReason = "walk";
    this.place();
  };

  private pick(): Point {
    const r = this.rect!;
    const minX = r.x + PAD_X;
    const maxX = Math.max(minX, r.x + r.width - PANEL_W - PAD_X);
    const minY = r.y + PAD_TOP;
    const maxY = Math.max(minY, r.y + r.height - PANEL_H - PAD_BOTTOM);
    return { x: rand(minX, maxX), y: rand(minY, maxY) };
  }

  private clampToScreen() {
    const r = this.rect!;
    const pos = this.pos!;
    const minX = r.x + PAD_X;
    const maxX = Math.max(minX, r.x + r.width - PANEL_W - PAD_X);
    const minY = r.y + PAD_TOP;
    const maxY = Math.max(minY, r.y + r.height - PANEL_H - PAD_BOTTOM);
    pos.x = Math.min(maxX, Math.max(minX, pos.x));
    pos.y = Math.min(maxY, Math.max(minY, pos.y));
  }

  /** One move. Throttled to a single request in flight: the OS is the clock. */
  private place() {
    if (!IS_TAURI || this.placing || !this.pos) return;
    const { x, y } = this.pos;
    this.placing = true;
    void getCurrentWindow()
      .setPosition(new LogicalPosition(x, y))
      .catch(() => {
        /* moving is best-effort: a denied call must not kill the loop */
      })
      .finally(() => {
        this.placing = false;
      });
  }

  private async loadRect(): Promise<void> {
    this.loading = true;
    try {
      const boot = await Bridge.boot();
      this.rect = boot ? boot.screen : browserRect();
    } catch {
      this.rect = browserRect();
    } finally {
      this.loading = false;
    }
  }
}
