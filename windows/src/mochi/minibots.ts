// Mini Mochis (pills + compact grid) — port of MiniBotCanvasView.
// Each canvas owns a BotEngine; the island's frame loop ticks every live one.

import { BotEngine, hexToRGB } from "./engine";
import type { AgentTask } from "../core/state";
import { SERVICE_ICONS } from "../views/icons";

interface MiniBot {
  canvas: HTMLCanvasElement;
  engine: BotEngine;
  cssSize: number;
  taskId: string;
}

const live = new Map<HTMLCanvasElement, MiniBot>();

/**
 * Standardized distinctive service avatar badge for integration services.
 * Features brand-tailored SVG emblems, luminous ambient glow, and micro-animations.
 */
export function createServiceAvatar(task: AgentTask, size: number): HTMLElement {
  const slot = document.createElement("span");
  slot.className = `service-avatar service-avatar-${task.id}`;
  slot.dataset.taskId = task.id;
  slot.style.width = `${size}px`;
  slot.style.height = `${size}px`;
  slot.style.minWidth = `${size}px`;
  slot.style.minHeight = `${size}px`;
  slot.style.borderRadius = "36%";
  slot.style.display = "inline-flex";
  slot.style.alignItems = "center";
  slot.style.justifyContent = "center";
  slot.style.position = "relative";
  slot.style.boxSizing = "border-box";
  slot.style.flexShrink = "0";
  slot.style.overflow = "hidden";

  const color = task.color || "#6366F1";
  slot.style.background = `radial-gradient(circle at 35% 25%, ${color}45 0%, ${color}1e 65%, rgba(10, 12, 18, 0.96) 100%)`;
  slot.style.border = `1px solid ${color}55`;
  slot.style.boxShadow = `0 2px 7px ${color}33, inset 0 1px 1px rgba(255, 255, 255, 0.25)`;

  const iconPath = SERVICE_ICONS[task.id] || SERVICE_ICONS.default_agent;
  const iconSize = Math.max(8, Math.round(size * 0.62));

  const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  iconSvg.setAttribute("viewBox", "0 0 24 24");
  iconSvg.setAttribute("width", String(iconSize));
  iconSvg.setAttribute("height", String(iconSize));
  iconSvg.style.display = "block";
  iconSvg.style.fill = color === "#F5F6F8" || color === "#ffffff" ? "#E2E8F0" : color;
  iconSvg.style.filter = `drop-shadow(0 1px 3px ${color}66)`;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", iconPath);
  iconSvg.append(path);
  slot.append(iconSvg);

  if (task.state === "working") {
    slot.classList.add("working");
    slot.style.boxShadow = `0 0 10px ${color}bb, inset 0 1px 2px rgba(255, 255, 255, 0.45)`;
  }

  return slot;
}

/**
 * Creates a mini service avatar or mini Mochi canvas.
 * If the task is an integration or has a service icon, it renders the modern
 * service avatar standard with crisp vector glyphs and brand aesthetics.
 */
export function createMiniBot(task: AgentTask, bodySize: number): HTMLElement {
  if (task.isIntegration || SERVICE_ICONS[task.id]) {
    return createServiceAvatar(task, bodySize);
  }

  const slot = document.createElement("span");
  slot.className = "mini";
  slot.style.width = `${bodySize}px`;
  slot.style.height = `${bodySize}px`;

  const canvas = document.createElement("canvas");
  const engineSize = bodySize / 0.6;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(engineSize * dpr);
  canvas.height = Math.round(engineSize * dpr);
  canvas.style.width = `${engineSize}px`;
  canvas.style.height = `${engineSize}px`;
  slot.append(canvas);

  const engine = new BotEngine();
  engine.isMini = true;
  engine.bodyColor = hexToRGB(task.color);
  engine.setState(task.state, true);
  if (task.emote) engine.setPermanentEmote(task.emote);
  if (task.miniEye) {
    engine.permanentEye = task.miniEye;
    engine.eyeOverride = task.miniEye;
    engine.eyeOverrideUntil = Number.POSITIVE_INFINITY;
  }

  live.set(canvas, { canvas, engine, cssSize: engineSize, taskId: task.id });
  return slot;
}

export function releaseMiniBot(canvas: HTMLCanvasElement) {
  live.delete(canvas);
}

/** Drops every canvas no longer in the document (views are rebuilt wholesale). */
export function pruneMiniBots() {
  for (const [canvas] of live) {
    if (!canvas.isConnected) live.delete(canvas);
  }
}

export function syncMiniBotStates(tasks: AgentTask[]) {
  for (const mb of live.values()) {
    const task = tasks.find((t) => t.id === mb.taskId);
    if (!task) continue;
    mb.engine.setState(task.state);
    mb.engine.bodyColor = hexToRGB(task.color);
  }

  // Also sync live states for modern service avatar badges
  for (const el of document.querySelectorAll<HTMLElement>(".service-avatar")) {
    const taskId = el.dataset.taskId;
    if (!taskId) continue;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) continue;
    const isWorking = task.state === "working";
    el.classList.toggle("working", isWorking);
    const color = task.color || "#6366F1";
    if (isWorking) {
      el.style.boxShadow = `0 0 10px ${color}bb, inset 0 1px 2px rgba(255, 255, 255, 0.45)`;
    } else {
      el.style.boxShadow = `0 2px 7px ${color}33, inset 0 1px 1px rgba(255, 255, 255, 0.25)`;
    }
  }
}

export function tickMiniBots(dt: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const mb of live.values()) {
    const ctx = mb.canvas.getContext("2d");
    if (!ctx) continue;
    mb.engine.update(dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, mb.cssSize, mb.cssSize);
    mb.engine.draw(ctx, mb.cssSize, mb.cssSize);
  }
}

export const miniBotCount = () => live.size;
