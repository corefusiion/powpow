// The roaming pal — a window of its own that keeps the user company on the
// desktop while the island stays parked at the top. It walks with a purpose:
// it stands beside the cursor to watch what the user is doing, comes under the
// island when something needs attention, and only strolls on its own when
// nothing is happening. Transparent, frameless and click-through (Rust opens
// the mouse up only over the character or the menu card), clicking it offers a
// card of actions — the island owns what each one means.

import "./pal.css";
import { Bridge, IS_TAURI, onEvent, type BootInfo, type IntegrationUpdate, type AttachedWindow, type ChatContext } from "./core/bridge";
import { PANEL_H, PANEL_W, type BotStateName, type BotEmoteName } from "./core/layout";
import { PAL_EMOTE, PAL_STATE } from "./island/palState";
import { BotEngine } from "./mochi/engine";
import { State, type Settings } from "./core/state";
import { t } from "./core/i18n";
import { h } from "./views/dom";
import { DotPal, registerCustom, type CustomPal, type Emote } from "../../src/index.js";
import { Sound } from "./core/sound";

// Window geometry — mirrors tauri.conf.json's "pal" entry. The body keeps the
// old 140x250 box at the window's left edge; the remaining width is the room
// the card opens into (360px) or the screen chat popup (540x440px).
const CARD_W = 360;
const PAL_W = 140;
const PAL_H = 250;
const CHAT_W = 540;
const CHAT_H = 440;
// Mochi's canvas: the body is 60 % of it, so 130 px of canvas is the 78 px
// body the dot-pal wears too — both sit on the centre of the body's box.
const BOT_SIZE = 130;
const BOT_OVERHANG = 40;
const DP_SIZE = 106;

// The stroll: a gentle, calm, leisurely walk (28 px/s)
const SPEED = 28;
let walkSpeed = SPEED;
const ACCEL = 35; // px/s^2 soft acceleration / deceleration
let currentVelocity = 0;
const IDLE_MIN = 45000;
const IDLE_MAX = 80000;
const SETTLE = 2;
// Clear of the screen edges, and of whatever sits along the bottom.
const PAD_X = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 64;
// The island owns the top centre; the pal never walks under it.
const KEEP_OUT = 24;
// Watching: consider user active if cursor moved in the last 8 seconds
const WATCH_STILL_MS = 8000;
const ROUTE_EPS = 12;
// "Back to the island": steer there for a while, whatever else is going on.
const ESCORT_MS = 15000;
// The states that mean "come and tell me" — the pal stands under the island.
const NOTABLE = new Set<BotStateName>(["finished", "error", "approval", "question"]);

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface Pt {
  x: number;
  y: number;
}
type Rule = "report" | "watch" | "tour";

const root = document.getElementById("pal-root")!;
const cardEl = document.getElementById("pal-card")!;
const searchWrap = document.getElementById("pal-search")!;
const searchOpenBtn = cardEl.querySelector<HTMLElement>('[data-action="search-open"]')!;
const searchInput = document.getElementById("pal-search-input") as HTMLInputElement;
const engine = new BotEngine();

// Attentive desktop companion thoughts and observation system
const thoughtEl = document.getElementById("pal-thought");
const thoughtTextEl = document.getElementById("pal-thought-content");

// Informative notification popup elements (no audio, rich formatted card)
const alertPopupEl = document.getElementById("pal-alert-popup");
const alertBadgeEl = document.getElementById("pal-alert-badge");
const alertIconEl = document.getElementById("pal-alert-icon");
const alertTypeEl = document.getElementById("pal-alert-type");
const alertSenderEl = document.getElementById("pal-alert-sender");
const alertSubjectEl = document.getElementById("pal-alert-subject");
const alertSnippetEl = document.getElementById("pal-alert-snippet");
const alertProgressFillEl = document.getElementById("pal-alert-progress-fill");
const alertCloseBtn = document.getElementById("pal-alert-close");
const alertAuraEl = document.getElementById("pal-alert-aura");
const alertReplyBtn = document.getElementById("pal-alert-reply-btn") as HTMLButtonElement | null;
const alertReplyBox = document.getElementById("pal-alert-reply-box");
const alertReplyTo = document.getElementById("pal-alert-reply-to");
const alertReplyInput = document.getElementById("pal-alert-reply-input") as HTMLTextAreaElement | null;
const alertReplyCancel = document.getElementById("pal-alert-reply-cancel") as HTMLButtonElement | null;
const alertReplySend = document.getElementById("pal-alert-reply-send") as HTMLButtonElement | null;
const alertReplyStatus = document.getElementById("pal-alert-reply-status");

// Screen Analysis & Chat Popup elements
const chatPopupEl = document.getElementById("pal-chat-popup");
const chatAppIconEl = document.getElementById("pal-chat-app-icon");
const chatAppNameEl = document.getElementById("pal-chat-app-name");
const chatTargetTitleEl = document.getElementById("pal-chat-target-title");
const chatMessagesEl = document.getElementById("pal-chat-messages");
const chatInputEl = document.getElementById("pal-chat-input") as HTMLTextAreaElement | null;
const chatSendBtn = document.getElementById("pal-chat-send-btn") as HTMLButtonElement | null;
const chatRecaptureBtn = document.getElementById("pal-chat-recapture-btn");
const chatClearBtn = document.getElementById("pal-chat-clear-btn");
const chatCloseBtn = document.getElementById("pal-chat-close-btn");
const chatQuickTagsEl = document.getElementById("pal-chat-quick-tags");

let isChatOpen = false;
let isChatSending = false;
let currentAttachedWindow: AttachedWindow | null = null;
let typingRowEl: HTMLElement | null = null;

let isAlertOpen = false;
let isReplying = false;
let alertTimer: number | null = null;
let alertStartTimestamp = 0;
let alertDurationMs = 30000;
let alertRemainingMs = 30000;

let currentAlertService = "";
let currentAlertSenderRaw = "";
let currentAlertSubject = "";

let thoughtTimer: number | null = null;
let lastObservationTime = 0;
const OBSERVATION_INTERVAL_MS = 48000; // minimum 48s between thoughts (anti-spam)

let lastAiInspectTime = 0;
const AI_INSPECT_COOLDOWN_MS = 120000; // 2 minutes cooldown (economical)
let lastInspectedApp = "";
let lastInspectedTitle = "";
let isAiInspectBusy = false;

type CompanionEmote = "happy" | "star" | "wink" | "love" | "surprised";

function triggerEmote(emote: CompanionEmote) {
  const engineEmote: BotEmoteName = emote === "star" ? "happy" : emote;
  const palEmote: Emote =
    emote === "surprised" ? "wide" : emote === "wink" ? "happy" : emote;
  engine.triggerEmote(engineEmote);
  if (pal) void pal.emote(palEmote);
}

function showThought(
  text: string,
  emote: CompanionEmote = "happy",
  durationMs = 4800,
  isAlert = false,
) {
  if (!thoughtEl || !thoughtTextEl) return;
  if (thoughtTimer != null) {
    window.clearTimeout(thoughtTimer);
    thoughtTimer = null;
  }
  thoughtTextEl.textContent = text;
  thoughtEl.hidden = false;
  if (isAlert) {
    thoughtEl.classList.add("is-alert");
  } else {
    thoughtEl.classList.remove("is-alert");
  }
  Sound.play("peek");
  triggerEmote(emote);

  thoughtTimer = window.setTimeout(() => {
    if (thoughtEl) {
      thoughtEl.hidden = true;
      thoughtEl.classList.remove("is-alert");
    }
    thoughtTimer = null;
  }, durationMs);
}

function closeAlertPopup() {
  if (alertTimer != null) {
    window.clearTimeout(alertTimer);
    alertTimer = null;
  }
  isAlertOpen = false;
  isReplying = false;
  if (alertReplyBox) alertReplyBox.hidden = true;
  if (alertReplyBtn) alertReplyBtn.hidden = true;
  if (alertReplyStatus) alertReplyStatus.hidden = true;
  if (alertReplyInput) alertReplyInput.value = "";
  if (alertPopupEl) alertPopupEl.hidden = true;
  if (alertAuraEl) alertAuraEl.hidden = true;
  void Bridge.setPalFocus(false);
  pushRect();
}

function extractEmailAddress(from: string): string {
  const angle = from.match(/<([^>]+)>/);
  if (angle) return angle[1].trim();
  const direct = from.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (direct) return direct[0].trim();
  return from.trim();
}

