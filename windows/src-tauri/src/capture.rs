// Window attach for the Mochi drag-out and for the roaming pal's "Screen
// analysis": captures a window into the inbox and reports it back, mirroring
// WindowContextCapture on macOS.
//
// Flow: user drags Mochi out of the island (> 7pt) — a ghost follows the
// cursor — on release the front end calls `attach_window` — we read the cursor
// position ourselves (the release usually happens outside our window, so
// client coordinates would be meaningless), find the window below it, blit the
// visible screen rect into a PNG next to dropped files. The front end then
// offers it as prompt context like any other file.
//
// The pal asks for the *foreground* window instead (`attach_active`): clicking
// the pal does not steal focus (the window is WS_EX_NOACTIVATE), so the app
// the user was working in is still the one in front — that is the window worth
// analysing.
//
// Permissions: none beyond what a screenshot tool needs. A minimized window or
// one of our own windows is a clean error, never a capture.

use serde::Serialize;
use tauri::{AppHandle, Manager};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
    GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    HDC, SRCCOPY,
};
use windows::Win32::System::ProcessStatus::GetModuleBaseNameW;
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
use windows::Win32::UI::WindowsAndMessaging::{
    GetCursorPos, GetForegroundWindow, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId,
    IsIconic, WindowFromPoint,
};

use crate::files;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachedWindow {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub app_name: String,
    pub title: String,
}

/// Every window that belongs to us: a capture must never pick one of Powpow's
/// own windows — they are what the user clicked, not what they were doing.
fn ours(app: &AppHandle) -> Vec<HWND> {
    ["island", "pal", "settings"]
        .iter()
        .filter_map(|label| app.get_webview_window(label))
        .filter_map(|w| w.hwnd().ok())
        .map(|raw| HWND(raw.0 as *mut _))
        .collect()
}

fn window_text(hwnd: HWND) -> String {
    let mut buf = [0u16; 512];
    let len = unsafe { GetWindowTextW(hwnd, &mut buf) };
    String::from_utf16_lossy(&buf[..len as usize]).trim().to_string()
}

fn process_name(pid: u32) -> String {
    unsafe {
        let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return String::new();
        };
        let mut buf = [0u16; 260];
        let len = GetModuleBaseNameW(handle, None, &mut buf);
        let _ = windows::Win32::Foundation::CloseHandle(handle);
        String::from_utf16_lossy(&buf[..len as usize])
    }
}

/// Captures rect in physical screen pixels into an RGBA buffer.
fn capture(rect: RECT) -> Result<(u32, u32, Vec<u8>), String> {
    let w = rect.right - rect.left;
    let h = rect.bottom - rect.top;
    if w < 8 || h < 8 || w > 8192 || h > 8192 {
        return Err("window has no usable size (minimized?)".into());
    }
    unsafe {
        let screen_dc: HDC = GetDC(None);
        if screen_dc.is_invalid() {
            return Err("cannot access the screen".into());
        }
        let mem_dc = CreateCompatibleDC(Some(screen_dc));
        let bmp = CreateCompatibleBitmap(screen_dc, w, h);
        if mem_dc.is_invalid() || bmp.is_invalid() {
            ReleaseDC(None, screen_dc);
            return Err("cannot create capture buffer".into());
        }
        let old = SelectObject(mem_dc, bmp.into());

        // Copy what is on screen at that rect. The drop always lands on a
        // visible window (minimized is rejected above), so a screen blit is
        // the honest capture here — no PrintWindow needed.
        let ok = BitBlt(mem_dc, 0, 0, w, h, Some(screen_dc), rect.left, rect.top, SRCCOPY).is_ok();
        SelectObject(mem_dc, old);

        let result = if ok {
            let mut info = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: w,
                    biHeight: -h, // top-down: no row flip needed
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    biSizeImage: 0,
                    ..Default::default()
                },
                ..Default::default()
            };
            let mut pixels = vec![0u8; (w * h * 4) as usize];
            let lines = GetDIBits(
                mem_dc,
                bmp,
                0,
                h as u32,
                Some(pixels.as_mut_ptr() as *mut _),
                &mut info,
                DIB_RGB_COLORS,
            );
            if lines == 0 {
                Err("could not read captured pixels".into())
            } else {
                // BGRA → RGBA for the PNG encoder.
                for px in pixels.chunks_exact_mut(4) {
                    px.swap(0, 2);
                }
                Ok((w as u32, h as u32, pixels))
            }
        } else {
            Err("window refused capture (try a normal resizable window)".into())
        };

        let _ = DeleteObject(bmp.into());
        let _ = DeleteDC(mem_dc);
        ReleaseDC(None, screen_dc);
        result
    }
}

pub fn attach(app: &AppHandle) -> Result<AttachedWindow, String> {
    let mut point = windows::Win32::Foundation::POINT::default();
    unsafe {
        GetCursorPos(&mut point).map_err(|_| "cannot read cursor position".to_string())?;
    }
    let target = unsafe { WindowFromPoint(point) };
    if target.0.is_null() {
        return Err("no window under the cursor".into());
    }
    check_target(app, target, "drop Mochi on another app's window, not on the island")?;
    save(target)
}

