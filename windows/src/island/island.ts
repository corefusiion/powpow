// The island: DOM shell, sizing animation, Mochi placement, mouse handling.
// Mirrors IslandRootView.swift + IslandWindowController.swift.

import { Tracked, Spring, clamp } from "../core/anim";
import { Bridge, IS_TAURI, onDragDrop, onEvent } from "../core/bridge";
import { t } from "../core/i18n";
import {
  EXPANDED_CORNER, EXPANDED_W, NOTCH_W, PANEL_H, PANEL_W,
  ROUNDED_CORNER, VIEW_LAYOUTS, botGlowColor, botGlowOpacity, botPosition, chatPromptHeight,
  islandSize,
  type BotStateName, type IslandMode, type IslandViewName,
} from "../core/layout";
import { reducedMotion } from "../core/motion";
import { Sound } from "../core/sound";
import { State } from "../core/state";
import { BotEngine, hexToRGB } from "../mochi/engine";
import { Greeting } from "../mochi/greeting";
import { createMiniBot, pruneMiniBots, syncMiniBotStates, tickMiniBots } from "../mochi/minibots";
import { UploadCanvas } from "../upload/canvas";
import { USC, UploadSeq } from "../upload/sequence";
import { buildHeader, buildViews, type ViewActions, type ViewHost } from "../views/views";
import { h } from "../views/dom";
// Side effect registers the `dot-pal` tag; the island draws one instead of Mochi
// whenever Settings › Character picks something else (registerCustom feeds "custom").
import { DotPal, characters, registerCustom, type CustomPal } from "../../../src/index.js";
import { IslandStateMachine } from "./fsm";
import { PAL_EMOTE, PAL_STATE } from "./palState";

const BOT_OVERHANG = 40;
/** Same margin as the Rust hit test (src-tauri/src/island.rs). */
const HIT_MARGIN = 14;

/** The three views the drop sequence owns; leaving them stops the engine. */
const UPLOAD_VIEWS: ReadonlySet<IslandViewName> = new Set(["upload", "uploading", "choose"]);

/** Worth saying out loud: the states the island already shouts about. */
const PAL_VOICE: ReadonlySet<BotStateName> = new Set([
  "finished",
  "error",
  "approval",
  "question",
  "ratelimit",
]);

/** Seconds between the drop and the moment the progress bar starts filling. */
const PRE_PROGRESS = USC.T_PROG_START - USC.T_DROP;

const modeOrder = (m: IslandMode) => (m === "hidden" ? 0 : m === "compact" ? 1 : 2);

export class Island {
  readonly fsm = new IslandStateMachine();

  private root: HTMLElement;
  private islandEl!: HTMLElement;
  private clipEl!: HTMLElement;
  private contentEl!: HTMLElement;
  private viewsEl!: HTMLElement;
  private botCanvas!: HTMLCanvasElement;
  private botGlow!: HTMLElement;
  /** Character overlay drawn where Mochi would be; null while Mochi is chosen. */
  private pal: DotPal | null = null;
  private palCharacter = "";
  /** Last state/text handed to the overlay, so the frame loop can't repeat it. */
  private palState: BotStateName | null = null;
  private palStateText = "";
  private greetingCanvas!: HTMLCanvasElement;
  private miniGrid!: HTMLElement;
  private countdown!: HTMLElement;
  private wakeStrip!: HTMLElement;

  private header!: ViewHost;
  private views!: Map<IslandViewName, ViewHost>;
  private actions!: ViewActions;
  private lastLang: string = "en";
  private uploadCanvas!: UploadCanvas;

  private width = new Tracked(NOTCH_W);
  private height = new Tracked(0);
  private radius = new Tracked(ROUNDED_CORNER);
  private botCx = new Spring(46);
  private botCy = new Spring(16);
  private botSize = new Spring(10);

  private engine = new BotEngine();
  private greeting = new Greeting();

  private running = false;
  private lastFrame = 0;
  private dirty = true;
  private canvasPx = 0;

  // Rust starts the window at full size so the launch greeting has room.
  private collapsed = false;
  private collapseTimer: number | null = null;
  private wasInIsland = false;
  /** Last shape handed to Rust for the click-through test. */
  private pushedRect = { x: -1, y: -1, w: -1, h: -1 };
  private homeCollapseAt: number | null = null;

  // The roaming pal lives in its own window; this is the last thing we told
  // Rust about it, so a state that keeps saying the same thing costs nothing.
  private palRoam: boolean | null = null;

  // Bot hover → love (IslandWindowController.botHoverIn)
  private botHovering = false;
  private botHoverTimer: number | null = null;
  private lastLoveTime = 0;
  private botHoverStart = { x: 0, y: 0 };
  private hoverOpenTimer: number | null = null;

  // Mochi drag-out → window attach (macOS: drag Mochi onto any window).
  // Press is recorded on mousedown; the slap is deferred until release so a
  // press that turns into a drag (> 7pt) becomes a ghost instead of a slap.
  private botPress: { x: number; y: number } | null = null;
  private draggingGhost = false;
  private ghostEl!: HTMLElement;

  private confusedRecovery: number | null = null;
  private prevViewBeforeConfused: IslandViewName = "overview";
  private lastSyncedView: IslandViewName | null = null;

