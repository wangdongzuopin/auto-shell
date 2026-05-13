use crate::AppState;

#[derive(Debug, serde::Serialize)]
pub struct ToolResult {
    pub success: bool,
    pub content: String,
}

pub async fn execute_tool(
    name: &str,
    arguments: serde_json::Value,
    state: &AppState,
    conversation_id: Option<String>,
) -> ToolResult {
    // Route MCP tools: names are "mcp:{server_id}:{tool_name}"
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
