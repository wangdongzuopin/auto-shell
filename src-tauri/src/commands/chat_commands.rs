use tauri::State;
use crate::AppState;
use crate::error::AppError;
use crate::models::{Conversation, Message, CreateConversationPayload, AddMessagePayload};
use crate::db::chat_repo;

#[tauri::command]
pub async fn list_conversations(state: State<'_, AppState>, project_id: String) -> Result<Vec<Conversation>, AppError> {
    chat_repo::list_conversations(&state.pool, &project_id).await
}

#[tauri::command]
pub async fn create_conversation(state: State<'_, AppState>, payload: CreateConversationPayload) -> Result<Conversation, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let title = payload.title.unwrap_or_else(|| format!("对话 {}", chrono::Local::now().format("%m/%d %H:%M")));
    chat_repo::create_conversation(&state.pool, &id, &payload.project_id, &title, &payload.mode).await
}

#[tauri::command]
pub async fn delete_conversation(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    chat_repo::delete_conversation(&state.pool, &id).await
}

#[tauri::command]
pub async fn list_messages(state: State<'_, AppState>, conversation_id: String) -> Result<Vec<Message>, AppError> {
    chat_repo::list_messages(&state.pool, &conversation_id).await
}

#[tauri::command]
pub async fn add_message(state: State<'_, AppState>, payload: AddMessagePayload) -> Result<Message, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    chat_repo::add_message(&state.pool, &id, &payload.conversation_id, &payload.role, &payload.content, payload.metadata.as_deref()).await
}
