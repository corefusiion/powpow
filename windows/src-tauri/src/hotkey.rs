use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::POINT;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    RegisterHotKey, MOD_ALT, MOD_CONTROL, MOD_NOREPEAT, MOD_SHIFT,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetCursorPos, GetMessageW, PeekMessageW, MSG, PM_NOREMOVE, WM_HOTKEY,
};

#[derive(Serialize, Clone, Copy)]
pub struct SummonPayload {
    pub x: i32,
    pub y: i32,
}

pub fn spawn(app: AppHandle) {
    std::thread::spawn(move || {
        const HOTKEY_SUMMON_CTRL_8: i32 = 0x8888;
        const HOTKEY_SUMMON_CTRL_SHIFT_C: i32 = 0x8889;
        const HOTKEY_SUMMON_CTRL_ALT_C: i32 = 0x888A;
        const HOTKEY_SUMMON_CTRL_ALT_P: i32 = 0x888B;

        // Virtual-Key codes:
        // '8' = 0x38, 'C' = 0x43, 'P' = 0x50
        const VK_8: u32 = 0x38;
        const VK_C: u32 = 0x43;
        const VK_P: u32 = 0x50;

        unsafe {
            // Force creation of Win32 message queue for this thread before registering thread hotkeys
            let mut dummy = MSG::default();
            let _ = PeekMessageW(&mut dummy, None, 0, 0, PM_NOREMOVE);

            let _ = RegisterHotKey(None, HOTKEY_SUMMON_CTRL_8, MOD_CONTROL | MOD_NOREPEAT, VK_8);
            let _ = RegisterHotKey(None, HOTKEY_SUMMON_CTRL_SHIFT_C, MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT, VK_C);
            let _ = RegisterHotKey(None, HOTKEY_SUMMON_CTRL_ALT_C, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_C);
            let _ = RegisterHotKey(None, HOTKEY_SUMMON_CTRL_ALT_P, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_P);

            crate::log::line("Registered global hotkeys: Ctrl+Shift+C, Ctrl+Alt+C, Ctrl+8, Ctrl+Alt+P for avatar summon");

            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                if msg.message == WM_HOTKEY {
                    let hk_id = msg.wParam.0 as i32;
                    if hk_id == HOTKEY_SUMMON_CTRL_8
                        || hk_id == HOTKEY_SUMMON_CTRL_SHIFT_C
                        || hk_id == HOTKEY_SUMMON_CTRL_ALT_C
                        || hk_id == HOTKEY_SUMMON_CTRL_ALT_P
                    {
                        crate::log::line(format!("Global summon hotkey (id {hk_id:#x}) triggered: summoning avatar!"));

                        // 1. Unpause backend state
                        crate::integrations::set_paused(false);

                        // 2. Mark PAL_WANDER as true and ensure window is visible
                        crate::apply_pal_wander(&app, true);

                        let mut point = POINT::default();
                        let _ = GetCursorPos(&mut point);

                        let payload = SummonPayload {
                            x: point.x,
                            y: point.y,
                        };

                        // 3. Move pal window instantly to cursor coordinates, show, unminimize, focus
                        let app_handle = app.clone();
                        let _ = app.run_on_main_thread(move || {
                            if let Some(pal) = app_handle.get_webview_window("pal") {
                                let pscale = pal.scale_factor().unwrap_or(1.0);
                                let target_x = (point.x as f64 - 40.0 * pscale) as i32;
                                let target_y = (point.y as f64 - 80.0 * pscale) as i32;
                                let _ = pal.set_position(tauri::PhysicalPosition::new(target_x, target_y));
                                let _ = pal.show();
                                let _ = pal.unminimize();
                                let _ = pal.set_always_on_top(true);
                                let _ = pal.set_focus();
                                let _ = pal.emit("pal-summon", payload);
                            }
                        });

                        // 4. Also notify island and pal about unpause and wander state
                        let _ = app.emit("pal-unpause", ());
                        let _ = app.emit("pal-wander", true);
                        let _ = app.emit("pal-wander-toggle", true);
                    }
                }
            }
        }
    });
}