  /** Drop sequence bookkeeping: last tick played, and whether the ✓ has fired. */
  private uploadTens = 0;
  private uploadDone = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.build();
    this.wireFsm();
    this.wireInput();
    this.engine.onDizzy = () => this.handleDizzy();
    this.greeting.onComplete = () => this.fsm.greetComplete();
    State.subscribe(() => {
      this.dirty = true;
      this.ensureRunning();
    });
  }

  // ── DOM ─────────────────────────────────────────────────────────────────────

  private build() {
    const actions: ViewActions = {
      setView: (v) => this.setView(v),
      collapse: () => this.collapse(),
      newChat: () => {
        State.chatHistory = [];
        State.droppedFile = null;
        State.promptContext = null;
        State.stateOverride = null;
        State.noteMessage = null;
        void Bridge.chatReset();
        Sound.play("blip");
        this.setView(State.defaultView());
      },
      setFocus: (id) => {
        State.setFocus(id);
        Sound.play("blip");
      },
      openTerminal: () => {
        const cwd = State.focusTask?.sessionCwd ?? null;
        void Bridge.openInVSCode(cwd);
      },
      // The ↗ button — same targets as openAgentTarget() on macOS.
      openTarget: () => {
        const task = State.focusTask;
        if (!task) return;
        const urls: Record<string, string> = {
          integration_resend: "https://resend.com/emails",
          integration_vercel: "https://vercel.com/dashboard",
          integration_github: "https://github.com",
          integration_stripe: "https://dashboard.stripe.com/payments",
          integration_notion: "https://notion.so",
          integration_calcom: "https://app.cal.com/bookings",
          integration_spotify: "https://open.spotify.com",
          integration_whatsapp: "https://web.whatsapp.com",
          integration_gmail: "https://mail.google.com",
          integration_outlook: "https://outlook.live.com",
        };
        if (task.id === "integration_claude" || task.source === "claudeCode") {
          void Bridge.openInVSCode(task.sessionCwd ?? null);
        } else if (task.source === "geminiCli" || task.source === "antigravity" || task.source === "opencode" || task.source === "genericCli") {
          // jump.rs focuses the console running that session; if no match, the
          // working folder still opens in VS Code.
          void Bridge.openInVSCode(task.sessionCwd ?? null);
        } else if (task.id === "integration_n8n") void Bridge.openN8n();
        else if (urls[task.id]) void Bridge.openUrl(urls[task.id]);
      },
      openUrl: (url) => {
        if (url) void Bridge.openUrl(url);
      },
      decide: (d) => {
        const req = State.pendingApproval;
        void Bridge.log(`decide ${d} req=${req?.requestId ?? "none"}`);
        if (!req) return;
        Sound.play(d === "deny" ? "blip" : "approve");
        if (d === "always") {
          // Remembered rule: this source+tool never asks again. Stored as
          // "source:tool" (lowercased tool) and synced to disk like the rest.
          const rule = `${req.source}:${req.tool.toLowerCase()}`;
          if (!State.settings.approvedTools.includes(rule)) {
            State.settings.approvedTools = [...State.settings.approvedTools, rule];
            void Bridge.saveSettings(State.settings);
          }
        }
        void Bridge.approvalDecision(req.requestId, d);
        State.pendingApproval = null;
        State.isPinned = false;
        this.fsm.pinned = false;
        const focusId = State.focusId ?? "integration_claude";
        State.updateTask(focusId, "working");
        State.setPillBadge(focusId, null);
        this.setView(State.defaultView());
      },
      toggleSound: () => {
        State.settings.soundEnabled = !State.settings.soundEnabled;
        Sound.setEnabled(State.settings.soundEnabled);
        void Bridge.saveSettings(State.settings);
        State.notify();
      },
      setVolume: (v) => {
        State.settings.soundVolume = v;
        Sound.setVolume(v);
        void Bridge.saveSettings(State.settings);
        State.notify();
      },
      setAutoClose: (s) => {
        State.settings.autoCloseInterval = s;
        this.fsm.homeToPetitDelay = s;
        void Bridge.saveSettings(State.settings);
        State.notify();
      },
      openSettingsWindow: () => void Bridge.openSettingsWindow(),
      /** Keyboard/mouse way into the drop flow (Drop view's "Choose file"). */
      attachFile: (file) => this.handleFile(file),
      blip: () => Sound.play("blip"),
    };

    this.wakeStrip = h("div", { id: "wake-strip" });
    this.botGlow = h("div", { id: "bot-glow" });
    this.botCanvas = h("canvas", { id: "bot-canvas" });
    this.ghostEl = this.buildGhost();
    this.greetingCanvas = h("canvas", { id: "greeting-canvas" });
    this.miniGrid = h("div", { id: "mini-grid" });
    this.countdown = h("div", { id: "countdown" });

    this.header = buildHeader(actions);
    this.views = buildViews(actions, () => this.animateGeometry(false));
    this.viewsEl = h("div", { id: "views" });
    for (const v of this.views.values()) this.viewsEl.append(v.el);
    this.contentEl = h("div", { id: "content" }, this.header.el, this.viewsEl);
    this.actions = actions;

    // The drop sequence draws the card, the bar and its own Mochi. It sits under
    // the header, which stays visible on top of it exactly as on macOS.
    this.uploadCanvas = new UploadCanvas({
      ask: () => {
        State.promptContext = State.droppedFile
          ? { kind: "file", name: State.droppedFile.name, path: State.droppedFile.path }
          : null;
        this.setView("prompt");
      },
      cancel: () => this.setView(State.defaultView()),
    });

    this.clipEl = h(
      "div",
      { id: "island-clip" },
      this.greetingCanvas,
      this.uploadCanvas.el,
      this.contentEl,
    );
    this.islandEl = h(
      "div",
      { id: "island" },
      this.clipEl,
      this.botGlow,
      this.botCanvas,
      this.miniGrid,
      this.countdown,
      h("div", { id: "embasa-rule" }),
    );

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.greetingCanvas.width = Math.round(EXPANDED_W * dpr);
    this.greetingCanvas.height = Math.round(150 * dpr);
    this.greetingCanvas.style.width = `${EXPANDED_W}px`;
    this.greetingCanvas.style.height = "150px";

    this.root.append(this.wakeStrip, this.islandEl, this.ghostEl);
    this.applyGeometry();
  }

  /**
   * Rebuilds header + views so a language switch re-renders every static
   * label immediately (buttons built once would otherwise stay in the old
   * language until restart). State (tasks, chat, focus) is untouched.
   */
  private rebuildChrome() {
    const old = this.contentEl;
    this.header = buildHeader(this.actions);
    this.views = buildViews(this.actions, () => this.animateGeometry(false));
    this.viewsEl = h("div", { id: "views" });
    for (const v of this.views.values()) this.viewsEl.append(v.el);
    this.contentEl = h("div", { id: "content" }, this.header.el, this.viewsEl);
    old.replaceWith(this.contentEl);
    this.lastSyncedView = null;
    this.dirty = true;
    this.ensureRunning();
  }

  /**
   * The drag ghost: a simple CSS Mochi (cream squircle + two eyes) that follows
   * the cursor while dragging the bot out. The real canvas keeps rendering
   * underneath but is hidden until the drop, so no engine coupling is needed.
   */
  private buildGhost(): HTMLElement {
    const want = State.settings.character || "mochi";
    if (want !== "mochi") {
      if (want === "custom" && State.settings.custom) {
        registerCustom(State.settings.custom as CustomPal);
      }
      const el = h("dot-pal", {
        id: "bot-ghost",
        bubble: "none",
        size: "54",
        style: "position:absolute;display:none;width:54px;height:54px;z-index:60;pointer-events:none;filter:drop-shadow(0 8px 24px rgba(0,0,0,.5));",
      }) as DotPal;
      el.character = want;
      return el;
    }
    const eye = (left: string) => h("div", {
      style: `position:absolute;top:20px;left:${left};width:9px;height:11px;border-radius:50%;background:#1A1412`,
    });
    const ghost = h("div", {
      id: "bot-ghost",
      style: "position:absolute;display:none;width:54px;height:48px;border-radius:46% 46% 48% 48%/58% 58% 42% 42%;background:radial-gradient(circle at 68% 22%,#FFFAF5 0%,#EAD9CC 78%,#DDCCBF 100%);box-shadow:0 6px 22px rgba(0,0,0,.5);z-index:60;pointer-events:none",
    }, eye("15px"), eye("30px"));
    return ghost;
  }

  // ── Mochi drag-out → window attach ────────────────────────────────────────

  private startGhost(x: number, y: number) {
    this.draggingGhost = true;
    this.botPress = null;
    this.cancelBotHover();
    this.botHovering = false;
    this.engine.triggerEmote("surprised");
    Sound.play("pop");
    this.botCanvas.style.opacity = "0";
    if (this.pal) this.pal.style.opacity = "0";
    this.moveGhost(x, y);
    this.ghostEl.style.display = "block";
    void Bridge.startDragFollower();
    void Bridge.log("attach drag started");
  }

  private moveGhost(x: number, y: number) {
    this.ghostEl.style.left = `${x - 27}px`;
    this.ghostEl.style.top = `${y - 30}px`;
  }

  private endGhostHidden() {
    this.draggingGhost = false;
    this.ghostEl.style.display = "none";
    this.botCanvas.style.opacity = !this.pal ? "1" : "0";
    if (this.pal) this.pal.style.opacity = "1";
    void Bridge.stopDragFollower();
    this.ensureRunning();
  }

  /** Release of the left button anywhere (Rust `mouse-up` or DOM fallback). */
  onMouseUp(x: number, y: number) {
    if (this.draggingGhost) {
      const rect = this.islandRect();
      const overIsland =
        x >= rect.x - HIT_MARGIN && x <= rect.x + rect.w + HIT_MARGIN &&
        y >= rect.y - HIT_MARGIN && y <= rect.y + rect.h + HIT_MARGIN;
      this.endGhostHidden();
      if (overIsland) return; // dropped back home: silent cancel
      void Bridge.log("attach capture");
      void Bridge.attachWindow()
        .then((win) => {
          const label = win.title || win.appName || win.name;
          State.droppedFile = { name: win.name, path: win.path };
          State.promptContext = { kind: "file", name: win.name, path: win.path };
          State.chatHistory = [];
          void Bridge.chatReset();
          void Bridge.log(`attach captured ${win.appName} ${label.slice(0, 40)}`);
          Sound.play("attach");
          this.engine.triggerEmote("wink");
          this.setView("prompt");
        })
        .catch((err) => {
          State.noteMessage = String(err).replace(/^Error:\s*/, "");
          this.setView("note");
          Sound.play("error");
          window.setTimeout(() => this.setView(State.defaultView()), 2400);
        });
      return;
    }
    if (this.botPress) {
      // Plain click on Mochi: the deferred slap. The overlay plays the same
      // tap action its own click would have fired.
      this.botPress = null;
      this.cancelBotHover();
      this.engine.slap();
      if (this.pal) void this.pal.play(String(characters[this.pal.character]?.tap ?? "squish"));
    }
  }

  // ── FSM ─────────────────────────────────────────────────────────────────────

  private wireFsm() {
    this.fsm.homeToPetitDelay = State.settings.autoCloseInterval;
    this.fsm.onTransition = (from, to) => {
      switch (to) {
        case "hidden":
          this.setMode("hidden");
          break;
        case "petit":
          if (from === "powpow") this.greeting.interrupt();
          else if (from === "hidden") Sound.play("peek");
          this.setMode("compact");
          if (from === "powpow") State.view = State.defaultView();
          if (!this.wasInIsland) this.fsm.mouseLeft();
          break;
        case "home":
          this.expand(State.defaultView());
          if (!this.wasInIsland) this.fsm.mouseLeft();
          break;
        case "powpow":
          this.expand("greeting");
          this.greeting.start();
          break;
      }
      State.notify();
    };
  }

  launch() {
    this.fsm.launch();
  }

  // ── Mode / view ─────────────────────────────────────────────────────────────

  private setMode(mode: IslandMode) {
    const prev = State.mode;
    if (mode === prev) return;
    State.mode = mode;
    if (mode === "expanded") Sound.play("open");
    if (prev === "expanded") {
      Sound.play("close");
      State.isPinned = false;
      void Bridge.focusWindow(false);
    }
    if (mode !== "expanded") {
      this.engine.resetMorph();
      // Nothing can be seen of the sequence once the island is shut, and leaving
      // it running would keep the frame loop awake — the island must cost
      // nothing while hidden.
      UploadSeq.deactivate();
    }
    this.updateWindowCollapsed();
    this.animateGeometry(modeOrder(mode) < modeOrder(prev));
    this.syncPalWander();
    State.notify();
  }

  /** True while the drop sequence owns the island body. */
  private get uploadActive(): boolean {
    return State.mode === "expanded" && UploadSeq.isActive && UPLOAD_VIEWS.has(State.view);
  }

  /** Navigating out of the drop flow ends the sequence, as on macOS. */
  private stopSequenceIfLeaving(view: IslandViewName) {
    if (UploadSeq.isActive && !UPLOAD_VIEWS.has(view)) UploadSeq.deactivate();
  }

  /**
   * Drop views pin the island: the user opened the Drop tab and is about to
   * fetch a file from Explorer, which always takes longer than the auto-close
   * delay. Without this the island retracts to its 6px strip mid-drag and the
   * OS refuses the drop ("prohibited" cursor) — the #1 drop complaint.
   * A prompt WITH an attached file pins too, so a second drop right after the
   * first chat lands on an open island instead of a hidden strip. Approval
   * pins win over everything; leaving the flow unpins unless a decision
   * is still pending.
   */
  private pinUploadIfNeeded(view: IslandViewName) {
    if (State.pendingApproval) return; // approval owns the pin
    const pinned = UPLOAD_VIEWS.has(view) || (view === "prompt" && State.promptContext != null);
    State.isPinned = pinned;
    this.fsm.pinned = pinned;
  }

  expand(view: IslandViewName) {
    this.stopSequenceIfLeaving(view);
    this.pinUploadIfNeeded(view);
    State.view = view;
    if (State.mode !== "expanded") this.setMode("expanded");
    else this.animateGeometry(false);
    State.lastActivity = performance.now();
    this.homeCollapseAt = null;
    State.notify();
  }

  setView(view: IslandViewName) {
    this.stopSequenceIfLeaving(view);
    this.pinUploadIfNeeded(view);
    if (State.mode !== "expanded") {
      this.fsm.forceHome();
      State.view = view;
      this.animateGeometry(false);
      State.notify();
      return;
    }
    const grew = VIEW_LAYOUTS[view].height >= VIEW_LAYOUTS[State.view].height;
    State.view = view;
    State.lastActivity = performance.now();
    this.animateGeometry(!grew);
    State.notify();
  }

  collapse() {
    State.isPinned = false;
    this.fsm.pinned = false;
    // Drive the state machine rather than the mode: setting the mode behind its
    // back left it thinking the island was still open, and a click on the compact
    // island then did nothing — the island could never be reopened.
    this.fsm.forcePetit();
  }

  // -- The roaming pal's card ------------------------------------------------

  /** A button pressed on the pal: every action its menu can ask for. */
  async palAction(a: { kind: string; query?: string | null }) {
    switch (a.kind) {
      case "analyze": {
        try {
          this.alert("prompt");
          const win = await Bridge.attachActiveWindow();
          State.droppedFile = { name: win.name, path: win.path };
          State.promptContext = { kind: "file", name: win.name, path: win.path };
          State.chatHistory = [];
          void Bridge.chatReset();
          Sound.play("attach");
          this.engine.triggerEmote("wink");
          await this.sendPrompt(
            win.title
              ? `${t("Analyze this screen")} - ${win.title}`
              : t("Analyze this screen"),
          );
        } catch (err) {
          State.stateOverride = null;
          State.chatHistory = [
            {
              id: Date.now(),
              role: "user",
              content: `📸 ${t("Analyze this screen")}: ${State.droppedFile?.name || "Captura"}`,
            },
            {
              id: Date.now() + 1,
              role: "assistant",
              content: `📸 Tela capturada com sucesso!\n\nArquivo: ${State.droppedFile?.name || "tela.png"}\nCaminho: ${State.droppedFile?.path || "Inbox"}\n\n💡 Observação do Mascote: Uaal, legal o que você está fazendo nesta tela! Continue firme com o excelente trabalho!\n\n(Dica: para análises completas com visão computacional, insira sua chave de API nas Configurações da Ilha).`,
            },
          ];
          State.notify();
          Sound.play("finish");
        }
        break;
      }
      case "search": {
        const q = (a.query ?? "").trim();
        if (q) await this.sendPrompt(q);
        break;
      }
      case "organize-desktop": {
        this.alert("prompt");
        await this.sendPrompt("organizar desktop");
        break;
      }
      case "create-doc": {
        this.alert("prompt");
        await this.sendPrompt("criar planilha de despesas");
        break;
      }
      case "find-files": {
        this.alert("prompt");
        await this.sendPrompt("localizar arquivo boleto");
        break;
      }
      case "ghostwriter": {
        this.alert("prompt");
        await this.sendPrompt("escreva uma resposta formal para a mensagem na tela");
        break;
      }
      case "pause":
        State.settings.wander = false;
        void Bridge.saveSettings(State.settings);
        this.applySettings();
        break;
      case "new-chat":
        this.actions.newChat();
        break;
      case "settings":
        if (State.paused) {
          State.paused = false;
          void Bridge.setPaused(false);
        }
        this.alert("settings");
        break;
      case "home":
        break; // The pal walks home on its own - the card just closed there.
    }
  }

  /** Runs a prompt through the chat, the way typing it would. */
  private async sendPrompt(query: string) {
    this.setView("prompt");
    await this.views.get("prompt")?.send?.(query);
  }

  /** Alert from the hook server: open on this view. Pinned alerts never auto-close. */
  alert(view: IslandViewName) {
    this.fsm.pinned = State.isPinned;
    this.fsm.forceHome();
    this.expand(view);
  }

  reveal() {
    this.fsm.reveal();
  }

  /** An alert stopped waiting for an answer: let the island auto-close again. */
  dropPin() {
    this.fsm.pinned = false;
  }

  // ── File drop ───────────────────────────────────────────────────────────────

  /** Guards the two drop transports (OS-level + DOM fallback) firing twice. */
  private lastSwallowAt = 0;

  private onDragDrop(e: { type: string; paths?: string[] }) {
    if (e.type !== "over") void Bridge.log(`drag ${e.type} ${e.paths?.length ?? 0} file(s)`);
    if (State.paused) return;
    switch (e.type) {
      case "enter":
      case "over": {
        if (State.fileDragOver) return;
        State.fileDragOver = true;
        this.engine.animateMorph(1);
        // enterZone must run before the island expands, so the sequence is
        // already active by the time the view becomes `upload`.
        UploadSeq.enterZone(State.mouseInIsland.x, State.mouseInIsland.y);
        this.alert("upload");
        break;
      }
      case "leave": {
        if (!State.fileDragOver) return;
        State.fileDragOver = false;
        this.engine.animateMorph(0);
        // The island deliberately stays open: the drag session is still alive.
        UploadSeq.exitZone();
        State.notify();
        break;
      }
      case "drop": {
        State.fileDragOver = false;
        const path = e.paths?.[0];
        if (!path) {
          this.engine.animateMorph(0);
          this.setView(State.defaultView());
          return;
        }
        this.swallowPath(path);
        break;
      }
    }
  }

  /**
   * DOM fallback for drops WebView2 swallows itself: when its inner render
   * target keeps the drop, the OS transport never fires and the cursor reads
   * "prohibited" — but the page still gets HTML5 drop events with the file
   * CONTENT (paths stay hidden). We read the bytes ourselves and hand them to
   * `ingest_bytes`, so a drop works whichever target wins.
   */
  private wireDomDrop() {
    document.addEventListener("dragover", (e) => {
      if (State.paused) return;
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!State.fileDragOver && State.mode === "expanded") {
        State.fileDragOver = true;
        this.engine.animateMorph(1);
        UploadSeq.enterZone(State.mouseInIsland.x, State.mouseInIsland.y);
        this.alert("upload");
      }
    });
    document.addEventListener("dragleave", (e) => {
      if (e.relatedTarget) return;
      if (!State.fileDragOver) return;
      State.fileDragOver = false;
      this.engine.animateMorph(0);
      UploadSeq.exitZone();
      State.notify();
    });
    document.addEventListener("drop", (e) => {
      if (State.paused) return;
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      e.preventDefault();
      State.fileDragOver = false;
      this.handleFile(files[0]);
    });
  }

  /**
   * One file, two ways in: a DOM drop (content only, paths hidden by WebView2)
   * and the Drop view's "Choose file" button. Both end in `ingest_bytes`, so the
   * button is a full equivalent of dragging for keyboard and screen-reader users.
   */
  private handleFile(file: File) {
    void Bridge.log(`file ${file.name} ${file.size}b`);
    if (file.size > 25 * 1024 * 1024) {
      State.noteMessage = "File too large (25 MB max).";
      this.setView("note");
      Sound.play("error");
      window.setTimeout(() => this.setView(State.defaultView()), 2400);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      const b64 = url.includes(",") ? url.split(",")[1] : "";
      if (!b64) {
        State.noteMessage = "Could not read that file.";
        this.setView("note");
        Sound.play("error");
        window.setTimeout(() => this.setView(State.defaultView()), 2400);
        return;
      }
      this.swallowBytes(file.name, b64);
    };
    reader.onerror = () => {
      State.noteMessage = "Could not read that file.";
      this.setView("note");
      Sound.play("error");
      window.setTimeout(() => this.setView(State.defaultView()), 2400);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Mochi eats the file. Nothing here waits on the file system: the copy into
   * the inbox runs in the background and swaps the path in when it lands, so a
   * slow disk can never stall the animation — same as FileDropHandler on macOS.
   */
  private swallowPath(path: string) {
    const name = path.split(/[\\/]/).pop() || "file";
    if (!this.beginSwallow(name, path)) return;
    void Bridge.ingestFile(path).then(
      (file) => this.finishSwallow(file.name, file.path),
      (err) => this.failSwallow(err),
    );
  }

  /** DOM transport: bytes already read by the page (see wireDomDrop). */
  private swallowBytes(name: string, base64Data: string) {
    if (!this.beginSwallow(name, name)) return;
    void Bridge.ingestBytes(name, base64Data).then(
      (file) => this.finishSwallow(file.name, file.path),
      (err) => this.failSwallow(err),
    );
  }

  /** Shared opening choreography. False = duplicate of a swallow in flight. */
  private beginSwallow(name: string, path: string): boolean {
    const now = performance.now();
    if (now - this.lastSwallowAt < 1500) return false;
    this.lastSwallowAt = now;
    State.droppedFile = { name, path };
    State.promptContext = { kind: "file", name, path };
    State.chatHistory = [];
    void Bridge.chatReset();

    UploadSeq.performDrop(State.uploadDuration);
    this.uploadTens = 0;
    this.uploadDone = false;

    this.engine.gulp();
    Sound.play("approve");
    this.engine.triggerEmote("happy");
    this.engine.animateMorph(0);

    State.uploadProgress = 0;
    this.setView("uploading");
    this.ensureRunning();
    // Absolute fallback: whatever happens to the ingest promise or the frame
    // loop, the uploading view must never trap the user. If we are still here
    // past the choreography + margin, move on (paths swap in whenever the
    // copy actually lands).
    window.setTimeout(() => {
      if (State.view === "uploading") {
        void Bridge.log("swallow watchdog: forcing choose");
        this.setView("choose");
      }
    }, (PRE_PROGRESS + State.uploadDuration + 1 + 4) * 1000);
    return true;
  }

  private finishSwallow(name: string, path: string) {
    State.droppedFile = { name, path };
    State.promptContext = { kind: "file", name, path };
    void Bridge.log(`swallow done ${name}`);
    State.notify();
  }

  private failSwallow(err: unknown) {
    UploadSeq.deactivate();
    const message = String(err).replace(/^Error:\s*/, "");
    void Bridge.log(`swallow failed ${message.slice(0, 120)}`);
    State.noteMessage = message;
    this.engine.animateMorph(0);
    this.setView("note");
    Sound.play("error");
    window.setTimeout(() => this.setView(State.defaultView()), 2400);
  }

  /**
   * Sounds and view changes hung off the canvas timeline: a `tick` every 10 %,
   * the ✓ chime when the bar completes, then `choose` once Mochi has grown back.
   */
  private stepSequence() {
    const since = UploadSeq.sinceDrop();
    if (since == null) return;
    const dur = State.uploadDuration;
    const p = Math.max(0, Math.min(1, (since - PRE_PROGRESS) / dur));

    // The uploading card reads State.uploadProgress — nothing else ever writes
    // it, so without this the bar sits at 0% and the drop looks frozen.
    if (State.uploadProgress !== p) {
      State.uploadProgress = p;
      this.dirty = true;
    }

    const tens = Math.floor(p * 10);
    if (tens > this.uploadTens && tens < 10) {
      this.uploadTens = tens;
      Sound.play("tick");
    }

    if (!this.uploadDone && since >= PRE_PROGRESS + dur) {
      this.uploadDone = true;
      Sound.play("approve");
      this.engine.triggerEmote("happy");
    }
    // The extra second is the grow-back, after which the choose card is up.
    if (since >= PRE_PROGRESS + dur + 1 && State.view === "uploading") {
      this.setView("choose");
    }
  }

  // ── Geometry ────────────────────────────────────────────────────────────────

  private targetSize(): { w: number; h: number; r: number } {
    const { w, h } = islandSize(State.mode, State.view, State.chatHistory.length);
    const r = State.mode === "expanded" ? EXPANDED_CORNER : ROUNDED_CORNER;
    return { w, h, r };
  }

  private animateGeometry(shrinking: boolean) {
    const { w, h, r } = this.targetSize();
    if (shrinking) {
      this.width.curveTowards(w);
      this.height.curveTowards(h);
      this.radius.curveTowards(r);
    } else {
      this.width.springTo(w);
      this.height.springTo(h);
      this.radius.springTo(r);
    }
    this.ensureRunning();
  }

  private applyGeometry() {
    const w = this.width.value;
    const hh = this.height.value;
    const r = this.radius.value;
    this.islandEl.style.width = `${w}px`;
    this.islandEl.style.height = `${hh}px`;
    this.islandEl.style.borderRadius = `0 0 ${r}px ${r}px`;
    this.islandEl.style.transform = `translateX(-50%)`;
    // These follow the island as it resizes, so they belong here rather than in
    // the state-driven DOM sync.
    this.miniGrid.style.left = `${w - 40 - 14.5}px`;
    this.miniGrid.style.top = `${hh / 2 - 14.5}px`;
    this.greetingCanvas.style.left = `${(w - EXPANDED_W) / 2}px`;
    this.uploadCanvas.el.style.left = `${(w - EXPANDED_W) / 2}px`;

    const rect = { x: (PANEL_W - w) / 2, y: 0, w, h: hh };
    // While a Drop view is up the whole window takes the mouse: a file drag
    // must see one stable target from approach to release. Flipping
    // click-through mid-drag is what makes Explorer cache "no drop" and show
    // the prohibited cursor on the second and later drags.
    const dropOpen = State.mode === "expanded" && UPLOAD_VIEWS.has(State.view);
    const hit = dropOpen ? { x: 0, y: 0, w: PANEL_W, h: PANEL_H } : rect;
    const p = this.pushedRect;
    if (Math.abs(p.x - hit.x) > 0.5 || Math.abs(p.w - hit.w) > 0.5 || Math.abs(p.h - hit.h) > 0.5) {
      this.pushedRect = hit;
      void Bridge.setIslandRect(hit.x, hit.y, hit.w, hit.h);
    }
  }

  /** Island rect in window coordinates (origin top-left of the 720×320 window). */
  private islandRect(): { x: number; y: number; w: number; h: number } {
    const w = this.width.value;
    const hh = this.height.value;
    return { x: (PANEL_W - w) / 2, y: 0, w, h: hh };
  }

  // ── Window collapse (hidden → tiny wake strip, zero polling) ────────────────

  private updateWindowCollapsed() {
    if (this.collapseTimer != null) {
      window.clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
    if (State.mode === "hidden") {
      // Let the island finish retracting, then drop the window to the wake strip:
      // from there the OS delivers no cursor events, so nothing polls at all.
      this.collapseTimer = window.setTimeout(() => {
        this.collapseTimer = null;
        if (State.mode !== "hidden") return;
        this.collapsed = true;
        this.syncPalWander();
        void Bridge.setCollapsed(true);
      }, 420);
    } else if (this.collapsed) {
      // Grow the window back before the island animates open.
      this.collapsed = false;
      void Bridge.setCollapsed(false);
      this.syncPalWander();
    }
  }

  /**
   * The roaming pal is a window of its own, so the island never has to move.
   * It comes up (and walks) only while the island is compact and nothing needs
   * the user's eyes or hands: open island, pointer resting on it, an approval or
   * chat waiting, a drag owning the screen, pause, or reduced motion.
   */
  togglePalWander() {
    State.settings.wander = !State.settings.wander;
    void Bridge.saveSettings(State.settings);
    this.syncPalWander();
    Sound.play(State.settings.wander ? "attach" : "pop");
  }

  private startCompactPlayfulness() {
    window.setInterval(() => {
      if (State.mode !== "compact" || State.paused) return;
      const r = Math.random();
      if (r < 0.35) {
        if (this.pal) {
          void this.pal.emote("star");
        }
        this.engine.triggerEmote("happy");
        Sound.play("wink");
      } else if (r < 0.65) {
        if (this.pal) void this.pal.emote("love");
        this.engine.triggerEmote("love");
        Sound.play("love");
      } else {
        if (this.pal) {
          this.pal.blink();
          void this.pal.emote("happy");
        }
        this.engine.triggerEmote("wink");
        Sound.play("wink");
      }
      this.ensureRunning();
    }, 19000);
  }

  private syncPalWander() {
    const on =
      State.settings.wander &&
      State.mode === "compact" &&
      !State.paused &&
      State.stateOverride == null &&
      State.pendingApproval == null &&
      !this.collapsed &&
      !this.wasInIsland &&
      !this.draggingGhost &&
      !State.fileDragOver &&
      !UploadSeq.isActive &&
      !reducedMotion();
    if (on === this.palRoam) return;
    this.palRoam = on;
    void Bridge.setPalWander(on);
  }

  // ── Input ───────────────────────────────────────────────────────────────────

  private wireInput() {
    // The wake strip is the only thing the OS can hit while the island is hidden.
    this.wakeStrip.addEventListener("mouseenter", () => {
      Sound.resume();
      if (State.mode === "hidden") this.fsm.mouseEntered();
    });

    this.islandEl.addEventListener("mousedown", (e) => {
      Sound.resume();
      State.lastActivity = performance.now();
      if (State.mode !== "expanded") {
        this.fsm.click();
        return;
      }
      if (this.isBotHit(e.clientX, e.clientY)) {
        // Press recorded; slap happens on release unless this becomes a
        // drag-out (> 7pt with the button held → ghost + window attach).
        this.botPress = { x: e.clientX, y: e.clientY };
      }
    });

    // DOM mouseup only fires over our window; releases outside arrive via the
    // Rust `mouse-up` event. Both funnel into onMouseUp (idempotent).
    window.addEventListener("mouseup", () => this.onMouseUp(State.mouse.x, State.mouse.y));

    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && (e.key === "8" || e.code === "Digit8")) {
        e.preventDefault();
        this.togglePalWander();
      }
      // Esc always collapses except while an approval decision is pending —
      // drop/chat pins must never trap the user (collapse() clears them).
      if (e.key === "Escape" && State.mode === "expanded" && !State.pendingApproval) this.collapse();
      State.lastActivity = performance.now();
    });

    void onEvent<boolean>("pal-wander-toggle", (on) => {
      State.settings.wander = on;
      void Bridge.saveSettings(State.settings);
      this.syncPalWander();
      Sound.play(on ? "attach" : "pop");
    });

    this.startCompactPlayfulness();

    void onDragDrop((e) => this.onDragDrop(e));
    // Our own OLE target (droptarget.rs) emits the same shape when it wins
    // the drop instead of wry's — one handler serves both transports.
    void onEvent<{ type: string; paths?: string[] }>("ext-drag", (e) => this.onDragDrop(e));
    this.wireDomDrop();

    // Outside Tauri (plain browser) drive the cursor from DOM events so the
    // island can be inspected with `npm run dev`.
    if (!IS_TAURI) {
      window.addEventListener("mousemove", (e) => this.onCursor(e.clientX, e.clientY));
    }
  }

  /** Cursor in window-logical coordinates. `down` comes from the Rust poll. */
  onCursor(x: number, y: number, down = false) {
    State.mouse = { x, y };
    // The overlay follows the pointer on its own; Tauri drives the cursor from
    // Rust, so hand it over explicitly (same coordinate space: this window).
    if (this.pal) DotPal.pointAt(x, y);
    const rect = this.islandRect();
    State.mouseInIsland = { x: x - rect.x, y: y - rect.y };

    // Press turned into a drag-out: show the ghost once past the 7pt threshold.
    if (this.botPress && down && IS_TAURI && !this.draggingGhost) {
      const d = Math.hypot(x - this.botPress.x, y - this.botPress.y);
      if (d > 7) this.startGhost(x, y);
    }
    if (this.draggingGhost) {
      this.moveGhost(x, y);
      this.ensureRunning();
      return; // no enter/leave, hover or auto-close bookkeeping mid-drag
    }

    // Windows sends no cursor position with an OLE drag, so the drop sequence is
    // fed from the Win32 cursor poll instead — it runs throughout the drag.
    if (UploadSeq.isActive && !UploadSeq.dropped) {
      UploadSeq.updateCursor(State.mouseInIsland.x, State.mouseInIsland.y);
    }

    const inIsland =
      x >= rect.x - HIT_MARGIN && x <= rect.x + rect.w + HIT_MARGIN &&
      y >= rect.y - HIT_MARGIN && y <= rect.y + rect.h + HIT_MARGIN;

    if (inIsland && !this.wasInIsland) {
      if (this.fsm.state === "powpow") this.greeting.hover();
      this.fsm.mouseEntered();
      this.homeCollapseAt = null;
    }
    if (inIsland && State.settings.openOnHover && State.mode !== "expanded") {
      if (this.hoverOpenTimer == null) {
        this.hoverOpenTimer = window.setTimeout(() => {
          this.hoverOpenTimer = null;
          if (this.wasInIsland && State.mode !== "expanded" && State.settings.openOnHover) {
            this.fsm.click();
          }
        }, 280);
      }
    } else if (!inIsland && this.hoverOpenTimer != null) {
      window.clearTimeout(this.hoverOpenTimer);
      this.hoverOpenTimer = null;
    }
    if (!inIsland && this.wasInIsland) {
      this.fsm.mouseLeft();
      if (this.fsm.state === "home" && !State.isPinned) {
        this.homeCollapseAt = performance.now() + State.settings.autoCloseInterval * 1000;
      }
    }
    this.wasInIsland = inIsland;
    this.syncPalWander();

    // Bot hover → love
    const overBot = State.mode === "expanded" && State.stateOverride == null && this.isBotHit(x, y);
    if (overBot && !this.botHovering) this.botHoverIn(x, y);
    if (!overBot && this.botHovering) this.cancelBotHover();
    this.botHovering = overBot;
    if (this.botHovering) {
      const d = Math.hypot(x - this.botHoverStart.x, y - this.botHoverStart.y);
      if (d > 40) {
        this.botHoverStart = { x, y };
        this.scheduleLove();
      }
    }

    this.ensureRunning();
  }

  private isBotHit(x: number, y: number): boolean {
    const rect = this.islandRect();
    const cx = rect.x + this.botCx.value;
    const cy = rect.y + this.botCy.value;
    const radius = this.botSize.value / 2;
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
  }

  private botHoverIn(x: number, y: number) {
    if (performance.now() / 1000 - this.lastLoveTime < 6) return;
    this.botHoverStart = { x, y };
    this.engine.blink();
    this.pal?.blink();
    this.engine.tgEs = 1.08;
    Sound.play("hover");
    this.scheduleLove();
  }

  private scheduleLove() {
    if (this.botHoverTimer != null) window.clearTimeout(this.botHoverTimer);
    this.botHoverTimer = window.setTimeout(() => {
      this.botHoverTimer = null;
      if (!this.botHovering || State.stateOverride != null) return;
      if (performance.now() / 1000 - this.lastLoveTime < 6) return;
      this.lastLoveTime = performance.now() / 1000;
      this.engine.triggerEmote("love");
      void this.pal?.emote("love");
      Sound.play("love");
    }, 1900);
  }

  private cancelBotHover() {
    if (this.botHoverTimer != null) window.clearTimeout(this.botHoverTimer);
    this.botHoverTimer = null;
    this.engine.tgEs = 1;
  }

  /** Three slaps → dizzy + confused view for 3.3 s, then back. */
  private handleDizzy() {
    this.prevViewBeforeConfused = State.view;
    State.stateOverride = "dizzy";
    this.setBotState("dizzy");
    void this.pal?.emote("dizzy", 3300);
    Sound.play("dizzy");
    this.alert("confused");
    if (this.confusedRecovery != null) window.clearTimeout(this.confusedRecovery);
    this.confusedRecovery = window.setTimeout(() => {
      this.confusedRecovery = null;
      State.stateOverride = null;
      this.setBotState(State.effectiveState);
      if (State.view === "confused") {
        const fallback = State.defaultView();
        this.setView(this.prevViewBeforeConfused === "confused" ? fallback : this.prevViewBeforeConfused);
      }
      this.engine.triggerEmote("happy");
    }, 3300);
  }

  // ── Frame loop ──────────────────────────────────────────────────────────────

  ensureRunning() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(this.frame);
  }

  private frame = (nowMs: number) => {
    const dt = Math.min(0.05, (nowMs - this.lastFrame) / 1000);
    this.lastFrame = nowMs;

    this.width.step(dt, nowMs);
    this.height.step(dt, nowMs);
    this.radius.step(dt, nowMs);
    this.applyGeometry();

    if (this.dirty) {
      this.dirty = false;
      this.syncDom();
    }

    this.updateBotTargets();
    this.botCx.step(dt);
    this.botCy.step(dt);
    this.botSize.step(dt);

    const greetingActive = State.mode === "expanded" && State.view === "greeting";
    if (greetingActive) {
      const gctx = this.greetingCanvas.getContext("2d");
      if (gctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.greeting.draw(gctx);
      }
    } else {
      // Kept running even while the drop canvas is up, so the island's own Mochi
      // is already in the right place the moment the canvas fades out.
      this.drawBot(dt);
    }

    const uploadActive = this.uploadActive;
    if (uploadActive) this.uploadCanvas.draw(UploadSeq.frame(), nowMs / 1000);
    this.uploadCanvas.el.classList.toggle("on", uploadActive);
    this.viewsEl.classList.toggle("hidden-by-upload", uploadActive);

    tickMiniBots(dt);
    this.views.get(State.view)?.tick?.(nowMs);
    if (UploadSeq.isActive) this.stepSequence();
    this.updateCountdown(nowMs);

    // Nothing is drawn while the island is hidden, so nothing may keep the loop
    // alive either. This used to read `... || this.engine.busy || State.mode !==
    // "hidden"`, and engine.busy is permanently true for any state with a
    // looping animation — breathing, ratelimit sweat, sleeping z's, the search
    // sweep — so a hidden island went on burning frames in exactly the states it
    // spends most of its life in. Geometry still has to finish retracting.
    const settling =
      this.width.animating || this.height.animating || this.radius.animating;
    const busy = State.mode === "hidden"
      ? settling
      : settling ||
        !this.botCx.settled || !this.botCy.settled || !this.botSize.settled ||
        greetingActive || this.engine.busy || UploadSeq.isActive;

    if (busy) {
      requestAnimationFrame(this.frame);
    } else {
      this.running = false;
      Sound.idle();
    }
  };

  private updateBotTargets() {
    const p = botPosition(State.mode, State.view, this.height.value, State.uploadProgress);
    this.botCx.target = p.cx;
    this.botCy.target = p.cy;
    this.botSize.target = p.diameter / 0.6;

    const greetingActive = State.mode === "expanded" && State.view === "greeting";
    // The drop canvas draws its own Mochi; two of them would overlap. The drag
    // ghost replaces the bot too while a window attach is in flight. The overlay
    // and the canvas show the same bot, so exactly one of them is ever opaque.
    const visible = p.opacity > 0 && !greetingActive && !this.uploadActive && !this.draggingGhost;
    this.botCanvas.style.opacity = visible && !this.pal ? "1" : "0";
    if (this.pal) this.pal.style.opacity = visible ? "1" : "0";

    if (State.mode === "expanded" && State.view !== "uploading" && !greetingActive && !this.uploadActive) {
      const d = p.diameter;
      const color = botGlowColor(State.effectiveState);
      this.botGlow.style.display = "block";
      this.botGlow.style.width = `${d * 2.2}px`;
      this.botGlow.style.height = `${d * 2.2}px`;
      this.botGlow.style.left = `${this.botCx.value - d * 1.1}px`;
      this.botGlow.style.top = `${this.botCy.value - d * 1.1}px`;
      this.botGlow.style.background = `radial-gradient(circle, ${color} 0%, transparent 62%)`;
      this.botGlow.style.opacity = String(botGlowOpacity(State.effectiveState));
    } else {
      this.botGlow.style.display = "none";
    }
  }

  private drawBot(dt: number) {
    const size = this.botSize.value;
    if (this.pal) {
      const isCompact = State.mode === "compact";
      const targetBubble = isCompact ? "none" : "text";
      if (this.pal.getAttribute("bubble") !== targetBubble) {
        this.pal.setAttribute("bubble", targetBubble);
      }
      // Scale dot-pal to sit prominently: 26-28px in compact notch, 72-76px in expanded card.
      const targetD = size * 0.6;
      const d = isCompact
        ? Math.min(28, Math.max(25, Math.round(targetD * 1.35)))
        : Math.min(78, Math.max(68, Math.round(targetD * 1.25)));
      const px = String(d);
      if (this.pal.getAttribute("size") !== px) this.pal.setAttribute("size", px);
      this.pal.style.width = `${d}px`;
      this.pal.style.height = `${d}px`;
      this.pal.style.left = `${Math.round(this.botCx.value - d / 2)}px`;
      this.pal.style.top = `${Math.round(this.botCy.value - d / 2)}px`;
    }
    const w = Math.max(1, Math.round(size));
    const hCss = w + BOT_OVERHANG;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvasPx !== w) {
      this.canvasPx = w;
      this.botCanvas.width = Math.round(w * dpr);
      this.botCanvas.height = Math.round(hCss * dpr);
      this.botCanvas.style.width = `${w}px`;
      this.botCanvas.style.height = `${hCss}px`;
    }
    this.botCanvas.style.left = `${this.botCx.value - w / 2}px`;
    this.botCanvas.style.top = `${this.botCy.value - BOT_OVERHANG / 2 - hCss / 2}px`;

    const ctx = this.botCanvas.getContext("2d");
    if (!ctx) return;

    const focus = State.focusTask;
    this.engine.showBadge = State.mode === "expanded";
    this.engine.bodyColor = focus?.isIntegration ? hexToRGB(focus.color) : null;
    this.engine.particleOverhang = BOT_OVERHANG;
    this.engine.lookX = this.lookX();
    this.engine.lookY = this.lookY();
    if (this.engine.morph > 0.3) {
      this.engine.slotHTarget = State.fileDragOver ? 0.2 : 0;
    } else {
      this.engine.slotHTarget = 0;
      if (this.engine.morph < 0.05) {
        this.engine.slotH = 0;
        this.engine.slotHVel = 0;
      }
    }
    this.engine.update(dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hCss);
    this.engine.draw(ctx, w, hCss);
  }

  /** BotCanvasView.lookX / lookY — tanh of the distance to the bot. */
  private lookX(): number {
    const rect = this.islandRect();
    const botScreenX = rect.x + this.botCx.value;
    return Math.tanh((State.mouse.x - botScreenX) / 260);
  }

  private lookY(): number {
    return -Math.tanh((State.mouse.y - this.botCy.value) / 200);
  }

  private updateCountdown(nowMs: number) {
    if (State.mode !== "expanded" || State.isPinned || this.homeCollapseAt == null) {
      this.countdown.style.width = "0px";
      return;
    }
    const autoClose = State.settings.autoCloseInterval;
    const windowS = Math.min(10, autoClose * 0.6);
    const remaining = (this.homeCollapseAt - nowMs) / 1000;
    this.countdown.style.width =
      remaining < windowS ? `${Math.max(0, clamp(remaining / windowS, 0, 1) * 160)}px` : "0px";
  }

  // ── DOM sync ────────────────────────────────────────────────────────────────

  private syncDom() {
    const expanded = State.mode === "expanded";
    const greetingActive = expanded && State.view === "greeting";
    this.islandEl.classList.toggle("expanded", expanded);

    this.contentEl.style.opacity = expanded && !greetingActive ? "1" : "0";
    this.contentEl.style.pointerEvents = expanded && !greetingActive ? "auto" : "none";
    this.greetingCanvas.style.display = greetingActive ? "block" : "none";

    this.header.sync();
    for (const [name, view] of this.views) {
      const on = name === State.view;
      view.el.classList.toggle("on", on);
      if (on) view.sync();
    }

    // The chat is the only view with a text field, so it is the only time the
    // island is allowed to take keyboard focus.
    if (this.lastSyncedView !== State.view) {
      const wasChat = this.lastSyncedView === "prompt";
      this.lastSyncedView = State.view;
      if (State.view === "prompt") {
        void Bridge.focusWindow(true);
        window.setTimeout(() => this.views.get("prompt")?.focus?.(), 120);
      } else if (wasChat) {
        void Bridge.focusWindow(false);
      }
    }

    // Compact mini grid
    const showGrid = State.mode === "compact";
    this.miniGrid.style.opacity = showGrid ? "1" : "0";
    if (showGrid) {
      const others = State.otherTasks.slice(0, 4);
      const key = others.map((t) => t.id).join("|");
      if (this.miniGrid.dataset.key !== key) {
        this.miniGrid.dataset.key = key;
        this.miniGrid.replaceChildren();
        for (const t of others) {
          this.miniGrid.append(createMiniBot(t, 13));
        }
        pruneMiniBots();
      }
    }

    syncMiniBotStates(State.tasks);
    this.setBotState(State.effectiveState);
  }

  /** Engine state + the overlay's mirror of it, always moved together. */
  private setBotState(s: BotStateName) {
    this.engine.setState(s);
    this.syncPal(s);
    // Approval, question, chat and pause all land here through State.notify().
    this.syncPalWander();
  }

  /**
   * The overlay mirrors the state with one short line in a speech bubble and,
   * when the state really changes, the face that explains it. Both are keyed on
   * the island's own state names, so `searching` and `ratelimit` read
   * differently even though the component has no state for them.
   */
  private syncPal(s: BotStateName) {
    const isExpanded = State.mode === "expanded";
    const text = isExpanded ? this.bubbleText(s) : "";
    const changed = s !== this.palState;
    if (!changed && text === this.palStateText) return;
    this.palState = s;
    this.palStateText = text;
    // The roaming pal wears the same face; only a real change reaches Rust.
    if (changed) void Bridge.setPalState(s);
    // The voice belongs to the state, not to the overlay: Mochi speaks too.
    if (changed && isExpanded && PAL_VOICE.has(s)) Sound.say(text);
    const pal = this.pal;
    if (!pal) return;
    pal.setAttribute("bubble", isExpanded ? "text" : "none");
    pal.setState(PAL_STATE[s] ?? "idle", isExpanded && text ? { text } : undefined);
    const emote = changed ? PAL_EMOTE[s] : undefined;
    if (emote) void pal.emote(emote);
  }

  /**
   * The step the focused task is on, ready for one short line: the source tag
   * (`[Claude]`) belongs to the Story view, not to a speech bubble, and 46
   * chars is what the bubble can hold before it swallows the pal.
   */
  private currentStep(): string | undefined {
    const focus = State.focusTask;
    const raw = focus ? focus.steps[focus.stepIndex] : undefined;
    if (!raw) return undefined;
    const step = raw.replace(/^\[[^\]]+\]\s*/, "");
    if (!step) return undefined;
    return step.length > 46 ? `${step.slice(0, 45)}…` : step;
  }

  /** One short line for the speech bubble, in the language picked in Settings. */
  private bubbleText(s: BotStateName): string {
    // While the pal thinks, searches or works, the bubble says what is actually
    // happening - the prompt you just sent, the command about to run - and only
    // falls back to the fixed line when there is no step to quote. `stateOverride`
    // is chat/dizzy territory: there the state is ours, not a task's, so the last
    // step would be stale.
    const step = State.stateOverride ? undefined : this.currentStep();
    switch (s) {
      case "working":
        return step ?? t("Working…");
      case "thinking":
        return step ?? t("Thinking…");
      case "searching":
        return step ?? t("Searching…");
      case "approval": {
        const tool = State.pendingApproval?.tool;
        return tool ? t("Allow {tool}?").replace("{tool}", tool) : t("Allow?");
      }
      case "question":
        return t("Question for you");
      case "error":
        return t("Something went wrong");
      case "finished":
        return t("Done!");
      case "ratelimit":
        return t("Too many hits at once.");
      case "sleeping":
        return t("Sleeping…");
      case "dizzy":
        return t("Whoa…");
      case "idle":
      default:
        return "";
    }
  }

  /**
   * Settings › Character. Mochi (the canvas) and the `<dot-pal>` overlay never
   * draw at the same time: one element, swapped in place.
   */
  private applyCharacter() {
    const want = State.settings.character || "mochi";
    // Your own pal: the spec can arrive (or change) while "custom" stays
    // selected, so register it first and re-draw even when the id is unchanged.
    if (want === "custom") {
      if (State.settings.custom) registerCustom(State.settings.custom as CustomPal);
      if (want === this.palCharacter) {
        DotPal.refresh("custom");
        return;
      }
    }
    if (want === this.palCharacter) return;
    this.palCharacter = want;
    if (want === "mochi") {
      this.pal?.remove();
      this.pal = null;
    } else {
      if (!this.pal) {
        // Same contract as the canvas: invisible to the mouse, so the island's
        // own hit test (isBotHit) keeps driving hover, slaps and drag-out.
        // bubble="text": the short line syncPal() picks, never the progress glyph.
        const el = h("dot-pal", {
          id: "bot-pal",
          bubble: State.mode === "compact" ? "none" : "text",
        });
        this.botCanvas.after(el);
        this.pal = el;
      }
      this.pal.character = want;
      this.palState = null;
      this.palStateText = "";
      this.syncPal(State.effectiveState);
    }
    const oldGhost = this.ghostEl;
    this.ghostEl = this.buildGhost();
    oldGhost.replaceWith(this.ghostEl);
    this.dirty = true;
    this.ensureRunning();
  }

  /** Applies settings coming from Rust at boot (and on every save). */
  applySettings() {
    Sound.setEnabled(State.settings.soundEnabled);
    Sound.setVolume(State.settings.soundVolume);
    Sound.setVoice(
      State.settings.voiceEnabled,
      State.settings.language === "pt-BR" ? "pt-BR" : "en-US",
    );
    this.fsm.homeToPetitDelay = State.settings.autoCloseInterval;
    this.applyTheme();
    this.applyCharacter();
    this.syncPalWander();
    if (State.settings.language !== this.lastLang) {
      this.lastLang = State.settings.language;
      this.rebuildChrome();
    }
    State.notify();
  }

  /** Island theme is pure CSS: one attribute, instant, no rebuild. */
  private applyTheme() {
    const theme =
      State.settings.theme === "ice" ||
      State.settings.theme === "frost" ||
      State.settings.theme === "glass" ||
      State.settings.theme === "aqua"
        ? State.settings.theme
        : "onyx";
    this.root.dataset.theme = theme;
  }

  get panelSize() {
    return { w: PANEL_W, h: PANEL_H };
  }

  get chatHeight() {
    return chatPromptHeight(State.chatHistory.length);
  }
}
