use serde::Serialize;
use std::{
    collections::{HashMap, VecDeque},
    fs,
    io::{BufRead, BufReader, Read},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{Manager, State};
use tauri_plugin_notification::NotificationExt;

#[derive(Default)]
struct ManagedProcesses {
    processes: Mutex<HashMap<u32, ManagedProcess>>,
}

struct ManagedProcess {
    label: String,
    started_at: String,
    log_path: Option<String>,
    recent_output: Arc<Mutex<VecDeque<String>>>,
    child: Child,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopEnvironment {
    available: bool,
    platform: String,
    app_version: String,
    app_data_dir: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    name: String,
    path: String,
    is_directory: bool,
    size_bytes: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FilePreview {
    file_name: String,
    path: String,
    size_bytes: u64,
    content_preview: String,
    truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CliProbeResult {
    command: String,
    available: bool,
    executable_path: Option<String>,
    version: Option<String>,
    help_probe: String,
    auth_probe_status: String,
    stream_support: String,
    schema_support: String,
    sandbox_policy: String,
    tool_policy: String,
    failure_reason: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ManagedProcessInfo {
    pid: u32,
    label: String,
    started_at: String,
    running: bool,
    log_path: Option<String>,
    recent_output: Vec<String>,
}

fn recent_lines(logs: &Arc<Mutex<VecDeque<String>>>) -> Vec<String> {
    logs.lock()
        .map(|value| value.iter().cloned().collect())
        .unwrap_or_default()
}

fn now_label() -> String {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(duration) => duration.as_secs().to_string(),
        Err(_) => "unknown".to_string(),
    }
}

fn sanitize_command(command: &str) -> Result<String, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Command is empty.".to_string());
    }

    let normalized = trimmed.replace('\\', "/").to_lowercase();
    let allowed = ["claude", "claude.cmd", "codex", "codex.cmd", "opencode", "opencode.cmd", "java", "java.exe"];
    let file_name = Path::new(trimmed)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(trimmed)
        .to_lowercase();

    if allowed.contains(&file_name.as_str()) || normalized.ends_with("/claude.cmd") || normalized.ends_with("/codex.cmd") {
        Ok(trimmed.to_string())
    } else {
        Err("Only known AgentHub desktop commands are allowed: claude, codex, opencode, java.".to_string())
    }
}

fn command_for(command: &str) -> Command {
    let normalized = command.replace('\\', "/").to_lowercase();
    if cfg!(windows) && (normalized.ends_with(".cmd") || normalized.ends_with(".bat")) {
        let mut shell = Command::new("cmd");
        shell.arg("/C").arg(command);
        shell
    } else {
        Command::new(command)
    }
}

fn resolve_command_path(command: &str) -> Option<String> {
    let output = if cfg!(windows) {
        command_for("where").arg(command).output().ok()
    } else {
        command_for("which").arg(command).output().ok()
    }?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .next()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
}

fn command_output(command: &str, args: &[&str], timeout_millis: u64) -> Result<String, String> {
    let mut command_builder = command_for(command);
    let mut child = command_builder
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start command: {error}"))?;

    let started_at = std::time::Instant::now();
    loop {
        if started_at.elapsed() > Duration::from_millis(timeout_millis) {
            let _ = child.kill();
            return Err(format!("Command timed out after {timeout_millis}ms."));
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                let mut stdout = String::new();
                let mut stderr = String::new();
                if let Some(mut stream) = child.stdout.take() {
                    let _ = stream.read_to_string(&mut stdout);
                }
                if let Some(mut stream) = child.stderr.take() {
                    let _ = stream.read_to_string(&mut stderr);
                }
                let output = if stdout.trim().is_empty() { stderr } else { stdout };
                if status.success() {
                    return Ok(output.trim().chars().take(800).collect());
                }
                return Err(format!("Command exited with {status}: {}", output.trim().chars().take(800).collect::<String>()));
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(40)),
            Err(error) => return Err(format!("Failed to wait for command: {error}")),
        }
    }
}

#[tauri::command]
fn desktop_environment(app: tauri::AppHandle) -> DesktopEnvironment {
    DesktopEnvironment {
        available: true,
        platform: std::env::consts::OS.to_string(),
        app_version: app.package_info().version.to_string(),
        app_data_dir: app
            .path()
            .app_data_dir()
            .ok()
            .map(|path| path.to_string_lossy().to_string()),
    }
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let directory = PathBuf::from(path);
    if !directory.is_dir() {
        return Err("Path is not a directory.".to_string());
    }

    let mut entries = Vec::new();
    for entry in fs::read_dir(directory).map_err(|error| format!("Failed to read directory: {error}"))?.take(200) {
        let entry = entry.map_err(|error| format!("Failed to read directory entry: {error}"))?;
        let metadata = entry.metadata().ok();
        entries.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_directory: metadata.as_ref().map(|value| value.is_dir()).unwrap_or(false),
            size_bytes: metadata.filter(|value| value.is_file()).map(|value| value.len()),
        });
    }

    entries.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(entries)
}

