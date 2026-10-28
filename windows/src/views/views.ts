// Island views — DOM ports of IslandViewContent.swift. Paddings, font sizes,
// colours and wording are copied from the Swift views so both platforms read
// identically.

import { h, svg, clear, dot } from "./dom";
import { ICONS } from "./icons";
import { t, langBadge } from "../core/i18n";
import { Ticker } from "./ticker";
import { State, type AgentTask, type PalPersonality } from "../core/state";
import { diffIsFresh, latestDiff } from "../core/activity";
import { washRGBA, type IslandViewName, type Wash } from "../core/layout";
import { createMiniBot, pruneMiniBots } from "../mochi/minibots";
import { buildPrompt } from "./chat";
import { buildStory } from "./story";
import { diffCardKey, renderDiffCard } from "./diff";
import { buildChoose, buildUpload, buildUploading } from "./upload";
import { renderIntegrationCard, type IntegrationCardHooks } from "./integrations";
import { pillColor } from "../core/pill-colors";
import { buildPlanPill, claudePillVisible, codexPillVisible, geminiPillVisible, planCardOpen, PlanCard } from "./usage";
import { Pomodoro } from "../core/productivity";
import { SysMonitor } from "../core/sysMonitor";
import { Soundscape } from "../core/soundscape";
import { Bridge } from "../core/bridge";

export interface ViewActions {
  setView(v: IslandViewName): void;
  collapse(): void;
  /** Clears the chat, drops any attached file and goes back to overview. */
  newChat(): void;
  setFocus(id: string): void;
  openTerminal(): void;
  /** The ↗ button: opens whatever the focused pill points at. */
  openTarget(): void;
  openUrl(url: string): void;
  decide(d: "allow" | "deny" | "always"): void;
  toggleSound(): void;
  setVolume(v: number): void;
  setAutoClose(seconds: number): void;
  openSettingsWindow(): void;
  /** The Drop view's "Choose file" button — same path as a DOM drop. */
  attachFile(file: File): void;
  blip(): void;
}

export interface ViewHost {
  el: HTMLElement;
  sync(): void;
  /** Called when the view becomes active, for views with a text field. */
  focus?(): void;
  /** Called every frame while the view is on screen. */
  tick?(nowMs: number): void;
  /** Runs a prompt through the view as if typed - only the prompt view. */
  send?(query: string): Promise<void>;
  promptInit?(mode: "create-doc" | "find-files" | "ghostwriter" | "organize-desktop"): Promise<void>;
}

// ── Shared pieces ─────────────────────────────────────────────────────────────

function card(wash: Wash, ...children: (Node | string)[]): HTMLElement {
  const el = h("div", { class: wash ? "card wash" : "card" }, ...children);
  if (wash) el.style.setProperty("--wash", washRGBA(wash));
  return el;
}

function btn(
  label: string,
  kind: "primary" | "secondary",
  onClick: () => void,
  kbd?: string,
): HTMLElement {
  return h(
    "button",
    { class: `btn ${kind}`, onclick: onClick },
    h("span", { text: label }),
    kbd ? h("span", { class: "kbd", text: kbd }) : null,
  );
}

/** AgentWho — coloured dot + task name + grey label. */
function agentWho(task: AgentTask | null, label: string): HTMLElement {
  const row = h("div", { class: "who-row" });
  if (task) {
    row.append(dot(task.color, 8), h("span", { class: "n", text: task.name }));
  }
  row.append(h("span", { text: label }));
  return row;
}

function stack(padLeft: number, padRight: number, ...children: Node[]): HTMLElement {
  const el = h("div", { class: "stack" }, ...children);
  el.style.padding = `4px ${padRight}px 4px ${padLeft}px`;
  return el;
}

// ── Header ────────────────────────────────────────────────────────────────────

