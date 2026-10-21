use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::POINT;
use windows::Win32::UI::Input::KeyboardAndMouse::{RegisterHotKey, MOD_CONTROL, MOD_NOREPEAT};
use windows::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetMessageW, MSG, WM_HOTKEY};

#[derive(Serialize, Clone, Copy)]
pub struct SummonPayload {
    pub x: i32,
    pub y: i32,
}

pub fn spawn(app: AppHandle) {
    std::thread::spawn(move || {
        const HOTKEY_SUMMON_PAL: i32 = 0x8888;
        // 0x38 is Virtual-Key Code for '8' (VK_8)
        const VK_8: u32 = 0x38;

        unsafe {
            if let Err(e) = RegisterHotKey(None, HOTKEY_SUMMON_PAL, MOD_CONTROL | MOD_NOREPEAT, VK_8) {
                crate::log::line(format!("Failed to register Ctrl+8 hotkey: {e}"));
                return;
            }
            crate::log::line("Registered global hotkey Ctrl+8 for avatar summon");

            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                if msg.message == WM_HOTKEY && msg.wParam.0 as i32 == HOTKEY_SUMMON_PAL {
                    crate::log::line("Global hotkey Ctrl+8 triggered: summoning avatar!");

                    // 1. Unpause backend state
                    crate::set_paused(false);

                    // 2. Mark PAL_WANDER as true and show window
                    crate::set_pal_wander(app.clone(), true);

                    let mut point = POINT::default();
                    let _ = GetCursorPos(&mut point);

                    let payload = SummonPayload {
                        x: point.x,
                        y: point.y,
                    };

                    // 3. Show, unminimize, focus, and emit to pal window
                    if let Some(pal) = app.get_webview_window("pal") {
                        let _ = pal.show();
                        let _ = pal.unminimize();
                        let _ = pal.set_focus();
                        let _ = pal.emit("pal-summon", payload);
                    }

                    // 4. Also notify island and pal about unpause and wander state
                    let _ = app.emit("pal-unpause", ());
                    let _ = app.emit("pal-wander", true);
                    let _ = app.emit("pal-wander-toggle", true);
                }
            }
        }
    });
}
