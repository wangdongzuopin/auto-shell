pub mod session;
pub mod manager;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum TerminalEvent {
    Output(String),
    Exit(i32),
}