export function buildHeader(actions: ViewActions): ViewHost {
  const tabHome = h("button", { class: "tab", title: t("Overview"), onclick: () => go("overview") }, svg(ICONS.house, 13));
  const tabStory = h("button", { class: "tab", title: t("Story"), onclick: () => go("story") }, svg(ICONS.doc, 13));
  const tabChat = h("button", { class: "tab", title: t("Ask"), onclick: () => go("prompt") }, svg(ICONS.bubble, 13));
  const tabDrop = h("button", { class: "tab", title: t("Drop"), onclick: () => go("upload") }, svg(ICONS.plus, 13));
  const tabSettings = h("button", {
    class: "tab",
    title: t("Settings"),
    onclick: () => {
      go("settings");
      actions.openSettingsWindow();
    },
  }, svg(ICONS.gear, 13));

  const gearBtn = h("button", {
    class: "tab",
    title: t("Settings…"),
    onclick: (e: Event) => {
      e.stopPropagation();
      go("settings");
      actions.openSettingsWindow();
    },
  }, svg(ICONS.gear, 14));
  const soundBtn = h("button", { title: t("Mute"), onclick: () => actions.toggleSound() }, svg(ICONS.speakerOn, 14));
  const claudePill = buildPlanPill("claude");
  const codexPill = buildPlanPill("codex");
  const geminiPill = buildPlanPill("gemini");
  // "Running in Brazil" indicator: opens Settings where the language switches.
  const langBtn = h(
    "button",
    {
      class: "tab lang-badge",
      title: t("Language: English — switch in Settings"),
      text: langBadge(),
      onclick: () => go("settings"),
    },
  );

  function go(v: IslandViewName) {
    actions.blip();
    actions.setView(v);
  }

  const pomoPill = h("button", {
    class: "tab pomo-pill",
    title: "Pomodoro Foco Ágil",
    style: "display:none;font-weight:600;font-size:11px;color:#f87171;",
    onclick: () => {
      actions.setView("prompt");
    },
  });

  const weatherPill = h("button", {
    class: "tab weather-pill",
    title: "Clima atual",
    style: "font-weight:500;font-size:11px;color:#38bdf8;",
    onclick: () => {
      actions.setView("prompt");
    },
  });

  const resourcePill = h("span", {
    class: "tab resource-pill",
    title: "Monitor de Recursos",
    style: "font-size:10px;color:#94a3b8;cursor:default;",
  });

  const soundscapePill = h("button", {
    class: "tab soundscape-pill",
    title: "Soundscape Lo-Fi",
    style: "display:none;font-weight:600;font-size:11px;color:#c084fc;",
    onclick: () => {
      Soundscape.toggle();
    },
  });

  const el = h(
    "div",
    { id: "header" },
    h("div", { class: "tabs" }, tabHome, tabStory, tabChat, tabDrop, tabSettings),
    h(
      "div",
      { class: "header-actions" },
      pomoPill,
      soundscapePill,
      weatherPill,
      resourcePill,
      claudePill.el,
      codexPill.el,
      geminiPill.el,
      langBtn,
      gearBtn,
      soundBtn,
    ),
  );

  return {
    el,
    sync() {
      const v = State.view;
      tabHome.classList.toggle("on", v === "overview" || v === "empty");
      tabStory.classList.toggle("on", v === "story");
      tabChat.classList.toggle("on", v === "prompt");
      tabDrop.classList.toggle("on", v === "upload");
      tabSettings.classList.toggle("on", v === "settings");
      gearBtn.classList.toggle("on", v === "settings");
      clear(gearBtn);
      gearBtn.append(svg(v === "settings" ? ICONS.gearFill : ICONS.gear, 14));
      clear(soundBtn);
      soundBtn.append(svg(State.settings.soundEnabled ? ICONS.speakerOn : ICONS.speakerOff, 14));

      // Pomodoro pill sync
      const pomoState = Pomodoro.getState();
      if (pomoState.isRunning || pomoState.remainingSeconds < pomoState.totalSeconds) {
        pomoPill.style.display = "";
        pomoPill.textContent = `${pomoState.mode === "focus" ? "🍅" : "☕"} ${Pomodoro.formatTime()}`;
      } else {
        pomoPill.style.display = "none";
      }

      // Soundscape pill sync
      const sc = Soundscape.getState();
      if (sc.isPlaying) {
        soundscapePill.style.display = "";
        soundscapePill.textContent = `🎧 ${sc.currentTrack.title.slice(0, 14)}…`;
        soundscapePill.title = `Tocando: ${sc.currentTrack.title} (${sc.currentTrack.styleLabel}) — Clique para pausar`;
      } else {
        soundscapePill.style.display = "none";
      }

      // Weather pill sync
      const w = SysMonitor.getWeather();
      const weatherIcon = w.condition === "rainy" || w.condition === "storm" ? "🌧️" : w.condition === "cloudy" ? "⛅" : "☀️";
      weatherPill.textContent = `${weatherIcon} ${w.temperatureC}°`;
      weatherPill.title = `${w.city}: ${w.conditionText} (${w.temperatureC}°C)`;

      // Resource pill sync
      const stats = SysMonitor.getStats();
      if (stats.batteryLevelPercent != null) {
        resourcePill.textContent = `⚡ ${stats.memoryUsagePercent}% · 🔋 ${stats.batteryLevelPercent}%`;
      } else {
        resourcePill.textContent = `⚡ ${stats.memoryUsagePercent}% RAM`;
      }

      claudePill.el.style.display = claudePillVisible() ? "" : "none";
      if (claudePillVisible()) claudePill.sync();
      codexPill.el.style.display = codexPillVisible() ? "" : "none";
      if (codexPillVisible()) codexPill.sync();
      geminiPill.el.style.display = geminiPillVisible() ? "" : "none";
      if (geminiPillVisible()) geminiPill.sync();
      el.style.opacity = v === "confused" ? "0" : "1";
    },
  };
}

