use tauri::State;
use crate::state::AppState;
use crate::mcp::types::*;

/// Load persisted MCP configs from DB, return merged with running servers
#[tauri::command]
pub async fn list_mcp_servers(state: State<'_, AppState>) -> Result<Vec<McpServerInfo>, String> {
    Ok(state.mcp_manager.get_all_server_info().await)
}

/// Add and optionally start a new MCP server
#[tauri::command]
pub async fn add_mcp_server(
    state: State<'_, AppState>,
    config: McpServerConfig,
) -> Result<McpServerInfo, String> {
    let mut config = config;
    if config.id.is_empty() {
        config.id = uuid::Uuid::new_v4().to_string();
    }

    let info = state.mcp_manager.start_server(config).await;
    let _ = state.mcp_manager.persist_configs(&state.pool).await;
    Ok(info)
}

/// Stop and remove an MCP server
#[tauri::command]
pub async fn remove_mcp_server(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<(), String> {
    state.mcp_manager.remove_server(&server_id).await?;
    state.mcp_manager.persist_configs(&state.pool).await?;
    Ok(())
}

/// Start a previously configured server
#[tauri::command]
pub async fn start_mcp_server(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<McpServerInfo, String> {
    // Get config from stored configs
    let configs = state.mcp_manager.get_all_server_info().await;
    let config = configs
        .into_iter()
        .find(|i| i.config.id == server_id)
        .map(|i| {
            let mut c = i.config;
            c.enabled = true;
            c
        })
        .ok_or_else(|| format!("Server not found: {}", server_id))?;

    let info = state.mcp_manager.start_server(config).await;
    let _ = state.mcp_manager.persist_configs(&state.pool).await;
    Ok(info)
}

/// Stop a running server (but keep config)
#[tauri::command]
pub async fn stop_mcp_server(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<(), String> {
    state.mcp_manager.stop_server(&server_id).await?;
    state.mcp_manager.persist_configs(&state.pool).await?;
    Ok(())
}

/// Get all discovered tools from connected servers
#[tauri::command]
pub async fn get_mcp_tools(state: State<'_, AppState>) -> Result<Vec<McpTool>, String> {
    Ok(state.mcp_manager.get_all_tools().await)
}

/// Reconnect to all enabled servers (called at app startup)
#[tauri::command]
pub async fn reconnect_mcp_servers(
    state: State<'_, AppState>,
) -> Result<Vec<McpServerInfo>, String> {
    state.mcp_manager.reconnect_all(&state.pool).await
}