function openReplyMode() {
  if (!isAlertOpen) return;
  isReplying = true;
  if (alertTimer != null) {
    window.clearTimeout(alertTimer);
    alertTimer = null;
  }
  if (alertReplyBtn) alertReplyBtn.hidden = true;
  if (alertReplyBox) alertReplyBox.hidden = false;
  if (alertReplyStatus) alertReplyStatus.hidden = true;
  if (alertReplyTo) alertReplyTo.textContent = `Para: ${currentAlertSenderRaw || "remetente"}`;
  if (alertReplyInput) {
    alertReplyInput.value = "";
    alertReplyInput.focus();
  }
  void Bridge.setPalFocus(true);
}

function cancelReplyMode() {
  isReplying = false;
  if (alertReplyBox) alertReplyBox.hidden = true;
  if (alertReplyBtn) alertReplyBtn.hidden = false;
  if (alertReplyStatus) alertReplyStatus.hidden = true;
  void Bridge.setPalFocus(false);
  alertStartTimestamp = performance.now();
  alertRemainingMs = 12000;
  alertTimer = window.setTimeout(() => {
    closeAlertPopup();
  }, alertRemainingMs);
}

async function sendReply() {
  if (!alertReplyInput) return;
  const text = alertReplyInput.value.trim();
  if (!text) {
    alertReplyInput.focus();
    return;
  }

  const recipient = extractEmailAddress(currentAlertSenderRaw);
  if (!recipient) {
    alertReplyInput.focus();
    return;
  }

  if (alertReplySend) {
    alertReplySend.disabled = true;
    alertReplySend.textContent = "Enviando...";
  }

  try {
    const res = await Bridge.sendEmailReply(
      currentAlertService,
      recipient,
      currentAlertSubject,
      text,
    );
    if (alertReplyStatus) {
      alertReplyStatus.textContent = res === "sent" ? "✓ Resposta enviada!" : "✓ Aberto no navegador!";
      alertReplyStatus.hidden = false;
    }
    window.setTimeout(() => {
      closeAlertPopup();
    }, 2400);
  } catch {
    if (alertReplyStatus) {
      alertReplyStatus.textContent = "✓ Aberto no navegador!";
      alertReplyStatus.hidden = false;
    }
    window.setTimeout(() => {
      closeAlertPopup();
    }, 2400);
  } finally {
    if (alertReplySend) {
      alertReplySend.disabled = false;
      alertReplySend.textContent = "Enviar ✈️";
    }
  }
}

function triggerVisualAlert(options?: {
  emote?: CompanionEmote;
  pose?: "celebrate" | "wave" | "think" | "observe";
}) {
  const emotes: CompanionEmote[] = ["star", "happy", "surprised", "love", "wink"];
  const chosenEmote = options?.emote ?? emotes[Math.floor(Math.random() * emotes.length)];

  triggerEmote(chosenEmote);
  // NO AUDIO: User specifically requested visual effects and animations without audio.

  if (pal) {
    const poses: Array<"celebrate" | "wave" | "observe"> = ["celebrate", "wave", "observe"];
    const chosenPose = options?.pose ?? poses[Math.floor(Math.random() * poses.length)];
    pal.setPose(chosenPose);
    window.setTimeout(() => {
      if (pal && (pal.pose === "celebrate" || pal.pose === "wave")) {
        pal.setPose("idle");
      }
    }, 4500);
  }

  root.classList.remove("pal-alert-bounce");
  void root.offsetWidth;
  root.classList.add("pal-alert-bounce");
  window.setTimeout(() => {
    root.classList.remove("pal-alert-bounce");
  }, 900);

  if (alertAuraEl) {
    alertAuraEl.hidden = false;
    window.setTimeout(() => {
      if (alertAuraEl) alertAuraEl.hidden = true;
    }, 3200);
  }
}

interface AlertPopupData {
  theme: "theme-email" | "theme-gmail" | "theme-outlook" | "theme-whatsapp" | "theme-calendar";
  icon: string;
  typeLabel: string;
  sender: string;
  subject: string;
  snippet: string;
  service?: "gmail" | "outlook" | "whatsapp" | "calcom";
  senderRaw?: string;
  durationMs?: number;
}

function showAlertPopup(data: AlertPopupData) {
  if (!alertPopupEl) return;
  if (cardOpen) setCard(false);

  closeAlertPopup();
  isAlertOpen = true;

  currentAlertService = data.service || "";
  currentAlertSenderRaw = data.senderRaw || data.sender;
  currentAlertSubject = data.subject || "";

  alertPopupEl.className = `pal-alert-popup ${data.theme}`;
  if (alertBadgeEl) alertBadgeEl.className = `pal-alert-badge ${data.theme}`;
  if (alertIconEl) alertIconEl.textContent = data.icon;
  if (alertTypeEl) alertTypeEl.textContent = data.typeLabel;
  if (alertSenderEl) alertSenderEl.textContent = data.sender;
  if (alertSubjectEl) alertSubjectEl.textContent = data.subject;
  if (alertSnippetEl) alertSnippetEl.textContent = data.snippet;

  // Show "Responder" button for emails
  const isEmail = data.service === "gmail" || data.service === "outlook";
  if (alertReplyBtn) {
    alertReplyBtn.hidden = !isEmail;
  }
  if (alertReplyBox) alertReplyBox.hidden = true;
  if (alertReplyStatus) alertReplyStatus.hidden = true;

  // 30 seconds default duration for comfortable reading
  alertDurationMs = data.durationMs || 30000;
  alertRemainingMs = alertDurationMs;
  alertStartTimestamp = performance.now();

  if (alertProgressFillEl) {
    alertProgressFillEl.style.transition = "none";
    alertProgressFillEl.style.width = "100%";
    void alertProgressFillEl.offsetWidth;
    alertProgressFillEl.style.transition = `width ${alertDurationMs}ms linear`;
    alertProgressFillEl.style.width = "0%";
  }

  alertPopupEl.hidden = false;
  pushRect();

  alertTimer = window.setTimeout(() => {
    closeAlertPopup();
  }, alertDurationMs);
}

