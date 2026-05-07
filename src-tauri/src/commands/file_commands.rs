use tauri::State;
use crate::AppState;
use crate::error::AppError;
use crate::models::file_entry::{FileContent, DirectoryListing, DirEntry};

#[tauri::command]
pub async fn read_file(path: String) -> Result<FileContent, AppError> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err(AppError::NotFound(format!("File not found: {}", path)));
    }
    let content = tokio::fs::read_to_string(&path).await?;
    let meta = tokio::fs::metadata(&path).await?;
    let hash = blake3::hash(content.as_bytes()).to_hex().to_string();
    Ok(FileContent {
        path,
        content,
        hash,
        size: meta.len() as i64,
    })
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), AppError> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    tokio::fs::write(&path, &content).await?;
    Ok(())
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<DirectoryListing, AppError> {
    let p = std::path::Path::new(&path);
    if !p.is_dir() {
        return Err(AppError::InvalidPath(path));
    }
    let mut entries = Vec::new();
    let mut read = tokio::fs::read_dir(&path).await?;
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
    Ok(DirectoryListing { path, entries })
}

#[tauri::command]
pub async fn search_files(state: State<'_, AppState>, query: String, project_id: Option<String>) -> Result<Vec<crate::db::search_repo::SearchResult>, AppError> {
    crate::db::search_repo::search_files(&state.pool, &query, project_id.as_deref()).await
}