// ── Overview ──────────────────────────────────────────────────────────────────

function buildOverview(actions: ViewActions): ViewHost {
  const ticker = new Ticker();
  const who = h("div", { class: "who" });
  const tickerBody = h("div", { class: "card-body" }, who, ticker.el);
  const leftBody = h("div", { class: "left-body" });
  const jump = h(
    "button",
    { class: "icon-btn jump", title: t("Open"), onclick: () => actions.openTarget() },
    svg(ICONS.arrowUpRight, 8),
  );
  const left = card(null, leftBody, jump);
  const pills = h("div", { class: "pills" });
  const right = card(null, pills);
  const plan = new PlanCard();

  const el = h("div", { class: "view overview" },
    h("div", { class: "left" }, left),
    h("div", { class: "right" }, right),
  );

  let pillIds = "";
  let detailOpen = false;
  let lastFocus: string | null = null;
  let mode: "ticker" | "diff" | "card" | null = null;
  let cardKey = "";

  const hooks: IntegrationCardHooks = {
    get detailOpen() {
      return detailOpen;
    },
    openDetail() {
      detailOpen = true;
      cardKey = "";
      State.notify();
    },
    closeDetail() {
      detailOpen = false;
      cardKey = "";
      State.notify();
    },
    openSettings: () => actions.setView("settings"),
  };

  return {
    el,
    tick(nowMs: number) {
      if (mode === "ticker") ticker.tick(nowMs);
    },
    sync() {
      const task = State.focusTask;
      if (task?.id !== lastFocus) {
        lastFocus = task?.id ?? null;
        detailOpen = false;
        cardKey = "";
        mode = null;
      }

      // VS Code with a live Claude Code session keeps the ticker; every other
      // pill shows its own card, exactly like IntegrationCardView.
      const sessionActive =
        task?.id === "integration_claude" && (task.state !== "idle" || task.steps.length > 0);

      if (planCardOpen()) {
        if (mode !== "card" || cardKey !== "plan") {
          clear(leftBody);
          leftBody.append(plan.el);
          mode = "card";
          cardKey = "plan";
        }
        plan.sync();
      } else if (task && sessionActive) {
        // A fresh edit takes the card over: the file, a few lines around the
        // change and the newest line typing in (bridge/ui/notch-diff.js).
        const diff = latestDiff();
        const diffKey = diff && diffIsFresh(diff) ? diffCardKey(diff) : "";
        if (diff && diffKey) {
          if (mode !== "diff" || cardKey !== diffKey) {
            clear(leftBody);
            leftBody.append(renderDiffCard(diff));
            mode = "diff";
            cardKey = diffKey;
          }
        } else {
          if (mode !== "ticker") {
            clear(leftBody);
            leftBody.append(tickerBody);
            mode = "ticker";
            cardKey = "";
          }
          clear(who);
          who.append(
            dot(task.color, 7),
            h("span", { class: "name", text: task.name }),
            h("span", { class: "tool", text: task.source === "claudeCode" ? "Claude Code" : "n8n" }),
          );
          if (task.steps.length > 1) {
            who.append(h("span", {
              class: "count",
              text: `${Math.min(task.stepIndex + 1, task.steps.length)}/${task.steps.length}`,
            }));
          }
          ticker.sync(task);
        }
      } else if (task) {
        const info = State.integrations[task.id];
        const key = [
          task.id, detailOpen, task.state, task.steps.join("|"),
          info?.loaded, info?.error, info?.configured,
          JSON.stringify(info?.data ?? {}),
        ].join("~");
        if (key !== cardKey) {
          cardKey = key;
          mode = "card";
          clear(leftBody);
          leftBody.append(renderIntegrationCard(task, hooks));
        }
      }

      jump.style.display = (detailOpen || planCardOpen()) ? "none" : "";

      const others = State.otherTasks.slice(0, 4);
      const pillKey = others.map((t) => `${t.id}:${t.pillBadge ?? ""}`).join("|");
      if (pillKey !== pillIds) {
        pillIds = pillKey;
        clear(pills);
        for (const t of others) pills.append(buildPill(t, actions));
        pruneMiniBots();
      }
    },
  };
}

