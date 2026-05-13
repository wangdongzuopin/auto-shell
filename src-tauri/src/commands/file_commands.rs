use tauri::State;
use crate::AppState;
use crate::error::AppError;
use crate::models::file_entry::{FileContent, DirectoryListing, DirEntry};

/// Canonicalize and validate path, rejecting traversal attempts.
fn safe_path(raw: &str) -> Result<std::path::PathBuf, AppError> {
    let p = std::path::Path::new(raw);

    // Reject obviously malicious patterns
    if raw.contains("..") || raw.contains('~') {
        return Err(AppError::PathEscape(format!("Path traversal blocked: {raw}")));
    }

    let canonical = p.canonicalize().map_err(|e| {
        AppError::NotFound(format!("Cannot resolve path: {raw} ({e})"))
    })?;

    // Verify the resolved path didn't end up outside intended territory
    // by re-checking no .. components survived
    let resolved_str = canonical.to_string_lossy();
    if resolved_str.contains("..") {
        return Err(AppError::PathEscape(format!("Path traversal blocked: {raw}")));
    }

    Ok(canonical)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<FileContent, AppError> {
    let p = safe_path(&path)?;
    let content = tokio::fs::read_to_string(&p).await?;
    let meta = tokio::fs::metadata(&p).await?;
    let hash = blake3::hash(content.as_bytes()).to_hex().to_string();
    Ok(FileContent {
        path: p.to_string_lossy().to_string(),
        content,
        hash,
        size: meta.len() as i64,
    })
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), AppError> {
    let p = safe_path(&path)?;
    if let Some(parent) = p.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    tokio::fs::write(&p, &content).await?;
    Ok(())
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<DirectoryListing, AppError> {
    let p = safe_path(&path)?;
    if !p.is_dir() {
        return Err(AppError::InvalidPath(p.to_string_lossy().to_string()));
    }
    let mut entries = Vec::new();
    let mut read = tokio::fs::read_dir(&p).await?;
    while let Some(entry) = read.next_entry().await? {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }
        let meta = entry.metadata().await?;
        entries.push(DirEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len() as i64,
        });
    }
    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then_with(|| a.name.cmp(&b.name)));
    Ok(DirectoryListing {
        path: p.to_string_lossy().to_string(),
        entries,
    })
}

#[tauri::command]
pub async fn search_files(state: State<'_, AppState>, query: String, project_id: Option<String>) -> Result<Vec<crate::db::search_repo::SearchResult>, AppError> {
    crate::db::search_repo::search_files(&state.pool, &query, project_id.as_deref()).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("pizz_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn safe_path_accepts_valid_path() {
        let dir = temp_dir();
        let f = dir.join("test.txt");
        std::fs::write(&f, b"hello").unwrap();
        let result = safe_path(&f.to_string_lossy());
        assert!(result.is_ok());
    }

    #[test]
    fn safe_path_rejects_dot_dot() {
        let result = safe_path("/etc/../passwd");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("traversal"));
    }

    #[test]
    fn safe_path_rejects_home_tilde() {
        let result = safe_path("~/.ssh/id_rsa");
        assert!(result.is_err());
    }

    #[test]
    fn safe_path_rejects_dot_dot_middle() {
        let dir = temp_dir();
        let bad = dir.join("sub/../../etc/passwd");
        let result = safe_path(&bad.to_string_lossy());
        assert!(result.is_err());
    }

    #[test]
    fn safe_path_rejects_non_existent() {
        let result = safe_path("/nonexistent/path/foo.txt");
        assert!(result.is_err());
    }

    #[test]
    fn safe_path_canonicalizes() {
        let dir = temp_dir();
        let sub = dir.join("subdir");
        std::fs::create_dir_all(&sub).unwrap();
        let f = sub.join("file.txt");
        std::fs::write(&f, b"data").unwrap();

        // Pass path with trailing /./
        let tricky = format!("{}/./file.txt", sub.to_string_lossy());
        let result = safe_path(&tricky);
        assert!(result.is_ok());
    }
}
