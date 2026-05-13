use sqlx::SqlitePool;
use crate::mcp::manager::McpManager;
use crate::terminal::manager::TerminalManager;

pub struct AppState {
    pub pool: SqlitePool,
    pub encryption_key: [u8; 32],
    pub mcp_manager: McpManager,
    pub terminal_manager: TerminalManager,
}

impl AppState {
    pub fn new(pool: SqlitePool, encryption_key: [u8; 32]) -> Self {
        Self {
            pool,
            encryption_key,
            mcp_manager: McpManager::new(),
            terminal_manager: TerminalManager::new(),
        }
    }
}