function buildPill(task: AgentTask, actions: ViewActions): HTMLElement {
  const label = task.id === "integration_claude" ? "VS Code" : task.name;
  const color = pillColor(task.id, task.color, State.settings.pillColors);
  const canvas = createMiniBot({ ...task, color }, 20);
  const pill = h(
    "div",
    { class: "pill", onclick: () => actions.setFocus(task.id) },
    canvas,
    h("span", { class: "lbl", text: label }),
  );
  pill.style.borderColor = `${color}24`;
  pill.addEventListener("mouseenter", () => {
    pill.style.background = `${color}2e`;
    pill.style.borderColor = `${color}8c`;
    pill.style.boxShadow = `0 2px 10px ${color}59`;
    (pill.querySelector(".lbl") as HTMLElement).style.color = lighten(color, 0.3);
  });
  pill.addEventListener("mouseleave", () => {
    pill.style.background = "";
    pill.style.borderColor = `${color}24`;
    pill.style.boxShadow = "";
    (pill.querySelector(".lbl") as HTMLElement).style.color = "";
  });

  if (task.pillBadge) {
    const colors = { approval: "#F5A524", finished: "#22C55E", error: "#F4505E" } as const;
    const icons = { approval: ICONS.bang, finished: ICONS.check, error: ICONS.xmark } as const;
    const inner = h("i", { style: `background:${colors[task.pillBadge]}` }, svg(icons[task.pillBadge], 6, { stroke: task.pillBadge === "finished" ? 3 : 0 }));
    const badge = h("div", { class: "pill-badge" }, inner);
    badge.style.boxShadow = `0 0 4px ${colors[task.pillBadge]}99`;
    pill.append(badge);
  }
  return pill;
}

function lighten(hex: string, amount: number): string {
  const v = parseInt(hex.replace("#", ""), 16);
  const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) =>
    Math.min(255, Math.round(x + amount * 255)),
  );
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ── Empty ─────────────────────────────────────────────────────────────────────

function buildEmpty(actions: ViewActions): ViewHost {
  const body = h(
    "div",
    { class: "stack", style: "padding:0 18px 0 118px;flex-direction:row;align-items:center;gap:16px" },
    h(
      "div",
      { style: "display:flex;flex-direction:column;gap:5px" },
      h("div", { class: "title", text: t("Nothing running right now.") }),
      h("div", { class: "sub", text: t("Drop a file or window, or ask me anything.") }),
    ),
    h("div", { class: "grow" }),
    btn(t("Ask AI"), "primary", () => actions.setView("prompt")),
  );
  return { el: h("div", { class: "view" }, card(null, body)), sync() {} };
}

// ── Approval ──────────────────────────────────────────────────────────────────

function buildApproval(actions: ViewActions): ViewHost {
  const who = h("div");
  const code = h("div", { class: "code" });
  const risks = h("div", { class: "risks" });
  const row = h("div", { class: "actions" });
  const el = h("div", { class: "view" }, card("amber", stack(116, 16, who, code, risks, row)));
  let rowKey = "";
  let riskKey = "";
  return {
    el,
    sync() {
      clear(who);
      who.append(agentWho(State.focusTask, t("needs permission")));
      // The whole point of approving here rather than in the terminal: this line
      // is the command, the file path or the URL being authorised, not just the
      // name of the tool asking.
      code.textContent = State.pendingApproval?.command || State.pendingApproval?.tool || "…";
      // The same warnings the terminal shows: a recursive delete, a force-push,
      // a file that usually holds secrets. Rebuilt only when they change.
      const risk = State.pendingApproval?.risk ?? [];
      const key = risk.map((r) => `${r.level}:${r.text}`).join("|");
      if (key !== riskKey) {
        riskKey = key;
        clear(risks);
        for (const r of risk) risks.append(h("div", { class: `risk ${r.level}`, text: t(r.text) }));
      }
      // Three buttons, built once. Rebuilding them between a mouse-down and a
      // mouse-up would swallow the click; "Always" persists a remembered rule.
      if (rowKey === "built") return;
      rowKey = "built";
      clear(row);
      row.append(
        btn(t("Deny"), "secondary", () => actions.decide("deny"), "N"),
        btn(t("Always"), "secondary", () => actions.decide("always"), "A"),
        btn(t("Allow"), "primary", () => actions.decide("allow"), "Y"),
      );
    },
  };
}

// ── Question ──────────────────────────────────────────────────────────────────

function buildQuestion(): ViewHost {
  const who = h("div");
  const title = h("div", { class: "title" });
  const row = h("div", { class: "actions" });
  const el = h("div", { class: "view" }, card("cyan", stack(116, 16, who, title, row)));
  return {
    el,
    sync() {
      clear(who);
      who.append(agentWho(State.focusTask, t("is asking a question")));
      const task = State.focusTask;
      title.textContent = task?.steps.at(-1) ?? t("needs an answer.");
      clear(row);
      row.append(h("div", { class: "sub", text: t("Answer in your terminal — Powpow can't reply for you yet.") }));
    },
  };
}

