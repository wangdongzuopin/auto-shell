use crate::git;

#[tauri::command]
pub async fn git_status(repo_path: String) -> Result<git::GitStatus, String> {
    git::get_status(&repo_path)
}

#[tauri::command]
pub async fn git_diff(repo_path: String, staged: bool) -> Result<String, String> {
    git::get_diff(&repo_path, staged)
}

#[tauri::command]
pub async fn git_log(repo_path: String, count: u32) -> Result<Vec<git::GitCommit>, String> {
    git::get_log(&repo_path, count)
}
