use serde_json::Value;
use crate::tools::executor::ToolResult;

pub async fn handle(args: Value) -> ToolResult {
    let path = args["path"].as_str().unwrap_or("");
    match tokio::fs::read_to_string(path).await {
        Ok(content) => ToolResult::ok(content),
        Err(e) => {
            let msg = e.to_string();
            let hint = if msg.contains("os code 2") || msg.contains("找不到") || msg.contains("No such file") {
                "File path may be incorrect. Check spelling, or use list_directory to verify the file exists."
            } else if msg.contains("permission") || msg.contains("denied") || msg.contains("拒绝") {
                "Permission denied. Check file access permissions."
            } else {
                ""
            };
            ToolResult::error(msg, hint)
        }
    }
}