function cleanSnippet(raw?: string): string {
  if (!raw) return "";
  const doc = new DOMParser().parseFromString(raw, "text/html");
  let text = (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  if (text.length > 140) text = text.slice(0, 137) + "…";
  return text;
}

// ── Stateful Deduplication for Intelligent Assistant Alerts ───────────────
const seenEmailKeys = new Set<string>();
let isEmailInitialPollDone = false;

let lastWhatsAppCount = 0;
let lastWhatsAppAlertTime = 0;
let isWhatsAppInitialPollDone = false;

const seenBookingKeys = new Set<string>();
const notifiedMeetingTimes = new Set<string>();
let isCalcomInitialPollDone = false;
let lastKnownBookings: Array<{ id: string; title: string; start: string; attendeeName?: string }> = [];

async function handlePalIntegrationAlert(update: IntegrationUpdate) {
  if (update.error) return;

  // 1. Email alerts (Gmail & Outlook)
  if (update.id === "integration_gmail" || update.id === "integration_outlook") {
    const latest = Array.isArray(update.data?.latest)
      ? (update.data.latest as Array<{ from: string; subject: string; snippet?: string }>)
      : [];

    if (!isEmailInitialPollDone) {
      isEmailInitialPollDone = true;
      for (const m of latest) {
        seenEmailKeys.add(`${update.id}:${m.from}:${m.subject}`);
      }
      return;
    }

    const newEmails = latest.filter((m) => !seenEmailKeys.has(`${update.id}:${m.from}:${m.subject}`));
    if (newEmails.length === 0) return;

    for (const m of newEmails) {
      seenEmailKeys.add(`${update.id}:${m.from}:${m.subject}`);
    }

    const newest = newEmails[0];
    const cleanFrom = (newest.from || "Alguém")
      .replace(/<[^>]+>/g, "")
      .replace(/"/g, "")
      .trim();
    const cleanSubj = newest.subject || "(Sem assunto)";
    const snippetText = cleanSnippet(newest.snippet) || "Novo e-mail recebido na sua caixa de entrada.";

    legs = [];
    currentVelocity = 0;
    idleUntil = performance.now() + 9000;

    triggerVisualAlert({ emote: "star", pose: "celebrate" });

    const isGmail = update.id === "integration_gmail";
    showAlertPopup({
      theme: isGmail ? "theme-gmail" : "theme-outlook",
      icon: isGmail ? "📬" : "✉️",
      typeLabel: isGmail ? "Gmail" : "Outlook",
      sender: cleanFrom || "Novo E-mail",
      subject: cleanSubj,
      snippet: snippetText,
      service: isGmail ? "gmail" : "outlook",
      senderRaw: newest.from || "",
      durationMs: 30000,
    });
    return;
  }

  // 2. WhatsApp messages
  if (update.id === "integration_whatsapp") {
    const unread = Number(update.data?.unread ?? 0);
    const contact = (update.data?.contact as string | undefined)?.trim() || "";

    if (!isWhatsAppInitialPollDone) {
      isWhatsAppInitialPollDone = true;
      lastWhatsAppCount = unread;
      return;
    }

    const now = performance.now();
    if (unread > lastWhatsAppCount && unread > 0 && now - lastWhatsAppAlertTime > 16000) {
      lastWhatsAppAlertTime = now;
      lastWhatsAppCount = unread;

      legs = [];
      currentVelocity = 0;
      idleUntil = performance.now() + 8000;

      triggerVisualAlert({ emote: "wink", pose: "wave" });

      showAlertPopup({
        theme: "theme-whatsapp",
        icon: "💬",
        typeLabel: "WhatsApp",
        sender: contact || "WhatsApp Web",
        subject: unread === 1 ? "1 nova mensagem não lida" : `${unread} novas mensagens não lidas`,
        snippet: contact ? `Mensagem recente recebida de ${contact}.` : "Mensagem recebida no WhatsApp.",
        durationMs: 8000,
      });
    } else {
      lastWhatsAppCount = unread;
    }
    return;
  }

  // 3. Cal.com and Meetings
  if (update.id === "integration_calcom") {
    const bookings = Array.isArray(update.data?.bookings)
      ? (update.data.bookings as Array<{ id: string; title: string; start: string; attendeeName?: string }>)
      : [];
    lastKnownBookings = bookings;

    if (!isCalcomInitialPollDone) {
      isCalcomInitialPollDone = true;
      for (const b of bookings) {
        seenBookingKeys.add(`${b.id}:${b.start}`);
      }
      return;
    }

    for (const b of bookings) {
      const key = `${b.id}:${b.start}`;
      if (!seenBookingKeys.has(key)) {
        seenBookingKeys.add(key);

        legs = [];
        currentVelocity = 0;
        idleUntil = performance.now() + 8500;

        triggerVisualAlert({ emote: "star", pose: "celebrate" });
        const attendee = b.attendeeName || "Convidado";
        const startTime = b.start ? new Date(b.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
        showAlertPopup({
          theme: "theme-calendar",
          icon: "📅",
          typeLabel: "Novo Agendamento",
          sender: b.title || "Reunião Confirmada",
          subject: `Com: ${attendee}`,
          snippet: startTime ? `Horário confirmado: ${startTime}` : "Compromisso confirmado na sua agenda.",
          durationMs: 8500,
        });
        return;
      }
    }
  }
}

function checkUpcomingMeetings() {
  const now = Date.now();
  for (const b of lastKnownBookings) {
    if (!b.start) continue;
    const startMs = Date.parse(b.start);
    if (isNaN(startMs)) continue;
    const diffMs = startMs - now;
    const diffMin = Math.round(diffMs / 60000);
    // Alert between 1 and 15 minutes before the meeting
    if (diffMin >= 1 && diffMin <= 15) {
      const key = `${b.id}:${b.start}:15min`;
      if (!notifiedMeetingTimes.has(key)) {
        notifiedMeetingTimes.add(key);
        legs = [];
        currentVelocity = 0;
        idleUntil = performance.now() + 8500;
        triggerVisualAlert({ emote: "surprised", pose: "wave" });
        showAlertPopup({
          theme: "theme-calendar",
          icon: "⏰",
          typeLabel: "Reunião em Breve",
          sender: b.title || "Reunião",
          subject: `Início em ${diffMin} minutos`,
          snippet: b.attendeeName ? `Participante: ${b.attendeeName}` : "Sua reunião começará em breve.",
          durationMs: 8500,
        });
      }
    }
  }
}

function generateRealWindowThought(appName: string, rawTitle: string): { text: string; emote: CompanionEmote } {
  const app = (appName || "").toLowerCase();
  const title = (rawTitle || "").trim();

  if (!app && !title) {
    return { text: "Acompanhando seu trabalho com atenção! 👀", emote: "happy" };
  }

  const lower = `${app} ${title}`.toLowerCase();
  if (
    lower.includes("error") ||
    lower.includes("falha") ||
    lower.includes("failed") ||
    lower.includes("exception") ||
    lower.includes("warning") ||
    lower.includes("panic")
  ) {
    return { text: `Alerta detectado em ${appName || "uma janela"}! ⚠️`, emote: "surprised" };
  }

  // Code editor (VS Code, Cursor, IntelliJ, etc.)
  if (
    app.includes("code") ||
    app.includes("cursor") ||
    app.includes("studio") ||
    app.includes("sublime") ||
    app.includes("idea") ||
    app.includes("pycharm") ||
    app.includes("webstorm") ||
    app.includes("vim") ||
    app.includes("antigravity")
  ) {
    const parts = title.split(" - ");
    let file = parts[0]?.replace(/^[●*]\s*/, "").trim();
    if (file && file !== appName && file.length < 35 && file.includes(".")) {
      const phrases = [
        `De olho na edição de ${file}! 💻`,
        `Acompanhando o código em ${file}...`,
        `Linhas de código avançando em ${file}! ✨`,
      ];
      return { text: phrases[Math.floor(Math.random() * phrases.length)], emote: "star" };
    }
    return { text: "Estrutura de código bem focada por aqui! 💻", emote: "happy" };
  }

  // Terminal (PowerShell, Cmd, Git Bash, Terminal)
  if (
    app.includes("powershell") ||
    app.includes("terminal") ||
    app.includes("cmd") ||
    app.includes("bash") ||
    app.includes("zsh") ||
    app.includes("wsl")
  ) {
    if (
      title.includes("npm") ||
      title.includes("cargo") ||
      title.includes("git") ||
      title.includes("yarn") ||
      title.includes("pnpm") ||
      title.includes("vite")
    ) {
      const match = title.match(/(npm|cargo|git|yarn|pnpm|vite|python|node)\s+[\w:-]+/i);
      const cmd = match ? match[0] : "comando";
      return { text: `Acompanhando '${cmd}' no terminal... ⚡`, emote: "star" };
    }
    const phrases = [
      "Terminal ativo, acompanhando a execução! 💻",
      "Processos rodando perfeitamente no terminal.",
      "De olho nos comandos do terminal! ⚡",
    ];
    return { text: phrases[Math.floor(Math.random() * phrases.length)], emote: "happy" };
  }

  // Browser (Chrome, Edge, Firefox, Brave)
  if (
    app.includes("chrome") ||
    app.includes("edge") ||
    app.includes("firefox") ||
    app.includes("brave") ||
    app.includes("arc")
  ) {
    const parts = title.split(" - ");
    const tabTitle = parts[0]?.trim();
    if (tabTitle && tabTitle.length < 35) {
      return { text: `Lendo: ${tabTitle} 🌐`, emote: "star" };
    }
    return { text: "Pesquisa e referências na web em andamento! 🌐", emote: "happy" };
  }

  // File Explorer
  if (app.includes("explorer") || app.includes("arquivos") || app.includes("files")) {
    const folder = title.split(" - ")[0]?.trim();
    if (folder && folder.length < 30) {
      return { text: `Organizando a pasta '${folder}' 📁`, emote: "wink" };
    }
    return { text: "Navegando pela estrutura de arquivos 📁", emote: "happy" };
  }

  // Spotify / Media
  if (app.includes("spotify") || app.includes("music")) {
    const track = title.split(" - ")[0]?.trim();
    if (track && track !== "Spotify") {
      return { text: `Curtindo o som: ${track} 🎵`, emote: "happy" };
    }
    return { text: "Boa música para manter o ritmo! 🎵", emote: "happy" };
  }

  // General application with title
  const cleanApp = appName.replace(/\.exe$/i, "");
  if (cleanApp && title) {
    const firstPart = title.split(" - ")[0]?.trim();
    if (firstPart && firstPart !== cleanApp && firstPart.length < 30) {
      return { text: `Acompanhando '${firstPart}' no ${cleanApp}! 👀`, emote: "happy" };
    }
    return { text: `Foco total no ${cleanApp}! 🚀`, emote: "happy" };
  }

  return { text: "Acompanhando seu trabalho com atenção! 👀", emote: "happy" };
}

async function tryAiAutonomousObservation(): Promise<boolean> {
  const now = performance.now();
  if (now - lastAiInspectTime < AI_INSPECT_COOLDOWN_MS || isAiInspectBusy) return false;

  let hasKey = false;
  try {
    const hasGemini = (await Bridge.secretPresent("gemini-api-key")) ?? false;
    const hasClaude = (await Bridge.secretPresent("anthropic-api-key")) ?? false;
    hasKey = hasGemini || hasClaude;
  } catch {
    return false;
  }
  if (!hasKey) return false;

  isAiInspectBusy = true;
  lastAiInspectTime = now;

  try {
    const attached = await Bridge.attachActiveWindow();
    if (!attached || !attached.path) {
      isAiInspectBusy = false;
      return false;
    }

    const app = (attached.appName || "").toLowerCase();
    const title = (attached.title || "").toLowerCase();
    if (app === lastInspectedApp && title === lastInspectedTitle) {
      // Screen context hasn't changed apps/tasks: skip to save API tokens
      isAiInspectBusy = false;
      return false;
    }
    lastInspectedApp = app;
    lastInspectedTitle = title;

    const prompt =
      "Você é o mascote assistente pessoal do usuário na área de trabalho. Analise a imagem anexada da janela/tela atual e faça UM comentário perspicaz, descontraído e útil em português (máximo de 8 a 10 palavras, sem introdução, sem aspas) sobre o que você realmente vê na tela (o arquivo sendo codado, o comando no terminal, a pasta ou a página aberta). Seja amigável e prestativo.";

    const reply = await Bridge.chatSend(prompt, {
      kind: "file",
      name: attached.name,
      path: attached.path,
    });

    if (reply?.text) {
      let text = reply.text
        .replace(/^["'«“]|["'»”]$/g, "")
        .replace(/\n.*/s, "")
        .trim();
      if (text.length > 70) text = text.slice(0, 68) + "…";

      if (text) {
        showThought(text, "star");
        isAiInspectBusy = false;
        return true;
      }
    }
  } catch {
    // Graceful fallback to contextual observations
  } finally {
    isAiInspectBusy = false;
  }
  return false;
}

async function triggerContextualObservation(now: number, force = false) {
  if (!force && now - lastObservationTime < OBSERVATION_INTERVAL_MS) return;
  lastObservationTime = now;

  // 1. Try smart economical AI visual observation first if API key is configured
  const aiHandled = await tryAiAutonomousObservation();
  if (aiHandled) return;

  // 2. Realistic dynamic window observation based on live attached window
  let appName = "";
  let title = "";
  try {
    const attached = await Bridge.attachActiveWindow();
    if (attached) {
      appName = attached.appName || "";
      title = attached.title || "";
    }
  } catch {
    // Ignore error
  }

  const thought = generateRealWindowThought(appName, title);
  showThought(thought.text, thought.emote);
}

function onPalSummoned() {
  if (pal) {
    pal.setPose("wave");
    window.setTimeout(() => {
      if (pal && pal.pose === "wave") pal.setPose("idle");
    }, 2800);
  }
  showThought("Aqui para acompanhar! 👀", "star");
}

let screenInfo = { x: 0, y: 0, width: 1920, height: 1080, scale: 1 };
let x = 0;
let y = 0;
let legs: Pt[] = [];
let idleUntil = 0;
let running = false;
let raf = 0;
let lastT = 0;
let frames = 0;
let pendingMove = false;
let faceDir = 1;

// Purpose: why it is walking right now.
let rule: Rule = "tour";
let routedTo: Pt | null = null;
let eyeTo: Pt | null = null;
let cursorPos: Pt = { x: 0, y: 0 };
let cursorAt = -1;
let tourIndex = -1;
let tourAt = 0;
let escortUntil = 0;
let hovered = false;
let isDragFollower = false;

// The card.
let cardOpen = false;
let lastRect = { x: 0, y: 0, w: PAL_W, h: PAL_H };
let lastAction: { kind: string; query?: string } | null = null;

let charName = "mochi";
let customSpec: CustomPal | null = null;
let currentChar = "";
let canvas: HTMLCanvasElement | null = null;
let pal: DotPal | null = null;
let lastState: BotStateName = "idle";

/** Where the window may go: the screen, minus its frame's padding. The card
 *  opens to the right of the body, so the right edge reserves room for it. */
function screenRect(): Rect {
  return {
    x0: screenInfo.x + PAD_X,
    y0: screenInfo.y + PAD_TOP,
    x1: screenInfo.x + screenInfo.width - CARD_W - PAD_X,
    y1: screenInfo.y + screenInfo.height - PAL_H - PAD_BOTTOM,
  };
}

/**
 * The island's band at the top centre, plus a margin the pal keeps out of. It
 * never reaches the bottom of the walkable strip: some corridor to stroll in
 * must always survive, even on a screen where the island takes most of it.
 */
function islandRect(): Rect {
  const b = screenRect();
  const left = screenInfo.x + (screenInfo.width - PANEL_W) / 2;
  const bandBottom = screenInfo.y + PANEL_H + KEEP_OUT;
  const y1 = Math.max(screenInfo.y - KEEP_OUT + 1, Math.min(bandBottom, b.y1 - 40));
  return { x0: left - KEEP_OUT, x1: left + PANEL_W + KEEP_OUT, y0: screenInfo.y - KEEP_OUT, y1 };
}

/** Would the window, standing at (px, py), hide behind the island? The whole
 *  window counts — the card must not open over the island either. */
function standsInBand(px: number, py: number): boolean {
  const k = islandRect();
  return px < k.x1 && px + CARD_W > k.x0 && py < k.y1 && py + PAL_H > k.y0;
}

/** Does the straight line from a to b cross the rectangle? (Liang–Barsky.) */
function segHitsRect(ax: number, ay: number, bx: number, by: number, r: Rect): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - r.x0, r.x1 - ax, ay - r.y0, r.y1 - ay];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
      continue;
    }
    const t = q[i] / p[i];
    if (p[i] < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) t0 = t;
      if (t < t1) t1 = t;
    }
  }
  return t0 <= t1;
}

