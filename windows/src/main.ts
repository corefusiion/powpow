// Entry point: boot the bridge, wire the island, start the greeting.

import "./style.css";
import { Bridge, IS_TAURI, onEvent } from "./core/bridge";
import { Sound } from "./core/sound";
import { State, type Settings } from "./core/state";
import { Island } from "./island/island";
import { handleHook, registerHookHandlers } from "./island/hooks";
import { latestDiff, storyTurns } from "./core/activity";
import { registerIntegrationHandlers, refreshConfigured } from "./island/integrations";

async function main() {
  const root = document.getElementById("root");
  if (!root) return;

  void Sound.preload();

  const island = new Island(root);

  const boot = await Bridge.boot();
  if (boot) {
    State.settings = { ...State.settings, ...boot.settings };
  }
  island.applySettings();
  State.loadIntegrationTasks();

  await onEvent<{ x: number; y: number; down: boolean }>("cursor", ({ x, y, down }) =>
    island.onCursor(x, y, down),
  );
  await onEvent<{ x: number; y: number }>("mouse-up", ({ x, y }) => island.onMouseUp(x, y));
  await onEvent<{ kind: string; query?: string | null }>("pal-action", (a) => void island.palAction(a));

  /** Pause has to reach Rust too, or the pollers keep calling out. */
  const setPaused = (on: boolean) => {
    if (State.paused === on) return;
    State.paused = on;
    void Bridge.setPaused(on);
  };

  await onEvent<string>("tray", (what) => {
    switch (what) {
      case "settings":
        setPaused(false);
        island.alert("settings");
        break;
      case "open":
        setPaused(false);
        island.alert(State.defaultView());
        break;
      case "pause":
        setPaused(!State.paused);
        if (State.paused) island.fsm.forceHidden();
        else island.reveal();
        break;
    }
  });

  await onEvent<null>("screen-changed", () => void Bridge.reposition());

  // The settings window writes preferences; apply them here without a restart.
  await onEvent<Settings>("settings-changed", (s) => {
    State.settings = { ...State.settings, ...s };
    island.applySettings();
    State.loadIntegrationTasks();
    void refreshConfigured();
  });

  registerHookHandlers(island);
  registerIntegrationHandlers(island);

  // Dev seam: in a browser there is no Tauri pipe to deliver hook events, so
  // the screenshot harness drives the same handleHook() the pipe calls. `DEV`
  // folds to false in `vite build`, so none of this ships.
  if (import.meta.env.DEV && !IS_TAURI) {
    (window as unknown as { __powpow?: unknown }).__powpow = {
      State,
      island,
      handleHook: (payload: unknown) => handleHook(island, payload as Parameters<typeof handleHook>[1]),
      probe: () => ({ turns: storyTurns(6).length, diff: !!latestDiff() }),
    };
  }

  island.launch();

  // In a plain browser there is no wake strip behind the cursor: make the whole
  // page wake the island so the visuals can be checked with `npm run dev`.
  if (!IS_TAURI) {
    document.addEventListener("click", () => Sound.resume(), { once: true });
  }
}

void main();
