use crate::ai::provider::{AiProvider, ChatMessage, StreamEvent, ToolCall};
use crate::tools::definitions::ToolDefinition;
use crate::tools::executor;
use crate::AppState;
use tauri::ipc;

pub async fn run_tool_loop(
    provider: &dyn AiProvider,
    messages: &[ChatMessage],
    tools: &[ToolDefinition],
    state: &AppState,
    channel: &ipc::Channel<StreamEvent>,
    max_iterations: usize,
) -> Result<(), String> {
    // TODO: Implement tool calling loop with streaming
    // For now, just stream without tool calling
    provider.chat_stream(messages, tools, &|event| {
        let _ = channel.send(event);
    }).await
}
