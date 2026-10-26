// Interactive UI Cards for Pro Features:
// 1. Excel/Sheets Wizard (Bloco 1)
// 2. Caçador de Pegadinhas em Contratos (Feature 5)
// 3. Tradutor de Juridiquês (Feature 6)
// 4. Detector de Tom e Anti-Passivo-Agressivo (Feature 8)
// 5. Quick OCR & Tradutor de Tela (Feature 3)
// 6. Resumo de Janela e Reunião (Feature 4)
// 7. Smart Clipboard Shelf (Feature 2)
// 8. Pomodoro & Foco Ágil (Feature 1)
// 9. Soundscape Lo-Fi Player (Feature 7)
// 10. Diário de Bordo / Standup (Feature 20)
// 11. Bem-Estar, Hidratação & Alongamento (Features 6, 8, 9, 10)

import { Bridge } from "../core/bridge";
import { SmartClipboard } from "../core/clipboard";
import { DailyRecap, Pomodoro } from "../core/productivity";
import { Sound } from "../core/sound";
import { Soundscape, type SoundscapeStyle } from "../core/soundscape";
import { h } from "./dom";

// Helper for temporary copy feedback
function setCopied(btn: HTMLButtonElement, originalText: string) {
  btn.textContent = "✅ Copiado!";
  Sound.play("peek");
  setTimeout(() => {
    btn.textContent = originalText;
  }, 2000);
}

// ── 1. Bloco 1: O Mago das Planilhas (Excel & Sheets) ─────────────────────────

export function renderExcelFormulaCard(data: {
  formulaPt: string;
  formulaEn: string;
  explanation: string;
  example: string;
}): HTMLElement {
  const card = h("div", { class: "sys-agent-card success" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "📊" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Mago das Planilhas: Fórmula Pronta" }),
      h("span", { class: "sys-card-sub", text: "Excel & Google Sheets (Português e Inglês)" }),
    ),
  );

  const formulaBox = h("div", { class: "sys-formula-box" });
  const ptRow = h("div", { class: "sys-formula-row" },
    h("span", { class: "sys-formula-badge pt", text: "PT-BR" }),
    h("code", { class: "sys-formula-code", text: data.formulaPt }),
    h("button", {
      class: "sys-icon-btn",
      text: "Copiar",
      onclick: (e) => {
        void navigator.clipboard.writeText(data.formulaPt);
        setCopied(e.currentTarget as HTMLButtonElement, "Copiar");
      },
    }),
  );

  const enRow = h("div", { class: "sys-formula-row" },
    h("span", { class: "sys-formula-badge en", text: "EN" }),
    h("code", { class: "sys-formula-code", text: data.formulaEn }),
    h("button", {
      class: "sys-icon-btn",
      text: "Copiar",
      onclick: (e) => {
        void navigator.clipboard.writeText(data.formulaEn);
        setCopied(e.currentTarget as HTMLButtonElement, "Copiar");
      },
    }),
  );

  formulaBox.append(ptRow, enRow);

  const expBox = h("div", { class: "sys-explanation-box" },
    h("div", { class: "sys-exp-title", text: "Como funciona:" }),
    h("div", { class: "sys-exp-text", text: data.explanation }),
    data.example ? h("div", { class: "sys-exp-example", text: `💡 Exemplo: ${data.example}` }) : null,
  );

  const btnInject = h("button", {
    class: "sys-btn-primary",
    text: "📥 Inserir no Excel / Sheets",
    onclick: async () => {
      await Bridge.injectText(data.formulaPt);
      btnInject.textContent = "✅ Inserido!";
      setTimeout(() => {
        btnInject.textContent = "📥 Inserir no Excel / Sheets";
      }, 2000);
    },
  });

  const actions = h("div", { class: "sys-actions-row" }, btnInject);

  card.append(head, formulaBox, expBox, actions);
  return card;
}

// ── 2. Feature 5: Caçador de Pegadinhas em Contratos ─────────────────────────

export interface ContractFinding {
  clause: string;
  riskLevel: "alta" | "media" | "atencao";
  explanation: string;
  recommendation: string;
}

