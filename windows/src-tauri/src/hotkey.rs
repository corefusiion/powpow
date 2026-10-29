use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::POINT;
use windows::Win32::UI::Input::KeyboardAndMouse::{RegisterHotKey, HOT_KEY_MODIFIERS, MOD_CONTROL, MOD_NOREPEAT};
use windows::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetMessageW, PeekMessageW, MSG, PM_NOREMOVE, WM_HOTKEY};

#[derive(Serialize, Clone, Copy)]
pub struct SummonPayload {
    pub x: i32,
    pub y: i32,
}

pub fn spawn(app: AppHandle) {
    std::thread::spawn(move || {
        const HOTKEY_SUMMON_PAL_8: i32 = 0x8888;
        const HOTKEY_SUMMON_PAL_C: i32 = 0x8889;
        const HOTKEY_SUMMON_PAL_ALT: i32 = 0x888A;

        const VK_8: u32 = 0x38;
        const VK_C: u32 = 0x43;

        unsafe {
            let mut dummy = MSG::default();
            let _ = PeekMessageW(&mut dummy, None, 0, 0, PM_NOREMOVE);

            // MOD_CONTROL (0x2), MOD_SHIFT (0x4), MOD_ALT (0x1), MOD_NOREPEAT (0x4000)
            let _ = RegisterHotKey(None, HOTKEY_SUMMON_PAL_8, MOD_CONTROL | MOD_NOREPEAT, VK_8);
            let _ = RegisterHotKey(None, HOTKEY_SUMMON_PAL_C, HOT_KEY_MODIFIERS(0x0002 | 0x0004 | 0x4000), VK_C);
            let _ = RegisterHotKey(None, HOTKEY_SUMMON_PAL_ALT, HOT_KEY_MODIFIERS(0x0002 | 0x0001 | 0x4000), VK_C);

            crate::log::line("Registered global hotkeys: Ctrl+Shift+C, Ctrl+Alt+C, Ctrl+8 for avatar summon");

            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                if msg.message == WM_HOTKEY {
                    let id = msg.wParam.0 as i32;
                    if id == HOTKEY_SUMMON_PAL_8 || id == HOTKEY_SUMMON_PAL_C || id == HOTKEY_SUMMON_PAL_ALT {
                        crate::log::line(format!("Global summon hotkey ({id:#x}) triggered: summoning avatar!"));

                        crate::integrations::set_paused(false);
                        crate::apply_pal_wander(&app, true);

                        let mut point = POINT::default();
                        let _ = GetCursorPos(&mut point);

                        let payload = SummonPayload {
                            x: point.x,
                            y: point.y,
                        };

                        let app_handle = app.clone();
                        let _ = app.run_on_main_thread(move || {
                            if let Some(pal) = app_handle.get_webview_window("pal") {
                                let _ = pal.show();
                                let _ = pal.unminimize();
                                let _ = pal.set_focus();
                                let _ = pal.emit("pal-summon", payload);
                            }
                        });

                        let _ = app.emit("pal-unpause", ());
                        let _ = app.emit("pal-wander", true);
                        let _ = app.emit("pal-wander-toggle", true);
                    }
                }
            }
        }
    });
}
