use serde_json::Value;
use crate::AppState;
use crate::tools::executor::ToolResult;
use crate::db::search_repo;

pub async fn handle(args: Value, state: &AppState) -> ToolResult {
    let query = args["query"].as_str().unwrap_or("");
    match search_repo::search_files(&state.pool, query, None).await {
        Ok(results) => ToolResult { success: true, content: serde_json::to_string(&results).unwrap_or_default() },
        Err(e) => ToolResult { success: false, content: e.to_string() },
    }
}