export function renderContractAnalysisCard(findings: ContractFinding[]): HTMLElement {
  const card = h("div", { class: "sys-agent-card warning" });

  const hasHighRisk = findings.some((f) => f.riskLevel === "alta");
  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: hasHighRisk ? "🚨" : "🛡️" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Caçador de Pegadinhas em Contratos" }),
      h("span", { class: "sys-card-sub", text: `${findings.length} pontos de atenção identificados no documento` }),
    ),
  );

  const list = h("div", { class: "sys-findings-list" });
  for (const item of findings) {
    const itemEl = h("div", { class: `sys-finding-item risk-${item.riskLevel}` });
    const topRow = h("div", { class: "sys-finding-top" },
      h("span", { class: "sys-finding-clause", text: item.clause }),
      h("span", { class: `sys-risk-badge ${item.riskLevel}`, text: `Risco ${item.riskLevel.toUpperCase()}` }),
    );
    const desc = h("div", { class: "sys-finding-desc", text: item.explanation });
    const rec = h("div", { class: "sys-finding-rec", text: `💡 Sugestão: ${item.recommendation}` });
    itemEl.append(topRow, desc, rec);
    list.append(itemEl);
  }

  card.append(head, list);
  return card;
}

// ── 3. Feature 6: Tradutor de Juridiquês para Linguagem Humana ───────────────

export function renderJuridicoTranslatorCard(original: string, translation: string, keyPoints: string[]): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "⚖️" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: `Tradutor de Juridiquês: "${original.slice(0, 30)}"` }),
      h("span", { class: "sys-card-sub", text: "Explicação clara e sem termos difíceis" }),
    ),
  );

  const bodyBox = h("div", { class: "sys-human-box" },
    h("div", { class: "sys-human-title", text: "O que isso significa na prática:" }),
    h("div", { class: "sys-human-text", text: translation }),
  );

  if (keyPoints && keyPoints.length > 0) {
    const list = h("ul", { class: "sys-human-points" });
    for (const p of keyPoints) {
      list.append(h("li", { text: p }));
    }
    bodyBox.append(list);
  }

  const btnCopy = h("button", {
    class: "sys-btn-ghost",
    text: "📋 Copiar Explicação",
    onclick: () => {
      void navigator.clipboard.writeText(translation);
      setCopied(btnCopy, "📋 Copiar Explicação");
    },
  });

  const actions = h("div", { class: "sys-actions-row" }, btnCopy);
  card.append(head, bodyBox, actions);
  return card;
}

// ── 4. Feature 8: Detector de Tom e Evitador de Conflitos ────────────────────

export function renderToneDetectorCard(data: {
  detectedTone: string;
  originalText: string;
  diplomaticOption: string;
  collaborativeOption: string;
}): HTMLElement {
  const card = h("div", { class: "sys-agent-card warning" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "🕊️" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Detector de Tom e Evitador de Conflitos" }),
      h("span", { class: "sys-card-sub", text: `Tom detectado: ${data.detectedTone}` }),
    ),
  );

  const opt1 = h("div", { class: "sys-tone-option" },
    h("div", { class: "sys-tone-tag diplomatic", text: "Opção 1: Diplomática & Firme (Profissional)" }),
    h("div", { class: "sys-tone-text", text: data.diplomaticOption }),
    h("div", { class: "sys-actions-row" },
      h("button", {
        class: "sys-btn-primary",
        text: "Usar esta versão",
        onclick: async () => {
          await Bridge.injectText(data.diplomaticOption);
        },
      }),
      h("button", {
        class: "sys-btn-ghost",
        text: "Copiar",
        onclick: (e) => {
          void navigator.clipboard.writeText(data.diplomaticOption);
          setCopied(e.currentTarget as HTMLButtonElement, "Copiar");
        },
      }),
    ),
  );

  const opt2 = h("div", { class: "sys-tone-option" },
    h("div", { class: "sys-tone-tag collaborative", text: "Opção 2: Colaborativa & Calorosa (Desarma conflito)" }),
    h("div", { class: "sys-tone-text", text: data.collaborativeOption }),
    h("div", { class: "sys-actions-row" },
      h("button", {
        class: "sys-btn-primary",
        text: "Usar esta versão",
        onclick: async () => {
          await Bridge.injectText(data.collaborativeOption);
        },
      }),
      h("button", {
        class: "sys-btn-ghost",
        text: "Copiar",
        onclick: (e) => {
          void navigator.clipboard.writeText(data.collaborativeOption);
          setCopied(e.currentTarget as HTMLButtonElement, "Copiar");
        },
      }),
    ),
  );

  card.append(head, opt1, opt2);
  return card;
}

// ── 5. Feature 3: Quick OCR & Tradutor Instantâneo de Tela ───────────────────

