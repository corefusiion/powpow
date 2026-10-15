// System Agent — Desktop Butler, Instant Doc Creator & File Locator.
// Provides native Windows OS assistant capabilities to Powpow.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::SystemTime;

use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_TAB,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
};
#[cfg(target_os = "windows")]
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
#[cfg(target_os = "windows")]
use windows::Win32::System::ProcessStatus::GetModuleBaseNameW;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizeItem {
    pub original_path: String,
    pub file_name: String,
    pub category: String,
    pub target_folder: String,
    pub target_path: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizePreview {
    pub base_path: String,
    pub folder_name: String,
    pub total_files: usize,
    pub categories: HashMap<String, usize>,
    pub items: Vec<OrganizeItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizeResult {
    pub moved_count: usize,
    pub base_path: String,
    pub target_folders: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedDocInfo {
    pub file_name: String,
    pub path: String,
    pub size: u64,
    pub doc_type: String,
    pub opened: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocatedFile {
    pub name: String,
    pub path: String,
    pub folder: String,
    pub size: u64,
    pub modified_secs_ago: u64,
    pub extension: String,
}

fn user_profile_dir() -> PathBuf {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("C:\\Users\\Default"))
}

pub fn get_desktop_dir() -> PathBuf {
    let profile = user_profile_dir();
    let one_drive_desktop = profile.join("OneDrive").join("Desktop");
    if one_drive_desktop.exists() {
        return one_drive_desktop;
    }
    profile.join("Desktop")
}

pub fn get_downloads_dir() -> PathBuf {
    user_profile_dir().join("Downloads")
}

pub fn get_documents_dir() -> PathBuf {
    let profile = user_profile_dir();
    let one_drive_docs = profile.join("OneDrive").join("Documents");
    if one_drive_docs.exists() {
        return one_drive_docs;
    }
    profile.join("Documents")
}

fn categorize_extension(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "ico" | "bmp" | "tiff" => "Imagens",
        "pdf" | "docx" | "doc" | "txt" | "md" | "rtf" | "odt" | "epub" => "Documentos",
        "xlsx" | "xls" | "csv" | "tsv" | "ods" => "Planilhas",
        "exe" | "msi" | "iso" | "dmg" | "pkg" => "Instaladores",
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" => "Compactados",
        "js" | "ts" | "jsx" | "tsx" | "rs" | "py" | "json" | "html" | "css" | "sql" | "sh" | "ps1" => "Código",
        "mp3" | "wav" | "flac" | "ogg" | "m4a" | "mp4" | "mkv" | "mov" | "avi" | "webm" => "Mídia",
        _ => "Outros",
    }
}

pub fn desktop_organize_preview(folder_kind: Option<String>) -> Result<OrganizePreview, String> {
    let (base_path, folder_name) = match folder_kind.as_deref() {
        Some("downloads") => (get_downloads_dir(), "Downloads".to_string()),
        _ => (get_desktop_dir(), "Área de Trabalho".to_string()),
    };

    if !base_path.exists() {
        return Err(format!("Diretório não encontrado: {}", base_path.display()));
    }

    let entries = fs::read_dir(&base_path)
        .map_err(|e| format!("Não foi possível ler {}: {e}", base_path.display()))?;

    let mut items = Vec::new();
    let mut categories_count: HashMap<String, usize> = HashMap::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            continue; // Nunca move diretórios existentes para preservar segurança
        }

        let file_name = entry.file_name().to_string_lossy().to_string();

        // Ignora arquivos do sistema e atalhos vitais
        if file_name.eq_ignore_ascii_case("desktop.ini")
            || file_name.starts_with('~')
            || file_name.ends_with(".lnk")
            || file_name.ends_with(".tmp")
        {
            continue;
        }

        let ext = path
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();

        let category = categorize_extension(&ext).to_string();
        let target_folder_path = base_path.join(&category);
        let target_file_path = target_folder_path.join(&file_name);
        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);

        *categories_count.entry(category.clone()).or_insert(0) += 1;

        items.push(OrganizeItem {
            original_path: path.to_string_lossy().to_string(),
            file_name,
            category: category.clone(),
            target_folder: category,
            target_path: target_file_path.to_string_lossy().to_string(),
            size,
        });
    }

    // Ordenar itens por categoria e nome
    items.sort_by(|a, b| a.category.cmp(&b.category).then(a.file_name.cmp(&b.file_name)));

    Ok(OrganizePreview {
        base_path: base_path.to_string_lossy().to_string(),
        folder_name,
        total_files: items.len(),
        categories: categories_count,
        items,
    })
}

