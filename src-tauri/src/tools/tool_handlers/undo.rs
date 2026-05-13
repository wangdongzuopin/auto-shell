use serde_json::Value;
use crate::db::checkpoint_repo;
use crate::tools::executor::ToolResult;
use crate::AppState;

pub async fn handle(args: Value, state: &AppState) -> ToolResult {
    let file_path = args["file_path"].as_str().unwrap_or("");
    let conversation_id = args["conversation_id"].as_str().unwrap_or("");

    if file_path.is_empty() || conversation_id.is_empty() {
        return ToolResult {
            success: false,
            content: "file_path and conversation_id are required".into(),
        };
    }

    match checkpoint_repo::get_latest_for_file(&state.pool, file_path, conversation_id).await {
        Ok(Some(cp)) => {
            match tokio::fs::write(&cp.file_path, &cp.old_content).await {
                Ok(_) => {
                    let _ = checkpoint_repo::delete_checkpoint(&state.pool, &cp.id).await;
                    ToolResult {
                        success: true,
                        content: format!("Undone: restored {} to previous state", file_path),
                    }
                }
                Err(e) => ToolResult {
                    success: false,
                    content: format!("Failed to restore file: {}", e),
                },
            }
        }
        Ok(None) => ToolResult {
            success: false,
            content: format!("No checkpoint found for {}", file_path),
        },
        Err(e) => ToolResult { success: false, content: e },
    }
}
