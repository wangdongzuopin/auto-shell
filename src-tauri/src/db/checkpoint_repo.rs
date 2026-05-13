use sqlx::SqlitePool;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct FileCheckpoint {
    pub id: String,
    pub file_path: String,
    pub old_hash: String,
    pub old_content: String,
    pub conversation_id: String,
    pub created_at: String,
}

pub async fn save_checkpoint(
    pool: &SqlitePool,
    file_path: &str,
    conversation_id: &str,
    old_content: &str,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let hash = blake3::hash(old_content.as_bytes()).to_hex().to_string();

    sqlx::query(
        "INSERT INTO file_checkpoints (id, file_path, old_hash, old_content, conversation_id) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(file_path)
    .bind(&hash)
    .bind(old_content)
    .bind(conversation_id)
    .execute(pool)
    .await
    .map_err(|e| format!("save checkpoint: {}", e))?;

    Ok(id)
}

pub async fn get_latest_for_file(
    pool: &SqlitePool,
    file_path: &str,
    conversation_id: &str,
) -> Result<Option<FileCheckpoint>, String> {
    sqlx::query_as::<_, FileCheckpoint>(
        "SELECT id, file_path, old_hash, old_content, conversation_id, created_at FROM file_checkpoints WHERE file_path = ? AND conversation_id = ? ORDER BY created_at DESC LIMIT 1",
    )
    .bind(file_path)
    .bind(conversation_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("get checkpoint: {}", e))
}

pub async fn get_all_for_conversation(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<Vec<FileCheckpoint>, String> {
    sqlx::query_as::<_, FileCheckpoint>(
        "SELECT id, file_path, old_hash, old_content, conversation_id, created_at FROM file_checkpoints WHERE conversation_id = ? ORDER BY created_at DESC",
    )
    .bind(conversation_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("list checkpoints: {}", e))
}

pub async fn delete_checkpoint(pool: &SqlitePool, id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM file_checkpoints WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("delete checkpoint: {}", e))?;
    Ok(())
}

pub async fn delete_all_for_conversation(pool: &SqlitePool, conversation_id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM file_checkpoints WHERE conversation_id = ?")
        .bind(conversation_id)
        .execute(pool)
        .await
        .map_err(|e| format!("clear checkpoints: {}", e))?;
    Ok(())
}
