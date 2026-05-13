use serde_json::Value;
use crate::db::checkpoint_repo;
use crate::tools::executor::ToolResult;
use crate::AppState;

pub async fn handle(args: Value, state: &AppState, conversation_id: Option<String>) -> ToolResult {
    let path = args["path"].as_str().unwrap_or("");
    let content = args["content"].as_str().unwrap_or("");

    if path.is_empty() {
        return ToolResult { success: false, content: "path is required".into() };
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
        Ok(_) => ToolResult { success: true, content: format!("File written: {}", path) },
        Err(e) => ToolResult { success: false, content: e.to_string() },
    }
}
