// The live diff card: the file the agent is changing right now, a few lines
// around the newest change, with the last line typing in and a blinking caret.
// Port of dotpals' diffCard/codeBlock (bridge/notch.html) onto the island's
// overview card; the patch is parsed by bridge/ui/notch-diff.js.

import { h } from "./dom";
import { t } from "../core/i18n";
import { reducedMotion } from "../core/motion";
import { diffOf, language } from "../../../bridge/ui/notch-diff.js";
import { baseName } from "../../../bridge/ui/recap.js";
import type { ActEntry } from "../core/activity";

/** Rebuild the card only when the patch grows or the tool reports back. */
export function diffCardKey(e: ActEntry): string {
  return `${e.id}|${e.status}|${e.body?.patch?.length ?? 0}`;
}

export function renderDiffCard(entry: ActEntry): HTMLElement {
  const d = diffOf(entry.body?.patch ?? "", { max: 6 }) as unknown as {
    path: string | null;
    lines: { sign: string; text: string }[];
    add: number;
    del: number;
    more: number;
    typing: number;
  };
  const path = d.path ?? entry.files?.find((f) => f.change !== "read")?.path ?? entry.title;
  const card = h("div", { class: "diff" });

  const file = h("div", { class: "file" });
  const lang = language(path);
  if (lang) file.append(h("span", { class: "lang", style: `--lc:${lang.color}`, text: lang.label }));
  file.append(h("b", { text: baseName(path) }));
  if (entry.status === "running" || entry.status === "waiting") {
    file.append(h("span", { class: "live", title: t("Editing now") }));
  }
  file.append(
    h("small", {
      text: entry.title && entry.title !== baseName(path) ? entry.title : String(path),
      title: String(path),
    }),
  );
  const n = h("span", { class: "n" });
  if (d.add) n.append(h("span", { class: "add", text: `+${d.add} ` }));
  if (d.del) n.append(h("span", { class: "del", text: `−${d.del}` }));
  file.append(n);
  card.append(file);

  const code = h("div", { class: "code" });
  const animate = !reducedMotion();
  d.lines.forEach((l, i) => {
    if (l.sign === "@") {
      code.append(h("div", { class: "ln gap" }));
      return;
    }
    const row = h("div", { class: `ln${l.sign === "+" ? " plus" : l.sign === "-" ? " minus" : ""}` });
    const parts = /^(\s*)(.*)$/s.exec(l.text || " ") ?? ["", "", l.text];
    const text = h("span", { class: "t" });
    text.append(document.createTextNode(parts[1]), h("span", { class: "x", text: parts[2] }));
    row.append(h("span", { class: "s", text: l.sign === " " ? "" : l.sign === "-" ? "−" : "+" }), text);
    if (animate && i === d.typing) {
      // The newest line types in, then a caret blinks after it.
      const len = Math.min(l.text.length, 160);
      row.classList.add("typing");
      row.style.setProperty("--n", String(len));
      row.style.setProperty("--dur", `${Math.min(1400, 280 + len * 22)}ms`);
      row.style.setProperty("--steps", `steps(${Math.max(1, len)}, end)`);
      row.append(h("i", { class: "caret" }));
    }
    code.append(row);
  });
  card.append(code);
  if (d.more) {
    card.append(
      h("span", { class: "code-more", text: `+${d.more} ${d.more === 1 ? t("more line") : t("more lines")}` }),
    );
  }
  return card;
}