pub fn desktop_organize_apply(items: Vec<OrganizeItem>) -> Result<OrganizeResult, String> {
    if items.is_empty() {
        return Ok(OrganizeResult {
            moved_count: 0,
            base_path: String::new(),
            target_folders: Vec::new(),
        });
    }

    let undo_file = crate::settings::local_dir().join("organize_undo.json");
    let mut undo_moves: Vec<(String, String)> = Vec::new();
    let mut target_folders_set = HashMap::new();
    let mut moved_count = 0;
    let base_path = Path::new(&items[0].original_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    for item in items {
        let src = PathBuf::from(&item.original_path);
        if !src.exists() {
            continue;
        }

        let target_folder = src.parent().unwrap_or(Path::new(".")).join(&item.category);
        if let Err(e) = fs::create_dir_all(&target_folder) {
            eprintln!("[powpow] erro ao criar pasta {}: {e}", target_folder.display());
            continue;
        }
        target_folders_set.insert(item.category.clone(), ());

        let mut dest = target_folder.join(&item.file_name);
        if dest.exists() && dest != src {
            let stem = src.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
            let ext = src.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
            for i in 1..1000 {
                let candidate = target_folder.join(format!("{stem} ({i}){ext}"));
                if !candidate.exists() {
                    dest = candidate;
                    break;
                }
            }
        }

        if let Ok(()) = fs::rename(&src, &dest) {
            undo_moves.push((dest.to_string_lossy().to_string(), src.to_string_lossy().to_string()));
            moved_count += 1;
        }
    }

    // Salvar log de desfeita (Undo)
    if let Ok(json) = serde_json::to_string(&undo_moves) {
        let _ = fs::write(undo_file, json);
    }

    Ok(OrganizeResult {
        moved_count,
        base_path,
        target_folders: target_folders_set.into_keys().collect(),
    })
}

pub fn desktop_organize_undo() -> Result<usize, String> {
    let undo_file = crate::settings::local_dir().join("organize_undo.json");
    if !undo_file.exists() {
        return Err("Nenhuma ação recente de organização para desfazer.".into());
    }

    let content = fs::read_to_string(&undo_file).map_err(|e| e.to_string())?;
    let moves: Vec<(String, String)> = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let mut restored = 0;
    for (current_path, original_path) in moves {
        let src = PathBuf::from(current_path);
        let dest = PathBuf::from(original_path);
        if src.exists() {
            if let Ok(()) = fs::rename(&src, &dest) {
                restored += 1;
            }
        }
    }

    let _ = fs::remove_file(undo_file);
    Ok(restored)
}

pub fn create_system_doc(
    doc_type: String,
    title: String,
    content: String,
    dest_folder: Option<String>,
) -> Result<CreatedDocInfo, String> {
    let clean_title = title.trim();
    let base_name = if clean_title.is_empty() {
        "Novo Documento".to_string()
    } else {
        clean_title.replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_")
    };

    let target_dir = match dest_folder.as_deref() {
        Some("desktop") => get_desktop_dir(),
        Some(custom) if Path::new(custom).exists() => PathBuf::from(custom),
        _ => get_documents_dir(),
    };

    let _ = fs::create_dir_all(&target_dir);

    let (file_name, file_bytes) = match doc_type.to_lowercase().as_str() {
        "spreadsheet" | "sheet" | "excel" | "csv" => {
            let name = if base_name.ends_with(".csv") {
                base_name
            } else {
                format!("{base_name}.csv")
            };
            // UTF-8 BOM para garantir compatibilidade perfeita no Excel do Windows
            let mut bytes = vec![0xEF, 0xBB, 0xBF];
            bytes.extend_from_slice(content.as_bytes());
            (name, bytes)
        }
        "markdown" | "md" => {
            let name = if base_name.ends_with(".md") {
                base_name
            } else {
                format!("{base_name}.md")
            };
            (name, content.into_bytes())
        }
        "html" => {
            let name = if base_name.ends_with(".html") {
                base_name
            } else {
                format!("{base_name}.html")
            };
            (name, content.into_bytes())
        }
        "json" => {
            let name = if base_name.ends_with(".json") {
                base_name
            } else {
                format!("{base_name}.json")
            };
            (name, content.into_bytes())
        }
        _ => {
            let name = if base_name.ends_with(".txt") {
                base_name
            } else {
                format!("{base_name}.txt")
            };
            (name, content.into_bytes())
        }
    };

    let mut dest = target_dir.join(&file_name);
    if dest.exists() {
        let stem = Path::new(&file_name).file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let ext = Path::new(&file_name).extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
        for i in 1..1000 {
            let candidate = target_dir.join(format!("{stem} ({i}){ext}"));
            if !candidate.exists() {
                dest = candidate;
                break;
            }
        }
    }

    fs::write(&dest, file_bytes).map_err(|e| format!("Erro ao criar arquivo: {e}"))?;

    let size = fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);
    let path_str = dest.to_string_lossy().to_string();

    // Abrir o documento automaticamente no programa padrão do Windows
    let _ = open_system_path(path_str.clone());

    Ok(CreatedDocInfo {
        file_name,
        path: path_str,
        size,
        doc_type,
        opened: true,
    })
}

