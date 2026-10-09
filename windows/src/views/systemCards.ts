// Interactive cards for System Agent actions (Desktop Butler, Doc Creator, File Locator).

import { Bridge, type CreatedDocInfo, type LocatedFile, type OrganizePreview } from "../core/bridge";
import { clear, h } from "./dom";
import { Sound } from "../core/sound";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(secs: number): string {
  if (secs < 60) return "agora há pouco";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

// ── 1. Desktop Butler Card ────────────────────────────────────────────────────

export function renderOrganizeCard(
  preview: OrganizePreview,
  onFinished?: () => void,
): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "🗂️" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: `Organizar ${preview.folderName}` }),
      h("span", { class: "sys-card-sub", text: `${preview.totalFiles} arquivos encontrados soltos` }),
    ),
  );

  // Category tags
  const tagsRow = h("div", { class: "sys-tags-row" });
  for (const [cat, count] of Object.entries(preview.categories)) {
    tagsRow.append(
      h("span", { class: "sys-tag", text: `${cat} (${count})` }),
    );
  }

  // File list preview (max 6 visible with scroll)
  const list = h("div", { class: "sys-files-list" });
  for (const item of preview.items.slice(0, 15)) {
    const row = h(
      "div",
      { class: "sys-file-item" },
      h("span", { class: "sys-file-name", text: item.fileName, title: item.originalPath }),
      h("span", { class: "sys-file-dest", text: `→ 📁 ${item.category}` }),
    );
    list.append(row);
  }
  if (preview.items.length > 15) {
    list.append(
      h("div", { class: "sys-file-more", text: `+ ${preview.items.length - 15} outros arquivos...` }),
    );
  }

  // Action buttons
  const btnApply = h("button", {
    class: "primary sys-btn",
    text: `⚡ Mover ${preview.totalFiles} Arquivos`,
  });
  const btnCancel = h("button", { class: "sys-btn-ghost", text: "Cancelar" });
  const actionsRow = h("div", { class: "sys-actions-row" }, btnApply, btnCancel);

  btnApply.addEventListener("click", async () => {
    btnApply.disabled = true;
    btnApply.textContent = "Movendo...";
    try {
      const res = await Bridge.desktopOrganizeApply(preview.items);
      clear(card);
      Sound.play("finish");
      const undoBtn = h("button", { class: "sys-btn-undo", text: "↩️ Desfazer Organização" });
      undoBtn.addEventListener("click", async () => {
        undoBtn.disabled = true;
        undoBtn.textContent = "Desfazendo...";
        const count = await Bridge.desktopOrganizeUndo();
        undoBtn.textContent = `Restaurados ${count} arquivos!`;
      });
      card.append(
        h("div", { class: "sys-card-head success" },
          h("span", { class: "sys-icon", text: "✅" }),
          h("div", { class: "sys-title-group" },
            h("span", { class: "sys-card-title", text: "Organização Concluída!" }),
            h("span", { class: "sys-card-sub", text: `${res?.movedCount ?? preview.totalFiles} arquivos organizados em subpastas com segurança.` }),
          ),
        ),
        h("div", { class: "sys-actions-row" }, undoBtn),
      );
      if (onFinished) onFinished();
    } catch (err) {
      btnApply.disabled = false;
      btnApply.textContent = "Erro ao mover";
    }
  });

  btnCancel.addEventListener("click", () => {
    card.remove();
  });

  card.append(head, tagsRow, list, actionsRow);
  return card;
}

// ── 2. Created Document Card ──────────────────────────────────────────────────

export function renderDocCreatedCard(doc: CreatedDocInfo): HTMLElement {
  const card = h("div", { class: "sys-agent-card success" });

  const icon = doc.docType.includes("sheet") || doc.fileName.endsWith(".csv")
    ? "📊"
    : doc.fileName.endsWith(".md")
    ? "📝"
    : "📄";

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: icon }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: doc.fileName }),
      h("span", { class: "sys-card-sub", text: `Criado e salvo em Documentos (${formatBytes(doc.size)})` }),
    ),
  );

  const btnOpen = h("button", {
    class: "primary sys-btn",
    text: "↗️ Abrir Arquivo",
    onclick: () => void Bridge.openSystemPath(doc.path),
  });

  const btnExplorer = h("button", {
    class: "sys-btn-ghost",
    text: "📁 Ver no Explorer",
    onclick: () => void Bridge.revealInExplorer(doc.path),
  });

  const actionsRow = h("div", { class: "sys-actions-row" }, btnOpen, btnExplorer);
  card.append(head, actionsRow);
  return card;
}

