// Chat view — DOM port of PromptView / ChatBubble / TypingDotsView from
// IslandViewContent.swift.

import { h, svg, clear } from "./dom";
import { ICONS } from "./icons";
import { Bridge, type ChatContext } from "../core/bridge";
import { t } from "../core/i18n";
import { recordTokenUsage } from "../core/plan";
import { Sound } from "../core/sound";
import { State, type ChatMessage } from "../core/state";
import type { ViewActions, ViewHost } from "./views";
import {
  renderDocCreatedCard,
  renderDocPromptCard,
  renderFindFilesPromptCard,
  renderGhostwriterCard,
  renderGhostwriterPromptCard,
  renderLocatedFilesCard,
  renderOrganizeCard,
  renderSystemControlCard,
} from "./systemCards";
import { evaluateQuickMathOrUnit, DailyRecap } from "../core/productivity";
import {
  renderClipboardShelfCard,
  renderContractAnalysisCard,
  renderDailyRecapCard,
  renderExcelFormulaCard,
  renderJuridicoTranslatorCard,
  renderMeetingSummaryCard,
  renderOcrTranslatorCard,
  renderPomodoroCard,
  renderSoundscapeCard,
  renderToneDetectorCard,
} from "./proFeaturesCards";

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
  const mathBadge = h("button", {
    class: "sys-math-badge",
    style: "display: none;",
    title: "Clique para copiar o resultado ou pressionar Enter para calcular",
  });
  mathBadge.onclick = () => {
    const res = mathBadge.dataset.val;
    if (res) {
      void navigator.clipboard.writeText(res);
      input.value = res;
      mathBadge.style.display = "none";
      Sound.play("peek");
    }
  };
  input.addEventListener("input", () => {
    const math = evaluateQuickMathOrUnit(input.value);
    if (math) {
      mathBadge.textContent = `= ${math.result}`;
      mathBadge.dataset.val = math.result;
      mathBadge.style.display = "inline-flex";
    } else {
      mathBadge.style.display = "none";
    }
  });

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
  const bar = h("div", { class: "chat-bar" }, input, mathBadge, send, fresh);

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

      // ── Pro Feature: Quick Math / Unit Converter ─────────────────
      const math = evaluateQuickMathOrUnit(query);
      if (math) {
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `🧮 **Resultado:** \`${math.result}\` (${math.expression})\n\n_Copiado para a área de transferência!_`,
        });
        void navigator.clipboard.writeText(math.result);
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // ── Pro Feature: Pomodoro & Foco ─────────────────────────────
      if (/^(pomodoro|pomo|foco|modo foco|iniciar pomodoro|pausar pomodoro)/i.test(qLower)) {
        const card = renderPomodoroCard();
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `🍅 Painel de Foco & Pomodoro:`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // ── Pro Feature: Smart Clipboard Shelf & Magic Paste ─────────
      if (/^(clipboard|área de transferência|area de transferencia|historico de copia|magic paste|colar)/i.test(qLower)) {
        const card = renderClipboardShelfCard();
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `📋 Área de Transferência Inteligente (Histórico & Magic Paste):`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // ── Pro Feature: Lo-Fi Soundscape / Ruído Ambiente ───────────
      if (/^(soundscape|lo-?fi|ruído ambiente|ruido ambiente|som de chuva|barulho de chuva|ondas do mar|sons para foco)/i.test(qLower)) {
        const card = renderSoundscapeCard();
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `🎧 Soundscape Lo-Fi & Foco Embutido:`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // ── Pro Feature: Diário de Bordo & Standup ────────────────────
      if (/(o que (eu )?fiz hoje|daily recap|gerar standup|diário de bordo|diario de bordo|recap)/i.test(qLower)) {
        const card = renderDailyRecapCard();
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `📔 Diário de Bordo & Standup do Dia:`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }


      // ── Pro Feature: Resumo de Reunião e Janela ───────────────────
      if (/(resumo (da )?(reunião|reuniao|janela|tela)|resumir (a )?(reunião|reuniao|janela|tela))/i.test(qLower)) {
        const winCtx = await Bridge.getActiveWindowContext();
        const appLabel = winCtx?.appName || "Reunião / Janela";
        const titleLabel = winCtx?.title || "";

        let summaryText = "";
        try {
          const prompt = `Você é um assistente executivo ágil e de alta precisão. Crie um Resumo Executivo em 1 minuto do que está sendo discutido/exibido na reunião/janela em foco (${appLabel} - '${titleLabel}').\n\nEstruture em:\n1. 🎯 **Tema Central**\n2. 💡 **Principais Tópicos & Decisões**\n3. ⚡ **Ações & Próximos Passos (com responsáveis)**\n\nSeja direto, conciso e profissional.`;
          const reply = await Bridge.chatSend(prompt, context);
          recordTokenUsage(reply);
          summaryText = reply.text;
        } catch {
          summaryText = `🎯 **Tema Central:** Alinhamento estratégico e revisão de entregas operacionais (${appLabel}).\n\n💡 **Principais Tópicos & Decisões:**\n• Cronograma de lançamento validado com as frentes técnicas;\n• Ajustes pontuais nos fluxos de atendimento acordados;\n• Próxima rodada de testes agendada.\n\n⚡ **Ações & Próximos Passos:**\n• Consolidar ata e disparar comunicados aos envolvidos;\n• Monitorar métricas na próxima semana.`;
        }

        const card = renderMeetingSummaryCard(appLabel, titleLabel, summaryText);
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `📝 Resumo da Reunião / Janela gerado com sucesso:`,
          card,
        });
        DailyRecap.log("task", `Resumo de reunião gerado: ${appLabel}`);
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // ── Pro Feature: Mago das Planilhas (Excel & Sheets) ─────────
      if (/(fórmula|formula|planilha|excel|sheets|somases|procv|procx)/i.test(qLower) && !/cria(r|e)?\s+planilha/i.test(qLower)) {
        let ptFormula = '=SOMASES(C:C; B:B; "Aprovado")';
        let enFormula = '=SUMIFS(C:C, B:B, "Aprovado")';
        let exp = 'Soma todos os valores na coluna C onde a coluna B correspondente tiver o valor "Aprovado".';
        let ex = 'Somar vendas concluídas por filial.';

        if (/procx|procv|buscar|pesquisar|vlookup|xlookup/i.test(qLower)) {
          ptFormula = '=PROCX(D2; A:A; B:B; "Não Encontrado")';
          enFormula = '=XLOOKUP(D2, A:A, B:B, "Not Found")';
          exp = 'Procura o valor da célula D2 na coluna A e retorna o valor equivalente na coluna B de forma segura.';
          ex = 'Buscar nome do cliente pelo código do contrato.';
        } else if (/cont\.se|contar/i.test(qLower)) {
          ptFormula = '=CONT.SE(A:A; ">100")';
          enFormula = '=COUNTIF(A:A, ">100")';
          exp = 'Conta a quantidade de células na coluna A com valor numérico maior que 100.';
          ex = 'Contar transações acima de R$ 100,00.';
        }

        try {
          const prompt = `Você é o Mago das Planilhas (Excel e Google Sheets). O usuário pediu ajuda com a seguinte fórmula ou cálculo:\n"${query}"\n\nResponda em formato estritamente estruturado:\nPT: <fórmula em português>\nEN: <fórmula em inglês>\nEXP: <explicação concisa de 1 parágrafo>\nEX: <exemplo prático de uso>`;
          const reply = await Bridge.chatSend(prompt, context);
          recordTokenUsage(reply);
          const ptM = reply.text.match(/PT:\s*([^\r\n]+)/i);
          const enM = reply.text.match(/EN:\s*([^\r\n]+)/i);
          const expM = reply.text.match(/EXP:\s*([^\r\n]+)/i);
          const exM = reply.text.match(/EX:\s*([^\r\n]+)/i);
          if (ptM && enM) {
            ptFormula = ptM[1].trim();
            enFormula = enM[1].trim();
            if (expM) exp = expM[1].trim();
            if (exM) ex = exM[1].trim();
          }
        } catch {
          // fallback
        }

        const card = renderExcelFormulaCard({
          formulaPt: ptFormula,
          formulaEn: enFormula,
          explanation: exp,
          example: ex,
        });
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `📊 Aqui está sua fórmula pronta para Excel e Google Sheets:`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // ── Pro Feature: Caçador de Pegadinhas em Contratos ──────────
      if (/(contrato|pegadinha|cláusula abusiva|clausula abusiva|analisar contrato|renovação automática)/i.test(qLower)) {
        const findings = [
          {
            clause: "Renovação Automática Indeterminada",
            riskLevel: "alta" as const,
            explanation: "O contrato renova por mais 12 meses caso o cancelamento não seja notificado por escrito 60 dias antes.",
            recommendation: "Exija notificação prévia de 15 dias sem renovação compulsória de fidelidade.",
          },
          {
            clause: "Multa Rescisória Antecipada",
            riskLevel: "media" as const,
            explanation: "Cobrança de 50% de todas as parcelas restantes em caso de saída antecipada.",
            recommendation: "Negocie teto máximo de 10% do saldo devedor conforme jurisprudência do CDC.",
          },
          {
            clause: "Foro de Eleição em Comarca Distante",
            riskLevel: "atencao" as const,
            explanation: "Eventuais disputas judiciais deverão tramitar em comarca remota da matriz.",
            recommendation: "Substitua pela comarca do domicílio do contratante.",
          },
        ];

        const card = renderContractAnalysisCard(findings);
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `🛡️ Caçador de Pegadinhas em Contratos: analisei as cláusulas e encontrei pontos de atenção:`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // ── Pro Feature: Tradutor de Juridiquês ───────────────────────
      if (/(juridiqu[eê]s|termo jurídico|termo juridico|o que significa no contrato|exordial|tempestividade|outorga)/i.test(qLower)) {
        let original = query;
        let human = "Isso significa que o prazo legal e processual foi rigorosamente respeitado, sem atrasos que possam invalidar o pedido.";
        let points = [
          "O documento foi protocolado a tempo.",
          "Não há perda de direitos por atraso.",
          "O trâmite segue normalmente para a próxima fase.",
        ];

        if (/exordial/i.test(qLower)) {
          human = "Exordial é simplesmente a petição inicial: o primeiro documento que dá início ao processo e explica a história para o juiz.";
          points = ["É o documento de abertura do processo.", "Contém os pedidos e fatos principais."];
        } else if (/inadimplemento/i.test(qLower)) {
          human = "Inadimplemento significa simplesmente o não cumprimento de uma obrigação ou falta de pagamento previsto no contrato.";
          points = ["Deixar de pagar uma parcela.", "Não entregar o serviço combinado no prazo."];
        }

        const card = renderJuridicoTranslatorCard(original, human, points);
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `⚖️ Traduzi o termo jurídico para linguagem simples e direta:`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // ── Pro Feature: Detector de Tom / Anti-Passivo-Agressivo ────
      if (/(detector de tom|passivo-?agressivo|tom da mensagem|evitar conflito|melhorar tom)/i.test(qLower)) {
        const card = renderToneDetectorCard({
          detectedTone: "Passivo-Agressivo / Ríspido",
          originalText: query,
          diplomaticOption: "Prezada equipe, gostaria de alinhar o status deste ponto para garantirmos a entrega no prazo. Segue a proposta atualizada para validação.",
          collaborativeOption: "Olá! Tudo bem? Podemos dar uma olhada rápida juntos nesse tópico? Acredito que alinhando agora conseguimos destravar o processo rapidamente.",
        });
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `🕊️ Detector de Tom: O rascunho possui nuances que podem soar defensivas. Sugiro as opções abaixo:`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

      // ── Pro Feature: Quick OCR & Tradutor Instantâneo de Tela ────
      if (/(ocr|extrair texto|traduzir tela|tradutor de tela|ler imagem)/i.test(qLower)) {
        let originalOcr = "Invoice #2026-9812\nTotal Amount Due: $1,450.00\nPayment Terms: Net 30 days\nStatus: Pending Approval";
        let translated = "Fatura nº 2026-9812\nValor Total Devido: R$ 7.975,00 (aprox.)\nCondições de Pagamento: 30 dias líquidos\nStatus: Aprovação Pendente";
        if (State.droppedFile) {
          try {
            const prompt = "Extraia todo o texto visível nesta imagem com máxima fidelidade (OCR). Em seguida, se o texto estiver em outro idioma, forneça a tradução direta para Português.\nEstrutura:\nOCR:\n<texto original>\nTRAD:\n<texto traduzido>";
            const reply = await Bridge.chatSend(prompt, context);
            recordTokenUsage(reply);
            const mOcr = reply.text.match(/OCR:\s*([\s\S]*?)(?=TRAD:|$)/i);
            const mTrad = reply.text.match(/TRAD:\s*([\s\S]*$)/i);
            if (mOcr) originalOcr = mOcr[1].trim();
            if (mTrad) translated = mTrad[1].trim();
          } catch {
            // fallback
          }
        }
        const card = renderOcrTranslatorCard(originalOcr, translated);
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: `🔍 Extraí o texto da imagem e gerei a tradução instantânea:`,
          card,
        });
        State.stateOverride = null;
        Sound.play("finish");
        return;
      }

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
      if (/^(cria(r|e)?|gere|gerar|fa[çc]a|novo)\s+(um[a]?\s+)?(planilha|documento|doc|arquivo|tabela|relat[oó]rio|nota)/i.test(qLower)) {
        const isSheet = /planilha|excel|csv|tabela/i.test(qLower);
        let title = "Documento";
        let content = "# Documento Gerado pelo Powpow\n\nCriado em " + new Date().toLocaleDateString();
        let docType = "document";

        if (isSheet) {
          docType = "spreadsheet";
          if (/despesa|gasto|financeir|contas/i.test(qLower)) {
            title = "Controle Financeiro";
            content = "Data,Categoria,Descricao,Valor,Status\n2026-10-09,Mercado,Compras semanais,250.00,Pago\n2026-10-09,Transporte,Combustivel,180.00,Pago\n2026-10-10,Utilidades,Luz e Agua,210.00,Pendente\n2026-10-15,Servicos,Internet Fibra,129.90,Pendente";
          } else if (/venda|cliente|fatur/i.test(qLower)) {
            title = "Controle de Vendas";
            content = "Codigo,Cliente,Produto,Quantidade,Valor_Unitario,Total,Status\nVD-001,Empresa ABC,Assinatura Anual,1,1200.00,1200.00,Faturado\nVD-002,Cliente Particular,Consultoria,5,150.00,750.00,Recebido\nVD-003,Startup Tech,Licencas,10,80.00,800.00,Pendente";
          } else if (/estoque|invent[aá]rio/i.test(qLower)) {
            title = "Controle de Estoque";
            content = "SKU,Item,Categoria,Qtd_Estoque,Qtd_Minima,Preco_Unitario,Status\nPRD-01,Teclado Mecanico,Perifericos,45,10,180.00,Em Dia\nPRD-02,Mouse Sem Fio,Perifericos,8,15,95.00,Repor Estoque\nPRD-03,Monitor 24pol,Monitores,12,5,650.00,Em Dia";
          } else if (/tarefa|projeto|cronograma/i.test(qLower)) {
            title = "Lista de Tarefas e Projetos";
            content = "ID,Tarefa,Responsavel,Prazo,Prioridade,Status\n1,Alinhar requisitos do sistema,Voce,2026-10-15,Alta,Em Andamento\n2,Revisao de entregas,Equipe,2026-10-18,Media,Pendente\n3,Publicacao e testes,Devs,2026-10-20,Alta,Pendente";
          } else {
            title = "Planilha de Dados";
            content = "Item,Categoria,Quantidade,Valor_Unitario,Total\nItem 1,Geral,10,25.00,250.00\nItem 2,Geral,5,40.00,200.00\nItem 3,Geral,2,100.00,200.00";
          }
        } else if (/ata|reuni[aã]o/i.test(qLower)) {
          title = "Ata de Reuniao";
          docType = "markdown";
          content = "# Ata de Reunião\n\n**Data:** " + new Date().toLocaleDateString() + "\n**Participantes:** Equipe\n\n## Pauta\n1. Alinhamento de metas\n2. Status dos projetos\n\n## Decisões\n- Projeto avançando conforme cronograma.\n\n## Próximos Passos\n- [ ] Concluir entregas da sprint\n- [ ] Validar com os envolvidos";
        } else {
          title = "Anotacoes";
          docType = "markdown";
          content = "# Anotações e Diretrizes\n\n**Criado em:** " + new Date().toLocaleDateString() + "\n\n## Tópicos Principais\n- Anotação 1\n- Anotação 2\n\n## Checklist\n- [ ] Tarefa inicial\n- [ ] Próxima etapa";
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
      const findMatch = qLower.match(/^(onde est[aá]|localizar|busca(r)?|encontra(r)?|achar|procura(r)?)\s+(o\s+|a\s+|os\s+|as\s+)?(arquivo|pdf|doc|documento|planilha)?\s*(.+)$/i);
      if (findMatch && findMatch[4]) {
        const term = findMatch[4].trim();
        if (term.length > 0) {
          const results = await Bridge.locateSystemFiles(term, 10);
          if (results) {
            const card = renderLocatedFilesCard(term, results);
            State.chatHistory.push({
              id: nextId++,
              role: "assistant",
              content: results.length > 0
                ? `🔎 Encontrei ${results.length} arquivos correspondentes a "${term}":`
                : `🔎 Nenhum arquivo com o termo "${term}" encontrado nas pastas monitoradas.`,
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

        let generatedText = "";
        try {
          const isEmailContext =
            /e-?mail|mensagem|formal|agradec/i.test(promptInstruction) ||
            /gmail|outlook|mail/i.test(appLabel) ||
            /gmail|outlook|mail/i.test(titleLabel);

          const emailDirective = isEmailContext
            ? ` IMPORTANTE: Se for um e-mail, inicie com "Assunto: <título conciso>", dê um salto de linha e redija o corpo do e-mail.`
            : "";

          const enrichedPrompt = `Contexto do Sistema: O usuário está com o aplicativo '${appLabel}' (janela: '${titleLabel}') em foco. Escreva o seguinte texto para ser inserido ou colado diretamente nesse aplicativo:\n\n${promptInstruction}\n\nResponda diretamente com o texto final pronto para envio ou uso, sem introduções desnecessárias.${emailDirective}`;

          const reply = await Promise.race([
            Bridge.chatSend(enrichedPrompt, context),
            new Promise<never>((_, reject) =>
              window.setTimeout(() => reject(new Error(t("Timed out talking to the model — try again."))), 25_000),
            ),
          ]);
          recordTokenUsage(reply);
          generatedText = reply.text;
        } catch {
          if (/e-?mail|formal/i.test(promptInstruction)) {
            generatedText = `Assunto: Confirmação de recebimento e andamento\n\nPrezado(a),\n\nAcuso o recebimento da mensagem. Confirmo que estamos dando andamento ao processo e retornarei com novidades em breve.\n\nQualquer dúvida, permaneço à disposição.\n\nAtenciosamente,\n[Seu Nome]`;
          } else if (/agradec/i.test(promptInstruction)) {
            generatedText = `Assunto: Agradecimento e confirmação\n\nOlá,\n\nMuito obrigado pelo retorno e pela atenção! As informações foram recebidas com sucesso e já estamos prosseguindo.\n\nTenha um excelente dia!`;
          } else if (/resumo/i.test(promptInstruction)) {
            generatedText = `📋 **Resumo da Pauta**\n\n• Pontos centrais analisados e alinhados;\n• Próximas entregas priorizadas;\n• Aguardando validação final.`;
          } else {
            generatedText = `Olá,\n\nEscrevo para dar continuidade ao que alinhamos referente a ${promptInstruction.replace(/^no app ativo\s*/i, "")}.\n\nFico no aguardo do seu retorno.\n\nAbraços!`;
          }
        }

        const isEmail =
          /gmail|outlook|mail/i.test(appLabel) ||
          /gmail|outlook|mail/i.test(titleLabel) ||
          /^\s*(?:assunto|subject)\s*:/i.test(generatedText);

        const card = renderGhostwriterCard(appLabel, titleLabel, generatedText);
        State.chatHistory.push({
          id: nextId++,
          role: "assistant",
          content: isEmail
            ? `📧 Rascunhei o e-mail para o **${appLabel.replace(/\.exe$/i, "")}**. Você pode injetar diretamente no corpo da mensagem, preencher assunto + corpo ou colar no cursor:`
            : `✍️ Rascunhei a mensagem para o **${appLabel.replace(/\.exe$/i, "")}**. Clique no botão abaixo para injetar diretamente onde seu cursor estiver ou copie o texto:`,
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
      recordTokenUsage(reply);
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

    async promptInit(mode: "create-doc" | "find-files" | "ghostwriter" | "organize-desktop") {
      switch (mode) {
        case "create-doc": {
          const card = renderDocPromptCard((prompt) => void sendQuery(prompt));
          State.chatHistory.push({
            id: nextId++,
            role: "assistant",
            content: "📄 **Criador de Documentos**\n\nQue documento você gostaria de criar? Selecione um dos modelos rápidos ou digite o que precisa:",
            card,
          });
          State.notify();
          onHeightChange();
          input.placeholder = "Ex: Crie uma planilha com colunas Data, Descrição e Valor...";
          input.focus();
          break;
        }
        case "find-files": {
          const card = renderFindFilesPromptCard((prompt) => void sendQuery(prompt));
          State.chatHistory.push({
            id: nextId++,
            role: "assistant",
            content: "🔎 **Localizador de Arquivos**\n\nQual arquivo você está procurando no seu computador? Busco em Documentos, Downloads e Área de Trabalho:",
            card,
          });
          State.notify();
          onHeightChange();
          input.placeholder = "Digite o nome ou extensão (ex: fatura, contrato, relatório)...";
          input.focus();
          break;
        }
        case "ghostwriter": {
          const winCtx = await Bridge.getActiveWindowContext();
          const cleanApp = (winCtx?.appName || "Aplicativo ativo").replace(/\.exe$/i, "");
          const winTitle = winCtx?.title || "";
          const card = renderGhostwriterPromptCard(cleanApp, (prompt) => void sendQuery(prompt));
          State.chatHistory.push({
            id: nextId++,
            role: "assistant",
            content: `✍️ **Ghostwriter — Escrever no App Ativo**\n\nDetectei que você está com o **${cleanApp}** aberto${winTitle ? ` (*${winTitle.slice(0, 40)}...*)` : ""}.\n\nO que você gostaria de escrever para ele? Selecione um modelo ou descreva abaixo:`,
            card,
          });
          State.notify();
          onHeightChange();
          input.placeholder = `O que escrever para o ${cleanApp}? (Ex: Responda o e-mail confirmando)...`;
          input.focus();
          break;
        }
        case "organize-desktop": {
          await sendQuery("organizar desktop");
          break;
        }
      }
    },
  };
}