pub fn locate_system_files(query: String, max_results: Option<usize>) -> Result<Vec<LocatedFile>, String> {
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return Ok(Vec::new());
    }

    let limit = max_results.unwrap_or(24);
    let terms: Vec<&str> = q.split_whitespace().collect();

    let roots = vec![
        get_desktop_dir(),
        get_documents_dir(),
        get_downloads_dir(),
        user_profile_dir().join("Pictures"),
    ];

    let mut results = Vec::new();

    for root in roots {
        if !root.exists() {
            continue;
        }
        search_recursive(&root, &terms, 0, 4, &mut results, limit);
        if results.len() >= limit {
            break;
        }
    }

    // Ordenar pelos mais recentes primeiro
    results.sort_by_key(|f| f.modified_secs_ago);

    Ok(results)
}

fn search_recursive(
    dir: &Path,
    terms: &[&str],
    depth: usize,
    max_depth: usize,
    results: &mut Vec<LocatedFile>,
    limit: usize,
) {
    if depth > max_depth || results.len() >= limit {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        if results.len() >= limit {
            break;
        }

        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Ignorar pastas ocultas ou gigantes
        if name.starts_with('.')
            || name.eq_ignore_ascii_case("node_modules")
            || name.eq_ignore_ascii_case("AppData")
            || name.eq_ignore_ascii_case("target")
            || name.eq_ignore_ascii_case("Windows")
        {
            continue;
        }

        if path.is_dir() {
            search_recursive(&path, terms, depth + 1, max_depth, results, limit);
        } else {
            let lower_name = name.to_lowercase();
            let matches = terms.iter().all(|term| lower_name.contains(term));
            if matches {
                let meta = entry.metadata().ok();
                let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                let modified_secs_ago = meta
                    .and_then(|m| m.modified().ok())
                    .and_then(|m| SystemTime::now().duration_since(m).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(u64::MAX);

                let extension = path
                    .extension()
                    .map(|e| e.to_string_lossy().to_string())
                    .unwrap_or_default();

                let folder = dir.to_string_lossy().to_string();

                results.push(LocatedFile {
                    name,
                    path: path.to_string_lossy().to_string(),
                    folder,
                    size,
                    modified_secs_ago,
                    extension,
                });
            }
        }
    }
}

pub fn open_system_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Arquivo não encontrado: {path}"));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Não foi possível abrir o arquivo: {e}"))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub fn reveal_in_explorer(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Caminho não encontrado: {path}"));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        Command::new("explorer")
            .arg(format!("/select,{}", path))
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Não foi possível revelar no Explorer: {e}"))?;
    }

    Ok(())
}

// ── Phase 2: System Commander & Ghostwriter ───────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemControlResult {
    pub success: bool,
    pub action: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowContextInfo {
    pub app_name: String,
    pub title: String,
    pub is_available: bool,
}