pub fn capture_screen() -> Result<AttachedWindow, String> {
    unsafe {
        use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
        let w = GetSystemMetrics(SM_CXSCREEN);
        let h = GetSystemMetrics(SM_CYSCREEN);
        let rect = RECT { left: 0, top: 0, right: w, bottom: h };
        let (w, h, pixels) = capture(rect)?;
        let img = image::RgbaImage::from_raw(w, h, pixels)
            .ok_or_else(|| "captured image is corrupt".to_string())?;

        let (w2, h2) = if w > 1568 {
            let h2 = (h as f32 * 1568.0 / w as f32).round() as u32;
            (1568, h2.max(1))
        } else {
            (w, h)
        };
        let img = image::imageops::resize(&img, w2, h2, image::imageops::FilterType::Triangle);

        let dir = files::inbox_dir();
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let dest = dir.join(format!("tela-{stamp}.png"));
        img.save(&dest).map_err(|e| format!("cannot save capture: {e}"))?;
        let size = std::fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);

        Ok(AttachedWindow {
            name: dest
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "tela.png".into()),
            path: dest.to_string_lossy().to_string(),
            size,
            app_name: "Tela".into(),
            title: "Captura de tela".into(),
        })
    }
}

/// The window the user was working in before clicking the roaming pal. The pal
/// is WS_EX_NOACTIVATE, so the click never changed what is in front.
pub fn attach_active(app: &AppHandle) -> Result<AttachedWindow, String> {
    let mut target = unsafe { GetForegroundWindow() };
    let our_windows = ours(app);

    if target.0.is_null() || our_windows.contains(&target) || unsafe { IsIconic(target) }.as_bool() {
        let mut next = target;
        while !next.0.is_null() {
            let Ok(h) = (unsafe {
                windows::Win32::UI::WindowsAndMessaging::GetWindow(
                    next,
                    windows::Win32::UI::WindowsAndMessaging::GW_HWNDNEXT,
                )
            }) else {
                break;
            };
            if h.0.is_null() {
                break;
            }
            next = h;
            if !our_windows.contains(&next)
                && !unsafe { IsIconic(next) }.as_bool()
                && unsafe { windows::Win32::UI::WindowsAndMessaging::IsWindowVisible(next) }.as_bool()
            {
                let mut r = RECT::default();
                if unsafe { GetWindowRect(next, &mut r) }.is_ok() {
                    let w = r.right - r.left;
                    let h = r.bottom - r.top;
                    if w > 120 && h > 120 {
                        target = next;
                        break;
                    }
                }
            }
        }
    }

    if !target.0.is_null() && !our_windows.contains(&target) && !unsafe { IsIconic(target) }.as_bool() {
        if let Ok(attached) = save(target) {
            return Ok(attached);
        }
    }

    capture_screen()
}

/// Ours or minimized are clean errors, never a capture.
fn check_target(app: &AppHandle, target: HWND, ours_msg: &str) -> Result<(), String> {
    if ours(app).contains(&target) {
        return Err(ours_msg.into());
    }
    if unsafe { IsIconic(target) }.as_bool() {
        return Err("that window is minimized".into());
    }
    Ok(())
}

fn save(target: HWND) -> Result<AttachedWindow, String> {
    let mut rect = RECT::default();
    unsafe {
        GetWindowRect(target, &mut rect).map_err(|_| "cannot read window bounds".to_string())?;
    }

    let title = window_text(target);
    let mut pid = 0u32;
    unsafe {
        GetWindowThreadProcessId(target, Some(&mut pid));
    }
    let app_name = process_name(pid)
        .trim_end_matches(".exe")
        .trim_end_matches(".EXE")
        .to_string();

    let (w, h, pixels) = capture(rect)?;
    let img = image::RgbaImage::from_raw(w, h, pixels)
        .ok_or_else(|| "captured image is corrupt".to_string())?;

    // Downscale wide captures like ScreenCaptureKit does (1568px max) so the
    // chat payload stays small; thumbnail preserves aspect.
    let (w2, h2) = if w > 1568 {
        let h2 = (h as f32 * 1568.0 / w as f32).round() as u32;
        (1568, h2.max(1))
    } else {
        (w, h)
    };
    let img = image::imageops::resize(&img, w2, h2, image::imageops::FilterType::Triangle);

    let dir = files::inbox_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let base = if app_name.is_empty() { "window".to_string() } else { app_name.clone() };
    let dest = dir.join(format!("{base}-{stamp}.png"));
    img.save(&dest).map_err(|e| format!("cannot save capture: {e}"))?;
    let size = std::fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);

    Ok(AttachedWindow {
        name: dest
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "window.png".into()),
        path: dest.to_string_lossy().to_string(),
        size,
        app_name,
        title,
    })
}
