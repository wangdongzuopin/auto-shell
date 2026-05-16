use crate::AppState;

#[derive(Debug, serde::Serialize)]
pub struct ToolResult {
    pub success: bool,
    pub content: String,
}

impl ToolResult {
    /// Create a success result.
    pub fn ok(content: String) -> Self {
        ToolResult { success: true, content }
    }

    /// Create an error with a hint to help the AI self-correct.
    pub fn error(message: impl Into<String>, hint: impl Into<String>) -> Self {
        let msg = message.into();
        let h = hint.into();
        let content = if h.is_empty() {
            format!("❌ Error: {msg}")
        } else {
            format!("❌ Error: {msg}\n💡 Hint: {h}")
        };
        ToolResult { success: false, content }
    }

    /// Check if this error is retryable (transient I/O, network, etc.).
    pub fn is_retryable(&self) -> bool {
        if self.success { return false; }
        let lower = self.content.to_lowercase();
        lower.contains("timeout")
            || lower.contains("connection refused")
            || lower.contains("temporarily unavailable")
            || lower.contains("resource busy")
            || lower.contains("interrupted")
            || lower.contains("deadlock")
    }
}

/// Max retries for transient tool failures.
const MAX_RETRIES: u32 = 2;

pub async fn execute_tool(
    name: &str,
    arguments: serde_json::Value,
    state: &AppState,
    conversation_id: Option<String>,
) -> ToolResult {
    let mut last_result: Option<ToolResult> = None;

    for attempt in 0..=MAX_RETRIES {
        if attempt > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(300 * attempt as u64)).await;
        }

        let result = execute_tool_once(name, arguments.clone(), state, conversation_id.clone()).await;
        if result.success || !result.is_retryable() {
            return result;
        }
        last_result = Some(result);
    }

    // All retries exhausted — return last error with retry note
    let mut r = last_result.unwrap();
    r.content = format!("{}. (重试 {} 次后仍然失败)", r.content, MAX_RETRIES);
    r
}

async fn execute_tool_once(
    name: &str,
    arguments: serde_json::Value,
    state: &AppState,
    conversation_id: Option<String>,
) -> ToolResult {
    if name.starts_with("mcp:") {
        match state.mcp_manager.call_tool(name, arguments).await {
            Some((success, content)) => return ToolResult { success, content },
            None => return ToolResult {
                success: false,
                content: format!("MCP server not found for tool: {}", name),
            },
        }
    }

    match name {
        "read_file" => super::tool_handlers::read_file::handle(arguments).await,
        "write_file" => super::tool_handlers::write_file::handle(arguments, state, conversation_id).await,
        "list_directory" => super::tool_handlers::list_directory::handle(arguments).await,
        "search_code" => super::tool_handlers::search_code::handle(arguments, state).await,
        "search_knowledge" => super::tool_handlers::search_knowledge::handle(arguments, state).await,
        "get_knowledge" => super::tool_handlers::manage_knowledge::handle_get(arguments, state).await,
        "create_knowledge" => super::tool_handlers::manage_knowledge::handle_create(arguments, state).await,
        "list_skills" => super::tool_handlers::manage_skills::handle_list(arguments, state).await,
        "run_command" => super::tool_handlers::run_command::handle(arguments).await,
        "git_status" => super::tool_handlers::git::handle_git_status(arguments).await,
        "git_diff" => super::tool_handlers::git::handle_git_diff(arguments).await,
        "undo_last_edit" => super::tool_handlers::undo::handle(arguments, state).await,
        _ => ToolResult {
            success: false,
            content: format!("Unknown tool: {}", name),
        },
    }
}
