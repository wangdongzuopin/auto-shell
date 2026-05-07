use crate::ai::provider::StreamEvent;
use tauri::ipc;

pub async fn send_event(channel: &ipc::Channel<StreamEvent>, event: StreamEvent) -> Result<(), String> {
    channel.send(event).map_err(|e| e.to_string())
}
