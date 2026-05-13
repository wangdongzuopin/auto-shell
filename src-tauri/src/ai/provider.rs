use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum StreamEvent {
    TextDelta(String),
    ToolCallStarted {
        id: String,
        name: String,
        arguments: String,
    },
    ToolCallCompleted {
        id: String,
        name: String,
        result: String,
        success: bool,
    },
    ConversationCompressed {
        summary: String,
        dropped_count: usize,
    },
    #[allow(dead_code)]
    Error(String),
    Done,
}