export function renderOcrTranslatorCard(ocrText: string, translatedText: string): HTMLElement {
  const card = h("div", { class: "sys-agent-card success" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "🔍" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Quick OCR & Tradutor de Tela" }),
      h("span", { class: "sys-card-sub", text: "Texto capturado diretamente da imagem" }),
    ),
  );

  const ocrBox = h("div", { class: "sys-ocr-box" },
    h("div", { class: "sys-ocr-head" },
      h("span", { text: "Texto Original Extraído:" }),
      h("button", {
        class: "sys-icon-btn",
        text: "Copiar OCR",
        onclick: (e) => {
          void navigator.clipboard.writeText(ocrText);
          setCopied(e.currentTarget as HTMLButtonElement, "Copiar OCR");
        },
      }),
    ),
    h("pre", { class: "sys-ocr-content", text: ocrText }),
  );

  let transBox: HTMLElement | null = null;
  if (translatedText && translatedText !== ocrText) {
    transBox = h("div", { class: "sys-ocr-box translated" },
      h("div", { class: "sys-ocr-head" },
        h("span", { text: "Tradução Instantânea (Português):" }),
        h("button", {
          class: "sys-icon-btn",
          text: "Copiar Tradução",
          onclick: (e) => {
            void navigator.clipboard.writeText(translatedText);
            setCopied(e.currentTarget as HTMLButtonElement, "Copiar Tradução");
          },
        }),
      ),
      h("div", { class: "sys-ocr-content", text: translatedText }),
    );
  }

  const btnInject = h("button", {
    class: "sys-btn-primary",
    text: "📥 Inserir no App Ativo",
    onclick: async () => {
      await Bridge.injectText(translatedText || ocrText);
      btnInject.textContent = "✅ Inserido!";
      setTimeout(() => {
        btnInject.textContent = "📥 Inserir no App Ativo";
      }, 2000);
    },
  });

  const actions = h("div", { class: "sys-actions-row" }, btnInject);
  card.append(head, ocrBox);
  if (transBox) card.append(transBox);
  card.append(actions);
  return card;
}

// ── 6. Feature 4: Resumo de Janela e Reunião em 1 Clique ─────────────────────

export function renderMeetingSummaryCard(appName: string, windowTitle: string, summaryMarkdown: string): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "📝" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: `Resumo Executivo: ${appName || "Reunião"}` }),
      h("span", { class: "sys-card-sub", text: windowTitle ? windowTitle.slice(0, 50) : "Síntese em 1 minuto" }),
    ),
  );

  const body = h("div", { class: "sys-summary-body", text: summaryMarkdown });

  const btnCopy = h("button", {
    class: "sys-btn-primary",
    text: "📋 Copiar Resumo",
    onclick: () => {
      void navigator.clipboard.writeText(summaryMarkdown);
      setCopied(btnCopy, "📋 Copiar Resumo");
    },
  });

  const actions = h("div", { class: "sys-actions-row" }, btnCopy);
  card.append(head, body, actions);
  return card;
}

// ── 7. Feature 2: Smart Clipboard Shelf & Magic Paste ────────────────────────

export function renderClipboardShelfCard(): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "📋" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Área de Transferência Inteligente" }),
      h("span", { class: "sys-card-sub", text: "Histórico e Formatação 'Magic Paste'" }),
    ),
  );

  const items = SmartClipboard.getItems();
  const list = h("div", { class: "sys-clipboard-list" });

  if (items.length === 0) {
    list.append(h("div", { class: "sys-empty", text: "Nenhum item copiado recentemente." }));
  } else {
    for (const item of items.slice(0, 6)) {
      const row = h("div", { class: "sys-clip-item" });
      const meta = h("div", { class: "sys-clip-meta" },
        h("span", { class: `sys-clip-kind ${item.kind}`, text: item.kind }),
        h("span", { class: "sys-clip-preview", text: item.preview }),
      );

      const actionsRow = h("div", { class: "sys-clip-actions" },
        h("button", {
          class: "sys-icon-btn",
          text: "Colar",
          title: "Inserir no app em foco",
          onclick: () => void Bridge.injectText(item.text),
        }),
        h("button", {
          class: "sys-icon-btn",
          text: "✨ Rich",
          title: "Colar como Rich Text formatado (Word/Docs)",
          onclick: () => {
            const rich = SmartClipboard.markdownToRichHtml(item.text);
            void SmartClipboard.copyMagic(item.text, rich);
          },
        }),
        h("button", {
          class: "sys-icon-btn",
          text: "1-Linha",
          title: "Colar em uma única linha limpa",
          onclick: () => {
            const single = SmartClipboard.toSingleLine(item.text);
            void Bridge.injectText(single);
          },
        }),
      );

      row.append(meta, actionsRow);
      list.append(row);
    }
  }

  card.append(head, list);
  return card;
}

