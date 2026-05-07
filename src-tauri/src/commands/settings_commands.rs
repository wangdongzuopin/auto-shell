use tauri::State;
use crate::AppState;
use crate::error::AppError;
use crate::db::settings_repo;

#[tauri::command]
pub async fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, AppError> {
    settings_repo::get(&state.pool, &key).await
}

#[tauri::command]
pub async fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), AppError> {
    settings_repo::set(&state.pool, &key, &value).await
}
