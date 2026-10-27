// Notification-area icon: Open, Settings, Pause, Quit.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter};

use crate::island::WINDOW_LABEL;

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Abrir Powpow", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Configurações…", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Pausar / Retomar", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Sair do Powpow", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[&open, &sep1, &settings, &pause, &sep2, &quit])?;

    let mut builder = TrayIconBuilder::with_id("powpow")
        .tooltip("Powpow")
        .show_menu_on_left_click(true)
        .menu(&menu)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                let _ = app.emit_to(WINDOW_LABEL, "tray", "open".to_string());
            }
        })
        .on_menu_event(|app: &AppHandle, event| {
            let id = event.id.as_ref();
            match id {
                "quit" => {
                    log::line("Tray Quit requested: terminating process");
                    app.cleanup_before_exit();
                    std::process::exit(0);
                }
                "settings" => {
                    crate::show_settings_window(app);
                }
                _ => {
                    let _ = app.emit_to(WINDOW_LABEL, "tray", id.to_string());
                }
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}
