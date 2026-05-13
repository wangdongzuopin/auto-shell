use std::collections::HashMap;
use std::sync::Arc;
use sqlx::SqlitePool;
use tokio::sync::RwLock;

use super::client::McpClient;
use super::types::*;
use crate::db::settings_repo;

const MCP_CONFIGS_KEY: &str = "mcp_servers";

#[derive(Clone)]
pub struct McpManager {
    inner: Arc<McpManagerInner>,
}

struct McpManagerInner {
    clients: RwLock<HashMap<String, Arc<McpClient>>>,
    tools_cache: RwLock<HashMap<String, Vec<McpTool>>>,
    configs: RwLock<Vec<McpServerConfig>>,
}

impl McpManager {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(McpManagerInner {
                clients: RwLock::new(HashMap::new()),
                tools_cache: RwLock::new(HashMap::new()),
                configs: RwLock::new(Vec::new()),
            }),
        }
    }

    pub async fn reconnect_all(&self, pool: &SqlitePool) -> Result<Vec<McpServerInfo>, String> {
        let configs = load_configs(pool).await.unwrap_or_default();
        self.inner.configs.write().await.clone_from(&configs);

        let mut infos = Vec::new();
        for config in &configs {
            if !config.enabled {
                infos.push(McpServerInfo {
                    config: config.clone(),
                    status: McpServerStatus::Disconnected,
                    tools: vec![],
                    error_message: None,
                });
                continue;
            }
            let info = self.start_server_inner(config.clone()).await;
            infos.push(info);
        }
        Ok(infos)
    }

    pub async fn start_server(&self, config: McpServerConfig) -> McpServerInfo {
        // Save config
        let mut configs = self.inner.configs.read().await.clone();
        if let Some(pos) = configs.iter().position(|c| c.id == config.id) {
            configs[pos] = config.clone();
        } else {
            configs.push(config.clone());
        }
        *self.inner.configs.write().await = configs;
        self.start_server_inner(config).await
    }

    async fn start_server_inner(&self, config: McpServerConfig) -> McpServerInfo {
        let client = Arc::new(McpClient::new(config.clone()));

        if let Err(e) = client.start().await {
            return McpServerInfo {
                config,
                status: McpServerStatus::Error,
                tools: vec![],
                error_message: Some(e),
            };
        }

        if let Err(e) = client.initialize().await {
            client.stop().await;
            return McpServerInfo {
                config,
                status: McpServerStatus::Error,
                tools: vec![],
                error_message: Some(format!("init failed: {}", e)),
            };
        }

        let mut tools = match client.list_tools().await {
            Ok(t) => t,
            Err(e) => {
                client.stop().await;
                return McpServerInfo {
                    config,
                    status: McpServerStatus::Error,
                    tools: vec![],
                    error_message: Some(format!("tools/list: {}", e)),
                };
            }
        };

        // Prefix tool names
        for tool in &mut tools {
            tool.name = format!("mcp:{}:{}", config.id, tool.name);
        }

        let info = McpServerInfo {
            config: config.clone(),
            status: McpServerStatus::Connected,
            tools: tools.clone(),
            error_message: None,
        };

        self.inner.clients
            .write()
            .await
            .insert(config.id.clone(), client);
        self.inner.tools_cache
            .write()
            .await
            .insert(config.id.clone(), tools);

        info
    }

    pub async fn stop_server(&self, server_id: &str) -> Result<(), String> {
        if let Some(client) = self.inner.clients.write().await.remove(server_id) {
            client.stop().await;
        }
        self.inner.tools_cache.write().await.remove(server_id);

        // Mark as disabled in configs
        let mut configs = self.inner.configs.write().await;
        if let Some(c) = configs.iter_mut().find(|c| c.id == server_id) {
            c.enabled = false;
        }

        Ok(())
    }

    pub async fn remove_server(&self, server_id: &str) -> Result<(), String> {
        self.stop_server(server_id).await?;
        self.inner.configs.write().await.retain(|c| c.id != server_id);
        Ok(())
    }

    pub async fn get_all_tools(&self) -> Vec<McpTool> {
        self.inner.tools_cache
            .read()
            .await
            .values()
            .flat_map(|t| t.clone())
            .collect()
    }

    pub async fn call_tool(
        &self,
        full_name: &str,
        args: serde_json::Value,
    ) -> Option<(bool, String)> {
        let parts: Vec<&str> = full_name.splitn(3, ':').collect();
        if parts.len() != 3 || parts[0] != "mcp" {
            return None;
        }
        let server_id = parts[1];
        let original_name = parts[2];

        let clients = self.inner.clients.read().await;
        let client = clients.get(server_id)?;
        match client.call_tool(original_name, args).await {
            Ok(result) => Some(result),
            Err(e) => Some((false, e)),
        }
    }

    pub async fn get_all_server_info(&self) -> Vec<McpServerInfo> {
        let configs = self.inner.configs.read().await;
        let clients = self.inner.clients.read().await;
        let tools_cache = self.inner.tools_cache.read().await;

        configs
            .iter()
            .map(|c| {
                let status = if clients.contains_key(&c.id) {
                    McpServerStatus::Connected
                } else if c.enabled {
                    McpServerStatus::Disconnected
                } else {
                    McpServerStatus::Disconnected
                };
                let tools = tools_cache.get(&c.id).cloned().unwrap_or_default();
                McpServerInfo {
                    config: c.clone(),
                    status,
                    tools,
                    error_message: None,
                }
            })
            .collect()
    }

    pub async fn persist_configs(&self, pool: &SqlitePool) -> Result<(), String> {
        let configs = self.inner.configs.read().await.clone();
        let json = serde_json::to_string(&configs).map_err(|e| format!("serialize: {}", e))?;
        settings_repo::set(pool, MCP_CONFIGS_KEY, &json)
            .await
            .map_err(|e| e.to_string())
    }
}

async fn load_configs(pool: &SqlitePool) -> Result<Vec<McpServerConfig>, String> {
    let raw = settings_repo::get(pool, MCP_CONFIGS_KEY)
        .await
        .map_err(|e| e.to_string())?;
    match raw {
        Some(json) => {
            serde_json::from_str(&json).map_err(|e| format!("parse mcp configs: {}", e))
        }
        None => Ok(vec![]),
    }
}
