// Story — what the agent did, in plain words: today's tally, one sentence per
// request (Simple) or its chapters (Detailed), "Ready to merge?", why it
// stopped, and the Markdown recap you can copy. Port of dotpals' Story tab
// (bridge/notch.html fillStory/turnBlock/todayItem/reviewBlock) onto the
// island: the heavy lifting is bridge/ui/story.js + recap.js, fed by
// core/activity.ts. Story.js's own sentences are English (upstream); the
// labels around them go through t().

import { h, clear } from "./dom";
import { t } from "../core/i18n";
import { Bridge } from "../core/bridge";
import { State } from "../core/state";
import type { ViewHost } from "./views";
import { sessionSteps, storyTurns, todayTally, type Turn } from "../core/activity";
import {
  minorChapter,
  readiness,
  recapMarkdown,
  simple,
  story,
  testLine,
  turnMarkdown,
  whyStopped,
} from "../../../bridge/ui/story.js";
import { harnessName, plain, secs, sentence, shortTime, turnTime } from "../../../bridge/ui/recap.js";

const STATUS_MARK: Record<string, string> = {
  ok: "✓",
  failed: "✕",
  unclear: "?",
  running: "…",
  stopped: "■",
};

/** A copy button that says so for a moment, like the notch's. */
function copyBtn(label: string, text: () => string): HTMLElement {
  const b = h("button", { class: "mini-btn", title: t("Copy as Markdown (for a PR, commit message or standup)") });
  const paint = () => b.replaceChildren(document.createTextNode(label));
  paint();
  b.addEventListener("click", () => {
    void navigator.clipboard?.writeText(text()).catch(() => undefined);
    b.textContent = t("Copied ✓");
    window.setTimeout(paint, 1400);
  });
  return b;
}

/** "3 requests · 5 files changed · 12 commands · 4m of agent work". */
function todayRow(tally: ReturnType<typeof todayTally>): HTMLElement | null {
  if (!tally.requests && !tally.files && !tally.commands && !tally.ms) return null;
  const stats = h("span", { class: "stats" });
  const n = (count: number, one: string, many: string) => {
    if (!count) return;
    stats.append(h("span", {}, h("b", { text: String(count) }), ` ${count === 1 ? t(one) : t(many)}`));
  };
  n(tally.requests, "request", "requests");
  n(tally.files, "file changed", "files changed");
  n(tally.commands, "command", "commands");
  if (tally.ms >= 60_000) {
    const work = tally.ms >= 3_600_000
      ? `${Math.floor(tally.ms / 3_600_000)}h ${Math.round((tally.ms % 3_600_000) / 60_000)}m`
      : `${Math.round(tally.ms / 60_000)}m`;
    stats.append(h("span", {}, h("b", { text: work }), ` ${t("of agent work")}`));
  }
  if (!stats.firstChild) stats.append(document.createTextNode(t("Nothing yet")));
  return h(
    "div",
    { class: "today" },
    h("small", { text: t("Today") }),
    stats,
    copyBtn(t("Copy today"), () => recapMarkdown(`Today with ${harnessName("claude")}`, storyTurns(20))),
  );
}

/** Ready to merge? + why it stopped (only when either has something to say). */
function reviewBlock(turn: Turn, live: boolean): HTMLElement | null {
  const ready = readiness(turn);
  const why = whyStopped(turn, { live });
  if (!ready && (!why || why.kind === "done")) return null;
  const box = h("div", { class: "review" });
  if (ready) {
    const text = ready.ready
      ? t("✅ Ready to merge: tests ran after the last change and passed, nothing risky")
      : `⚠ ${t("Not ready to merge")}: ${ready.problems.join(" · ")}`;
    box.append(h("div", { class: `ready ${ready.ready ? "ok" : "no"}`, text }));
  }
  if (why && why.kind !== "done") box.append(h("div", { class: "why", text: `${t("Why it stopped")}: ${why.text}` }));
  return box.children.length ? box : null;
}

const openChapters = new Set<string>();

function chapterRow(turn: Turn, c: any): HTMLElement {
  const key = `${turn.id}:${c.type}`;
  const open = openChapters.has(key);
  const li = h("li", { class: `ch t-${c.type}${c.status === "failed" ? " failed" : ""}${open ? " open" : ""}` });
  const side = h("span", { class: "side" });
  if (c.lines?.add || c.lines?.del) {
    side.append(h("span", { class: "add", text: `+${c.lines.add ?? 0}` }), h("span", { class: "del", text: `−${c.lines.del ?? 0}` }));
  }
  if (c.status === "running" || c.status === "waiting") side.append(h("span", { class: "spin" }));
  else if (c.status === "failed") side.append(h("span", { class: "bad", text: "✕" }));
  else if (c.status === "unclear") side.append(h("span", { class: "unclear", text: "?" }));
  else if (["test", "build", "ship"].includes(c.type)) side.append(h("span", { class: "ok", text: "✓" }));
  side.append(h("span", { class: "caret", text: open ? "▾" : "▸" }));
  const what = h("span", { class: "what" }, h("b", { text: c.title }), c.detail ? h("small", { text: c.detail }) : null);
  const row = h(
    "div",
    {
      class: "row",
      role: "button",
      "aria-expanded": String(open),
      onclick: () => {
        if (openChapters.has(key)) openChapters.delete(key);
        else openChapters.add(key);
        State.notify();
      },
    },
    what,
    side,
  );
  li.append(row);
  if (open && c.steps?.length) {
    const ul = h("ul", { class: "steps" });
    const steps: any[] = c.steps.slice(-30);
    for (const e of steps) ul.append(h("li", { class: e.status === "failed" ? "failed" : "", text: sentence(e), title: sentence(e) }));
    li.append(ul);
  }
  return li;
}