// ── 8. Feature 1: Pomodoro & Foco Interativo ─────────────────────────────────

export function renderPomodoroCard(): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "🍅" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Foco Ágil & Pomodoro" }),
      h("span", { class: "sys-card-sub", text: "Alterne ciclos de concentração e descanso" }),
    ),
  );

  const timerDisplay = h("div", { class: "sys-pomo-display", text: Pomodoro.formatTime() });
  const statusLabel = h("div", { class: "sys-pomo-status", text: "Pronto para começar" });

  const btnToggle = h("button", {
    class: "sys-btn-primary",
    text: "Iniciar Foco (25m)",
    onclick: () => {
      Pomodoro.toggle();
    },
  });

  const btnReset = h("button", {
    class: "sys-btn-ghost",
    text: "Resetar",
    onclick: () => Pomodoro.reset(),
  });

  const modeRow = h("div", { class: "sys-pomo-modes" },
    h("button", {
      class: "sys-chip-btn",
      text: "Foco (25m)",
      onclick: () => Pomodoro.setMode("focus"),
    }),
    h("button", {
      class: "sys-chip-btn",
      text: "Pausa Curta (5m)",
      onclick: () => Pomodoro.setMode("shortBreak"),
    }),
    h("button", {
      class: "sys-chip-btn",
      text: "Pausa Longa (15m)",
      onclick: () => Pomodoro.setMode("longBreak"),
    }),
  );

  const actions = h("div", { class: "sys-actions-row" }, btnToggle, btnReset);

  // Sync with timer state
  Pomodoro.subscribe((s) => {
    timerDisplay.textContent = Pomodoro.formatTime();
    btnToggle.textContent = s.isRunning ? "Pausar" : "Continuar";
    statusLabel.textContent = s.isRunning
      ? (s.mode === "focus" ? "🔥 Modo Foco Ativo" : "☕ Momento de Descanso")
      : (s.mode === "focus" ? "Foco Pausado" : "Descanso Pausado");
  });

  card.append(head, timerDisplay, statusLabel, modeRow, actions);
  return card;
}

// ── 9. Feature 7: Lo-Fi Soundscape Player ────────────────────────────────────

export function renderSoundscapeCard(): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });
  const state = Soundscape.getState();

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "🎧" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Soundscape Lo-Fi & Foco" }),
      h("span", { class: "sys-card-sub", text: `${state.currentTrack.title} (${state.currentTrack.styleLabel})` }),
    ),
  );

  const presets: Array<{ id: SoundscapeStyle; icon: string; name: string }> = [
    { id: "lofi", icon: "☕", name: "Lo-Fi Beats" },
    { id: "piano", icon: "🎹", name: "Piano" },
    { id: "acoustic", icon: "🎸", name: "Violão" },
    { id: "ambient", icon: "🌌", name: "Ambiente" },
    { id: "rain", icon: "🌧️", name: "Chuva" },
    { id: "ocean", icon: "🌊", name: "Ondas" },
  ];

  const modesGrid = h("div", { class: "sys-sound-grid" });
  for (const p of presets) {
    const btn = h("button", {
      class: `sys-sound-btn ${state.currentStyle === p.id ? "active" : ""}`,
      onclick: () => {
        Soundscape.setStyle(p.id);
        updateCard();
      },
    }, h("span", { text: p.icon }), h("span", { text: p.name }));
    modesGrid.append(btn);
  }

  const volSlider = h("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.05",
    value: state.volume.toString(),
    class: "sys-vol-slider",
    oninput: (e) => {
      Soundscape.setVolume(parseFloat((e.target as HTMLInputElement).value));
    },
  });

  const btnPrev = h("button", {
    class: "sys-icon-btn",
    text: "⏮",
    title: "Faixa Anterior",
    onclick: () => {
      Soundscape.prev();
      updateCard();
    },
  });

  const btnPlay = h("button", {
    class: "sys-btn-primary",
    text: state.isPlaying ? "⏸ Pausar" : "▶ Tocar",
    onclick: () => {
      Soundscape.toggle();
      updateCard();
    },
  });

  const btnNext = h("button", {
    class: "sys-icon-btn",
    text: "⏭",
    title: "Próxima Faixa",
    onclick: () => {
      Soundscape.next();
      updateCard();
    },
  });

  const controlsRow = h("div", { class: "sys-actions-row", style: "display:flex;align-items:center;gap:8px;" },
    btnPrev,
    btnPlay,
    btnNext,
  );

  const volRow = h("div", { class: "sys-vol-row" },
    h("span", { text: "🔈 Volume:" }),
    volSlider,
  );

  const updateCard = () => {
    const s = Soundscape.getState();
    const sub = head.querySelector(".sys-card-sub");
    if (sub) sub.textContent = `${s.currentTrack.title} (${s.currentTrack.styleLabel})`;
    btnPlay.textContent = s.isPlaying ? "⏸ Pausar" : "▶ Tocar";
  };

  card.append(head, modesGrid, controlsRow, volRow);
  return card;
}

