use tauri::State;
use crate::AppState;
use crate::error::AppError;
use crate::models::skill::{Skill, CreateSkillPayload, UpdateSkillPayload};
use crate::db::skill_repo;

#[tauri::command]
pub async fn list_skills(state: State<'_, AppState>) -> Result<Vec<Skill>, AppError> {
    skill_repo::list_all(&state.pool).await
}

#[tauri::command]
pub async fn list_enabled_skills(state: State<'_, AppState>) -> Result<Vec<Skill>, AppError> {
    skill_repo::list_enabled(&state.pool).await
}

#[tauri::command]
pub async fn get_skill(state: State<'_, AppState>, id: String) -> Result<Skill, AppError> {
    skill_repo::get_by_id(&state.pool, &id).await
}

#[tauri::command]
pub async fn create_skill(state: State<'_, AppState>, payload: CreateSkillPayload) -> Result<Skill, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    skill_repo::insert(&state.pool, &id, &payload.name, &payload.description, &payload.content, &payload.skill_type, &payload.category).await
}

#[tauri::command]
pub async fn update_skill(state: State<'_, AppState>, payload: UpdateSkillPayload) -> Result<Skill, AppError> {
    skill_repo::update(&state.pool, &payload.id, payload.name.as_deref(), payload.description.as_deref(), payload.content.as_deref(), payload.category.as_deref()).await
}

#[tauri::command]
pub async fn toggle_skill(state: State<'_, AppState>, id: String) -> Result<Skill, AppError> {
    skill_repo::toggle(&state.pool, &id).await
}

#[tauri::command]
pub async fn delete_skill(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    skill_repo::delete(&state.pool, &id).await
}
