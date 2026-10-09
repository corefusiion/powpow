// Every pill the island can show.
// IDs, names, colours, categories, and connection states.

import type { AgentSource } from "./state";

export type PillCategory = "workspace" | "agent" | "ai" | "service";

export const PILL_CATEGORIES: { id: PillCategory; title: string }[] = [
  { id: "workspace", title: "Onde você coda" },
  { id: "agent", title: "Agentes" },
  { id: "ai", title: "IA para o chat" },
  { id: "service", title: "Serviços" },
];

export type PillSupport = "yes" | "windows" | "soon" | "no";

export type PillConnect =
  | { kind: "hooks" }
  | { kind: "key"; key: string }
  | { kind: "server"; field: "ollamaUrl" | "lmstudioUrl" }
  | { kind: "none" };

export interface PillDefinition {
  id: string;
  name: string;
  color: string;
  category: PillCategory;
  subtitle: string;
  source: AgentSource;
  support: PillSupport;
  connect: PillConnect;
}

export type HostOs = "windows" | "linux";

const hooks: PillConnect = { kind: "hooks" };
const key = (k: string): PillConnect => ({ kind: "key", key: k });
const none: PillConnect = { kind: "none" };
const server = (field: "ollamaUrl" | "lmstudioUrl"): PillConnect => ({ kind: "server", field });

const ACCENT = {
  anthropic: "#E07950",
  google: "#4285F4",
  openai: "#10A37F",
  ollama: "#FACC15",
  lmstudio: "#A3E635",
};

export const PILL_CATALOG: readonly PillDefinition[] = [
  // ── Workspace ─────────────────────────────────────────────────────────────
  { id: "integration_claude", name: "VS Code", color: "#F5F6F8", category: "workspace",
    subtitle: "Integração", source: "claudeCode", support: "yes", connect: hooks },
  { id: "agent_cursor", name: "Cursor", color: "#C0C4CC", category: "workspace",
    subtitle: "Integração", source: "agent", support: "yes", connect: hooks },
  { id: "agent_antigravity", name: "Antigravity", color: "#E879F9", category: "workspace",
    subtitle: "Integração", source: "agent", support: "yes", connect: hooks },
  { id: "agent_codex", name: "Codex", color: "#2DD4BF", category: "workspace",
    subtitle: "Integração", source: "agent", support: "yes", connect: hooks },

  // ── Agentes ─────────────────────────────────────────────────────────────────
  { id: "agent_gemini", name: "Gemini CLI", color: "#8AB4F8", category: "agent",
    subtitle: "Agente", source: "agent", support: "yes", connect: hooks },
  { id: "agent_copilot", name: "Copilot CLI", color: "#818CF8", category: "agent",
    subtitle: "Agente", source: "agent", support: "yes", connect: hooks },
  { id: "agent_muse", name: "Muse Code", color: "#38BDF8", category: "agent",
    subtitle: "Agente", source: "agent", support: "yes", connect: hooks },
  { id: "agent_opencode", name: "OpenCode", color: "#4ADE80", category: "agent",
    subtitle: "Agente", source: "agent", support: "yes", connect: hooks },
  { id: "agent_amp", name: "Amp", color: "#F59E0B", category: "agent",
    subtitle: "Agente", source: "agent", support: "yes", connect: hooks },
  { id: "agent_hermes", name: "Hermes", color: "#C084FC", category: "agent",
    subtitle: "Agente", source: "agent", support: "yes", connect: hooks },
  { id: "agent_claude-desktop", name: "Claude Desktop", color: "#D97757", category: "agent",
    subtitle: "Agente", source: "agent", support: "windows", connect: none },

  // ── IA para o chat ────────────────────────────────────────────────────────
  { id: "ai_anthropic", name: "Anthropic", color: ACCENT.anthropic, category: "ai",
    subtitle: "Chat", source: "n8n", support: "yes", connect: key("anthropic-api-key") },
  { id: "ai_google", name: "Google AI", color: ACCENT.google, category: "ai",
    subtitle: "Chat", source: "n8n", support: "yes", connect: key("google-api-key") },
  { id: "ai_openai", name: "OpenAI", color: ACCENT.openai, category: "ai",
    subtitle: "Chat", source: "n8n", support: "yes", connect: key("openai-api-key") },
  { id: "ai_ollama", name: "Ollama", color: ACCENT.ollama, category: "ai",
    subtitle: "Chat", source: "n8n", support: "yes", connect: server("ollamaUrl") },
  { id: "ai_lmstudio", name: "LM Studio", color: ACCENT.lmstudio, category: "ai",
    subtitle: "Chat", source: "n8n", support: "yes", connect: server("lmstudioUrl") },

  // ── Serviços ───────────────────────────────────────────────────────────────
  { id: "integration_resend", name: "Resend", color: "#22C55E", category: "service",
    subtitle: "Integração", source: "n8n", support: "yes", connect: key("resend-api-key") },
  { id: "integration_n8n", name: "n8n", color: "#F29B38", category: "service",
    subtitle: "Integração", source: "n8n", support: "yes", connect: key("n8n-api-key") },
  { id: "integration_vercel", name: "Vercel", color: "#7C5CFF", category: "service",
    subtitle: "Integração", source: "n8n", support: "yes", connect: key("vercel-token") },
  { id: "integration_github", name: "GitHub", color: "#F4505E", category: "service",
    subtitle: "Integração", source: "n8n", support: "yes", connect: key("github-token") },
  { id: "integration_notion", name: "Notion", color: "#8C8C8C", category: "service",
    subtitle: "Integração", source: "n8n", support: "yes", connect: key("notion-api-key") },
  { id: "integration_calcom", name: "Cal.com", color: "#C9956A", category: "service",
    subtitle: "Integração", source: "n8n", support: "yes", connect: key("calcom-api-key") },
  { id: "integration_stripe", name: "Stripe", color: "#0570DE", category: "service",
    subtitle: "Integração", source: "n8n", support: "yes", connect: key("stripe-api-key") },
  { id: "integration_spotify", name: "Spotify", color: "#1DB954", category: "service",
    subtitle: "Integração", source: "media", support: "yes", connect: none },
  { id: "integration_whatsapp", name: "WhatsApp", color: "#25D366", category: "service",
    subtitle: "Integração", source: "media", support: "yes", connect: none },
  { id: "integration_gmail", name: "Gmail", color: "#EA4335", category: "service",
    subtitle: "Integração", source: "n8n", support: "yes", connect: key("gmail-email") },
  { id: "integration_outlook", name: "Outlook", color: "#0078D4", category: "service",
    subtitle: "Integração", source: "n8n", support: "yes", connect: key("outlook-email") },
];