function clampTo(p: Pt): Pt {
  const b = screenRect();
  return {
    x: Math.min(Math.max(p.x, b.x0), b.x1),
    y: Math.min(Math.max(p.y, b.y0), b.y1),
  };
}

/** Route to a spot: straight when nothing is in the way, otherwise drop below
 *  the island's band, cross there and climb back up. Never a random detour. */
function routeTo(tx: number, ty: number): Pt[] {
  const k = islandRect();
  if (!segHitsRect(x, y, tx, ty, k)) return [{ x: tx, y: ty }];
  const b = screenRect();
  const detour = Math.min(b.y1, Math.max(k.y1 + 8, b.y0));
  const out: Pt[] = [];
  if (y < detour - SETTLE) out.push({ x, y: detour });
  out.push({ x: tx, y: detour });
  if (Math.abs(ty - detour) > SETTLE) out.push({ x: tx, y: ty });
  return out;
}

/** Under the island: close enough to be noticed, clear of the band. */
function postIsland(): Pt {
  const k = islandRect();
  const b = screenRect();
  return clampTo({
    x: screenInfo.x + (screenInfo.width - PAL_W) / 2,
    y: Math.max(k.y1 + 8, b.y0),
  });
}

let stationCursor: Pt = { x: -9999, y: -9999 };
let stationShiftStart = 0;
const SHIFT_THRESHOLD = 240; // Cursor must move >240px away from current station to consider moving
const SHIFT_SUSTAIN_MS = 3800; // Must stay in new area for 3.8s before moving
let microPauseUntil = 0;
let distanceWalkedInLeg = 0;
let nextPauseDistance = 160 + Math.random() * 80;
let lastGazeAdjust = 0;

let currentGazeX = 0;
let currentGazeY = 0;
let targetGazeX = 0;
let targetGazeY = 0;

interface CachedWindowBounds {
  appName: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  at: number;
}
let cachedWindowBounds: CachedWindowBounds | null = null;
let lastWindowPoll = 0;
const WINDOW_POLL_INTERVAL_MS = 3200;
let isPerchedOnWindow = false;

async function pollActiveWindowBounds() {
  const now = performance.now();
  if (now - lastWindowPoll < WINDOW_POLL_INTERVAL_MS) return;
  lastWindowPoll = now;
  try {
    const b = await Bridge.activeWindowBounds();
    if (b && b.width >= 160 && b.height >= 160) {
      cachedWindowBounds = { ...b, at: now };
    }
  } catch {
    // Graceful fallback
  }
}

/**
 * Calculates a comfortable perch on top of or along the active window border
 * (e.g. VS Code header, Terminal border, Browser top bar).
 */
