// Smart Clipboard Shelf & "Magic Paste" utilities.

export interface ClipboardItem {
  id: string;
  timestamp: number;
  text: string;
  preview: string;
  kind: "text" | "code" | "link" | "json" | "table";
}

class SmartClipboardManager {
  private history: ClipboardItem[] = [];
  private lastCopiedText: string = "";
  private listeners: Set<(items: ClipboardItem[]) => void> = new Set();

  constructor() {
    this.load();
    this.startWatcher();
  }

  private load() {
    try {
      const raw = localStorage.getItem("powpow_clipboard_history");
      if (raw) {
        this.history = JSON.parse(raw);
      }
    } catch {
      this.history = [];
    }
  }

  private save() {
    try {
      localStorage.setItem("powpow_clipboard_history", JSON.stringify(this.history.slice(0, 30)));
    } catch {
      // ignore
    }
  }

  private startWatcher() {
    // Poll clipboard when window has focus
    window.addEventListener("focus", () => this.checkClipboard());
    window.setInterval(() => this.checkClipboard(), 3000);
  }

  async checkClipboard() {
    if (!document.hasFocus()) return;
    try {
      if (!navigator.clipboard?.readText) return;
      const text = await navigator.clipboard.readText();
      if (text && text.trim() && text !== this.lastCopiedText) {
        this.lastCopiedText = text;
        this.addItem(text);
      }
    } catch {
      // Permissions or empty clipboard
    }
  }

  addItem(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Detect kind
    let kind: ClipboardItem["kind"] = "text";
    if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
      kind = "link";
    } else if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        JSON.parse(trimmed);
        kind = "json";
      } catch {
        kind = "code";
      }
    } else if (
      trimmed.includes("\n") &&
      (trimmed.includes("\t") || (trimmed.includes(",") && trimmed.split("\n")[0].split(",").length > 1))
    ) {
      kind = "table";
    } else if (
      trimmed.includes("function") ||
      trimmed.includes("const ") ||
      trimmed.includes("let ") ||
      trimmed.includes("class ") ||
      trimmed.includes("import ") ||
      trimmed.includes("SELECT ") ||
      trimmed.includes("def ")
    ) {
      kind = "code";
    }

    const preview = trimmed.length > 80 ? trimmed.substring(0, 80) + "…" : trimmed;

    // Deduplicate existing
    this.history = this.history.filter((i) => i.text !== text);
    this.history.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      text,
      preview,
      kind,
    });

    if (this.history.length > 30) this.history.pop();
    this.save();
    this.notify();
  }

  subscribe(fn: (items: ClipboardItem[]) => void): () => void {
    this.listeners.add(fn);
    fn(this.getItems());
    return () => this.listeners.delete(fn);
  }

  private notify() {
    const items = this.getItems();
    for (const l of this.listeners) {
      try {
        l(items);
      } catch (err) {
        console.error("[clipboard] listener error", err);
      }
    }
  }

  getItems(): ClipboardItem[] {
    return [...this.history];
  }

  clear() {
    this.history = [];
    this.save();
    this.notify();
  }

  // ── Magic Paste Transformations ──────────────────────────────────────────

  /** Converts Markdown text to clean Rich Text (HTML) for Office/Docs. */
  markdownToRichHtml(md: string): string {
    let html = md
      // Escaping basic HTML tags
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-family:sans-serif;color:#1e293b;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-family:sans-serif;color:#0f172a;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-family:sans-serif;color:#0f172a;">$1</h1>');

    // Bold / Italic
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Code blocks & inline code
    html = html.replace(
      /```([a-z]*)\n([\s\S]*?)```/g,
      '<pre style="background:#f1f5f9;padding:12px;border-radius:6px;font-family:monospace;font-size:13px;border:1px solid #cbd5e1;"><code>$2</code></pre>',
    );
    html = html.replace(
      /`([^`]+)`/g,
      '<code style="background:#f1f5f9;padding:2px 5px;border-radius:4px;font-family:monospace;font-size:12px;color:#0284c7;">$1</code>',
    );

    // Bullet lists
    html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin-bottom:4px;">$1</li>');

    // Line breaks
    html = html.replace(/\n\n+/g, "<br/><br/>");

    return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#334155;">${html}</div>`;
  }

  /** Cleans text by removing hidden invisible chars, trailing spaces, tabs. */
  cleanPlainText(text: string): string {
    return text
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // remove zero-width spaces
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+$/gm, "") // remove trailing whitespace per line
      .replace(/\n{3,}/g, "\n\n") // collapse multiple blank lines
      .trim();
  }

  /** Compresses multiline string into a single line separated by spaces. */
  toSingleLine(text: string): string {
    return text
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /** Converts Tab-delimited (TSV) or CSV text to Markdown Table. */
  csvToMarkdownTable(text: string): string {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return text;

    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const rows = lines.map((line) =>
      line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim()),
    );

    if (rows.length === 0 || rows[0].length === 0) return text;

    const colCount = Math.max(...rows.map((r) => r.length));
    const padRow = (r: string[]) => {
      while (r.length < colCount) r.push("");
      return r;
    };

    const header = padRow(rows[0]);
    const separator = Array(colCount).fill("---");

    const tableLines = [
      `| ${header.join(" | ")} |`,
      `| ${separator.join(" | ")} |`,
    ];

    for (let i = 1; i < rows.length; i++) {
      const row = padRow(rows[i]);
      tableLines.push(`| ${row.join(" | ")} |`);
    }

    return tableLines.join("\n");
  }

  /** Write text and optional HTML to the system clipboard. */
  async copyMagic(text: string, richHtml?: string): Promise<boolean> {
    try {
      if (richHtml && typeof ClipboardItem !== "undefined") {
        const textBlob = new Blob([text], { type: "text/plain" });
        const htmlBlob = new Blob([richHtml], { type: "text/html" });
        await navigator.clipboard.write([
          new window.ClipboardItem({
            "text/plain": textBlob,
            "text/html": htmlBlob,
          }),
        ]);
        return true;
      } else {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn("[clipboard] write error", err);
      // Fallback
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    }
  }
}

export const SmartClipboard = new SmartClipboardManager();