// ── 3. File Locator Card ──────────────────────────────────────────────────────

export function renderLocatedFilesCard(query: string, files: LocatedFile[]): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "🔎" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: `Busca: "${query}"` }),
      h("span", { class: "sys-card-sub", text: files.length === 0 ? "Nenhum arquivo encontrado" : `${files.length} arquivos localizados no PC` }),
    ),
  );

  if (files.length === 0) {
    card.append(head);
    return card;
  }

  const list = h("div", { class: "sys-files-list search-results" });
  for (const f of files.slice(0, 8)) {
    const row = h("div", { class: "sys-result-item" });
    const nameCol = h("div", { class: "sys-result-name-col" },
      h("span", { class: "sys-result-name", text: f.name }),
      h("span", { class: "sys-result-path", text: `${f.folder} · ${timeAgo(f.modifiedSecsAgo)} · ${formatBytes(f.size)}` }),
    );
    const btns = h("div", { class: "sys-result-btns" },
      h("button", {
        class: "sys-icon-btn",
        title: "Abrir arquivo",
        text: "Abrir",
        onclick: () => void Bridge.openSystemPath(f.path),
      }),
      h("button", {
        class: "sys-icon-btn",
        title: "Ver na pasta",
        text: "Pasta",
        onclick: () => void Bridge.revealInExplorer(f.path),
      }),
    );
    row.append(nameCol, btns);
    list.append(row);
  }

  card.append(head, list);
  return card;
}

// ── 4. Ghostwriter Card ───────────────────────────────────────────────────────

export function renderGhostwriterCard(
  appName: string,
  windowTitle: string,
  text: string,
): HTMLElement {
  const card = h("div", { class: "sys-agent-card success" });

  const cleanApp = (appName || "App em foco").replace(/\.exe$/i, "");
  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: "✍️" }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: `Ghostwriter: ${cleanApp}` }),
      h("span", { class: "sys-card-sub", text: windowTitle ? `Contexto: ${windowTitle.slice(0, 45)}...` : "Pronto para inserção direta" }),
    ),
  );

  const textBox = h("div", { class: "sys-text-preview", text });

  const btnInject = h("button", {
    class: "primary sys-btn",
    text: "✍️ Injetar no App Ativo",
  });

  const btnCopy = h("button", {
    class: "sys-btn-ghost",
    text: "📋 Copiar Texto",
  });

  btnInject.addEventListener("click", async () => {
    btnInject.disabled = true;
    btnInject.textContent = "Injetando...";
    await Bridge.injectText(text);
    Sound.play("finish");
    btnInject.textContent = "✅ Injetado com sucesso!";
    setTimeout(() => {
      btnInject.textContent = "✍️ Injetar Novamente";
      btnInject.disabled = false;
    }, 2500);
  });

  btnCopy.addEventListener("click", () => {
    void navigator.clipboard?.writeText(text);
    Sound.play("peek");
    btnCopy.textContent = "✅ Copiado!";
    setTimeout(() => {
      btnCopy.textContent = "📋 Copiar Texto";
    }, 2000);
  });

  const actionsRow = h("div", { class: "sys-actions-row" }, btnInject, btnCopy);
  card.append(head, textBox, actionsRow);
  return card;
}

// ── 5. System Control Card ────────────────────────────────────────────────────

export function renderSystemControlCard(action: string, message: string): HTMLElement {
  const card = h("div", { class: "sys-agent-card" });

  const icon = action.includes("volume")
    ? (action.includes("mute") ? "🔇" : "🔊")
    : action.includes("theme")
    ? (action.includes("dark") ? "🌙" : "☀️")
    : action.includes("bin")
    ? "🗑️"
    : "🔒";

  const head = h(
    "div",
    { class: "sys-card-head" },
    h("span", { class: "sys-icon", text: icon }),
    h("div", { class: "sys-title-group" },
      h("span", { class: "sys-card-title", text: "Comando do Windows Executado" }),
      h("span", { class: "sys-card-sub", text: message }),
    ),
  );

  card.append(head);
  return card;
}
