use tauri::State;
use crate::db::checkpoint_repo::{self, FileCheckpoint};
use crate::AppState;

#[tauri::command]
pub async fn undo_last_edit(
    state: State<'_, AppState>,
    file_path: String,
    conversation_id: String,
) -> Result<String, String> {
    match checkpoint_repo::get_latest_for_file(&state.pool, &file_path, &conversation_id).await? {
        Some(cp) => {
            tokio::fs::write(&cp.file_path, &cp.old_content)
                .await
                .map_err(|e| format!("write: {}", e))?;
            checkpoint_repo::delete_checkpoint(&state.pool, &cp.id).await?;
            Ok(format!("Restored {} to previous state", file_path))
        }
        None => Err(format!("No checkpoint found for {}", file_path)),
    }
}

#[tauri::command]
pub async fn list_checkpoints(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<Vec<FileCheckpoint>, String> {
    checkpoint_repo::get_all_for_conversation(&state.pool, &conversation_id).await
}

#[tauri::command]
pub async fn clear_checkpoints(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<(), String> {
    checkpoint_repo::delete_all_for_conversation(&state.pool, &conversation_id).await
}
