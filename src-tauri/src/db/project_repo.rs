use sqlx::SqlitePool;
use crate::error::AppError;
use crate::models::Project;

pub async fn list_all(pool: &SqlitePool) -> Result<Vec<Project>, AppError> {
    sqlx::query_as::<_, Project>("SELECT * FROM projects ORDER BY updated_at DESC")
        .fetch_all(pool)
        .await
        .map_err(AppError::from)
}

pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Project, AppError> {
    sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Project not found: {}", id)))
}

pub async fn insert(pool: &SqlitePool, id: &str, name: &str, path: &str, description: &str) -> Result<Project, AppError> {
    let now = chrono::Utc::now().timestamp_millis();
    sqlx::query(
        "INSERT INTO projects (id, name, path, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id).bind(name).bind(path).bind(description).bind(now).bind(now)
    .execute(pool).await?;
    get_by_id(pool, id).await
}

pub async fn update(pool: &SqlitePool, id: &str, name: Option<&str>, description: Option<&str>) -> Result<Project, AppError> {
    let now = chrono::Utc::now().timestamp_millis();
    if let Some(n) = name {
        sqlx::query("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?")
            .bind(n).bind(now).bind(id)
            .execute(pool).await?;
    }
    if let Some(d) = description {
        sqlx::query("UPDATE projects SET description = ?, updated_at = ? WHERE id = ?")
            .bind(d).bind(now).bind(id)
            .execute(pool).await?;
    }
    get_by_id(pool, id).await
}

pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
    let rows = sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(id)
        .execute(pool).await?;
    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Project not found: {}", id)));
    }
    Ok(())
}
