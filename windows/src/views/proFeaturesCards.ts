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
import { Soundscape, type SoundscapeMode } from "../core/soundscape";
import { Wellness } from "../core/wellness";
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

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "🎧" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Soundscape Lo-Fi & Foco" }),
      h("span", { class: "sys-card-sub", text: "Ruído ambiente sintetizado na Ilha (Offline)" }),
    ),
  );

  const modesGrid = h("div", { class: "sys-sound-grid" });
  const presets: Array<{ id: SoundscapeMode; icon: string; name: string }> = [
    { id: "rain", icon: "🌧️", name: "Chuva Suave" },
    { id: "cafe", icon: "☕", name: "Cafeteria" },
    { id: "ocean", icon: "🌊", name: "Ondas do Mar" },
    { id: "lofi", icon: "🎵", name: "Lo-Fi Beats" },
  ];

  for (const p of presets) {
    const btn = h("button", {
      class: "sys-sound-btn",
      onclick: () => {
        Soundscape.setMode(p.id);
      },
    }, h("span", { text: p.icon }), h("span", { text: p.name }));
    modesGrid.append(btn);
  }

  const volSlider = h("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.05",
    value: Soundscape.getState().volume.toString(),
    class: "sys-vol-slider",
    oninput: (e) => {
      Soundscape.setVolume(parseFloat((e.target as HTMLInputElement).value));
    },
  });

  const volRow = h("div", { class: "sys-vol-row" },
    h("span", { text: "🔈 Volume:" }),
    volSlider,
    h("button", {
      class: "sys-icon-btn",
      text: Soundscape.getState().isPlaying ? "Pausar" : "Tocar",
      onclick: () => Soundscape.toggle(),
    }),
  );

  card.append(head, modesGrid, volRow);
  return card;
}

// ── 10. Feature 20: Diário de Bordo & Standup ────────────────────────────────

export function renderDailyRecapCard(): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "📔" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Diário de Bordo / Standup Local" }),
      h("span", { class: "sys-card-sub", text: "Resumo do que foi realizado hoje no seu PC" }),
    ),
  );

  const standupText = DailyRecap.generateStandupMarkdown();
  const textBox = h("pre", { class: "sys-standup-box", text: standupText });

  const btnCopy = h("button", {
    class: "sys-btn-primary",
    text: "📋 Copiar para WhatsApp / Teams",
    onclick: () => {
      void navigator.clipboard.writeText(standupText);
      setCopied(btnCopy, "📋 Copiar para WhatsApp / Teams");
    },
  });

  const actions = h("div", { class: "sys-actions-row" }, btnCopy);
  card.append(head, textBox, actions);
  return card;
}

// ── 11. Features 6, 8, 9, 10: Bem-Estar & Ergonomia ──────────────────────────

export function renderWellnessCard(): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "💧" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Bem-Estar & Ergonomia (Mascote Embasa)" }),
      h("span", { class: "sys-card-sub", text: "Hidratação, descanso ocular e alongamento" }),
    ),
  );

  const state = Wellness.getState();

  // Water widget
  const waterRow = h("div", { class: "sys-wellness-row" },
    h("div", { class: "sys-wellness-info" },
      h("span", { class: "sys-wellness-icon", text: "💧" }),
      h("div", undefined,
        h("div", { class: "sys-wellness-label", text: "Hidratação Diária" }),
        h("div", { class: "sys-wellness-sub", text: `${state.glassesDrankToday} de ${state.goalGlasses} copos bebidos` }),
      ),
    ),
    h("button", {
      class: "sys-btn-primary",
      text: "+1 Copo 💧",
      onclick: () => Wellness.drinkGlass(),
    }),
  );

  // Micro-stretch widget
  const stretchRow = h("div", { class: "sys-wellness-row" },
    h("div", { class: "sys-wellness-info" },
      h("span", { class: "sys-wellness-icon", text: "🧘" }),
      h("div", undefined,
        h("div", { class: "sys-wellness-label", text: "Micro-Alongamento (30s)" }),
        h("div", { class: "sys-wellness-sub", text: "Alívio de tensão nos ombros e punhos" }),
      ),
    ),
    h("button", {
      class: "sys-btn-ghost",
      text: "Iniciar 30s",
      onclick: () => Wellness.startMicroStretch(),
    }),
  );

  // 20-20-20 Eye Rest
  const eyeRow = h("div", { class: "sys-wellness-row" },
    h("div", { class: "sys-wellness-info" },
      h("span", { class: "sys-wellness-icon", text: "👀" }),
      h("div", undefined,
        h("div", { class: "sys-wellness-label", text: "Regra 20-20-20" }),
        h("div", { class: "sys-wellness-sub", text: "Descanso ocular contra fadiga visual" }),
      ),
    ),
    h("button", {
      class: "sys-chip-btn",
      text: "Pausar 20s",
      onclick: () => Wellness.startEyeRest(),
    }),
  );

  card.append(head, waterRow, stretchRow, eyeRow);
  return card;
}
