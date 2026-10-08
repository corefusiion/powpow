// Codex plan usage — queries `codex app-server` for rate limits.

use std::path::PathBuf;
use std::io::{BufRead, BufReader, Write};
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::sync::atomic::{self, AtomicBool};
use std::sync::mpsc;
use std::time::Duration;

use serde_json::Value;

const TIMEOUT: Duration = Duration::from_secs(15);
const MAX_LINE: usize = 256 * 1024;
const MAX_TOTAL: usize = 2 * 1024 * 1024;
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const REQUESTS: &str = concat!(
    r#"{"id":1,"method":"initialize","params":{"clientInfo":{"name":"powpow","version":"1"}}}"#,
    "\n",
    r#"{"method":"initialized"}"#,
    "\n",
    r#"{"id":2,"method":"account/rateLimits/read"}"#,
    "\n",
);

static BUSY: AtomicBool = AtomicBool::new(false);

struct NotBusy;
impl Drop for NotBusy {
    fn drop(&mut self) {
        BUSY.store(false, atomic::Ordering::Release);
    }
}

pub fn codex_candidates() -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = Vec::new();
    if let Some(path) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&path) {
            for ext in ["cmd", "exe", "bat"] {
                let candidate = dir.join(format!("codex.{ext}"));
                if candidate.is_file() {
                    out.push(candidate);
                }
            }
        }
    }
    let var = |k: &str| std::env::var_os(k).map(PathBuf::from).filter(|p| p.is_absolute());
    if let Some(appdata) = var("APPDATA") {
        let p = appdata.join("npm").join("codex.cmd");
        if p.is_file() { out.push(p); }
    }
    if let Some(local) = var("LOCALAPPDATA") {
        let p1 = local.join("Volta").join("bin").join("codex.exe");
        if p1.is_file() { out.push(p1); }
        let p2 = local.join("pnpm").join("codex.cmd");
        if p2.is_file() { out.push(p2); }
    }
    out
}

pub fn read() -> Option<Value> {
    if BUSY.swap(true, atomic::Ordering::AcqRel) {
        return None;
    }
    let _busy = NotBusy;

    let exe = codex_candidates().into_iter().next()?;
    let mut cmd = Command::new(&exe);
    cmd.arg("app-server").stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null());
    cmd.creation_flags(CREATE_NO_WINDOW);
    if let Some(dir) = exe.parent() {
        let mut dirs = vec![dir.to_path_buf()];
        if let Some(path) = std::env::var_os("PATH") {
            dirs.extend(std::env::split_paths(&path));
        }
        if let Ok(joined) = std::env::join_paths(dirs) {
            cmd.env("PATH", joined);
        }
    }
    let mut child = cmd.spawn().ok()?;

    let answer = (|| {
        let mut stdin = child.stdin.take()?;
        let stdout = child.stdout.take()?;
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            let _ = tx.send(first_answer(BufReader::new(stdout)));
        });
        stdin.write_all(REQUESTS.as_bytes()).ok()?;
        stdin.flush().ok()?;
        let answer = rx.recv_timeout(TIMEOUT).ok().flatten();
        drop(stdin);
        answer
    })();

    let mut kill = Command::new("taskkill");
    kill.args(["/T", "/F", "/PID", &child.id().to_string()]);
    kill.creation_flags(CREATE_NO_WINDOW);
    let _ = kill.status();
    let _ = child.kill();
    let _ = child.wait();

    answer
}

fn first_answer<R: std::io::Read>(mut reader: BufReader<R>) -> Option<Value> {
    let mut total = 0;
    let mut line = String::new();
    while total < MAX_TOTAL {
        line.clear();
        let n = reader.read_line(&mut line).ok()?;
        if n == 0 {
            return None;
        }
        total += n;
        if n > MAX_LINE {
            continue;
        }
        let Ok(v) = serde_json::from_str::<Value>(&line) else { continue };
        if v.get("id").and_then(|id| id.as_i64()) == Some(2) {
            return v.get("result").cloned();
        }
    }
    None
}