export const DEFAULT_MAIN_PILL = "integration_claude";
export const MAX_DECLARED = 8;

export const HOST_OS: HostOs = "windows";

export function pillDefinition(id: string): PillDefinition | undefined {
  return PILL_CATALOG.find((p) => p.id === id);
}

function offeredOn(def: PillDefinition, os: HostOs): boolean {
  return def.support === "yes" || def.support === "soon" || (def.support === "windows" && os === "windows");
}

export function availablePills(os: HostOs = HOST_OS): PillDefinition[] {
  return PILL_CATALOG.filter((p) => offeredOn(p, os));
}

export function isComingSoon(id: string): boolean {
  return pillDefinition(id)?.support === "soon";
}

export function isHookPill(id: string): boolean {
  return pillDefinition(id)?.connect.kind === "hooks";
}

export function mainPillChoices(os: HostOs = HOST_OS): PillDefinition[] {
  return availablePills(os).filter((p) => p.category === "workspace" && p.support !== "soon");
}

export interface Declared {
  mainPill: string;
  activeIntegrations: string[];
}

export function sanitizeDeclared(d: Declared, os: HostOs = HOST_OS): Declared {
  const mains = new Set(mainPillChoices(os).map((p) => p.id));
  const mainPill = mains.has(d.mainPill) ? d.mainPill : DEFAULT_MAIN_PILL;
  const offered = new Set(availablePills(os).map((p) => p.id));
  const activeIntegrations: string[] = [];
  for (const id of d.activeIntegrations ?? []) {
    if (id !== mainPill && offered.has(id) && !activeIntegrations.includes(id)) {
      activeIntegrations.push(id);
    }
  }
  return { mainPill, activeIntegrations };
}

export function toggleDeclared(d: Declared, id: string, os: HostOs = HOST_OS): string[] | null {
  if (id === d.mainPill) return null;
  if (!availablePills(os).some((p) => p.id === id)) return null;
  if (d.activeIntegrations.includes(id)) return d.activeIntegrations.filter((x) => x !== id);
  if (d.activeIntegrations.length >= MAX_DECLARED) return null;
  return [...d.activeIntegrations, id];
}

export function chooseMainPill(d: Declared, id: string, os: HostOs = HOST_OS): Declared | null {
  if (!mainPillChoices(os).some((p) => p.id === id)) return null;
  return { mainPill: id, activeIntegrations: d.activeIntegrations.filter((x) => x !== id) };
}

export function orderPills<T extends { id: string }>(tasks: T[], mainPill: string): T[] {
  const index = new Map(PILL_CATALOG.map((p, i) => [p.id, i]));
  const rank = (t: T) => (t.id === mainPill ? -2 : index.has(t.id) ? index.get(t.id)! : -1);
  return tasks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i)
    .map(({ t }) => t);
}
