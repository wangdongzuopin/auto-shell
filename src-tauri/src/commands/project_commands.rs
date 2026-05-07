use tauri::State;
use crate::AppState;
use crate::error::AppError;
use crate::models::project::{Project, CreateProjectPayload, UpdateProjectPayload};
use crate::db::project_repo;

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, AppError> {
    project_repo::list_all(&state.pool).await
}

#[tauri::command]
pub async fn get_project(state: State<'_, AppState>, id: String) -> Result<Project, AppError> {
    project_repo::get_by_id(&state.pool, &id).await
}

#[tauri::command]
pub async fn create_project(state: State<'_, AppState>, payload: CreateProjectPayload) -> Result<Project, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let path = std::path::PathBuf::from(&payload.path);
    if !path.exists() || !path.is_dir() {
        return Err(AppError::InvalidPath(payload.path));
    }
    project_repo::insert(&state.pool, &id, &payload.name, &payload.path, &payload.description).await
}

#[tauri::command]
pub async fn update_project(state: State<'_, AppState>, payload: UpdateProjectPayload) -> Result<Project, AppError> {
    project_repo::update(&state.pool, &payload.id, payload.name.as_deref(), payload.description.as_deref()).await
}

#[tauri::command]
pub async fn delete_project(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    project_repo::delete(&state.pool, &id).await
}
