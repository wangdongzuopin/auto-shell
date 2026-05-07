use serde_json::Value;
use crate::AppState;
use crate::tools::executor::ToolResult;
use crate::db::skill_repo;

pub async fn handle_list(_args: Value, state: &AppState) -> ToolResult {
    match skill_repo::list_enabled(&state.pool).await {
        Ok(skills) => ToolResult { success: true, content: serde_json::to_string(&skills).unwrap_or_default() },
        Err(e) => ToolResult { success: false, content: e.to_string() },
    }
}