function turnBlock(turn: Turn): HTMLElement {
  const last = turn.steps[turn.steps.length - 1];
  const live = !turn.end && !!last && (last.status === "running" || last.status === "waiting");
  const box = h("div", { class: "turn" });

  if (turn.prompt) {
    box.append(
      h(
        "div",
        { class: "asked", title: turn.prompt.title },
        h("small", { text: `${t("You asked")} · ${shortTime(turn.at)}` }),
        h("span", { text: turn.prompt.title.split("\n")[0] }),
      ),
    );
  }

  const detailed = State.settings.storyView === "detailed";
  const easy = detailed ? null : simple(turn, { live });
  if (easy) {
    box.append(
      h(
        "p",
        { class: `simple ${easy.status}` },
        h("span", { class: "mark", text: STATUS_MARK[easy.status] ?? "•" }),
        h("span", { text: easy.text }),
      ),
    );
    if (easy.warnings.length) {
      const f = h("div", { class: "flags" });
      for (const w of easy.warnings) f.append(h("div", { class: "flag warn", text: w }));
      box.append(f);
    }
  } else if (turn.end?.summary) {
    box.append(
      h("p", { class: "said" }, h("b", { text: `${harnessName(turn.harness)}: ` }), document.createTextNode(plain(turn.end.summary))),
    );
  } else if (turn.end?.kind === "error") {
    box.append(h("p", { class: "said bad", text: turn.end.title }));
  }

  if (detailed) {
    const s = story(turn, live ? sessionSteps(turn.session) : turn.steps);
    if (s.chapters.length) {
      const shown = s.chapters.length > 1 ? s.chapters.filter((c: any) => !minorChapter(c)) : s.chapters;
      const ul = h("ul", { class: "chapters" });
      for (const c of shown) ul.append(chapterRow(turn, c));
      box.append(ul);
    }
    if (s.flags.length) {
      const f = h("div", { class: "flags" });
      for (const x of s.flags.slice(0, 4)) f.append(h("div", { class: `flag ${x.level}`, text: x.text }));
      box.append(f);
    }
  }

  const review = reviewBlock(turn, live);
  if (review) box.append(review);

  const foot = h("footer", { class: "turn-foot" });
  if (turn.end) {
    const took = turnTime(turn);
    const ok = turn.end.kind === "done";
    foot.append(
      h("span", { class: ok ? "ok" : "bad", text: ok ? `✓ ${t("Done")}` : `✕ ${t("Stopped")}` }),
    );
    if (took > 0) foot.append(document.createTextNode(` ${t("in")} ${secs(took)}`));
  } else if (live) {
    const steps = turn.steps.length;
    foot.append(document.createTextNode(`${t("Working")} · ${steps} ${steps === 1 ? t("step") : t("steps")} ${t("so far")}`));
  } else {
    foot.append(document.createTextNode(turn.steps.length ? t("Stopped") : ""));
  }
  foot.append(h("div", { class: "grow" }));
  if (turn.end || turn.steps.length) {
    foot.append(
      copyBtn(t("Copy"), () =>
        easy
          ? [
              turn.prompt ? `### ${turn.prompt.title.split("\n")[0]}` : "",
              easy.text,
              ...easy.warnings.map((w) => `- ⚠ ${w}`),
            ]
              .filter(Boolean)
              .join("\n\n")
          : turnMarkdown(turn, { live }),
      ),
    );
  }
  box.append(foot);
  return box;
}

export function buildStory(): ViewHost {
  const el = h("div", { class: "view" }, h("div", { class: "card" }, h("div", { class: "story" })));
  const body = el.querySelector(".story") as HTMLElement;
  let key = "";

  return {
    el,
    sync() {
      const turns = storyTurns(6);
      const tally = todayTally();
      const newest = turns[0];
      const tests = newest ? testLine(sessionSteps(newest.session), shortTime) : null;
      const nextKey = [
        State.settings.storyView,
        turns
          .map(
            (tn) =>
              `${tn.id}|${tn.steps.length}|${tn.end?.id ?? ""}|${tn.end?.summary?.length ?? 0}|${tn.steps.at(-1)?.status ?? ""}`,
          )
          .join("~"),
        `${tally.requests}|${tally.files}|${tally.commands}|${tally.ms}`,
        tests ? `${tests.level}:${tests.text}` : "",
        [...openChapters].join(","),
      ].join("~");
      if (nextKey === key) return;
      key = nextKey;

      const top = body.scrollTop;
      clear(body);

      // Simple / Detailed — the same choice the notch's Story tab offers.
      const seg = h("div", { class: "viewseg" });
      for (const [v, label] of [
        ["simple", t("Simple")],
        ["detailed", t("Detailed")],
      ] as const) {
        seg.append(
          h("button", {
            class: State.settings.storyView === v ? "on" : "",
            "aria-pressed": String(State.settings.storyView === v),
            text: label,
            onclick: () => {
              State.settings.storyView = v;
              void Bridge.saveSettings(State.settings);
              State.notify();
            },
          }),
        );
      }
      body.append(seg);

      const today = todayRow(tally);
      if (today) body.append(today);

      if (tests) body.append(h("div", { class: `note ${tests.level}`, text: tests.text, title: t("Only tests the agent ran count.") }));

      if (!turns.length) {
        body.append(
          h("div", {
            class: "quiet",
            text: t("Each request you give the agent shows up here, with what it changed in plain words."),
          }),
        );
      } else {
        for (const turn of turns) body.append(turnBlock(turn));
      }
      body.scrollTop = top;
    },
  };
}
