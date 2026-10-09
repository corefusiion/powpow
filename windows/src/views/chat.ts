// Chat view — DOM port of PromptView / ChatBubble / TypingDotsView from
// IslandViewContent.swift.

import { h, svg, clear } from "./dom";
import { ICONS } from "./icons";
import { Bridge, type ChatContext } from "../core/bridge";
import { t } from "../core/i18n";
import { Sound } from "../core/sound";
import { State, type ChatMessage } from "../core/state";
import type { ViewActions, ViewHost } from "./views";
import {
  renderDocCreatedCard,
  renderGhostwriterCard,
  renderLocatedFilesCard,
  renderOrganizeCard,
  renderSystemControlCard,
} from "./systemCards";

let nextId = 1;

function bubble(message: ChatMessage): HTMLElement {
  if (message.role === "user") {
    return h(
      "div",
      { class: "chat-row user" },
      h("div", { class: "bubble", text: message.content }),
    );
  }
  const replyEl = h("div", { class: "reply" });
  if (message.content) {
    replyEl.append(h("span", { text: message.content }));
  }
  if (message.card) {
    replyEl.append(message.card);
  }
  return h("div", { class: "chat-row" }, replyEl);
}

function typingDots(): HTMLElement {
  return h(
    "div",
    { class: "chat-row" },
    h("div", { class: "typing" }, h("i"), h("i"), h("i")),
  );
}

/** The coloured chip showing what the question is about (a dropped file). */
function contextChip(label: string): HTMLElement {
  const chip = h("div", { class: "chip" }, h("i", { class: "chip-dot" }), h("span", { text: label }));
  requestAnimationFrame(() => chip.classList.add("settled"));
  return chip;
}

