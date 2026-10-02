<div align="center">

<img src="docs/media/powpow.png" width="96" alt="Powpow icon">

# Powpow

**An animated companion for your coding agents — living in your Mac's notch or at the top of your screen on Windows.**

Watch every session live, approve permissions, drop files, chat with your agent and pick the character that cheers you on — without leaving what you're doing.

![macOS 15+](https://img.shields.io/badge/macOS-15%2B-black?logo=apple)
![Windows 10/11](https://img.shields.io/badge/Windows-10%2F11-0078D4?logo=windows&logoColor=white)
![Tauri 2](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=black)
![Swift 6](https://img.shields.io/badge/Swift-6-F05138?logo=swift&logoColor=white)
![Node 20+](https://img.shields.io/badge/Node-20%2B-339933?logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

<img src="docs/media/demo.gif" width="760" alt="Powpow in action">

</div>

---

## Why

Coding agents got good at working alone — but you still have to babysit them: Which terminal was that? What did it just change? Is it waiting for me? Did the tests pass?

Powpow puts a small animated friend on the edge of your screen that tells you, at a glance, what your agents are doing and what they need — and lets you act on it in one click.

## Features

- 👀 **Many agents, one island** — Claude Code, Gemini CLI, Antigravity (agy), OpenCode, Codex, Cursor and GitHub Copilot sessions appear side by side, each with its own pill, steps and working folder. Codex is followed by tailing its logs (zero setup); the others plug in via hooks or a tiny plugin.
- ✋ **Approve from the notch** — permission requests surface with **Deny / Always allow / Allow**; "Always" remembers per-tool choices. Chat-only CLIs (agy, old Gemini) get read-only auto-allow so they are never blocked.
- 📺 **Live activity** — see what each agent reads, edits and runs, step by step; files, commands and test results as they happen.
- 💬 **Chat built in** — ask your agent anything from the notch. Providers: Anthropic and Google Gemini today; OpenRouter, OpenAI and more on the way.
- 🎭 **A cast of characters** — eight hand-drawn SVG pals (Blu, Hop, Sunny, Lovi, Muse, Grok, Nova, Byte) with moods, gaze tracking and per-state animations — plus a **build-your-own pal** builder (shape, eyes, topper, color, fluff). Choose who lives in your island — or keep **Mochi**, the original notch pal — in **Settings → Character**, with a live preview before you save.
- 📂 **Drop a file on the island** — your character turns into a box and swallows it, ready to ask a question about it.
- 🪟 **Attach a window** — drag your companion onto any window to attach it as context.
- 🔌 **Integrations** — Spotify, WhatsApp, Gmail, Outlook, Stripe, n8n, GitHub, Vercel, Resend, Notion, Cal.com — each with its own pill.
- 🌐 **PT-BR + English interface** — switch live from Settings, no restart.
- 🎨 **Themes** — Onyx, Ice and Frost, plus an "embasa" rule that expands the island over light backgrounds.
- 🔒 **Private by design** — no telemetry, no account. Keys live in the macOS Keychain or Windows Credential Manager. The app only talks to services you configure.

## Project layout

| Where | What |
|---|---|
| [`windows/`](windows/) | The Windows companion — a [Tauri 2](https://tauri.app) app (Rust + TypeScript): island window, character engine, hooks, approvals, chat, integrations. |
| [`NotchBuddy/`](NotchBuddy/) | The macOS companion — native Swift 6 / SwiftUI / AppKit, zero third-party dependencies. |
| [`bridge/`](bridge/) | Local activity bridge (Node, zero runtime dependencies): hook adapters for every supported agent, unified activity log, HTTP + SSE feed on `127.0.0.1:5175`, history, cross-agent file-conflict guard and handoff. |
| [`src/`](src/) | `<dot-pal>` — a dependency-free animated web component: characters, moods, agent states, custom pal builder. Works in any page, no build step. |
| [`hooks/`](hooks/), [`commands/`](commands/) | Claude Code plugin hooks and slash commands. |

## Install

### macOS

1. Grab the latest `Powpow.zip` from [Releases](https://github.com/corefusiion/powpow/releases).
2. Unzip and move **Powpow.app** to `/Applications`.
3. Launch. If macOS can't verify the developer the first time: **System Settings → Privacy & Security → Open Anyway** (once).

### Windows

There is no notch on a PC, so the island slides out of the top edge of the screen instead. Download the installer or the portable build from the latest [Windows workflow run](https://github.com/corefusiion/powpow/actions/workflows/windows.yml) (artifacts are kept for 3 days), or see [`windows/README.md`](windows/README.md) for the details and to build it yourself.

### Build from source

**macOS** — requirements: macOS 15+, Xcode 16+, [XcodeGen](https://github.com/yonaskolb/XcodeGen).

```bash
brew install xcodegen
git clone https://github.com/corefusiion/powpow.git
cd powpow/NotchBuddy
xcodegen
open NotchBuddy.xcodeproj   # then ⌘R
```

**Windows** — requirements: [Rust](https://rustup.rs), Node 20+, MSVC build tools.

```powershell
git clone https://github.com/corefusiion/powpow.git
cd powpow/windows
npm install
npm run pack                # installer lands in windows/release/
```

**Activity bridge** — requirements: Node 20+.

```bash
npm install
npm run bridge              # http://127.0.0.1:5175/dashboard
npm test                    # test suite
```

## Setup

Open Settings from the menu bar icon (macOS) or the system tray (Windows):

| What | Why | Where it goes |
|---|---|---|
| **Claude Code hooks** | live sessions + approvals | **Install hooks** — Powpow backs up `~/.claude/settings.json`, merges its own entries and shows you the diff before writing anything |
| **Gemini CLI / Antigravity hooks** | their sessions in the island | one click each in Settings — always with a backup first |
| **OpenCode plugin** | its sessions in the island | copy the bundled plugin to `~/.config/opencode/plugins/` |
| **API key** (Anthropic / Gemini) | chat from the notch | Keychain / Windows Credential Manager |
| Integrations | their pills | Keychain / Windows Credential Manager — all optional |

If Powpow isn't running, hooks exit immediately: **your agent is never blocked.**

## Things to try

| Do this | Your pal does that |
|---|---|
| Hover the notch (top edge on Windows) | peeks out and says hi 👋 |
| Click it | opens the full view |
| Hover your pal | blinks, eyes follow you |
| Click it | squish + annoyed |
| Click 3 times fast | 😵‍💫 dizzy for a few seconds |
| Drag a file onto the island | turns into a box and swallows it |
| Drag your pal onto a window *(macOS)* | attaches it as context |

## How it works

**Windows** — a Tauri 2 app: the island is a transparent, always-on-top window that never steals focus. Agent CLIs run a tiny `powpow-hook.exe` relay that talks to the app over a named pipe; approvals wait for your click, then answer the hook. Keys live in Windows Credential Manager.

**macOS** — a borderless `NSPanel` hugging the notch; the character is drawn in SwiftUI `Canvas` + `TimelineView` at 60 fps. A small socket-based hook script forwards events; approvals block until you click.

**Bridge** (cross-platform) — hook adapters for each agent POST events into a local bridge, which merges them into one activity log and broadcasts over SSE. Any UI — the dashboard, an embedded `<dot-pal>`, your own script — consumes the same feed:

```js
const pal = document.querySelector('dot-pal');
const source = new EventSource('http://127.0.0.1:5175/events');
source.onmessage = (e) => {
  const { state, text } = JSON.parse(e.data);
  pal.setState(state, { text });
};
```

See [`bridge/`](bridge/) and [`src/`](src/) for the adapters and the full component API.

## Roadmap

- 🔄 Island ⇄ bridge integration — the notch consuming the unified SSE feed directly
- 🌐 More chat providers — OpenRouter, OpenAI, and others
- 🎭 More characters and pal customization in the island
- 🤖 Agent coverage — more CLIs as they add hook support

## Contributing

Issues and PRs are very welcome — new adapters, characters, providers, sounds and bug fixes. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

- **Code:** [MIT](LICENSE) — use it, fork it, learn from it, just keep the copyright notices.
- **Bridge and web component:** MIT — see [LICENSE-dotpals](LICENSE-dotpals) and [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) for adapted third-party code.
- **Artwork and sounds:** see [LICENSE-ASSETS.md](LICENSE-ASSETS.md).

Maintained by [Gleisson Santos](mailto:jsgleisson@gmail.com).

<div align="center">

**If Powpow made you smile, a ⭐ helps a lot.**

[Issues](https://github.com/corefusiion/powpow/issues)

</div>
