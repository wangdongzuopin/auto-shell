use std::sync::Arc;
use tauri::ipc::Channel;
use tokio::io::AsyncReadExt;
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, Mutex};

use super::TerminalEvent;

pub struct TerminalSession {
    pub input_tx: mpsc::UnboundedSender<Vec<u8>>,
    pub child: Arc<Mutex<Child>>,
    pub cols: u16,
    pub rows: u16,
}

impl TerminalSession {
    pub async fn spawn(
        shell: &str,
        cwd: Option<&str>,
        cols: u16,
        rows: u16,
        channel: Channel<TerminalEvent>,
    ) -> Result<Self, String> {
        let mut cmd = Command::new(shell);
        cmd.stdin(std::process::Stdio::piped());
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());
        if let Some(dir) = cwd {
            cmd.current_dir(dir);
        }

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        let child_stdin = child.stdin.take().ok_or("no stdin")?;
        let mut child_stdout = child.stdout.take().ok_or("no stdout")?;
        let mut child_stderr = child.stderr.take().ok_or("no stderr")?;

        let (input_tx, mut input_rx) = mpsc::unbounded_channel::<Vec<u8>>();

        // stdin writer task
        tokio::spawn(async move {
            let mut stdin_writer = child_stdin;
            use tokio::io::AsyncWriteExt;
            while let Some(data) = input_rx.recv().await {
                if stdin_writer.write_all(&data).await.is_err() {
                    break;
                }
            }
        });

        // stdout reader task
        let ch_out = channel.clone();
        tokio::spawn(async move {
            let mut buf = [0u8; 4096];
            loop {
                match child_stdout.read(&mut buf).await {
                    Ok(0) => break,
                    Ok(n) => {
                        let s = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = ch_out.send(TerminalEvent::Output(s));
                    }
                    Err(_) => break,
                }
            }
        });

        // stderr reader task
        let ch_err = channel.clone();
        tokio::spawn(async move {
            let mut buf = [0u8; 4096];
            loop {
                match child_stderr.read(&mut buf).await {
                    Ok(0) => break,
                    Ok(n) => {
                        let s = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = ch_err.send(TerminalEvent::Output(s));
                    }
                    Err(_) => break,
                }
            }
        });

        // Exit watcher task
        let child_arc = Arc::new(Mutex::new(child));
        let child_for_wait = child_arc.clone();
        let ch_exit = channel.clone();
        tokio::spawn(async move {
            let status = child_for_wait.lock().await.wait().await;
            let code = match status {
                Ok(s) => s.code().unwrap_or(-1),
                Err(_) => -1,
            };
            let _ = ch_exit.send(TerminalEvent::Exit(code));
        });

        Ok(TerminalSession {
            input_tx,
            child: child_arc,
            cols,
            rows,
        })
    }
}
