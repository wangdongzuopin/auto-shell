use sqlx::SqlitePool;
use crate::error::AppError;
use crate::models::Skill;

pub async fn list_all(pool: &SqlitePool) -> Result<Vec<Skill>, AppError> {
    sqlx::query_as::<_, Skill>(
        "SELECT id, name, description, content, type, category, enabled, created_at FROM skills ORDER BY created_at DESC"
    )
    .fetch_all(pool).await.map_err(AppError::from)
}

pub async fn list_enabled(pool: &SqlitePool) -> Result<Vec<Skill>, AppError> {
    sqlx::query_as::<_, Skill>(
        "SELECT id, name, description, content, type, category, enabled, created_at FROM skills WHERE enabled = 1 ORDER BY created_at DESC"
    )
    .fetch_all(pool).await.map_err(AppError::from)
}

pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Skill, AppError> {
    sqlx::query_as::<_, Skill>(
        "SELECT id, name, description, content, type, category, enabled, created_at FROM skills WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool).await?
    .ok_or_else(|| AppError::NotFound(format!("Skill not found: {}", id)))
}

pub async fn insert(pool: &SqlitePool, id: &str, name: &str, description: &str, content: &str, skill_type: &str, category: &str) -> Result<Skill, AppError> {
    let now = chrono::Utc::now().timestamp_millis();
    sqlx::query(
        "INSERT INTO skills (id, name, description, content, type, category, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)"
    )
    .bind(id).bind(name).bind(description).bind(content).bind(skill_type).bind(category).bind(now)
    .execute(pool).await?;
    get_by_id(pool, id).await
}

pub async fn update(pool: &SqlitePool, id: &str, name: Option<&str>, description: Option<&str>, content: Option<&str>, category: Option<&str>) -> Result<Skill, AppError> {
    if let Some(n) = name {
        sqlx::query("UPDATE skills SET name = ? WHERE id = ?")
            .bind(n).bind(id).execute(pool).await?;
    }
    if let Some(d) = description {
        sqlx::query("UPDATE skills SET description = ? WHERE id = ?")
            .bind(d).bind(id).execute(pool).await?;
    }
    if let Some(c) = content {
        sqlx::query("UPDATE skills SET content = ? WHERE id = ?")
            .bind(c).bind(id).execute(pool).await?;
    }
    if let Some(cat) = category {
        sqlx::query("UPDATE skills SET category = ? WHERE id = ?")
            .bind(cat).bind(id).execute(pool).await?;
    }
    get_by_id(pool, id).await
}

pub async fn toggle(pool: &SqlitePool, id: &str) -> Result<Skill, AppError> {
    sqlx::query("UPDATE skills SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?")
        .bind(id)
        .execute(pool).await?;
    get_by_id(pool, id).await
}

pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
    sqlx::query("DELETE FROM skills WHERE id = ?")
        .bind(id).execute(pool).await?;
    Ok(())
}