function postWindowPerch(): Pt | null {
  if (!cachedWindowBounds || performance.now() - cachedWindowBounds.at > 14000) return null;
  const w = cachedWindowBounds;
  const b = screenRect();
  const k = islandRect();

  // Prefer top-right corner of the window (like: Terminal/VS Code 🐾)
  let targetX = w.x + w.width - PAL_W - 36;
  // If window is very wide and cursor is active, place closer to cursor side
  if (cursorAt >= 0 && Math.abs(cursorPos.x - targetX) > 480) {
    targetX = cursorPos.x > w.x + w.width / 2 ? w.x + w.width - PAL_W - 36 : w.x + 36;
  }

  // Vertical placement: perched resting on the top edge of the window
  let targetY = w.y - PAL_H + 46;
  if (targetY < b.y0) {
    targetY = Math.max(b.y0, w.y + 4);
  }

  const spot = clampTo({ x: targetX, y: targetY });
  // Avoid island keep-out
  if (standsInBand(spot.x, spot.y)) {
    if (spot.x > screenInfo.x + screenInfo.width / 2) {
      spot.x = Math.min(b.x1, k.x1 + 16);
    } else {
      spot.x = Math.max(b.x0, k.x0 - PAL_W - 16);
    }
  }
  return spot;
}

/**
 * Comfortable vantage point beside the active typing / work area.
 * Prefers sitting on top of the active window ledge when available,
 * otherwise keeps an intermediate, comfortable distance (~110-130px laterally).
 */
function postWatch(): Pt {
  const perch = postWindowPerch();
  if (perch) {
    isPerchedOnWindow = true;
    return perch;
  }
  isPerchedOnWindow = false;

  if (cursorAt < 0) return postIsland();
  const k = islandRect();
  const b = screenRect();

  // Try placing to the right first; if not enough room, place to the left
  const rightSpace = b.x1 - (cursorPos.x + 110 + PAL_W);
  const leftSpace = cursorPos.x - 110 - PAL_W - b.x0;

  let targetX = 0;
  if (rightSpace >= 0 && (rightSpace >= leftSpace || leftSpace < 0)) {
    targetX = cursorPos.x + 110;
  } else if (leftSpace >= 0) {
    targetX = cursorPos.x - 110 - PAL_W;
  } else {
    targetX = rightSpace >= leftSpace ? cursorPos.x + 80 : cursorPos.x - 80 - PAL_W;
  }

  // Vertical placement: line of sight slightly above or level with work area (-30px)
  let targetY = cursorPos.y - 30;

  const spot = clampTo({ x: targetX, y: targetY });
  // Never stand in the Island's keep-out band
  if (standsInBand(spot.x, spot.y)) {
    spot.y = Math.max(spot.y, k.y1 + 8);
  }
  return spot;
}

/** The quiet tour: resting vantage points when no activity is detected for a long time. */
function tourPosts(): Pt[] {
  const b = screenRect();
  return [
    clampTo({ x: b.x1 - 24, y: b.y1 - 10 }),
    clampTo({ x: screenInfo.x + (screenInfo.width - PAL_W) * 0.82, y: b.y0 + 8 }),
    clampTo({ x: b.x0 + 24, y: b.y1 - 10 }),
  ];
}

/** One request in flight at a time; the next frame overwrites nothing. */
function send() {
  if (pendingMove) return;
  pendingMove = true;
  void Bridge.movePal(x, y).finally(() => {
    pendingMove = false;
  });
}

function step(dt: number, now: number) {
  if (isDragFollower) return;
  if (isChatOpen) return; // Screen chat in progress: remain beside user
  if (hovered) return; // pointer on the pal: stay put for the click
  if (now < microPauseUntil) return; // natural micro-pause during walk

  const notable = NOTABLE.has(lastState) || now < escortUntil;
  const watching = cursorAt >= 0 && now - cursorAt < WATCH_STILL_MS;
  const next: Rule = notable ? "report" : watching ? "watch" : "tour";

  if (next !== rule) {
    rule = next;
    legs = [];
    currentVelocity = 0;
    routedTo = null;
    stationShiftStart = 0;
    if (next === "tour") {
      tourAt = now;
      // Do not rush when entering tour: linger calmly where we are
      idleUntil = Math.max(idleUntil, now + 30000);
    }
  }

  // If in watch mode and stationed, allow occasional contextual observations
  if (rule === "watch" && !legs.length && now >= idleUntil) {
    if (now - lastObservationTime > OBSERVATION_INTERVAL_MS && Math.random() < 0.3) {
      void triggerContextualObservation(now);
    }
  }

  // Micro adjustments while observing: subtle blink
  if (rule === "watch" && !legs.length && now - lastGazeAdjust > 8000) {
    lastGazeAdjust = now;
    if (Math.random() < 0.3) {
      if (pal) pal.blink();
      engine.blink();
    }
  }

  if (now < idleUntil) return;

  // Where it should be standing now
  let target: Pt | null = null;
  if (rule === "report") {
    target = postIsland();
    eyeTo = { x: screenInfo.x + screenInfo.width / 2, y: screenInfo.y + PANEL_H / 2 };
  } else if (rule === "watch") {
    eyeTo = cursorAt >= 0 ? cursorPos : null;
    const distFromStation = Math.hypot(cursorPos.x - stationCursor.x, cursorPos.y - stationCursor.y);
    if (stationCursor.x === -9999 || distFromStation > SHIFT_THRESHOLD) {
      // Activity moved to a noticeably different screen area (>240px away)
      if (stationShiftStart === 0) {
        stationShiftStart = now;
      } else if (now - stationShiftStart >= SHIFT_SUSTAIN_MS) {
        // Sustained activity in new area: update station and route
        stationCursor = { ...cursorPos };
        stationShiftStart = 0;
        target = postWatch();
      }
    } else {
      // User is continuing work within the same regional station: stay comfortably still!
      stationShiftStart = 0;
    }
  } else {
    eyeTo = null;
    if (!legs.length && now >= tourAt) {
      const spots = tourPosts();
      tourIndex = (tourIndex + 1) % spots.length;
      target = spots[tourIndex];
    }
  }

  if (target) {
    const follow = rule === "watch" ? 160 : ROUTE_EPS;
    const drift = routedTo
      ? Math.hypot(target.x - routedTo.x, target.y - routedTo.y)
      : Number.POSITIVE_INFINITY;
    const needWalk = !legs.length && Math.hypot(target.x - x, target.y - y) > follow;
    if (drift > follow || needWalk) {
      legs = routeTo(target.x, target.y);
      routedTo = { ...target };
      currentVelocity = 0;
      distanceWalkedInLeg = 0;
      nextPauseDistance = 160 + Math.random() * 80;
    }
  }
  if (!legs.length) return;

  const ox = x;
  const oy = y;
  const t = legs[0];
  const dx = t.x - x;
  const dy = t.y - y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0) {
    if (dx !== 0) {
      faceDir = Math.sign(dx);
      if (pal) pal.setDirection(faceDir);
    }
    if (pal && currentVelocity > 2) {
      pal.setPose("walk");
    }

    // Smooth sinusoidal deceleration curve as we near target
    const maxSpeed = walkSpeed;
    const targetVel = dist < 55 ? Math.max(8, walkSpeed * Math.sin((dist / 55) * (Math.PI / 2))) : maxSpeed;
    if (currentVelocity < targetVel) {
      currentVelocity = Math.min(targetVel, currentVelocity + ACCEL * dt);
    } else {
      currentVelocity = Math.max(targetVel, currentVelocity - ACCEL * dt);
    }

    const stride = Math.min(dist, currentVelocity * dt);
    x += (dx / dist) * stride;
    y += (dy / dist) * stride;

    // Organic micro-pause during longer walks
    distanceWalkedInLeg += stride;
    if (distanceWalkedInLeg >= nextPauseDistance && dist > 70) {
      distanceWalkedInLeg = 0;
      nextPauseDistance = 160 + Math.random() * 80;
      microPauseUntil = now + 600;
      currentVelocity = 0;
      if (pal) pal.setPose("idle");
    }
  }

  if (Math.abs(t.x - x) <= SETTLE && Math.abs(t.y - y) <= SETTLE) {
    x = t.x;
    y = t.y;
    legs.shift();
    currentVelocity = 0;
    distanceWalkedInLeg = 0;
    if (!legs.length) {
      // Arrived at destination!
      if (rule === "watch") {
        if (pal) pal.setPose(isPerchedOnWindow ? "sit" : "observe");
        // Stationed observing for 35-65 seconds!
        idleUntil = now + 35000 + Math.random() * 30000;
        void triggerContextualObservation(now);
      } else if (rule === "tour") {
        if (pal) pal.setPose(Math.random() < 0.5 ? "sit" : "lie");
        // Quiet resting station for 45-80 seconds
        idleUntil = now + IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);
        tourAt = idleUntil;
      } else if (rule === "report") {
        if (pal) pal.setPose("idle");
      }
    }
  }
  if (x !== ox || y !== oy) send();
}

