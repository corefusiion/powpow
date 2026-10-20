// Now-playing pill with no API key and no OAuth: the Spotify desktop app sets
// its main window title to "Artist - Title" while something is playing
// ("Spotify" when idle, "Advertisement" during ads). Reading a window title is
// local, instant and needs no permission — the same trick every lightweight
// now-playing widget uses. Runs synchronously inside the poller tick.

use serde::Serialize;

use windows::core::BOOL;
use windows::Win32::Foundation::{CloseHandle, HWND, LPARAM};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED,
};
use windows::Win32::System::ProcessStatus::GetModuleBaseNameW;
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
use windows::Win32::UI::Accessibility::{CUIAutomation, IUIAutomation};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VIRTUAL_KEY,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetClassNameW, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible,
};

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct NowPlaying {
    pub playing: bool,
    pub artist: String,
    pub title: String,
}

struct Found(Option<String>);

unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let found = unsafe { &mut *(lparam.0 as *mut Found) };
    if found.0.is_some() {
        return false.into();
    }
    if !unsafe { IsWindowVisible(hwnd) }.as_bool() {
        return true.into();
    }
    let mut class = [0u16; 64];
    let class_len = unsafe { GetClassNameW(hwnd, &mut class) };
    if class_len == 0 {
        return true.into();
    }
    if String::from_utf16_lossy(&class[..class_len as usize]) != "SpotifyMainWindow" {
        return true.into();
    }
    let mut buf = [0u16; 512];
    let len = unsafe { GetWindowTextW(hwnd, &mut buf) };
    if len > 0 {
        found.0 = Some(String::from_utf16_lossy(&buf[..len as usize]));
        return false.into();
    }
    true.into()
}

pub fn now_playing() -> NowPlaying {
    let mut found = Found(None);
    unsafe {
        let _ = EnumWindows(
            Some(enum_proc),
            LPARAM(&mut found as *mut Found as isize),
        );
    };
    let title = found.0.unwrap_or_default();
    // "Artist - Title" (hyphen and en-dash both seen in the wild).
    for sep in [" - ", " – "] {
        if let Some((artist, track)) = title.split_once(sep) {
            let artist = artist.trim();
            let track = track.trim();
            if !artist.is_empty()
                && !track.is_empty()
                && artist != "Spotify"
                && track != "Advertisement"
            {
                return NowPlaying {
                    playing: true,
                    artist: artist.to_string(),
                    title: track.to_string(),
                };
            }
        }
    }
    NowPlaying::default()
}

/// System-wide media keys (play/pause, next, previous). They go to whatever
/// is currently playing — the Spotify desktop app, a browser tab with the web
/// player, anything. No focus stealing, no API, no key.
pub fn press(action: &str) -> Result<(), String> {
    let vk = match action {
        "playpause" | "toggle" | "play" | "pause" => 0xB3u16,
        "next" => 0xB0u16,
        "prev" | "previous" => 0xB1u16,
        _ => return Err("unknown media key".into()),
    };
    let mk = |up: bool| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(vk),
                wScan: 0,
                dwFlags: if up { KEYEVENTF_KEYUP } else { Default::default() },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let sent = unsafe { SendInput(&[mk(false), mk(true)], std::mem::size_of::<INPUT>() as i32) };
    if sent == 2 {
        Ok(())
    } else {
        Err("media key not delivered".into())
    }
}

// ── WhatsApp (no login, no key) ─────────────────────────────────────────────
// WhatsApp has no personal-account API, so the pill reads what the OS shows:
// active browser tabs running WhatsApp Web (Firefox, Chrome, Edge, Brave, Opera,
// Vivaldi, Arc, Floorp, Waterfox, etc.), background tabs via UI Automation, or
// the native desktop app. No credentials, no network, local and instant.

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct WhatsAppState {
    pub present: bool,
    pub unread: u32,
    pub contact: Option<String>,
    pub browser: Option<String>,
}

struct WaFound {
    present: bool,
    unread: u32,
    contact: Option<String>,
    browser: Option<String>,
    browser_hwnds: Vec<(HWND, String)>,
}

