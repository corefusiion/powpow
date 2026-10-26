# Powpow — guide for AI coding agents

Powpow is a native macOS app: Mochi, a small animated character living in the MacBook notch, shows Claude Code sessions and a few integrations, and lets the user approve, answer, chat and drop files from the notch.

## Where things are
- `NotchBuddy/Sources/App/` — all Swift code. `NotchBuddy/Resources/sounds/` — the 28 WAV sounds. `NotchBuddy/project.yml` — XcodeGen project (never edit the `.xcodeproj` by hand).
- `docs/SPEC.md`, `docs/INTEGRATIONS.md` — behaviour, views, states, integrations (in French).
- `design/prototype/notch-buddy.html` — original prototype, the visual source of truth. `design/captures/` — target screenshots.
- `docs/*.html` — the GitHub Pages site (privacy, terms, support, legal notice).

## Build
```
cd NotchBuddy && xcodegen && xcodebuild -scheme NotchBuddy -configuration Debug build
```

## Rules
- Swift 6, SwiftUI + AppKit. No third-party dependencies unless truly unavoidable. The character is drawn in code (`Canvas` + `TimelineView`), no Rive/Lottie/images.
- Secrets live in the Keychain, never on disk or in git.
- No telemetry. Network calls only to services the user configured.
- Never block Claude Code: if the app doesn't answer, the hook exits immediately.
- Never overwrite `~/.claude/settings.json`: dated backup, merge, show the diff, write only after the user confirms.
- Never send an email or approve a Claude Code permission without an explicit click.
- Performance: 0 % CPU when the island is hidden.
- The bundle identifier is `com.corefusiion.powpow` (Keychain items, preferences and permissions depend on it).
- Visual changes must match the prototype and the screenshots in `design/captures/`.

## Windows Port (`windows/`) — Tauri v2, Rust & Win32 Architecture

The Windows port is built on Tauri v2 with a multi-window architecture:
- `windows/src-tauri/` — Rust backend (Win32 API integration, named pipes, system tray, hooks, window management).
- `windows/src/` — TypeScript frontend (Dynamic Island, Pal mascot rig, views, settings, and mascot gallery).

### Critical Window Management Rules (Tauri v2 on Windows)
1. **Never create secondary windows dynamically inside `setup()` or async IPC handlers:**
   - On Windows, WebView2 requires strict thread affinity (COM STA) with the Win32 window message loop.
   - Calling `WebviewWindowBuilder::new()` dynamically inside `.setup()` or async tokio IPC commands triggers `WindowsError: HRESULT(0x80070578: The window handle is invalid)` (`O identificador da janela é inválido`).
   - **Rule:** ALL application windows (`island`, `pal`, `settings`) MUST be statically declared in `windows/src-tauri/tauri.conf.json` under `app.windows`.
   - Auxiliary windows (such as `settings`) must start with `"visible": false`.
   - In `lib.rs`, wire `CloseRequested` to hide the window (`win.hide()` + `api.prevent_close()`), and in `show_settings_window()` retrieve the existing window handle with `app.get_webview_window("settings")`, unminimize, show, and focus.
2. **Identical Browser Arguments:**
   - WebView2 permits only one browser environment per application process. Every window defined in `tauri.conf.json` MUST share the exact same `additionalBrowserArgs` (`--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required`). A mismatch causes secondary webviews to render completely blank.

### Antivirus & False-Positive Prevention (Defender / Trend Micro / SmartScreen)
Corporate and consumer antivirus solutions (Trend Micro Apex One, Windows Defender ML, CrowdStrike) use predictive machine learning on newly compiled unsigned Windows binaries. Follow these strict rules to prevent download blocking and false-positive quarantine:
1. **Never use `strip = true` or `opt-level = "s"` for release profile in `windows/Cargo.toml`:**
   - Stripping PE section symbols removes the `IMAGE_DIRECTORY_ENTRY_DEBUG` directory. Combined with size-optimization compression, this creates an ultra-high entropy binary pattern that ML heuristics classify as a packed malware dropper (`Trojan:Win32/Wacatac` or suspect file).
   - **Configuration:** Always use `strip = false`, `debug = 1` (retains legitimate MSVC PDB debug directory), `opt-level = 3`, and `lto = "thin"`.
2. **NSIS Installer vs Portable ZIP:**
   - Unsigned NSIS setup installers (`*-setup.exe`) are the primary source of heuristic false positives.
   - The CI workflow (`.github/workflows/windows.yml`) publishes both `Powpow-Windows-setup` and `Powpow-Windows-portable.zip`. For environments with strict corporate endpoint security (e.g. EMBASA / Trend Micro Apex One), always prioritize the **Portable ZIP** (`Powpow-Windows-portable.zip`), which extracts `powpow.exe` and `powpow-hook.exe` directly without NSIS unpacking stubs.
3. **Browser SmartScreen Download Workaround:**
   - In Microsoft Edge, if a brand-new unsigned SHA-256 hash displays "Download blocked / not commonly downloaded":
     Press `Ctrl + J` (Downloads) -> click the three dots `...` next to the file -> **Keep** (`Manter`) -> **Show more** (`Mostrar mais`) -> **Keep anyway** (`Manter mesmo assim`).
