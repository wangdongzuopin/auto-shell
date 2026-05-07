use serde_json::Value;
use crate::tools::executor::ToolResult;

pub async fn handle(args: Value) -> ToolResult {
    let path = args["path"].as_str().unwrap_or("");
    match tokio::fs::read_to_string(path).await {
        Ok(content) => ToolResult { success: true, content },
        Err(e) => ToolResult { success: false, content: e.to_string() },
    }
}