// ── Error ─────────────────────────────────────────────────────────────────────

function buildError(actions: ViewActions): ViewHost {
  const who = h("div");
  const title = h("div", { class: "title", text: t("Workflow stopped.") });
  const detail = h("div", { class: "detail" });
  const row = h("div", { class: "actions" },
    btn(t("Retry"), "primary", () => actions.setView(State.defaultView())),
    btn(t("Open in n8n"), "secondary", () => actions.openUrl("")),
  );
  const el = h("div", { class: "view" }, card("red", stack(116, 16, who, title, detail, row)));
  return {
    el,
    sync() {
      const task = State.focusTask;
      clear(who);
      who.append(agentWho(task, task?.source === "n8n" ? "n8n" : t("Claude Code")));
      title.textContent = task?.source === "n8n" ? t("Workflow stopped.") : t("Session stopped on an error.");
      detail.textContent = task?.steps.at(-1) ?? t("No detail available.");
    },
  };
}

// ── Finished ──────────────────────────────────────────────────────────────────

function buildFinished(actions: ViewActions): ViewHost {
  const who = h("div");
  const title = h("div", { class: "title" });
  const go = (v: IslandViewName) => {
    actions.blip();
    actions.setView(v);
  };
  const row = h("div", { class: "actions" },
    btn(t("Open terminal"), "primary", () => actions.openTerminal()),
    btn(t("OK"), "secondary", () => actions.collapse()),
  );
  // What usually comes next. The chips only ever open views the island already
  // has - nobody starts a command from here that the terminal did not ask for.
  const suggest = h(
    "div",
    { class: "suggest" },
    h("button", { class: "link-btn", text: t("See what changed"), onclick: () => go("story") }),
    h("button", { class: "link-btn", text: t("Ask the pal"), onclick: () => go("prompt") }),
    h("button", {
      class: "link-btn",
      text: t("New chat"),
      onclick: () => {
        actions.blip();
        actions.newChat();
      },
    }),
  );
  const el = h("div", { class: "view" }, card("green", stack(116, 16, who, title, row, suggest)));
  return {
    el,
    sync() {
      clear(who);
      who.append(agentWho(State.focusTask, t("Claude Code finished")));
      title.textContent = State.focusTask?.steps.at(-1) ?? t("Session finished");
    },
  };
}

// ── Confused ──────────────────────────────────────────────────────────────────

function buildConfused(): ViewHost {
  const body = h(
    "div",
    { class: "stack", style: "padding:0 18px 0 128px" },
    h("div", { class: "title", text: t("Too many hits at once.") }),
    h("div", { class: "sub", text: t("Give me a sec — back to work in three seconds.") }),
  );
  return { el: h("div", { class: "view" }, card("pink", body)), sync() {} };
}

// ── Note ──────────────────────────────────────────────────────────────────────

function buildNote(): ViewHost {
  const title = h("div", { class: "title" });
  const el = h("div", { class: "view" }, card(null, h("div", { class: "stack", style: "padding:0 18px 0 98px" }, title)));
  return {
    el,
    sync() {
      title.textContent = State.noteMessage ?? "";
    },
  };
}

// ── In-island settings ────────────────────────────────────────────────────────