function computeGaze(dt: number, now: number) {
  // If stationed at the very top of the screen: look down towards workspace
  if (y <= screenRect().y0 + 20) {
    const rawDx = (cursorPos.x - (x + PAL_W / 2)) / 450;
    targetGazeX = Math.max(-0.35, Math.min(0.35, rawDx));
    targetGazeY = 0.55;
  } else if (cursorAt >= 0 && now - cursorAt < 6000) {
    // User active: glance softly in direction of activity, clamped to gentle angles
    const dx = cursorPos.x - (x + PAL_W / 2);
    const dy = cursorPos.y - (y + PAL_H / 2);
    const dist = Math.hypot(dx, dy);

    if (dist > 70) {
      // Gentle direction: clamped to friendly max ±0.35 horizontal, ±0.25 vertical
      const s = Math.tanh(dist / 400);
      targetGazeX = Math.max(-0.35, Math.min(0.35, (dx / dist) * s * 0.6));
      targetGazeY = Math.max(-0.25, Math.min(0.25, (dy / dist) * s * 0.45));
    } else {
      // Close by: relaxed forward gaze
      targetGazeX = faceDir * 0.12;
      targetGazeY = 0.04;
    }
  } else {
    // Idle/quiet: resting relaxed gaze facing forward
    targetGazeX = faceDir * 0.15;
    targetGazeY = 0.04;
  }

  // Damped exponential smoothing for fluid, calm, lifelike gaze
  const kGaze = 1 - Math.pow(0.003, dt);
  currentGazeX += (targetGazeX - currentGazeX) * kGaze;
  currentGazeY += (targetGazeY - currentGazeY) * kGaze;

  if (pal) {
    pal.lookAt(currentGazeX, currentGazeY);
  }
}

function drawMochi(dt: number) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const hCss = BOT_SIZE + BOT_OVERHANG;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  engine.particleOverhang = BOT_OVERHANG;
  engine.lookX = currentGazeX;
  engine.lookY = currentGazeY;
  engine.slotHTarget = 0;
  engine.update(dt);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, BOT_SIZE, hCss);
  engine.draw(ctx, BOT_SIZE, hCss);
}

function tick(t: number) {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(0.1, Math.max(0, (t - lastT) / 1000));
  lastT = t;
  frames++;
  step(dt, t);
  computeGaze(dt, t);
  void pollActiveWindowBounds();
  if (currentChar === "mochi") drawMochi(dt);
}

/** Show the pal and let it walk, or park it and stop costing anything. */
function setWander(on: boolean) {
  if (on === running) return;
  const wasRunning = running;
  running = on;
  if (on) {
    lastT = performance.now();
    raf = requestAnimationFrame(tick);
    if (!wasRunning) onPalSummoned();
  } else if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
    setCard(false);
  }
}

function applyState(s: BotStateName) {
  lastState = s;
  engine.setState(s);
  if (!pal) return;
  pal.setState(PAL_STATE[s] ?? "idle");
  if (s === "finished") {
    pal.setPose("celebrate");
  } else if (s === "error") {
    pal.setPose("error");
  } else if (s === "thinking" || s === "question") {
    pal.setPose("think");
  }
  const emote = PAL_EMOTE[s];
  if (emote) void pal.emote(emote);
}

/** The island's character, mirrored: Mochi on canvas, or the same `<dot-pal>`. */
function syncCharacter() {
  const want = charName || "mochi";
  if (want === "custom" && customSpec) registerCustom(customSpec);
  if (want === currentChar) {
    if (want === "custom") DotPal.refresh("custom");
    return;
  }
  currentChar = want;
  canvas?.remove();
  canvas = null;
  pal?.remove();
  pal = null;
  if (want === "mochi") {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const hCss = BOT_SIZE + BOT_OVERHANG;
    const el = h("canvas", { id: "pal-bot" });
    el.width = Math.round(BOT_SIZE * dpr);
    el.height = Math.round(hCss * dpr);
    el.style.width = `${BOT_SIZE}px`;
    el.style.height = `${hCss}px`;
    // Same seating as the island: the body's centre is the window's centre.
    el.style.left = `${Math.round((PAL_W - BOT_SIZE) / 2)}px`;
    el.style.top = `${Math.round((PAL_H - hCss) / 2 - BOT_OVERHANG / 2)}px`;
    root.append(el);
    canvas = el;
  } else {
    const el = h("dot-pal", { id: "pal-overlay", bubble: "none", size: String(DP_SIZE) });
    el.style.width = `${DP_SIZE}px`;
    el.style.height = `${DP_SIZE}px`;
    el.style.left = `${Math.round((PAL_W - DP_SIZE) / 2)}px`;
    el.style.top = `${Math.round(PAL_H / 2 - DP_SIZE * 0.45)}px`;
    el.character = want;
    root.append(el);
    pal = el;
    pal.setDirection(faceDir);
  }
  applyState(lastState);
}

// ── The card ────────────────────────────────────────────────────────────────
/** Tell Rust which part of the window takes the mouse: the body, plus the
 *  card when it is open — the transparent rest stays click-through. */
function pushRect() {
  const w = isChatOpen ? CHAT_W : (cardOpen || isAlertOpen) ? CARD_W : PAL_W;
  const h = isChatOpen ? CHAT_H : PAL_H;
  lastRect = { x: 0, y: 0, w, h };
  void Bridge.setPalRect(lastRect.x, lastRect.y, lastRect.w, lastRect.h);
}

function setCard(open: boolean) {
  if (open === cardOpen) return;
  cardOpen = open;
  cardEl.hidden = !open;
  if (open && isAlertOpen) closeAlertPopup();
  if (open && isChatOpen) closeScreenChat();
  if (!open) {
    searchWrap.hidden = true;
    searchOpenBtn.hidden = false;
    if (document.activeElement === searchInput) searchInput.blur();
  }
  pushRect();
}

// ── On-Desktop Screen Chat ──────────────────────────────────────────────────
function resolveAppPresentation(appName?: string, title?: string): { icon: string; name: string } {
  const rawApp = (appName || "").toLowerCase();
  const rawTitle = (title || "").toLowerCase();
  if (rawApp.includes("excel") || rawTitle.includes("excel") || rawTitle.includes(".xlsx") || rawTitle.includes(".xls")) {
    return { icon: "📊", name: "Excel" };
  }
  if (rawApp.includes("powerpnt") || rawTitle.includes("powerpoint") || rawTitle.includes(".pptx")) {
    return { icon: "📽️", name: "PowerPoint" };
  }
  if (rawApp.includes("winword") || rawTitle.includes("word") || rawTitle.includes(".docx")) {
    return { icon: "📝", name: "Word" };
  }
  if (rawApp.includes("chrome") || rawApp.includes("msedge") || rawApp.includes("firefox") || rawApp.includes("brave")) {
    return { icon: "🌐", name: "Navegador" };
  }
  if (rawApp.includes("code") || rawApp.includes("cursor") || rawApp.includes("sublime") || rawApp.includes("devenv")) {
    return { icon: "💻", name: "Editor de Código" };
  }
  if (rawApp.includes("whatsapp")) {
    return { icon: "💬", name: "WhatsApp" };
  }
  if (rawApp.includes("calc")) {
    return { icon: "🧮", name: "Calculadora" };
  }
  if (rawApp.includes("cmd") || rawApp.includes("powershell") || rawApp.includes("wt") || rawApp.includes("terminal")) {
    return { icon: "📟", name: "Terminal" };
  }
  if (rawApp.includes("notepad")) {
    return { icon: "📄", name: "Bloco de Notas" };
  }
  const cleanName = appName ? appName.replace(/\.exe$/i, "") : "Tela Ativa";
  return { icon: "🖥️", name: cleanName };
}