pub fn parse_wa_title(title: &str) -> (bool, u32, Option<String>) {
    let lower = title.to_lowercase();
    let is_wa = lower.contains("whatsapp")
        || lower.contains("web.whatsapp")
        || lower.contains("web.whatsapp.com");

    if !is_wa {
        return (false, 0, None);
    }

    let mut unread = 0u32;
    let mut contact: Option<String> = None;

    // Scan for parenthesis containing unread count, e.g. "(3)", "\u{200e}(1)", "(99+)"
    if let Some(open) = title.find('(') {
        if let Some(close) = title[open + 1..].find(')') {
            let inside = title[open + 1..open + 1 + close].trim();
            let digits: String = inside.chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(n) = digits.parse::<u32>() {
                unread = n;

                let after = title[open + 1 + close + 1..].trim();
                let candidate = if let Some((c, _)) = after.split_once(" - ") {
                    c.trim()
                } else if let Some((c, _)) = after.split_once(" — ") {
                    c.trim()
                } else if let Some((c, _)) = after.split_once(": ") {
                    c.trim()
                } else {
                    ""
                };

                let cand_lower = candidate.to_lowercase();
                if !candidate.is_empty()
                    && !cand_lower.contains("whatsapp")
                    && !cand_lower.contains("mozilla firefox")
                    && !cand_lower.contains("google chrome")
                    && !cand_lower.contains("microsoft edge")
                    && !cand_lower.contains("brave")
                    && !cand_lower.contains("opera")
                    && !cand_lower.contains("navegador")
                    && !cand_lower.contains("guias")
                    && !cand_lower.contains("tabs")
                {
                    contact = Some(candidate.to_string());
                }
            }
        }
    }

    (true, unread, contact)
}

fn get_window_process_name(hwnd: HWND) -> String {
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    if pid == 0 {
        return String::new();
    }
    if let Ok(handle) = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) } {
        let mut buf = [0u16; 260];
        let len = unsafe { GetModuleBaseNameW(handle, None, &mut buf) };
        let _ = unsafe { CloseHandle(handle) };
        if len > 0 {
            return String::from_utf16_lossy(&buf[..len as usize]).to_lowercase();
        }
    }
    String::new()
}

fn friendly_browser_name(proc_name: &str) -> &'static str {
    let p = proc_name.to_lowercase();
    if p.contains("firefox") || p.contains("waterfox") || p.contains("librewolf") || p.contains("floorp") {
        "Mozilla Firefox"
    } else if p.contains("chrome") {
        "Google Chrome"
    } else if p.contains("msedge") || p.contains("edge") {
        "Microsoft Edge"
    } else if p.contains("brave") {
        "Brave"
    } else if p.contains("opera") {
        "Opera"
    } else if p.contains("vivaldi") {
        "Vivaldi"
    } else if p.contains("arc") {
        "Arc"
    } else if p.contains("whatsapp") {
        "WhatsApp App"
    } else {
        "Navegador Web"
    }
}

fn is_browser_proc(proc_name: &str) -> bool {
    let p = proc_name.to_lowercase();
    p.contains("firefox")
        || p.contains("chrome")
        || p.contains("msedge")
        || p.contains("brave")
        || p.contains("opera")
        || p.contains("vivaldi")
        || p.contains("arc")
        || p.contains("floorp")
        || p.contains("waterfox")
        || p.contains("librewolf")
        || p.contains("tor")
}

unsafe extern "system" fn wa_enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let found = unsafe { &mut *(lparam.0 as *mut WaFound) };
    if unsafe { IsWindowVisible(hwnd) }.as_bool() {
        let mut buf = [0u16; 512];
        let len = unsafe { GetWindowTextW(hwnd, &mut buf) };
        let title = if len > 0 {
            String::from_utf16_lossy(&buf[..len as usize])
        } else {
            String::new()
        };

        let proc_name = get_window_process_name(hwnd);

        // Check if top-level window title identifies WhatsApp
        if !title.is_empty() {
            let (is_wa, unread, contact) = parse_wa_title(&title);
            if is_wa {
                found.present = true;
                found.unread = found.unread.max(unread);
                if found.contact.is_none() && contact.is_some() {
                    found.contact = contact;
                }
                if found.browser.is_none() {
                    found.browser = Some(friendly_browser_name(&proc_name).to_string());
                }
            }
        }

        // If this window belongs to a browser, save HWND for tab strip inspection
        if is_browser_proc(&proc_name) {
            found.browser_hwnds.push((hwnd, proc_name));
        }
    }
    true.into()
}