function buildSettings(actions: ViewActions): ViewHost {
  type SettingsTab = "mascots" | "keys" | "hooks" | "general";

  const mascots = [
    { id: "embasa", label: "💧 Embasa 2D" },
    { id: "doraemon", label: "🐱 Doraemon" },
    { id: "vaultboy", label: "⚡ Vault Boy" },
    { id: "shimeji", label: "🍄 Shimeji" },
    { id: "mochi", label: "🥟 Mochi" },
  ];

  const mascotButtons = mascots.map((m) =>
    h(
      "button",
      {
        class: "mascot-seg-btn",
        style: "padding: 3px 9px; font-size: 11px; border-radius: 999px; border: none; cursor: pointer; transition: all 0.15s ease;",
        onclick: () => {
          State.settings.character = m.id;
          void Bridge.saveSettings(State.settings);
          State.notify();
          actions.blip();
        },
      },
      m.label,
    ),
  );

  const personalities: { id: PalPersonality; label: string }[] = [
    { id: "sarcastic", label: "😏 Sarcástico" },
    { id: "friendly", label: "😊 Amigável" },
    { id: "coach", label: "💪 Treinador" },
    { id: "philosophical", label: "🧐 Filosófico" },
    { id: "chaotic", label: "🤪 Caótico" },
  ];

  const personalityButtons = personalities.map((p) =>
    h(
      "button",
      {
        class: "mascot-seg-btn",
        style: "padding: 3px 8px; font-size: 10.5px; border-radius: 999px; border: none; cursor: pointer; transition: all 0.15s ease;",
        onclick: () => {
          State.settings.personality = p.id;
          void Bridge.saveSettings(State.settings);
          State.notify();
          actions.blip();
        },
      },
      p.label,
    ),
  );

  // Sub-tabs
  const tabBtnMascots = h("button", { class: "tab on", style: "font-size:11px; padding:2px 8px;", onclick: () => switchTab("mascots") }, "🎭 Mascote");
  const tabBtnKeys = h("button", { class: "tab", style: "font-size:11px; padding:2px 8px;", onclick: () => switchTab("keys") }, "🔑 APIs");
  const tabBtnHooks = h("button", { class: "tab", style: "font-size:11px; padding:2px 8px;", onclick: () => switchTab("hooks") }, "⚡ Hooks");
  const tabBtnGeneral = h("button", { class: "tab", style: "font-size:11px; padding:2px 8px;", onclick: () => switchTab("general") }, "🔊 Geral");

  const openWindowBtn = h("button", {
    class: "link-btn",
    style: "color:#38bdf8; font-size:11.5px; font-weight:600; padding:2px 8px; cursor:pointer; margin-right:8px;",
    text: "Janela Completa ↗",
    onclick: (e: Event) => {
      e.stopPropagation();
      actions.openSettingsWindow();
      actions.blip();
    },
  });

  const closeBtn = h("button", {
    class: "link-btn",
    style: "color:#94a3b8; font-size:11.5px; font-weight:600; padding:2px 6px; cursor:pointer;",
    text: "✕ Fechar",
    onclick: (e: Event) => {
      e.stopPropagation();
      State.isPinned = false;
      actions.setView(State.defaultView());
      actions.blip();
    },
  });

  const tabBar = h("div", {
    style: "display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:6px;",
  },
    h("div", { style: "display:flex; gap:4px;" }, tabBtnMascots, tabBtnKeys, tabBtnHooks, tabBtnGeneral),
    h("div", { style: "display:flex; align-items:center;" }, openWindowBtn, closeBtn),
  );

  // Mascots panel
  const mascotsPanel = h("div", { class: "settings-panel", style: "display:flex; flex-direction:column; gap:6px;" },
    h("div", { style: "display:flex; align-items:center; gap:6px; flex-wrap:wrap;" },
      h("span", { style: "font-weight:600; font-size:11px; color:#cbd5e1; width:72px;" }, "Personagem:"),
      h("div", { style: "display:flex; gap:4px; flex-wrap:wrap;" }, ...mascotButtons),
    ),
    h("div", { style: "display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:2px;" },
      h("span", { style: "font-weight:600; font-size:11px; color:#cbd5e1; width:72px;" }, "Tom de voz:"),
      h("div", { style: "display:flex; gap:4px; flex-wrap:wrap;" }, ...personalityButtons),
    ),
  );

  // API Keys panel
  const anthropicInput = h("input", {
    type: "password",
    placeholder: "sk-ant-...",
    style: "background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:4px; padding:3px 6px; font-size:10.5px; width:150px;",
  }) as HTMLInputElement;

  const anthropicStatus = h("span", { style: "font-size:10px; color:#94a3b8;" }, "verificando...");

  const saveAnthropicBtn = h("button", {
    class: "link-btn",
    style: "background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.4); color:#60a5fa; border-radius:4px; padding:2px 6px; font-size:10.5px; cursor:pointer;",
    text: "Salvar",
    onclick: async () => {
      const v = anthropicInput.value.trim();
      if (v) {
        await Bridge.secretSet("claude-api-key", v);
        anthropicInput.value = "";
        anthropicStatus.textContent = "🟢 Salva";
        actions.blip();
      }
    },
  });

  const geminiInput = h("input", {
    type: "password",
    placeholder: "AIzaSy...",
    style: "background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:4px; padding:3px 6px; font-size:10.5px; width:150px;",
  }) as HTMLInputElement;

  const geminiStatus = h("span", { style: "font-size:10px; color:#94a3b8;" }, "verificando...");

  const saveGeminiBtn = h("button", {
    class: "link-btn",
    style: "background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.4); color:#60a5fa; border-radius:4px; padding:2px 6px; font-size:10.5px; cursor:pointer;",
    text: "Salvar",
    onclick: async () => {
      const v = geminiInput.value.trim();
      if (v) {
        await Bridge.secretSet("gemini-api-key", v);
        geminiInput.value = "";
        geminiStatus.textContent = "🟢 Salva";
        actions.blip();
      }
    },
  });

  const keysPanel = h("div", { class: "settings-panel", style: "display:none; flex-direction:column; gap:6px;" },
    h("div", { style: "display:flex; align-items:center; gap:8px;" },
      h("span", { style: "font-size:11px; font-weight:600; color:#cbd5e1; width:72px;" }, "Anthropic:"),
      anthropicInput,
      saveAnthropicBtn,
      anthropicStatus,
    ),
    h("div", { style: "display:flex; align-items:center; gap:8px;" },
      h("span", { style: "font-size:11px; font-weight:600; color:#cbd5e1; width:72px;" }, "Gemini:"),
      geminiInput,
      saveGeminiBtn,
      geminiStatus,
    ),
  );

  // Hooks panel
  const claudeHookLabel = h("span", { style: "font-size:11px; color:#cbd5e1;" }, "Claude Code: verificando...");
  const claudeHookBtn = h("button", {
    class: "link-btn",
    style: "font-size:10.5px; padding:2px 8px; border-radius:4px; background:rgba(255,255,255,0.08); border:none; cursor:pointer; color:#fff;",
    text: "Alternar",
    onclick: async () => {
      try {
        const st = await Bridge.hooksStatus();
        const next = !st?.installed;
        const prev = await Bridge.hooksPreview(next);
        await Bridge.hooksApply(next, prev.fingerprint);
        claudeHookLabel.textContent = next ? "Claude Code: 🟢 Ativo" : "Claude Code: ⚪ Inativo";
        actions.blip();
      } catch (e) {
        claudeHookLabel.textContent = "Claude Code: erro ao alternar";
      }
    },
  });

  const agyHookLabel = h("span", { style: "font-size:11px; color:#cbd5e1;" }, "Antigravity (agy): verificando...");
  const agyHookBtn = h("button", {
    class: "link-btn",
    style: "font-size:10.5px; padding:2px 8px; border-radius:4px; background:rgba(255,255,255,0.08); border:none; cursor:pointer; color:#fff;",
    text: "Alternar",
    onclick: async () => {
      try {
        const st = await Bridge.agyHooksStatus();
        const next = !st?.installed;
        const prev = await Bridge.agyHooksPreview(next);
        await Bridge.agyHooksApply(next, prev.fingerprint);
        agyHookLabel.textContent = next ? "Antigravity (agy): 🟢 Ativo" : "Antigravity (agy): ⚪ Inativo";
        actions.blip();
      } catch (e) {
        agyHookLabel.textContent = "Antigravity: erro ao alternar";
      }
    },
  });

  const hooksPanel = h("div", { class: "settings-panel", style: "display:none; flex-direction:column; gap:8px;" },
    h("div", { style: "display:flex; align-items:center; justify-content:space-between; max-width:380px;" },
      claudeHookLabel,
      claudeHookBtn,
    ),
    h("div", { style: "display:flex; align-items:center; justify-content:space-between; max-width:380px;" },
      agyHookLabel,
      agyHookBtn,
    ),
  );

  // General panel
  const soundSwitch = h("button", { class: "switch", onclick: () => actions.toggleSound() });
  const volume = h("input", {
    type: "range", min: "0", max: "0.2", step: "0.005",
    oninput: (e: Event) => actions.setVolume(Number((e.target as HTMLInputElement).value)),
  }) as HTMLInputElement;

  const autoLabel = h("span", { style: "font-size:11px; color:#cbd5e1;" });
  const segButtons = [10, 15, 30].map((s) =>
    h("button", { onclick: () => actions.setAutoClose(s), style: "font-size:10px; padding:2px 6px;" }, `${s}s`),
  );

  const wanderSwitch = h("button", {
    class: "switch",
    onclick: () => {
      State.settings.wander = !State.settings.wander;
      void Bridge.saveSettings(State.settings);
      State.notify();
      actions.blip();
    },
  });

  const generalPanel = h("div", { class: "settings-panel", style: "display:none; flex-direction:column; gap:6px;" },
    h("div", { style: "display:flex; align-items:center; gap:8px;" },
      soundSwitch,
      h("span", { text: t("Sound"), style: "font-size:11px; color:#cbd5e1; width:50px;" }),
      volume,
    ),
    h("div", { style: "display:flex; align-items:center; gap:8px;" },
      wanderSwitch,
      h("span", { text: "Mascote solto no Desktop", style: "font-size:11px; color:#cbd5e1; margin-right:8px;" }),
    ),
    h("div", { style: "display:flex; align-items:center; gap:8px;" },
      svg(ICONS.timer, 12),
      autoLabel,
      h("div", { class: "seg" }, ...segButtons),
    ),
  );

  function switchTab(t: SettingsTab) {
    tabBtnMascots.classList.toggle("on", t === "mascots");
    tabBtnKeys.classList.toggle("on", t === "keys");
    tabBtnHooks.classList.toggle("on", t === "hooks");
    tabBtnGeneral.classList.toggle("on", t === "general");

    mascotsPanel.style.display = t === "mascots" ? "flex" : "none";
    keysPanel.style.display = t === "keys" ? "flex" : "none";
    hooksPanel.style.display = t === "hooks" ? "flex" : "none";
    generalPanel.style.display = t === "general" ? "flex" : "none";
    actions.blip();

    if (t === "keys") {
      void Bridge.secretPresent("claude-api-key").then((ok) => {
        anthropicStatus.textContent = ok ? "🟢 Configurada" : "⚪ Não salva";
      });
      void Bridge.secretPresent("gemini-api-key").then((ok) => {
        geminiStatus.textContent = ok ? "🟢 Configurada" : "⚪ Não salva";
      });
    } else if (t === "hooks") {
      void Bridge.hooksStatus().then((st) => {
        claudeHookLabel.textContent = st?.installed ? "Claude Code: 🟢 Ativo" : "Claude Code: ⚪ Inativo";
      });
      void Bridge.agyHooksStatus().then((st) => {
        agyHookLabel.textContent = st?.installed ? "Antigravity (agy): 🟢 Ativo" : "Antigravity (agy): ⚪ Inativo";
      });
    }
  }

  const container = h("div", { class: "stack", style: "padding:12px 16px 12px 84px; width:100%; box-sizing:border-box;" },
    tabBar,
    mascotsPanel,
    keysPanel,
    hooksPanel,
    generalPanel,
  );

  const el = h("div", { class: "view" }, card(null, container));

  return {
    el,
    sync() {
      const s = State.settings;
      soundSwitch.classList.toggle("on", s.soundEnabled);
      volume.value = String(s.soundVolume);
      volume.style.opacity = s.soundEnabled ? "1" : "0.4";
      wanderSwitch.classList.toggle("on", s.wander);

      const curChar = s.character || "embasa";
      mascotButtons.forEach((b, i) => {
        const isSelected = curChar === mascots[i].id;
        b.classList.toggle("on", isSelected);
        b.style.background = isSelected ? "#3b82f6" : "rgba(255,255,255,0.08)";
        b.style.color = isSelected ? "#ffffff" : "#94a3b8";
        b.style.fontWeight = isSelected ? "600" : "400";
      });

      const curPers = s.personality || "sarcastic";
      personalityButtons.forEach((b, i) => {
        const isSelected = curPers === personalities[i].id;
        b.classList.toggle("on", isSelected);
        b.style.background = isSelected ? "#10b981" : "rgba(255,255,255,0.06)";
        b.style.color = isSelected ? "#ffffff" : "#94a3b8";
        b.style.fontWeight = isSelected ? "600" : "400";
      });

      autoLabel.textContent = `${t("Auto-close")} · ${Math.round(s.autoCloseInterval)}s`;
      segButtons.forEach((b, i) => b.classList.toggle("on", s.autoCloseInterval === [10, 15, 30][i]));
    },
  };
}

