use tauri::State;
use crate::AppState;
use crate::error::AppError;
use crate::models::knowledge::{KnowledgeEntry, CreateKnowledgePayload, UpdateKnowledgePayload};
use crate::db::knowledge_repo;

#[tauri::command]
pub async fn list_knowledge(state: State<'_, AppState>) -> Result<Vec<KnowledgeEntry>, AppError> {
    knowledge_repo::list_all(&state.pool).await
}

#[tauri::command]
pub async fn get_knowledge(state: State<'_, AppState>, id: String) -> Result<KnowledgeEntry, AppError> {
    knowledge_repo::get_by_id(&state.pool, &id).await
}

#[tauri::command]
pub async fn create_knowledge(state: State<'_, AppState>, payload: CreateKnowledgePayload) -> Result<KnowledgeEntry, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let tags = serde_json::to_string(&payload.tags).unwrap_or_default();
    knowledge_repo::insert(&state.pool, &id, &payload.title, &payload.content, &tags, &payload.source, payload.project_id.as_deref()).await
}

#[tauri::command]
pub async fn update_knowledge(state: State<'_, AppState>, payload: UpdateKnowledgePayload) -> Result<KnowledgeEntry, AppError> {
    let tags = payload.tags.map(|t| serde_json::to_string(&t).unwrap_or_default());
    knowledge_repo::update(&state.pool, &payload.id, payload.title.as_deref(), payload.content.as_deref(), tags.as_deref()).await
}

#[tauri::command]
pub async fn delete_knowledge(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    knowledge_repo::delete(&state.pool, &id).await
}

#[tauri::command]
pub async fn search_knowledge(state: State<'_, AppState>, query: String) -> Result<Vec<KnowledgeEntry>, AppError> {
    knowledge_repo::search(&state.pool, &query).await
}