fn inspect_browser_tabs(hwnds: &[(HWND, String)], found: &mut WaFound) {
    unsafe {
        let _ = CoInitializeEx(None::<*const core::ffi::c_void>, COINIT_MULTITHREADED);
        let uia: IUIAutomation = match CoCreateInstance(
            &CUIAutomation,
            None::<&windows_core::IUnknown>,
            CLSCTX_INPROC_SERVER,
        ) {
            Ok(u) => u,
            Err(_) => return,
        };

        let walker = match uia.ControlViewWalker() {
            Ok(w) => w,
            Err(_) => return,
        };

        for (hwnd, proc_name) in hwnds {
            let root = match uia.ElementFromHandle(*hwnd) {
                Ok(r) => r,
                Err(_) => continue,
            };

            let mut queue = std::collections::VecDeque::new();
            queue.push_back((root, 0usize));

            let mut visited = 0;
            while let Some((elem, depth)) = queue.pop_front() {
                visited += 1;
                if visited > 75 {
                    break;
                }

                if let Ok(name_bstr) = elem.CurrentName() {
                    let name = name_bstr.to_string();
                    if !name.is_empty() {
                        let (is_wa, unread, contact) = parse_wa_title(&name);
                        if is_wa {
                            found.present = true;
                            found.unread = found.unread.max(unread);
                            if found.contact.is_none() && contact.is_some() {
                                found.contact = contact;
                            }
                            if found.browser.is_none() {
                                found.browser = Some(friendly_browser_name(proc_name).to_string());
                            }
                            if unread > 0 {
                                break;
                            }
                        }
                    }
                }

                if let Ok(ctrl_type) = elem.CurrentControlType() {
                    // 50004 = UIA_EditControlTypeId (address bar)
                    if ctrl_type.0 == 50004 {
                        if let Ok(name_bstr) = elem.CurrentName() {
                            let val = name_bstr.to_string().to_lowercase();
                            if val.contains("web.whatsapp.com") || val.contains("whatsapp.com") {
                                found.present = true;
                                if found.browser.is_none() {
                                    found.browser = Some(friendly_browser_name(proc_name).to_string());
                                }
                            }
                        }
                    }

                    // 50030 = UIA_DocumentControlTypeId (skip deep web content)
                    if ctrl_type.0 == 50030 {
                        continue;
                    }
                }

                // Tabs are located near the top of the browser UI hierarchy (depth < 4)
                if depth < 4 {
                    if let Ok(mut child) = walker.GetFirstChildElement(&elem) {
                        loop {
                            queue.push_back((child.clone(), depth + 1));
                            match walker.GetNextSiblingElement(&child) {
                                Ok(next) => child = next,
                                Err(_) => break,
                            }
                        }
                    }
                }
            }

            if found.present && found.unread > 0 {
                break;
            }
        }
    }
}

pub fn whatsapp() -> WhatsAppState {
    let mut found = WaFound {
        present: false,
        unread: 0,
        contact: None,
        browser: None,
        browser_hwnds: Vec::new(),
    };
    unsafe {
        let _ = EnumWindows(
            Some(wa_enum_proc),
            LPARAM(&mut found as *mut WaFound as isize),
        );
    };

    // If WhatsApp is not detected on top-level titles, or unread is 0,
    // inspect browser tabs (handles background tabs in Firefox, Chrome, Edge, Brave, Opera, etc.)
    if (!found.present || found.unread == 0) && !found.browser_hwnds.is_empty() {
        inspect_browser_tabs(&found.browser_hwnds, &mut found);
    }

    WhatsAppState {
        present: found.present,
        unread: found.unread,
        contact: found.contact,
        browser: found.browser,
    }
}