#[tauri::command]
fn read_text_preview(path: String, max_bytes: Option<usize>) -> Result<FilePreview, String> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_file() {
        return Err("Path is not a file.".to_string());
    }

    let metadata = fs::metadata(&path_buf).map_err(|error| format!("Failed to inspect file: {error}"))?;
    let limit = max_bytes.unwrap_or(4096).clamp(256, 16 * 1024);
    let mut file = fs::File::open(&path_buf).map_err(|error| format!("Failed to open file: {error}"))?;
    let mut buffer = vec![0_u8; limit];
    let read = file.read(&mut buffer).map_err(|error| format!("Failed to read file: {error}"))?;
    buffer.truncate(read);

    Ok(FilePreview {
        file_name: path_buf.file_name().and_then(|name| name.to_str()).unwrap_or("file").to_string(),
        path: path_buf.to_string_lossy().to_string(),
        size_bytes: metadata.len(),
        content_preview: String::from_utf8_lossy(&buffer).to_string(),
        truncated: metadata.len() > read as u64,
    })
}

#[tauri::command]
fn probe_agent_cli(command: String) -> CliProbeResult {
    let safe_command = match sanitize_command(&command) {
        Ok(value) => value,
        Err(error) => {
            return CliProbeResult {
                command,
                available: false,
                executable_path: None,
                version: None,
                help_probe: "REJECTED".to_string(),
                auth_probe_status: "NOT_CHECKED".to_string(),
                stream_support: "UNKNOWN".to_string(),
                schema_support: "UNKNOWN".to_string(),
                sandbox_policy: "UNKNOWN".to_string(),
                tool_policy: "UNKNOWN".to_string(),
                failure_reason: Some(error),
            };
        }
    };

    let executable_path = resolve_command_path(&safe_command);
    let version = command_output(&safe_command, &["--version"], 5000);
    let help = command_output(&safe_command, &["--help"], 5000);
    let help_text = help.as_ref().ok().map(|value| value.to_lowercase()).unwrap_or_default();
    let command_name = Path::new(&safe_command)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or(&safe_command)
        .to_lowercase();

    let (stream_support, schema_support, sandbox_policy, tool_policy) = if command_name.contains("claude") {
        (
            if help_text.contains("stream-json") { "stream-json" } else { "prompt-contract" },
            "prompt-contract-only",
            "artifact-only isolated run dir",
            "Read/Grep/Glob allowlist; write tools denied",
        )
    } else if command_name.contains("codex") {
        (
            if help_text.contains("--json") { "json-events" } else { "stdout-preview" },
            if help_text.contains("output-schema") { "output-schema" } else { "prompt-contract" },
            if help_text.contains("sandbox") { "read-only sandbox" } else { "artifact-only isolated run dir" },
            "no workspace-write; artifact-only",
        )
    } else if command_name.contains("opencode") {
        ("probe-only", "probe-only", "probe-only", "probe-only")
    } else {
        ("unknown", "unknown", "unknown", "unknown")
    };

    CliProbeResult {
        command: safe_command,
        available: version.is_ok(),
        executable_path,
        version: version.ok(),
        help_probe: if help.is_ok() { "PASSED".to_string() } else { "FAILED".to_string() },
        auth_probe_status: "NOT_CHECKED_NON_INVASIVE".to_string(),
        stream_support: stream_support.to_string(),
        schema_support: schema_support.to_string(),
        sandbox_policy: sandbox_policy.to_string(),
        tool_policy: tool_policy.to_string(),
        failure_reason: help.err(),
    }
}

