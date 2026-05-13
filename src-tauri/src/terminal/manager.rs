use std::collections::HashMap;
use std::sync::Arc;
use tauri::ipc::Channel;
use tokio::sync::Mutex;

use super::session::TerminalSession;
use super::TerminalEvent;

#[derive(Clone)]
pub struct TerminalManager {
    sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn spawn(
        &self,
        shell: &str,
        cwd: Option<&str>,
        cols: u16,
        rows: u16,
        channel: Channel<TerminalEvent>,
    ) -> Result<String, String> {
        let session = TerminalSession::spawn(shell, cwd, cols, rows, channel).await?;
        let id = uuid::Uuid::new_v4().to_string();
        self.sessions.lock().await.insert(id.clone(), session);
        Ok(id)
    }

    pub async fn write(&self, session_id: &str, data: Vec<u8>) -> Result<(), String> {
        let sessions = self.sessions.lock().await;
        let session = sessions
            .get(session_id)
            .ok_or_else(|| format!("terminal session not found: {}", session_id))?;
        session
            .input_tx
            .send(data)
            .map_err(|e| format!("send to stdin: {}", e))
    }

    pub async fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let mut sessions = self.sessions.lock().await;
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("terminal session not found: {}", session_id))?;
        session.cols = cols;
        session.rows = rows;
        Ok(())
    }

    pub async fn kill(&self, session_id: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().await;
        let session = sessions
            .get(session_id)
            .ok_or_else(|| format!("terminal session not found: {}", session_id))?;
        session
            .child
            .lock()
            .await
            .start_kill()
            .map_err(|e| format!("kill: {}", e))?;
        Ok(())
    }
}
