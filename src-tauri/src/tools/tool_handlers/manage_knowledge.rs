use serde_json::Value;
use crate::AppState;
use crate::tools::executor::ToolResult;
use crate::db::knowledge_repo;

pub async fn handle_get(args: Value, state: &AppState) -> ToolResult {
    let id = args["id"].as_str().unwrap_or("");
    match knowledge_repo::get_by_id(&state.pool, id).await {
        Ok(entry) => ToolResult { success: true, content: serde_json::to_string(&entry).unwrap_or_default() },
        Err(e) => ToolResult { success: false, content: e.to_string() },
    }
}

pub async fn handle_create(args: Value, state: &AppState) -> ToolResult {
    let id = uuid::Uuid::new_v4().to_string();
    let title = args["title"].as_str().unwrap_or("Untitled");
    let content = args["content"].as_str().unwrap_or("");
    let tags = serde_json::to_string(&args["tags"]).unwrap_or_else(|_| "[]".into());
    match knowledge_repo::insert(&state.pool, &id, title, content, &tags, "ai", None).await {
        Ok(entry) => ToolResult { success: true, content: serde_json::to_string(&entry).unwrap_or_default() },
        Err(e) => ToolResult { success: false, content: e.to_string() },
    }
}
