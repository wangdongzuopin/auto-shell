use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{oneshot, Mutex};

use super::types::*;

pub struct McpClient {
    config: McpServerConfig,
    child: Mutex<Option<Child>>,
    request_id: Mutex<u64>,
    pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Result<serde_json::Value, String>>>>>,
}

impl McpClient {
    pub fn new(config: McpServerConfig) -> Self {
        Self {
            config,
            child: Mutex::new(None),
            request_id: Mutex::new(1),
            pending: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start(&self) -> Result<(), String> {
        let mut child = Command::new(&self.config.command)
            .args(&self.config.args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| format!("spawn '{}': {}", self.config.command, e))?;

        let stdout = child.stdout.take().ok_or("no stdout")?;

        // Reset pending map and get a clone for the reader task
        *self.pending.lock().await = HashMap::new();
        let pending_clone = self.pending.clone();

        // Background reader task
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) => break,
                    Ok(_) => {
                        let trimmed = line.trim();
                        if trimmed.is_empty() {
                            continue;
                        }
                        if let Ok(resp) = serde_json::from_str::<JsonRpcResponse>(trimmed) {
                            if let Some(id) = resp.id {
                                let mut pend = pending_clone.lock().await;
                                if let Some(tx) = pend.remove(&id) {
                                    if let Some(err) = resp.error {
                                        let _ = tx.send(Err(err.message));
                                    } else {
                                        let _ = tx.send(Ok(resp.result.unwrap_or(serde_json::Value::Null)));
                                    }
                                }
                            }
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        *self.child.lock().await = Some(child);
        Ok(())
    }

    pub async fn initialize(&self) -> Result<serde_json::Value, String> {
        let params = serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": { "name": "pizz", "version": "0.1.0" }
        });
        let result = self.send_request("initialize", Some(params)).await?;
        self.send_notification("notifications/initialized", None)
            .await?;
        Ok(result)
    }

    pub async fn list_tools(&self) -> Result<Vec<McpTool>, String> {
        let result = self
            .send_request("tools/list", Some(serde_json::json!({})))
            .await?;
        let tools: Vec<McpTool> = serde_json::from_value(
            result
                .get("tools")
                .cloned()
                .unwrap_or(serde_json::json!([])),
        )
        .map_err(|e| format!("parse tools/list: {}", e))?;
        Ok(tools)
    }

    pub async fn call_tool(
        &self,
        original_name: &str,
        args: serde_json::Value,
    ) -> Result<(bool, String), String> {
        let params = serde_json::json!({ "name": original_name, "arguments": args });
        let result = self.send_request("tools/call", Some(params)).await?;

        let content = extract_text_content(&result);
        Ok((true, content))
    }

    pub async fn stop(&self) {
        let mut guard = self.child.lock().await;
        if let Some(mut child) = guard.take() {
            let _ = child.kill().await;
        }
    }

    async fn send_request(
        &self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, String> {
        let id = {
            let mut g = self.request_id.lock().await;
            let current = *g;
            *g += 1;
            current
        };

        let req = JsonRpcRequest {
            jsonrpc: "2.0".into(),
            id,
            method: method.into(),
            params,
        };
        let json = serde_json::to_string(&req).map_err(|e| format!("serialize: {}", e))?;

        let (tx, rx) = oneshot::channel();
        self.pending.lock().await.insert(id, tx);

        {
            let mut guard = self.child.lock().await;
            let child = guard.as_mut().ok_or("server not started")?;
            let stdin = child.stdin.as_mut().ok_or("no stdin")?;
            stdin
                .write_all(json.as_bytes())
                .await
                .map_err(|e| format!("write: {}", e))?;
            stdin
                .write_all(b"\n")
                .await
                .map_err(|e| format!("write: {}", e))?;
        }

        match tokio::time::timeout(std::time::Duration::from_secs(30), rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => Err("request cancelled".into()),
            Err(_) => Err(format!("{} timed out", method)),
        }
    }

    async fn send_notification(
        &self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> Result<(), String> {
        let json = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        });
        let s = serde_json::to_string(&json).map_err(|e| format!("serialize: {}", e))?;
        let mut guard = self.child.lock().await;
        let child = guard.as_mut().ok_or("server not started")?;
        let stdin = child.stdin.as_mut().ok_or("no stdin")?;
        stdin
            .write_all(s.as_bytes())
            .await
            .map_err(|e| format!("write: {}", e))?;
        stdin
            .write_all(b"\n")
            .await
            .map_err(|e| format!("write: {}", e))?;
        Ok(())
    }
}

fn extract_text_content(result: &serde_json::Value) -> String {
    if let Some(arr) = result["content"].as_array() {
        return arr
            .iter()
            .filter_map(|c| c["text"].as_str().map(|s| s.to_string()))
            .collect::<Vec<_>>()
            .join("\n");
    }
    if let Some(s) = result["content"].as_str() {
        return s.to_string();
    }
    result.to_string()
}
