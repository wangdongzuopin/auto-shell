use tauri::ipc::Channel;
use tauri::State;
use crate::terminal::TerminalEvent;
use crate::AppState;

#[tauri::command]
pub async fn terminal_spawn(
    channel: Channel<TerminalEvent>,
    state: State<'_, AppState>,
    cwd: Option<String>,
    shell: Option<String>,
) -> Result<String, String> {
    let shell = shell.unwrap_or_else(default_shell);
    let session_id = state
        .terminal_manager
        .spawn(&shell, cwd.as_deref(), 80, 24, channel)
        .await?;
    Ok(session_id)
}

#[tauri::command]
pub async fn terminal_write(
    state: State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state
        .terminal_manager
        .write(&session_id, data.into_bytes())
        .await
}

#[tauri::command]
pub async fn terminal_resize(
    state: State<'_, AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.terminal_manager.resize(&session_id, cols, rows).await
}

#[tauri::command]
pub async fn terminal_kill(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    state.terminal_manager.kill(&session_id).await
}

fn default_shell() -> String {
    #[cfg(target_os = "windows")]
    {
        "cmd.exe".to_string()
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
    }
}
