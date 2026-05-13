use sqlx::SqlitePool;
use crate::error::AppError;
use crate::models::KnowledgeEntry;

pub async fn list_all(pool: &SqlitePool) -> Result<Vec<KnowledgeEntry>, AppError> {
    sqlx::query_as::<_, KnowledgeEntry>("SELECT * FROM knowledge_entries ORDER BY updated_at DESC")
        .fetch_all(pool).await.map_err(AppError::from)
}

#[allow(dead_code)]
pub async fn list_by_project(pool: &SqlitePool, project_id: &str) -> Result<Vec<KnowledgeEntry>, AppError> {
    sqlx::query_as::<_, KnowledgeEntry>(
        "SELECT * FROM knowledge_entries WHERE project_id = ? ORDER BY updated_at DESC"
    )
    .bind(project_id)
    .fetch_all(pool).await.map_err(AppError::from)
}

pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<KnowledgeEntry, AppError> {
    sqlx::query_as::<_, KnowledgeEntry>("SELECT * FROM knowledge_entries WHERE id = ?")
        .bind(id)
        .fetch_optional(pool).await?
        .ok_or_else(|| AppError::NotFound(format!("Knowledge entry not found: {}", id)))
}

pub async fn insert(pool: &SqlitePool, id: &str, title: &str, content: &str, tags: &str, source: &str, project_id: Option<&str>) -> Result<KnowledgeEntry, AppError> {
    let now = chrono::Utc::now().timestamp_millis();
    sqlx::query(
        "INSERT INTO knowledge_entries (id, title, content, tags, source, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id).bind(title).bind(content).bind(tags).bind(source).bind(project_id).bind(now).bind(now)
    .execute(pool).await?;
    // Update FTS
    sqlx::query(
        "INSERT INTO knowledge_fts (rowid, title, content, tags) VALUES ((SELECT rowid FROM knowledge_entries WHERE id = ?), ?, ?, ?)"
    )
    .bind(id).bind(title).bind(content).bind(tags)
    .execute(pool).await?;
    get_by_id(pool, id).await
}

pub async fn update(pool: &SqlitePool, id: &str, title: Option<&str>, content: Option<&str>, tags: Option<&str>) -> Result<KnowledgeEntry, AppError> {
    let now = chrono::Utc::now().timestamp_millis();
    if let Some(t) = title {
        sqlx::query("UPDATE knowledge_entries SET title = ?, updated_at = ? WHERE id = ?")
            .bind(t).bind(now).bind(id)
            .execute(pool).await?;
    }
    if let Some(c) = content {
        sqlx::query("UPDATE knowledge_entries SET content = ?, updated_at = ? WHERE id = ?")
            .bind(c).bind(now).bind(id)
            .execute(pool).await?;
    }
    if let Some(tg) = tags {
        sqlx::query("UPDATE knowledge_entries SET tags = ?, updated_at = ? WHERE id = ?")
            .bind(tg).bind(now).bind(id)
            .execute(pool).await?;
    }
    let entry = get_by_id(pool, id).await?;
    // Update FTS
    sqlx::query(
        "UPDATE knowledge_fts SET title = ?, content = ?, tags = ? WHERE rowid = (SELECT rowid FROM knowledge_entries WHERE id = ?)"
    )
    .bind(&entry.title).bind(&entry.content).bind(&entry.tags).bind(id)
    .execute(pool).await?;
    Ok(entry)
}

pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
    sqlx::query("DELETE FROM knowledge_fts WHERE rowid = (SELECT rowid FROM knowledge_entries WHERE id = ?)")
        .bind(id).execute(pool).await?;
    sqlx::query("DELETE FROM knowledge_entries WHERE id = ?")
        .bind(id).execute(pool).await?;
    Ok(())
}

pub async fn search(pool: &SqlitePool, query: &str) -> Result<Vec<KnowledgeEntry>, AppError> {
    sqlx::query_as::<_, KnowledgeEntry>(
        "SELECT ke.* FROM knowledge_entries ke JOIN knowledge_fts kf ON ke.rowid = kf.rowid WHERE knowledge_fts MATCH ? ORDER BY rank LIMIT 50"
    )
    .bind(query)
    .fetch_all(pool).await.map_err(AppError::from)
}
