use sqlx::SqlitePool;
use crate::error::AppError;

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct SearchResult {
    pub path: String,
    pub snippet: String,
}

#[derive(sqlx::FromRow)]
struct FileRow {
    path: String,
    content: Option<String>,
}

pub async fn search_files(pool: &SqlitePool, query: &str, _project_id: Option<&str>) -> Result<Vec<SearchResult>, AppError> {
    let row_ids: Vec<i64> = sqlx::query_scalar::<_, i64>(
        "SELECT rowid FROM files_fts WHERE files_fts MATCH ? ORDER BY rank LIMIT 30"
    )
    .bind(query)
    .fetch_all(pool).await?;

    let mut results = Vec::new();
    for id in row_ids {
        let row = sqlx::query_as::<_, FileRow>(
            "SELECT path, content FROM files WHERE rowid = ?"
        )
        .bind(id)
        .fetch_optional(pool).await?;
        if let Some(r) = row {
            let content = r.content.unwrap_or_default();
            let snippet = if content.len() > 200 {
                format!("{}...", &content[..200])
            } else {
                content
            };
            results.push(SearchResult { path: r.path, snippet });
        }
    }
    Ok(results)
}

pub async fn index_file(pool: &SqlitePool, project_id: &str, path: &str, content: &str, hash: &str, size: i64, modified_at: i64) -> Result<(), AppError> {
    let now = chrono::Utc::now().timestamp_millis();
    // Upsert file entry
    sqlx::query(
        "INSERT INTO files (id, project_id, path, hash, size, modified_at, indexed_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET hash=excluded.hash, size=excluded.size, modified_at=excluded.modified_at, indexed_at=excluded.indexed_at"
    )
    .bind(hash).bind(project_id).bind(path).bind(hash).bind(size).bind(modified_at).bind(now)
    .execute(pool).await?;

    // Upsert FTS
    sqlx::query(
        "INSERT INTO files_fts (rowid, path, content) VALUES ((SELECT rowid FROM files WHERE id = ?), ?, ?)"
    )
    .bind(hash).bind(path).bind(content)
    .execute(pool).await?;
    Ok(())
}
