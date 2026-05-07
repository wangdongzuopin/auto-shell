use sqlx::SqlitePool;
use crate::error::AppError;
use crate::models::{Conversation, Message};

// --- Conversations ---

pub async fn list_conversations(pool: &SqlitePool, project_id: &str) -> Result<Vec<Conversation>, AppError> {
    sqlx::query_as::<_, Conversation>(
        "SELECT * FROM conversations WHERE project_id = ? ORDER BY updated_at DESC"
    )
    .bind(project_id)
    .fetch_all(pool).await.map_err(AppError::from)
}

pub async fn get_conversation(pool: &SqlitePool, id: &str) -> Result<Conversation, AppError> {
    sqlx::query_as::<_, Conversation>("SELECT * FROM conversations WHERE id = ?")
        .bind(id)
        .fetch_optional(pool).await?
        .ok_or_else(|| AppError::NotFound(format!("Conversation not found: {}", id)))
}

pub async fn create_conversation(pool: &SqlitePool, id: &str, project_id: &str, title: &str, mode: &str) -> Result<Conversation, AppError> {
    let now = chrono::Utc::now().timestamp_millis();
    sqlx::query(
        "INSERT INTO conversations (id, project_id, title, mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id).bind(project_id).bind(title).bind(mode).bind(now).bind(now)
    .execute(pool).await?;
    get_conversation(pool, id).await
}

pub async fn delete_conversation(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
    sqlx::query("DELETE FROM conversations WHERE id = ?")
        .bind(id)
        .execute(pool).await?;
    Ok(())
}

// --- Messages ---

pub async fn list_messages(pool: &SqlitePool, conversation_id: &str) -> Result<Vec<Message>, AppError> {
    sqlx::query_as::<_, Message>(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC"
    )
    .bind(conversation_id)
    .fetch_all(pool).await.map_err(AppError::from)
}

pub async fn add_message(pool: &SqlitePool, id: &str, conversation_id: &str, role: &str, content: &str, metadata: Option<&str>) -> Result<Message, AppError> {
    let now = chrono::Utc::now().timestamp_millis();
    let meta = metadata.unwrap_or("{}");
    sqlx::query(
        "INSERT INTO messages (id, conversation_id, role, content, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id).bind(conversation_id).bind(role).bind(content).bind(now).bind(meta)
    .execute(pool).await?;
    let row = sqlx::query_as::<_, Message>("SELECT * FROM messages WHERE id = ?")
        .bind(id)
        .fetch_one(pool).await?;
    Ok(row)
}