// ── Placeholders filled in later stages ───────────────────────────────────────

function buildPlaceholder(title: string, sub: string): ViewHost {
  const body = h(
    "div",
    { class: "stack", style: "padding:0 18px 0 118px" },
    h("div", { class: "title", text: title }),
    h("div", { class: "sub", text: sub }),
  );
  return { el: h("div", { class: "view" }, card(null, body)), sync() {} };
}

// ── Registry ──────────────────────────────────────────────────────────────────

export function buildViews(
  actions: ViewActions,
  onChatHeightChange: () => void,
): Map<IslandViewName, ViewHost> {
  const map = new Map<IslandViewName, ViewHost>();
  map.set("overview", buildOverview(actions));
  map.set("empty", buildEmpty(actions));
  map.set("approval", buildApproval(actions));
  map.set("question", buildQuestion());
  map.set("error", buildError(actions));
  map.set("finished", buildFinished(actions));
  map.set("confused", buildConfused());
  map.set("note", buildNote());
  map.set("settings", buildSettings(actions));
  map.set("story", buildStory());
  map.set("prompt", buildPrompt(actions, onChatHeightChange));
  map.set("upload", buildUpload(actions));
  map.set("uploading", buildUploading());
  map.set("choose", buildChoose(actions));
  // Placeholders kept from the spec: sending a file by mail, plus the search and
  // result views. Window attach is real — drag Mochi out of the island.
  map.set("mail", buildPlaceholder(t("Sending by email isn't in this version."), ""));
  map.set("searching", buildPlaceholder(t("Claude is searching…"), ""));
  map.set("result", buildPlaceholder(t("Result"), ""));
  return map;
}
