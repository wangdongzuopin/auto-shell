use serde_json::Value;
use crate::tools::executor::ToolResult;

pub async fn handle(args: Value) -> ToolResult {
    let path = args["path"].as_str().unwrap_or("");
    let content = args["content"].as_str().unwrap_or("");
    if let Some(parent) = std::path::Path::new(path).parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    match tokio::fs::write(path, content).await {
        Ok(_) => ToolResult { success: true, content: format!("File written: {}", path) },
        Err(e) => ToolResult { success: false, content: e.to_string() },
    }
}