#[tauri::command]
fn send_system_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|error| format!("Failed to send notification: {error}"))
}

#[tauri::command]
fn start_agenthub_backend(
    state: State<ManagedProcesses>,
    java_command: String,
    jar_path: String,
    working_directory: String,
) -> Result<ManagedProcessInfo, String> {
    let java = sanitize_command(&java_command)?;
    let jar = PathBuf::from(jar_path);
    if !jar.is_file() {
        return Err("Backend jar path does not exist.".to_string());
    }
    let cwd = PathBuf::from(working_directory);
    if !cwd.is_dir() {
        return Err("Working directory does not exist.".to_string());
    }

    let recent_output = Arc::new(Mutex::new(VecDeque::with_capacity(40)));
    let log_path = std::env::temp_dir().join(format!("agenthub-backend-{}.log", now_label()));
    let mut child = command_for(&java)
        .arg("-jar")
        .arg(jar)
        .current_dir(cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start backend: {error}"))?;

    if let Some(stdout) = child.stdout.take() {
        let logs = Arc::clone(&recent_output);
        let path = log_path.clone();
        thread::spawn(move || collect_process_output("stdout", stdout, logs, path));
    }
    if let Some(stderr) = child.stderr.take() {
        let logs = Arc::clone(&recent_output);
        let path = log_path.clone();
        thread::spawn(move || collect_process_output("stderr", stderr, logs, path));
    }

    let pid = child.id();
    let label = "AgentHub backend".to_string();
    let started_at = now_label();
    let info = ManagedProcessInfo {
        pid,
        label: label.clone(),
        started_at: started_at.clone(),
        running: true,
        log_path: Some(log_path.to_string_lossy().to_string()),
        recent_output: recent_lines(&recent_output),
    };

    state
        .processes
        .lock()
        .map_err(|_| "Process registry is locked.".to_string())?
        .insert(pid, ManagedProcess {
            label,
            started_at,
            log_path: Some(log_path.to_string_lossy().to_string()),
            recent_output,
            child,
        });

    Ok(info)
}

fn collect_process_output<R: Read + Send + 'static>(
    stream_name: &'static str,
    stream: R,
    logs: Arc<Mutex<VecDeque<String>>>,
    log_path: PathBuf,
) {
    let reader = BufReader::new(stream);
    for line in reader.lines().map_while(Result::ok) {
        let entry = format!("{stream_name}: {}", line.chars().take(600).collect::<String>());
        if let Ok(mut value) = logs.lock() {
            if value.len() >= 40 {
                value.pop_front();
            }
            value.push_back(entry.clone());
        }
        let _ = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .and_then(|mut file| {
                use std::io::Write;
                writeln!(file, "{entry}")
            });
    }
}

#[tauri::command]
fn stop_managed_process(state: State<ManagedProcesses>, pid: u32) -> Result<(), String> {
    let mut processes = state
        .processes
        .lock()
        .map_err(|_| "Process registry is locked.".to_string())?;
    let mut managed = processes.remove(&pid).ok_or_else(|| "Process is not managed by AgentHub desktop.".to_string())?;
    managed.child.kill().map_err(|error| format!("Failed to stop process: {error}"))?;
    Ok(())
}

#[tauri::command]
fn list_managed_processes(state: State<ManagedProcesses>) -> Result<Vec<ManagedProcessInfo>, String> {
    let mut processes = state
        .processes
        .lock()
        .map_err(|_| "Process registry is locked.".to_string())?;
    let mut result = Vec::new();

    for (pid, managed) in processes.iter_mut() {
        let running = managed.child.try_wait().map_err(|error| format!("Failed to inspect process: {error}"))?.is_none();
        result.push(ManagedProcessInfo {
            pid: *pid,
            label: managed.label.clone(),
            started_at: managed.started_at.clone(),
            running,
            log_path: managed.log_path.clone(),
            recent_output: recent_lines(&managed.recent_output),
        });
    }

    Ok(result)
}

fn main() {
    tauri::Builder::default()
        .manage(ManagedProcesses::default())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            desktop_environment,
            list_directory,
            read_text_preview,
            probe_agent_cli,
            send_system_notification,
            start_agenthub_backend,
            stop_managed_process,
            list_managed_processes
        ])
        .run(tauri::generate_context!())
        .expect("error while running AgentHub desktop");
}
