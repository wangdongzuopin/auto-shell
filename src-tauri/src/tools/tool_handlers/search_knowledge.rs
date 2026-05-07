use serde_json::Value;
use crate::AppState;
use crate::tools::executor::ToolResult;
use crate::db::knowledge_repo;

pub async fn handle(args: Value, state: &AppState) -> ToolResult {
    let query = args["query"].as_str().unwrap_or("");
    match knowledge_repo::search(&state.pool, query).await {
        Ok(results) => ToolResult { success: true, content: serde_json::to_string(&results).unwrap_or_default() },
        Err(e) => ToolResult { success: false, content: e.to_string() },
    }
}