// ── 10. Feature 20: Diário de Bordo & Standup Executivo ─────────────────────

export function renderDailyRecapCard(): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "📔" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Diário de Bordo & Standup Executivo" }),
      h("span", { class: "sys-card-sub", text: "Métricas de foco por app e entregas registradas" }),
    ),
  );

  // App breakdown and KPI stats
  const appStats = DailyRecap.getAppUsage();
  const totalMins = appStats.reduce((acc, u) => acc + u.minutes, 0);
  const totalHoursStr = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
  const pomodoros = DailyRecap.getItems().filter((i) => i.category === "pomodoro").length;

  const statsGrid = h("div", { style: "display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;" },
    h("div", { style: "background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:6px;text-align:center;" },
      h("div", { style: "font-size:10px;color:#94a3b8;", text: "Foco Total" }),
      h("div", { style: "font-size:13px;font-weight:700;color:#38bdf8;", text: totalHoursStr }),
    ),
    h("div", { style: "background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:6px;text-align:center;" },
      h("div", { style: "font-size:10px;color:#94a3b8;", text: "Pomodoros" }),
      h("div", { style: "font-size:13px;font-weight:700;color:#f87171;", text: `${pomodoros} ciclos` }),
    ),
    h("div", { style: "background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:6px;text-align:center;" },
      h("div", { style: "font-size:10px;color:#94a3b8;", text: "Ferramentas" }),
      h("div", { style: "font-size:13px;font-weight:700;color:#a78bfa;", text: `${appStats.length} apps` }),
    ),
  );

  // App breakdown progress bars
  const appBarsContainer = h("div", { style: "display:flex;flex-direction:column;gap:5px;margin-bottom:10px;" });
  for (const a of appStats) {
    const row = h("div", { style: "display:flex;flex-direction:column;gap:2px;" },
      h("div", { style: "display:flex;justify-content:space-between;font-size:10px;color:#cbd5e1;" },
        h("span", { text: a.app }),
        h("span", { text: `${Math.floor(a.minutes / 60)}h ${a.minutes % 60}m (${a.percent}%)` }),
      ),
      h("div", { style: "height:4px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;" },
        h("div", { style: `height:100%;width:${a.percent}%;background:linear-gradient(90deg, #38bdf8, #818cf8);border-radius:3px;` }),
      ),
    );
    appBarsContainer.append(row);
  }

  let standupText = DailyRecap.generateStandupMarkdown();
  const textBox = h("pre", { class: "sys-standup-box", style: "max-height:160px;overflow-y:auto;white-space:pre-wrap;font-size:11px;line-height:1.45;", text: standupText });

  const taskInput = h("input", {
    type: "text",
    placeholder: "Adicionar entrega ou tarefa concluída...",
    style: "flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:6px 8px;color:#f1f5f9;font-size:11px;",
  }) as HTMLInputElement;

  const btnAddTask = h("button", {
    class: "sys-btn-ghost",
    text: "+ Adicionar",
    style: "font-size:11px;padding:6px 10px;",
    onclick: () => {
      const val = taskInput.value.trim();
      if (!val) return;
      DailyRecap.addTask(val);
      taskInput.value = "";
      standupText = DailyRecap.generateStandupMarkdown();
      textBox.textContent = standupText;
    },
  });

  const taskRow = h("div", { style: "display:flex;gap:6px;align-items:center;margin-top:8px;" }, taskInput, btnAddTask);

  const btnCopy = h("button", {
    class: "sys-btn-primary",
    text: "📋 Copiar para WhatsApp / Teams",
    style: "margin-top:10px;",
    onclick: () => {
      void navigator.clipboard.writeText(standupText);
      setCopied(btnCopy, "📋 Copiar para WhatsApp / Teams");
    },
  });

  card.append(head, statsGrid, appBarsContainer, textBox, taskRow, btnCopy);
  return card;
}
