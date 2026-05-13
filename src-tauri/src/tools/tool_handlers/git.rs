use serde_json::Value;
use crate::tools::executor::ToolResult;

pub async fn handle_git_status(args: Value) -> ToolResult {
    let path = args["repo_path"].as_str().unwrap_or(".").to_string();
    match crate::git::get_status(&path) {
        Ok(status) => ToolResult {
            success: true,
            content: serde_json::to_string(&status).unwrap_or_default(),
        },
        Err(e) => ToolResult { success: false, content: e },
    }
}

pub async fn handle_git_diff(args: Value) -> ToolResult {
    let path = args["repo_path"].as_str().unwrap_or(".").to_string();
    let staged = args["staged"].as_bool().unwrap_or(false);
    match crate::git::get_diff(&path, staged) {
        Ok(diff) => ToolResult { success: true, content: diff },
        Err(e) => ToolResult { success: false, content: e },
    }
}
