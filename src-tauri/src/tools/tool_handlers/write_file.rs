use serde_json::Value;
use crate::db::checkpoint_repo;
use crate::tools::executor::ToolResult;
use crate::AppState;

pub async fn handle(args: Value, state: &AppState, conversation_id: Option<String>) -> ToolResult {
    let path = args["path"].as_str().unwrap_or("");
    let content = args["content"].as_str().unwrap_or("");

    if path.is_empty() {
        return ToolResult::error("path is required", "Provide a valid file path to write to.");
    }

    // Save checkpoint: read old content before overwriting
    if let Some(ref conv_id) = conversation_id {
        if let Ok(old) = tokio::fs::read_to_string(path).await {
            if old != content {
                let _ = checkpoint_repo::save_checkpoint(&state.pool, path, conv_id, &old).await;
            }
        }
    }

    if let Some(parent) = std::path::Path::new(path).parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    match tokio::fs::write(path, content).await {
        Ok(_) => ToolResult::ok(format!("File written: {}", path)),
        Err(e) => {
            let msg = e.to_string();
            let hint = if msg.contains("permission") || msg.contains("denied") {
                "Permission denied. Check directory write permissions."
            } else if msg.contains("read-only") || msg.contains("只读") {
                "File is read-only. Change permissions or pick a different path."
            } else {
                ""
            };
            ToolResult::error(msg, hint)
        }
    }
}
