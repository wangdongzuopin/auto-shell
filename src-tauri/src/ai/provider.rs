use async_trait::async_trait;
use crate::tools::definitions::ToolDefinition;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type", content = "data")]
pub enum StreamEvent {
    TextDelta(String),
    ToolCallStarted { id: String, name: String, arguments: String },
    ToolCallCompleted { id: String, result: String, success: bool },
    Error(String),
    Done,
}

#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn chat_stream(
        &self,
        messages: &[ChatMessage],
        tools: &[ToolDefinition],
        on_event: &(dyn Fn(StreamEvent) + Send + Sync),
    ) -> Result<(), String>;
}