export function buildPrompt(actions: ViewActions, onHeightChange: () => void): ViewHost {
  const chipRow = h("div", { class: "chip-row" });
  const log = h("div", { class: "chat-log" });
  const input = h("input", {
    type: "text",
    class: "chat-input",
    placeholder: "Ask me anything…",
    spellcheck: "false",
  }) as HTMLInputElement;
  const send = h("button", { class: "send-btn", title: t("Send") }, svg(ICONS.arrowUp, 11));
  // Ends this conversation (and detaches any file) so the next drop starts
  // clean — no restart needed. Only shown once there is something to clear.
  const fresh = h("button", {
    class: "link-btn",
    style: "color:#8e939c",
    title: t("New chat"),
    text: t("New chat"),
    onclick: () => actions.newChat(),
  });
  fresh.style.display = "none";
  const bar = h("div", { class: "chat-bar" }, input, send, fresh);

  const el = h(
    "div",
    { class: "view" },
    h("div", { class: "card wash chat-card" }, h("div", { class: "chat-body" }, chipRow, log, bar)),
  );
  (el.querySelector(".card") as HTMLElement).style.setProperty("--wash", "rgba(99,102,241,0.5)");

  let sending = false;
  let renderedCount = -1;

  async function submit() {
    const query = input.value.trim();
    if (!query || sending) return;
    input.value = "";
    await sendQuery(query);
  }

  /** Runs a prompt through the chat as if it were typed - the pal's menu. */
  async function sendQuery(query: string) {
    if (!query || sending) return;
    sending = true;
    Sound.play("send");

    State.chatHistory.push({ id: nextId++, role: "user", content: query });
    State.stateOverride = "thinking";
    State.notify();
    onHeightChange();

    const file = State.droppedFile;
    const context: ChatContext | null =
      State.chatHistory.length === 1 && file ? { kind: "file", name: file.name, path: file.path } : null;

    try {
      const qLower = query.toLowerCase().trim();

      // ── System Agent: Desktop Butler ──────────────────────────────
      if (
        /^(organizar|organize|arrumar)\s*(o\s*)?(desktop|área de trabalho|downloads)?$/i.test(qLower) ||
        qLower.includes("organizar desktop") ||
        qLower.includes("organizar área de trabalho") ||
        qLower.includes("organizar downloads")
      ) {
        const isDownloads = qLower.includes("download");
        const preview = await Bridge.desktopOrganizePreview(isDownloads ? "downloads" : "desktop");
        if (preview && preview.items.length > 0) {
          const card = renderOrganizeCard(preview, () => onHeightChange());
          State.chatHistory.push({
            id: nextId++,
            role: "assistant",
            content: `🗂️ Analisei sua pasta ${preview.folderName} e encontrei ${preview.totalFiles} arquivos para organizar:`,
            card,
          });
          State.stateOverride = null;
          Sound.play("finish");
          return;
        } else {
          State.chatHistory.push({
            id: nextId++,
            role: "assistant",
            content: `✨ Sua pasta ${isDownloads ? "Downloads" : "Área de Trabalho"} já está 100% limpa e organizada! Nenhum arquivo solto encontrado.`,
          });
          State.stateOverride = null;
          Sound.play("finish");
          return;
        }
      }

      // ── System Agent: Instant Document Creator ───────────────────
      if (/^(cria(r|e)?|gere|gerar)\s+(um[a]?\s+)?(planilha|documento|doc|arquivo|tabela|relat[oó]rio)/i.test(qLower)) {
        const isSheet = /planilha|excel|csv|tabela/i.test(qLower);
        let title = "Documento";
        let content = "# Documento Gerado pelo Powpow\n\nCriado em " + new Date().toLocaleDateString();
        let docType = "document";

        if (isSheet) {
          docType = "spreadsheet";
          title = "Controle";
          if (/despesa|gasto|financeir/i.test(qLower)) {
            title = "Controle Financeiro";
            content = "Data,Categoria,Descricao,Valor,Status\n2026-10-09,Mercado,Compras semanais,250.00,Pago\n2026-10-09,Transporte,Combustivel,180.00,Pago\n2026-10-10,Utilidades,Luz e Agua,210.00,Pendente\n2026-10-15,Servicos,Internet Fibra,129.90,Pendente";
          } else {
            content = "Item,Categoria,Quantidade,Valor Unitario,Total\nItem A,Geral,10,25.00,250.00\nItem B,Geral,5,40.00,200.00\nItem C,Geral,2,100.00,200.00";
          }
        } else if (/ata|reuni[aã]o/i.test(qLower)) {
          title = "Ata de Reuniao";
          docType = "markdown";
          content = "# Ata de Reunião\n\n**Data:** " + new Date().toLocaleDateString() + "\n**Participantes:** Equipe\n\n## Pauta\n1. Alinhamento de metas\n2. Status dos projetos\n\n## Decisões\n- Projeto avançando conforme cronograma.\n\n## Próximos Passos\n- [ ] Concluir entregas da sprint\n- [ ] Validar com o cliente";
        }

        const res = await Bridge.createSystemDoc(docType, title, content);
        if (res) {
          const card = renderDocCreatedCard(res);
          State.chatHistory.push({
            id: nextId++,
            role: "assistant",
            content: `📄 Criei seu arquivo e já abri no aplicativo padrão do Windows!`,
            card,
          });
          State.stateOverride = null;
          Sound.play("finish");
          return;
        }
      }

      // ── System Agent: File Locator ───────────────────────────────
      const findMatch = qLower.match(/^(onde est[aá]|localizar|busca(r)?|encontra(r)?|achar)\s+(o\s+|a\s+|os\s+|as\s+)?(arquivo|pdf|doc|documento|planilha)?\s*(.+)$/i);
      if (findMatch && findMatch[4]) {
        const term = findMatch[4].trim();
        if (term.length > 1) {
          const results = await Bridge.locateSystemFiles(term, 10);
          if (results) {
            const card = renderLocatedFilesCard(term, results);
            State.chatHistory.push({
              id: nextId++,
              role: "assistant",
              content: `🔎 Busquei arquivos correspondentes a "${term}" nas suas pastas:`,
              card,
            });
            State.stateOverride = null;
            Sound.play("finish");
            return;
          }
        }
      }

      // ── System Agent: System Commander ───────────────────────────
      let sysAction = "";
      if (/(aumente|suba|mais|aumentar)\s*(o\s*)?volume/i.test(qLower)) sysAction = "volume_up";
      else if (/(diminua|abaixe|menos|diminuir)\s*(o\s*)?volume/i.test(qLower)) sysAction = "volume_down";
      else if (/mudo|silenciar|mutar/i.test(qLower)) sysAction = "volume_mute";
      else if (/(ativar|coloque|modo)\s*escuro/i.test(qLower)) sysAction = "theme_dark";
      else if (/(ativar|coloque|modo)\s*claro/i.test(qLower)) sysAction = "theme_light";
      else if (/(esvazi(e|ar)|limp(e|ar))\s*(a\s*)?lixeira/i.test(qLower)) sysAction = "empty_recycle_bin";
      else if (/(bloque(ie|ar)|trave|travar)\s*(o\s*)?(computador|tela|pc)/i.test(qLower)) sysAction = "lock_screen";

      if (sysAction) {
        const res = await Bridge.systemControl(sysAction);
        if (res) {
          const card = renderSystemControlCard(res.action, res.message);
          State.chatHistory.push({
            id: nextId++,
            role: "assistant",
            content: `⚙️ Comando executado com sucesso:`,
            card,
          });
          State.stateOverride = null;
          Sound.play("finish");
          return;
        }
      }

      // ── System Agent: Ghostwriter ─────────────────────────────────
      const ghostMatch = qLower.match(/^(escreva|redija|responda|ajude a escrever|ghostwriter)\s+(um[a]?\s+)?(.+)$/i);
      if (ghostMatch && ghostMatch[3]) {
        const promptInstruction = ghostMatch[3].trim();
        const winCtx = await Bridge.getActiveWindowContext();
        const appLabel = winCtx?.appName || "Aplicativo ativo";
        const titleLabel = winCtx?.title || "";

        const enrichedPrompt = `Contexto do Sistema: O usuário está com o aplicativo '${appLabel}' (janela: '${titleLabel}') em foco. Escreva o seguinte texto para ser inserido ou colado diretamente nesse aplicativo:\n\n${promptInstruction}\n\nResponda diretamente com o texto final pronto para envio ou uso, sem introduções desnecessárias.`;

        const reply = await Promise.race([
          Bridge.chatSend(enrichedPrompt, context),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error(t("Timed out talking to the model — try again."))), 60_000),
          ),
        ]);

        const card = renderGhostwriterCard(appLabel, titleLabel, reply.text);
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `✍️ Rascunhei a resposta para você. Você pode injetá-la diretamente no ${appLabel.replace(/\.exe$/i, "")} ou copiar o texto:`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // Backend has its own 90s HTTP timeout, but a hung invoke must never
      // leave the typing dots forever: race it against a 60s fuse.
      const reply = await Promise.race([
        Bridge.chatSend(query, context),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error(t("Timed out talking to the model — try again."))), 60_000),
        ),
      ]);
      State.chatHistory.push({ id: nextId++, role: "assistant", content: reply.text });
      State.stateOverride = null;
      Sound.play("finish");
    } catch (err) {
      State.stateOverride = null;
      State.noteMessage = String(err).replace(/^Error:\s*/, "");
      State.view = "note";
      Sound.play("error");
    } finally {
      sending = false;
      State.notify();
      onHeightChange();
      input.focus();
    }
  }

  send.addEventListener("click", () => void submit());
  input.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      void submit();
    }
    e.stopPropagation(); // Escape closes the island, not the chat
  });

  return {
    el,
    sync() {
      const file = State.droppedFile;
      const wantChip = file?.name ?? "";
      if (chipRow.dataset.label !== wantChip) {
        chipRow.dataset.label = wantChip;
        clear(chipRow);
        if (wantChip) chipRow.append(contextChip(wantChip));
      }

      const thinking = State.stateOverride === "thinking";
      const count = State.chatHistory.length + (thinking ? 0.5 : 0);
      if (count !== renderedCount) {
        renderedCount = count;
        clear(log);
        for (const m of State.chatHistory) log.append(bubble(m));
        if (thinking) log.append(typingDots());
        log.scrollTop = log.scrollHeight;
      }

      input.placeholder = State.chatHistory.length === 0 ? t("Ask me anything…") : t("Continue…");
      input.disabled = sending;
      fresh.style.display = State.chatHistory.length > 0 || State.droppedFile ? "" : "none";
    },
    send: sendQuery,

    focus() {
      input.focus();
      input.select();
    },
  };
}