function renderMarkdownSimple(md: string): string {
  let escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks ```lang\n...```
  escaped = escaped.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code `...`
  escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold **...**
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic *...*
  escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Lines and lists
  const lines = escaped.split("\n");
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${trimmed.slice(2)}</li>`);
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (trimmed.length > 0) {
        out.push(`<p>${line}</p>`);
      }
    }
  }
  if (inList) out.push("</ul>");

  return out.join("");
}

function appendChatMessage(role: "user" | "assistant", content: string) {
  if (!chatMessagesEl) return;
  const row = document.createElement("div");
  row.className = `pal-chat-msg-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "pal-chat-msg-bubble";

  if (role === "user") {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = renderMarkdownSimple(content);
  }

  row.appendChild(bubble);
  chatMessagesEl.appendChild(row);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function showChatTyping() {
  if (!chatMessagesEl) return;
  removeChatTyping();
  const row = document.createElement("div");
  row.className = "pal-chat-msg-row assistant";
  row.id = "pal-chat-typing-indicator";

  const bubble = document.createElement("div");
  bubble.className = "pal-chat-msg-bubble";

  const typing = document.createElement("div");
  typing.className = "pal-chat-typing";
  typing.innerHTML = "<span></span><span></span><span></span>";

  bubble.appendChild(typing);
  row.appendChild(bubble);
  chatMessagesEl.appendChild(row);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  typingRowEl = row;
}

function removeChatTyping() {
  if (typingRowEl && typingRowEl.parentNode) {
    typingRowEl.parentNode.removeChild(typingRowEl);
  }
  typingRowEl = null;
}

async function openScreenChat() {
  if (cardOpen) setCard(false);
  if (isAlertOpen) closeAlertPopup();

  isChatOpen = true;

  // Stop stroll immediately
  legs = [];
  currentVelocity = 0;
  idleUntil = performance.now() + 999999999;

  // Clamp on screen so the 540x440 chat popup fits safely inside monitor bounds
  const maxChatX = screenInfo.x + screenInfo.width - CHAT_W - PAD_X;
  const maxChatY = screenInfo.y + screenInfo.height - CHAT_H - PAD_BOTTOM;
  let adjusted = false;
  if (x > maxChatX) {
    x = Math.max(screenInfo.x + PAD_X, maxChatX);
    adjusted = true;
  }
  if (y > maxChatY) {
    y = Math.max(screenInfo.y + PAD_TOP, maxChatY);
    adjusted = true;
  }
  if (adjusted) {
    send();
  }

  pushRect();
  void Bridge.setPalFocus(true);

  triggerEmote("surprised");
  if (pal) pal.setPose("think");

  if (chatPopupEl) chatPopupEl.hidden = false;
  if (chatMessagesEl) chatMessagesEl.innerHTML = "";

  try {
    Sound.play("attach");
    const win = await Bridge.attachActiveWindow();
    currentAttachedWindow = win;
    const { icon, name } = resolveAppPresentation(win.appName, win.title);
    if (chatAppIconEl) chatAppIconEl.textContent = icon;
    if (chatAppNameEl) chatAppNameEl.textContent = name;
    if (chatTargetTitleEl) {
      chatTargetTitleEl.textContent = win.title ? `Janela: ${win.title}` : `Aplicativo: ${win.appName}`;
    }

    void Bridge.chatReset();

    appendChatMessage(
      "assistant",
      `👋 Capturei a tela de **${name}**!\n\nComo posso te ajudar com o que está visível? Pode perguntar sobre **fórmulas de Excel**, **cálculos**, **código**, **dados** ou pedir explicações e resumos!`,
    );
  } catch {
    currentAttachedWindow = null;
    if (chatAppIconEl) chatAppIconEl.textContent = "🖥️";
    if (chatAppNameEl) chatAppNameEl.textContent = "Tela Ativa";
    if (chatTargetTitleEl) chatTargetTitleEl.textContent = "Visualização da Área de Trabalho";
    appendChatMessage(
      "assistant",
      "👋 Olá! Estou pronto para analisar sua tela. O que você gostaria de tirar dúvidas ou fazer?",
    );
  }

  if (chatInputEl) {
    chatInputEl.value = "";
    chatInputEl.style.height = "auto";
    chatInputEl.focus();
  }
}

function closeScreenChat() {
  if (!isChatOpen) return;
  isChatOpen = false;
  if (chatPopupEl) chatPopupEl.hidden = true;
  void Bridge.setPalFocus(false);
  pushRect();
  if (pal && pal.pose === "think") {
    pal.setPose("idle");
  }
  idleUntil = performance.now() + 5000;
}

async function recaptureScreen() {
  if (isChatSending) return;
  try {
    Sound.play("attach");
    triggerEmote("wink");
    const win = await Bridge.attachActiveWindow();
    currentAttachedWindow = win;
    const { icon, name } = resolveAppPresentation(win.appName, win.title);
    if (chatAppIconEl) chatAppIconEl.textContent = icon;
    if (chatAppNameEl) chatAppNameEl.textContent = name;
    if (chatTargetTitleEl) {
      chatTargetTitleEl.textContent = win.title ? `Janela: ${win.title}` : `Aplicativo: ${win.appName}`;
    }
    appendChatMessage("assistant", `📸 *Tela recapturada com sucesso (${name})! As próximas perguntas usarão esta imagem atualizada.*`);
  } catch {
    appendChatMessage("assistant", "⚠️ *Não foi possível recapturar a tela neste momento.*");
  }
}

function clearScreenChat() {
  if (isChatSending) return;
  void Bridge.chatReset();
  if (chatMessagesEl) chatMessagesEl.innerHTML = "";
  const name = chatAppNameEl?.textContent || "sua tela";
  appendChatMessage(
    "assistant",
    `🔄 Conversa reiniciada. O que mais você gostaria de saber ou tirar dúvidas sobre **${name}**?`,
  );
  if (chatInputEl) chatInputEl.focus();
}

async function sendScreenChatMessage(explicitQuery?: string) {
  if (isChatSending) return;
  const query = (explicitQuery !== undefined ? explicitQuery : (chatInputEl?.value || "")).trim();
  if (!query) {
    if (chatInputEl) chatInputEl.focus();
    return;
  }

  if (chatInputEl) {
    chatInputEl.value = "";
    chatInputEl.style.height = "auto";
  }
  isChatSending = true;
  if (chatSendBtn) chatSendBtn.disabled = true;

  appendChatMessage("user", query);
  showChatTyping();
  triggerEmote("star");
  Sound.play("send");

  try {
    const context: ChatContext | null = currentAttachedWindow
      ? { kind: "file", name: currentAttachedWindow.name, path: currentAttachedWindow.path }
      : null;

    const reply = await Bridge.chatSend(query, context);
    removeChatTyping();
    appendChatMessage("assistant", reply.text);
    triggerEmote("happy");
    Sound.play("finish");
  } catch (err) {
    removeChatTyping();
    const msg = String(err).replace(/^Error:\s*/, "");
    appendChatMessage("assistant", `⚠️ Desculpe, ocorreu um erro ao consultar a IA: ${msg}`);
    triggerEmote("surprised");
  } finally {
    isChatSending = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    if (chatInputEl) chatInputEl.focus();
  }
}

function callPal(kind: string, query?: string) {
  lastAction = query === undefined ? { kind } : { kind, query };
  void Bridge.palAction(kind, query);
}

function sendSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  searchInput.value = "";
  setCard(false);
  callPal("search", q);
}

/** Pointer arrived or left: freeze for the click, close the card on leaving
 *  (unless the user is typing a search in it). */
function setHovered(on: boolean) {
  hovered = on;
  if (!hovered && document.activeElement !== searchInput) setCard(false);
}

async function press(action: string) {
  switch (action) {
    case "search-open":
      searchOpenBtn.hidden = true;
      searchWrap.hidden = false;
      void Bridge.setPalFocus(true);
      searchInput.focus();
      return;
    case "search-send":
      sendSearch();
      return;
    case "home":
      setCard(false);
      escortUntil = performance.now() + ESCORT_MS;
      legs = [];
      idleUntil = 0;
      return;
    case "analyze":
      setCard(false);
      void openScreenChat();
      return;
    case "organize-desktop":
      setCard(false);
      showThought("🗂️ Analisando sua Área de Trabalho...", "star");
      callPal(action);
      return;
    case "create-doc":
      setCard(false);
      showThought("📄 Que tipo de documento você gostaria de criar?", "happy");
      callPal(action);
      return;
    case "find-files":
      setCard(false);
      showThought("🔎 O que você gostaria de encontrar?", "star");
      callPal(action);
      return;
    case "ghostwriter":
      setCard(false);
      showThought("✍️ O que deseja escrever para o aplicativo ativo?", "star");
      callPal(action);
      return;
    case "pause":
    case "new-chat":
    case "settings":
      setCard(false);
      callPal(action);
      return;
  }
}

function applyLabels() {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-label]"))) {
    const key = el.dataset.label ?? "";
    if (key === "Screen analysis") {
      el.textContent = "📸 " + t(key);
      continue;
    }
    el.textContent = t(key);
  }
  searchInput.placeholder = t("Search the web…");
}