#[cfg(target_os = "windows")]
fn press_key(vk: VIRTUAL_KEY) {
    let mk = |up: bool| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: if up { KEYEVENTF_KEYUP } else { Default::default() },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let mut inputs = [mk(false), mk(true)];
    unsafe {
        SendInput(&mut inputs, std::mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(target_os = "windows")]
fn press_key_repeat(vk: VIRTUAL_KEY, count: usize) {
    for _ in 0..count {
        press_key(vk);
        std::thread::sleep(std::time::Duration::from_millis(25));
    }
}

pub fn system_control(action: String, _value: Option<String>) -> Result<SystemControlResult, String> {
    match action.as_str() {
        "volume_up" => {
            #[cfg(target_os = "windows")]
            {
                let vk = VIRTUAL_KEY(0xAF); // VK_VOLUME_UP
                press_key_repeat(vk, 5);
            }
            Ok(SystemControlResult {
                success: true,
                action,
                message: "Volume aumentado.".into(),
            })
        }
        "volume_down" => {
            #[cfg(target_os = "windows")]
            {
                let vk = VIRTUAL_KEY(0xAE); // VK_VOLUME_DOWN
                press_key_repeat(vk, 5);
            }
            Ok(SystemControlResult {
                success: true,
                action,
                message: "Volume diminuído.".into(),
            })
        }
        "volume_mute" => {
            #[cfg(target_os = "windows")]
            {
                let vk = VIRTUAL_KEY(0xAD); // VK_VOLUME_MUTE
                press_key(vk);
            }
            Ok(SystemControlResult {
                success: true,
                action,
                message: "Mudo alternado.".into(),
            })
        }
        "theme_dark" => {
            #[cfg(target_os = "windows")]
            unsafe {
                use windows::Win32::System::Registry::{
                    RegCloseKey, RegOpenKeyExW, RegSetValueExW, HKEY_CURRENT_USER, KEY_SET_VALUE, REG_DWORD,
                };
                use windows::core::PCWSTR;
                let mut hkey = windows::Win32::System::Registry::HKEY::default();
                let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize\0"
                    .encode_utf16()
                    .collect();
                let err = RegOpenKeyExW(
                    HKEY_CURRENT_USER,
                    PCWSTR(subkey.as_ptr()),
                    None,
                    KEY_SET_VALUE,
                    &mut hkey,
                );
                if err.0 == 0 {
                    let val: u32 = 0;
                    let bytes = val.to_ne_bytes();
                    let app_key: Vec<u16> = "AppsUseLightTheme\0".encode_utf16().collect();
                    let sys_key: Vec<u16> = "SystemUsesLightTheme\0".encode_utf16().collect();
                    let _ = RegSetValueExW(hkey, PCWSTR(app_key.as_ptr()), None, REG_DWORD, Some(&bytes));
                    let _ = RegSetValueExW(hkey, PCWSTR(sys_key.as_ptr()), None, REG_DWORD, Some(&bytes));
                    let _ = RegCloseKey(hkey);
                }
            }
            Ok(SystemControlResult {
                success: true,
                action,
                message: "Modo escuro ativado no Windows.".into(),
            })
        }
        "theme_light" => {
            #[cfg(target_os = "windows")]
            unsafe {
                use windows::Win32::System::Registry::{
                    RegCloseKey, RegOpenKeyExW, RegSetValueExW, HKEY_CURRENT_USER, KEY_SET_VALUE, REG_DWORD,
                };
                use windows::core::PCWSTR;
                let mut hkey = windows::Win32::System::Registry::HKEY::default();
                let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize\0"
                    .encode_utf16()
                    .collect();
                let err = RegOpenKeyExW(
                    HKEY_CURRENT_USER,
                    PCWSTR(subkey.as_ptr()),
                    None,
                    KEY_SET_VALUE,
                    &mut hkey,
                );
                if err.0 == 0 {
                    let val: u32 = 1;
                    let bytes = val.to_ne_bytes();
                    let app_key: Vec<u16> = "AppsUseLightTheme\0".encode_utf16().collect();
                    let sys_key: Vec<u16> = "SystemUsesLightTheme\0".encode_utf16().collect();
                    let _ = RegSetValueExW(hkey, PCWSTR(app_key.as_ptr()), None, REG_DWORD, Some(&bytes));
                    let _ = RegSetValueExW(hkey, PCWSTR(sys_key.as_ptr()), None, REG_DWORD, Some(&bytes));
                    let _ = RegCloseKey(hkey);
                }
            }
            Ok(SystemControlResult {
                success: true,
                action,
                message: "Modo claro ativado no Windows.".into(),
            })
        }
        "empty_recycle_bin" => {
            #[cfg(target_os = "windows")]
            unsafe {
                use windows::Win32::UI::Shell::{
                    SHEmptyRecycleBinW, SHERB_NOCONFIRMATION, SHERB_NOPROGRESSUI, SHERB_NOSOUND,
                };
                let _ = SHEmptyRecycleBinW(
                    None,
                    windows::core::PCWSTR(std::ptr::null()),
                    SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI | SHERB_NOSOUND,
                );
            }
            Ok(SystemControlResult {
                success: true,
                action,
                message: "Lixeira do Windows esvaziada com sucesso.".into(),
            })
        }
        "lock_screen" => {
            #[cfg(target_os = "windows")]
            unsafe {
                #[link(name = "user32")]
                extern "system" {
                    fn LockWorkStation() -> i32;
                }
                let _ = LockWorkStation();
            }
            Ok(SystemControlResult {
                success: true,
                action,
                message: "Computador bloqueado.".into(),
            })
        }
        _ => Err(format!("Ação do sistema desconhecida: {action}")),
    }
}

#[cfg(target_os = "windows")]
fn detect_focused_element_name() -> Option<String> {
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED};
    use windows::Win32::UI::Accessibility::{CUIAutomation, IUIAutomation};

    unsafe {
        let _ = CoInitializeEx(None::<*const core::ffi::c_void>, COINIT_MULTITHREADED);
        let uia: IUIAutomation = CoCreateInstance(&CUIAutomation, None::<&windows_core::IUnknown>, CLSCTX_INPROC_SERVER).ok()?;
        let elem = uia.GetFocusedElement().ok()?;
        let mut name = String::new();
        if let Ok(bstr) = elem.CurrentName() {
            name = String::from_utf16_lossy(bstr.as_wide()).trim().to_string();
        }
        if name.is_empty() {
            if let Ok(bstr) = elem.CurrentAriaRole() {
                name = String::from_utf16_lossy(bstr.as_wide()).trim().to_string();
            }
        }
        if !name.is_empty() {
            Some(name)
        } else {
            None
        }
    }
}

pub fn inject_text(
    app: &tauri::AppHandle,
    text: String,
    target_field: Option<String>,
    subject: Option<String>,
) -> Result<(), String> {
    if text.is_empty() {
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::Foundation::HANDLE;
        use windows::Win32::System::DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData};
        use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};
        use windows::Win32::UI::WindowsAndMessaging::SetForegroundWindow;

        let mut win_title = String::new();
        if let Some(target) = crate::capture::find_active_target(app) {
            let mut buf = [0u16; 512];
            let len = GetWindowTextW(target, &mut buf);
            win_title = String::from_utf16_lossy(&buf[..len as usize]).to_lowercase();

            let _ = SetForegroundWindow(target);
            std::thread::sleep(std::time::Duration::from_millis(180));
        } else {
            std::thread::sleep(std::time::Duration::from_millis(60));
        }

        let is_email_app = win_title.contains("gmail")
            || win_title.contains("outlook")
            || win_title.contains("e-mail")
            || win_title.contains("email")
            || win_title.contains("mail");

        let mk_key = |vk: VIRTUAL_KEY, up: bool| INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: if up { KEYEVENTF_KEYUP } else { Default::default() },
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let press_tab = || {
            let inputs = [mk_key(VK_TAB, false), mk_key(VK_TAB, true)];
            SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
            std::thread::sleep(std::time::Duration::from_millis(80));
        };

        let press_ctrl_v = || {
            let vk_ctrl = VIRTUAL_KEY(0x11);
            let vk_v = VIRTUAL_KEY(0x56);
            let inputs = [
                mk_key(vk_ctrl, false),
                mk_key(vk_v, false),
                mk_key(vk_v, true),
                mk_key(vk_ctrl, true),
            ];
            SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
            std::thread::sleep(std::time::Duration::from_millis(60));
        };

        let set_clipboard = |content: &str| {
            if OpenClipboard(None).is_ok() {
                let _ = EmptyClipboard();
                let utf16: Vec<u16> = content.encode_utf16().chain(std::iter::once(0)).collect();
                let byte_len = utf16.len() * 2;
                if let Ok(hmem) = GlobalAlloc(GMEM_MOVEABLE, byte_len) {
                    let ptr = GlobalLock(hmem);
                    if !ptr.is_null() {
                        std::ptr::copy_nonoverlapping(utf16.as_ptr() as *const u8, ptr as *mut u8, byte_len);
                        let _ = GlobalUnlock(hmem);
                        let _ = SetClipboardData(13, Some(HANDLE(hmem.0 as _))); // 13 = CF_UNICODETEXT
                    }
                }
                let _ = CloseClipboard();
            }
        };

        // Query focused element via UI Automation
        let focused_raw = detect_focused_element_name().unwrap_or_default().to_lowercase();

        let in_recipient_field = focused_raw.contains("para")
            || focused_raw.contains("destinat")
            || focused_raw.contains("to")
            || focused_raw.contains("recipient");

        let in_subject_field = focused_raw.contains("assunto") || focused_raw.contains("subject");

        let in_body_field = focused_raw.contains("corpo")
            || focused_raw.contains("body")
            || focused_raw.contains("mensagem")
            || focused_raw.contains("texto da mensagem");

        match target_field.as_deref() {
            Some("email_all") => {
                let subj = subject.as_deref().unwrap_or("");
                if in_recipient_field || (is_email_app && !in_subject_field && !in_body_field) {
                    // Navigate from "Para" to "Assunto"
                    press_tab();
                    if !subj.is_empty() {
                        set_clipboard(subj);
                        press_ctrl_v();
                    }
                    // Navigate from "Assunto" to "Corpo da mensagem"
                    press_tab();
                    set_clipboard(&text);
                    press_ctrl_v();
                } else if in_subject_field {
                    if !subj.is_empty() {
                        set_clipboard(subj);
                        press_ctrl_v();
                    }
                    press_tab();
                    set_clipboard(&text);
                    press_ctrl_v();
                } else {
                    set_clipboard(&text);
                    press_ctrl_v();
                }
            }
            Some("email_body") => {
                if in_body_field {
                    // Cursor is already in the body!
                    set_clipboard(&text);
                    press_ctrl_v();
                } else if in_subject_field {
                    // In Subject -> 1 Tab to Body
                    press_tab();
                    set_clipboard(&text);
                    press_ctrl_v();
                } else if in_recipient_field || is_email_app {
                    // In "Para" field (or standard Compose window):
                    // Tab 1: Para -> Assunto
                    press_tab();
                    // Tab 2: Assunto -> Corpo da mensagem
                    press_tab();
                    // Now focused in the body ("mais abaixo no corpo do email")!
                    set_clipboard(&text);
                    press_ctrl_v();
                } else {
                    set_clipboard(&text);
                    press_ctrl_v();
                }
            }
            _ => {
                set_clipboard(&text);
                press_ctrl_v();
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, text, target_field, subject);
    }

    Ok(())
}

pub fn get_active_window_context(app: &tauri::AppHandle) -> Result<WindowContextInfo, String> {
    #[cfg(target_os = "windows")]
    unsafe {
        let hwnd = match crate::capture::find_active_target(app) {
            Some(h) => h,
            None => GetForegroundWindow(),
        };
        if hwnd.is_invalid() || hwnd.0.is_null() {
            return Ok(WindowContextInfo {
                app_name: String::new(),
                title: String::new(),
                is_available: false,
            });
        }
        let mut buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut buf);
        let title = String::from_utf16_lossy(&buf[..len as usize]).trim().to_string();

        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        let mut app_name = String::new();
        if pid > 0 {
            if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                let mut pbuf = [0u16; 260];
                let plen = GetModuleBaseNameW(handle, None, &mut pbuf);
                let _ = windows::Win32::Foundation::CloseHandle(handle);
                app_name = String::from_utf16_lossy(&pbuf[..plen as usize]);
            }
        }
        Ok(WindowContextInfo {
            app_name,
            title,
            is_available: true,
        })
    }
    #[cfg(not(target_os = "windows"))]
    Ok(WindowContextInfo {
        app_name: String::new(),
        title: String::new(),
        is_available: false,
    })
}
