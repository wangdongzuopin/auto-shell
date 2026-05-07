use crate::AppState;

#[derive(Debug, serde::Serialize)]
pub struct ToolResult {
    pub success: bool,
    pub content: String,
}

pub async fn execute_tool(name: &str, arguments: serde_json::Value, state: &AppState) -> ToolResult {
    match name {
        "read_file" => super::tool_handlers::read_file::handle(arguments).await,
        "write_file" => super::tool_handlers::write_file::handle(arguments).await,
        "list_directory" => super::tool_handlers::list_directory::handle(arguments).await,
        "search_code" => super::tool_handlers::search_code::handle(arguments, state).await,
        "search_knowledge" => super::tool_handlers::search_knowledge::handle(arguments, state).await,
        "get_knowledge" => super::tool_handlers::manage_knowledge::handle_get(arguments, state).await,
        "create_knowledge" => super::tool_handlers::manage_knowledge::handle_create(arguments, state).await,
        "list_skills" => super::tool_handlers::manage_skills::handle_list(arguments, state).await,
        _ => ToolResult {
            success: false,
            content: format!("Unknown tool: {}", name),
        },
    }
}