async function main() {
  const info: BootInfo | null = await Bridge.boot();
  if (info) {
    screenInfo = info.screen;
    State.settings = { ...State.settings, ...info.settings };
    charName = info.settings.character || "mochi";
    customSpec = (info.settings.custom as CustomPal | null) ?? null;
  } else {
    const s = window.screen as Screen & { availLeft?: number; availTop?: number };
    screenInfo = {
      x: s.availLeft ?? 0,
      y: s.availTop ?? 0,
      width: s.availWidth,
      height: s.availHeight,
      scale: 1,
    };
  }
  applyLabels();
  syncCharacter();

  // Park somewhere legal while hidden, so the first step out is never across
  // the island or off the edge.
  const b = screenRect();
  x = b.x0 + (b.x1 - b.x0) / 2;
  y = b.y1 - 40;
  send();
  pushRect();

  // The island may have spoken before this page loaded: ask for the face.
  const face = await Bridge.palState();
  if (face) applyState(face as BotStateName);
  setWander((await Bridge.palWanderState()) === true);

  await onEvent<boolean>("pal-wander", (on) => setWander(on === true));
  await onEvent<string>("pal-state", (s) => applyState(s as BotStateName));
  await onEvent<null>("drag-follower-start", () => {
    isDragFollower = true;
    setCard(false);
    if (thoughtEl) thoughtEl.hidden = true;
    root.classList.add("is-dragging");
    triggerEmote("surprised");
    if (pal) {
      pal.setPose("walk");
      void pal.emote("wide");
    }
  });
  await onEvent<null>("drag-follower-stop", () => {
    isDragFollower = false;
    root.classList.remove("is-dragging");
    if (pal) pal.setPose("idle");
    if (!running) {
      void Bridge.setPalWander(false);
    }
  });
  // Global summon hotkey: jumps to cursor, gives friendly greeting and opens quick command card!
  await onEvent<null>("pal-summon", () => {
    legs = [];
    currentVelocity = 0;
    idleUntil = performance.now() + 15000;
    triggerEmote("star");
    showThought("✨ Estou aqui! O que posso fazer por você?", "star");
    setCard(true);
    void Bridge.setPalFocus(true);
    searchOpenBtn.hidden = true;
    searchWrap.hidden = false;
    searchInput.focus();
  });
  // Pointer over the character or its card: stand still while it is there,
  // and close the card when it leaves (unless the user is typing in it).
  await onEvent<boolean>("pal-hover", (on) => setHovered(on === true));
  // Where the user's hand is: the watch post is built from this.
  await onEvent<{ x: number; y: number; down: boolean }>("pal-cursor", (c) => {
    cursorPos = { x: c.x, y: c.y };
    cursorAt = performance.now();
  });
  await onEvent<Settings>("settings-changed", (s) => {
    State.settings = { ...State.settings, ...s };
    if (s.character != null) charName = s.character || "mochi";
    if (s.custom !== undefined) customSpec = s.custom as CustomPal | null;
    applyLabels();
    syncCharacter();
  });
  await onEvent<null>("screen-changed", async () => {
    const i = await Bridge.boot();
    if (i) screenInfo = i.screen;
    const r = screenRect();
    x = Math.min(Math.max(x, r.x0), r.x1);
    y = Math.min(Math.max(y, r.y0), r.y1);
    legs = [];
    routedTo = null;
    idleUntil = 0;
  });

  await onEvent<IntegrationUpdate>("integration", (u) => void handlePalIntegrationAlert(u));
  window.setInterval(checkUpcomingMeetings, 60000);

  // On the body: the card. On a button: its action, owned by the island.
  alertCloseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAlertPopup();
  });

  alertReplyBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openReplyMode();
  });

  alertReplyCancel?.addEventListener("click", (e) => {
    e.stopPropagation();
    cancelReplyMode();
  });

  alertReplySend?.addEventListener("click", (e) => {
    e.stopPropagation();
    void sendReply();
  });

  alertReplyInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void sendReply();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelReplyMode();
    }
    e.stopPropagation();
  });

  alertReplyInput?.addEventListener("focus", () => void Bridge.setPalFocus(true));
  alertReplyInput?.addEventListener("blur", () => {
    if (!isReplying) void Bridge.setPalFocus(false);
  });

  alertPopupEl?.addEventListener("mouseenter", () => {
    if (isReplying) return;
    if (alertTimer != null) {
      window.clearTimeout(alertTimer);
      alertTimer = null;
      alertRemainingMs -= (performance.now() - alertStartTimestamp);
      if (alertRemainingMs < 4000) alertRemainingMs = 4000;
    }
  });

  alertPopupEl?.addEventListener("mouseleave", () => {
    if (isReplying || !isAlertOpen) return;
    alertStartTimestamp = performance.now();
    alertTimer = window.setTimeout(() => {
      closeAlertPopup();
    }, alertRemainingMs);
  });

  root.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
    if (el?.dataset.action) {
      void press(el.dataset.action);
      return;
    }
    if ((e.target as HTMLElement).closest("#pal-card")) return; // a gap, not a button
    if ((e.target as HTMLElement).closest("#pal-alert-popup")) return;
    if ((e.target as HTMLElement).closest("#pal-chat-popup")) return;
    if (e.clientX <= PAL_W) {
      if (isChatOpen) {
        closeScreenChat();
      } else {
        setCard(!cardOpen);
      }
    }
  });

  // ── Screen Chat Event Listeners ──
  chatCloseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeScreenChat();
  });

  chatRecaptureBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    void recaptureScreen();
  });

  chatClearBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    clearScreenChat();
  });

  chatSendBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    void sendScreenChatMessage();
  });

  chatInputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendScreenChatMessage();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeScreenChat();
    }
    e.stopPropagation();
  });

  chatInputEl?.addEventListener("input", () => {
    if (!chatInputEl) return;
    chatInputEl.style.height = "auto";
    chatInputEl.style.height = `${Math.min(chatInputEl.scrollHeight, 68)}px`;
  });

  chatInputEl?.addEventListener("focus", () => void Bridge.setPalFocus(true));
  chatInputEl?.addEventListener("blur", () => {
    if (!isChatOpen) void Bridge.setPalFocus(false);
  });

  chatQuickTagsEl?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".pal-chat-tag");
    if (!btn || !btn.dataset.tag) return;
    e.stopPropagation();
    void sendScreenChatMessage(btn.dataset.tag);
  });
  searchInput.addEventListener("focus", () => void Bridge.setPalFocus(true));
  searchInput.addEventListener("blur", () => void Bridge.setPalFocus(false));
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "8" || e.code === "Digit8")) {
      e.preventDefault();
      callPal("pause");
    }
  });

  searchInput.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      sendSearch();
    }
    e.stopPropagation();
  });

  if (import.meta.env.DEV && !IS_TAURI) {
    (window as unknown as { __pal?: unknown }).__pal = {
      pos: () => ({ x, y }),
      bounds: () => screenRect(),
      keepOut: () => islandRect(),
      legs: () => legs.map((p) => ({ ...p })),
      running: () => running,
      frames: () => frames,
      screen: () => ({ ...screenInfo }),
      setScreen: (r: { x: number; y: number; width: number; height: number; scale: number }) => {
        screenInfo = r;
        const b = screenRect();
        x = Math.min(Math.max(x, b.x0), b.x1);
        y = Math.min(Math.max(y, b.y0), b.y1);
        legs = [];
        routedTo = null;
        idleUntil = 0;
      },
      start: () => setWander(true),
      stop: () => setWander(false),
      char: (name: string, spec?: CustomPal | null) => {
        charName = name;
        customSpec = spec ?? null;
        syncCharacter();
      },
      face: (s: string) => applyState(s as BotStateName),
      character: () => currentChar,
      crossing: (ax: number, ay: number, bx: number, by: number) =>
        segHitsRect(ax, ay, bx, by, islandRect()),
      // Purpose seams: rule, posts and the card, without touching Rust.
      rule: () => rule,
      posts: () => ({ island: postIsland(), watch: postWatch(), tour: tourPosts() }),
      cursor: (cx: number, cy: number) => {
        cursorPos = { x: cx, y: cy };
        cursorAt = performance.now();
      },
      hover: (on?: boolean) => {
        if (on !== undefined) setHovered(on);
        return hovered;
      },
      card: () => cardOpen,
      rect: () => ({ ...lastRect }),
      press: (action: string, query?: string) => {
        if (query !== undefined) {
          searchInput.value = query;
          sendSearch();
        } else {
          void press(action);
        }
      },
      lastAction: () => (lastAction ? { ...lastAction } : null),
      escort: (ms: number) => {
        escortUntil = performance.now() + ms;
        legs = [];
        idleUntil = 0;
      },
      tourNow: () => {
        idleUntil = 0;
        tourAt = 0;
      },
      speed: (v: number) => {
        walkSpeed = v;
      },
      eyes: () => (eyeTo ? { ...eyeTo } : null),
    };
  }
}

void main();
