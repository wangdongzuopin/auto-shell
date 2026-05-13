#![allow(dead_code)]

use crate::AppState;
use crate::db::search_repo;
use std::path::Path;

pub async fn index_project(state: &AppState, project_id: &str, project_path: &str) -> Result<usize, String> {
    let mut count = 0;
    walk_dir(&state, project_id, Path::new(project_path), &mut count).await?;
    Ok(count)
}

fn should_skip(name: &str) -> bool {
    name.starts_with('.') || matches!(name, "node_modules" | "target" | "dist" | ".git" | "__pycache__" | "venv" | ".next")
}

async fn walk_dir(state: &AppState, project_id: &str, dir: &Path, count: &mut usize) -> Result<(), String> {
    let mut read = tokio::fs::read_dir(dir).await.map_err(|e| e.to_string())?;
    while let Ok(Some(entry)) = read.next_entry().await {
        let name = entry.file_name().to_string_lossy().to_string();
        if should_skip(&name) { continue; }
        let path = entry.path();
        if path.is_dir() {
            Box::pin(walk_dir(state, project_id, &path, count)).await?;
        } else if path.is_file() {
            let rel_path = path.to_string_lossy().to_string();
            if let Ok(content) = tokio::fs::read_to_string(&path).await {
                if content.len() > 1_000_000 { continue; } // Skip files > 1MB
                let meta = path.metadata().map(|m| m.len() as i64).unwrap_or(0);
                let modified = path.metadata()
                    .and_then(|m| m.modified())
                    .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64)
                    .unwrap_or(0);
                let hash = blake3::hash(content.as_bytes()).to_hex().to_string();
                if let Err(e) = search_repo::index_file(&state.pool, project_id, &rel_path, &content, &hash, meta, modified).await {
                    eprintln!("[pizz] Failed to index {}: {}", rel_path, e);
                } else {
                    *count += 1;
                }
            }
        }
    }
    Ok(())
}
