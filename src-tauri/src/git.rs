use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct GitStatus {
    pub branch: String,
    pub clean: bool,
    pub files: Vec<GitFileStatus>,
    pub ahead: u32,
    pub behind: u32,
    pub recent_commits: Vec<GitCommit>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitCommit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitCommitSuggestion {
    pub title: String,
    pub body: String,
}

fn run_git(repo: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo)
        .output()
        .map_err(|e| format!("git error: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git failed: {}", stderr.trim()));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

pub fn get_diff(repo: &str, staged: bool) -> Result<String, String> {
    let mut args = vec!["diff"];
    if staged {
        args.push("--staged");
    }
    run_git(repo, &args)
}

fn commit_type_for_status(files: &[GitFileStatus]) -> &'static str {
    if files.iter().all(|file| file.status.contains("D")) {
        return "chore";
    }

    if files.iter().any(|file| {
        let path = file.path.to_ascii_lowercase();
        path.contains("test") || path.contains("__tests__") || path.ends_with(".spec.ts")
    }) {
        return "test";
    }

    if files.iter().any(|file| {
        let path = file.path.to_ascii_lowercase();
        path.ends_with(".md") || path.contains("readme") || path.contains("docx/")
    }) {
        return "docs";
    }

    if files.iter().any(|file| {
        let path = file.path.to_ascii_lowercase();
        path.contains("package") || path.contains("cargo.") || path.contains("lock")
    }) {
        return "chore";
    }

    if files.iter().any(|file| {
        let path = file.path.to_ascii_lowercase();
        path.contains("style") || path.ends_with(".css")
    }) {
        return "style";
    }

    "feat"
}

fn summarize_scope(files: &[GitFileStatus]) -> String {
    let mut scopes: Vec<&str> = Vec::new();

    for file in files {
        let path = file.path.replace('\\', "/");
        let scope = if path.starts_with("src-tauri/") {
            "backend"
        } else if path.starts_with("src/components/") {
            "ui"
        } else if path.starts_with("src/stores/") {
            "state"
        } else if path.starts_with("src/lib/") || path.starts_with("src/services/") {
            "core"
        } else if path.starts_with("src/") {
            "frontend"
        } else if path.starts_with("docx/") || path.ends_with(".md") {
            "docs"
        } else {
            "project"
        };

        if !scopes.contains(&scope) {
            scopes.push(scope);
        }
    }

    match scopes.as_slice() {
        [] => "project".to_string(),
        [single] => single.to_string(),
        _ => "project".to_string(),
    }
}

fn summarize_changes(files: &[GitFileStatus]) -> String {
    let added = files
        .iter()
        .filter(|file| file.status.contains("A") || file.status == "??")
        .count();
    let modified = files
        .iter()
        .filter(|file| file.status.contains("M"))
        .count();
    let deleted = files
        .iter()
        .filter(|file| file.status.contains("D"))
        .count();

    let mut parts = Vec::new();
    if added > 0 {
        parts.push(format!("{} added", added));
    }
    if modified > 0 {
        parts.push(format!("{} modified", modified));
    }
    if deleted > 0 {
        parts.push(format!("{} deleted", deleted));
    }

    if parts.is_empty() {
        "update files".to_string()
    } else {
        parts.join(", ")
    }
}

pub fn suggest_commit_message(repo: &str) -> Result<GitCommitSuggestion, String> {
    let status = get_status(repo)?;
    if status.clean {
        return Ok(GitCommitSuggestion {
            title: "chore: no local changes".to_string(),
            body: "Working tree is clean.".to_string(),
        });
    }

    let commit_type = commit_type_for_status(&status.files);
    let scope = summarize_scope(&status.files);
    let summary = summarize_changes(&status.files);
    let file_list = status
        .files
        .iter()
        .take(8)
        .map(|file| format!("- {} {}", file.status, file.path))
        .collect::<Vec<_>>()
        .join("\n");

    let hidden_count = status.files.len().saturating_sub(8);
    let extra = if hidden_count > 0 {
        format!("\n- ...and {} more", hidden_count)
    } else {
        String::new()
    };

    Ok(GitCommitSuggestion {
        title: format!("{commit_type}({scope}): {summary}"),
        body: format!("Changed files:\n{file_list}{extra}"),
    })
}

pub fn get_log(repo: &str, count: u32) -> Result<Vec<GitCommit>, String> {
    let n = count.min(50).to_string();
    let output = run_git(
        repo,
        &["log", "--format=%H||%s||%an||%ci", "-n", &n],
    )?;
    let mut commits = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.split("||").collect();
        if parts.len() >= 4 {
            commits.push(GitCommit {
                hash: parts[0][..8.min(parts[0].len())].to_string(),
                message: parts[1].to_string(),
                author: parts[2].to_string(),
                date: parts[3].to_string(),
            });
        }
    }
    Ok(commits)
}

pub fn get_status(repo: &str) -> Result<GitStatus, String> {
    let branch = run_git(repo, &["rev-parse", "--abbrev-ref", "HEAD"])?;
    let clean_output = run_git(repo, &["status", "--porcelain"])?;
    let clean = clean_output.is_empty();

    // Parse status entries
    let mut files = Vec::new();
    for line in clean_output.lines() {
        if line.len() < 3 {
            continue;
        }
        let (status_code, path) = line.split_at(3);
        let st = status_code.trim();
        let staged_code = status_code.chars().next().unwrap_or(' ');
        let staged = staged_code != ' ' && staged_code != '?';
        files.push(GitFileStatus {
            path: path.trim().to_string(),
            status: st.to_string(),
            staged,
        });
    }

    // Ahead/behind
    let ahead = run_git(repo, &["rev-list", "--count", "@{u}..HEAD"])
        .unwrap_or_default()
        .parse()
        .unwrap_or(0);
    let behind = run_git(repo, &["rev-list", "--count", "HEAD..@{u}"])
        .unwrap_or_default()
        .parse()
        .unwrap_or(0);

    // Recent commits
    let log_output = run_git(
        repo,
        &[
            "log",
            "--format=%H||%s||%an||%ci",
            "-n",
            "10",
        ],
    )?;
    let mut recent_commits = Vec::new();
    for line in log_output.lines() {
        let parts: Vec<&str> = line.split("||").collect();
        if parts.len() >= 4 {
            recent_commits.push(GitCommit {
                hash: parts[0][..8.min(parts[0].len())].to_string(),
                message: parts[1].to_string(),
                author: parts[2].to_string(),
                date: parts[3].to_string(),
            });
        }
    }

    Ok(GitStatus {
        branch,
        clean,
        files,
        ahead,
        behind,
        recent_commits,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_status_in_current_dir() {
        // pnpm project root should be a git repo
        let result = get_status(".");
        assert!(result.is_ok(), "status should succeed in git repo");
        let status = result.unwrap();
        assert!(!status.branch.is_empty(), "branch should not be empty");
    }

    #[test]
    fn test_get_diff_returns_string() {
        let result = get_diff(".", false);
        assert!(result.is_ok(), "diff should succeed in git repo");
    }

    #[test]
    fn test_get_log_returns_commits() {
        let result = get_log(".", 5);
        assert!(result.is_ok(), "log should succeed in git repo");
        let commits = result.unwrap();
        assert!(commits.len() <= 5, "should return at most 5 commits");
        if !commits.is_empty() {
            assert!(!commits[0].hash.is_empty());
            assert!(!commits[0].message.is_empty());
        }
    }

    #[test]
    fn test_get_log_zero_count() {
        let result = get_log(".", 0);
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    fn test_commit_type_prefers_tests() {
        let files = vec![GitFileStatus {
            path: "src/__tests__/stores/gitStore.test.ts".to_string(),
            status: "M".to_string(),
            staged: false,
        }];

        assert_eq!(commit_type_for_status(&files), "test");
    }

    #[test]
    fn test_summarize_scope_for_backend_files() {
        let files = vec![GitFileStatus {
            path: "src-tauri/src/git.rs".to_string(),
            status: "M".to_string(),
            staged: false,
        }];

        assert_eq!(summarize_scope(&files), "backend");
        assert_eq!(summarize_changes(&files), "1 modified");
    }

    #[test]
    fn test_commit_type_prefers_docs() {
        let files = vec![GitFileStatus {
            path: "README.md".to_string(),
            status: "M".to_string(),
            staged: false,
        }];
        assert_eq!(commit_type_for_status(&files), "docs");
    }

    #[test]
    fn test_commit_type_prefers_chore_for_package_files() {
        let files = vec![GitFileStatus {
            path: "package.json".to_string(),
            status: "M".to_string(),
            staged: false,
        }];
        assert_eq!(commit_type_for_status(&files), "chore");
    }

    #[test]
    fn test_commit_type_prefers_style() {
        let files = vec![GitFileStatus {
            path: "src/styles/globals.css".to_string(),
            status: "M".to_string(),
            staged: false,
        }];
        assert_eq!(commit_type_for_status(&files), "style");
    }

    #[test]
    fn test_commit_type_delete_only() {
        let files = vec![GitFileStatus {
            path: "old_file.rs".to_string(),
            status: "D".to_string(),
            staged: true,
        }];
        assert_eq!(commit_type_for_status(&files), "chore");
    }

    #[test]
    fn test_commit_type_defaults_to_feat() {
        let files = vec![GitFileStatus {
            path: "src/components/NewFeature.tsx".to_string(),
            status: "A".to_string(),
            staged: true,
        }];
        assert_eq!(commit_type_for_status(&files), "feat");
    }

    #[test]
    fn test_summarize_scope_frontend() {
        let files = vec![GitFileStatus {
            path: "src/pages/ChatPage.tsx".to_string(),
            status: "M".to_string(),
            staged: false,
        }];
        assert_eq!(summarize_scope(&files), "frontend");
    }

    #[test]
    fn test_summarize_scope_ui() {
        let files = vec![GitFileStatus {
            path: "src/components/ui/button.tsx".to_string(),
            status: "M".to_string(),
            staged: false,
        }];
        assert_eq!(summarize_scope(&files), "ui");
    }

    #[test]
    fn test_summarize_scope_state() {
        let files = vec![GitFileStatus {
            path: "src/stores/appStore.ts".to_string(),
            status: "M".to_string(),
            staged: false,
        }];
        assert_eq!(summarize_scope(&files), "state");
    }

    #[test]
    fn test_summarize_scope_core() {
        let files = vec![GitFileStatus {
            path: "src/lib/ipc.ts".to_string(),
            status: "M".to_string(),
            staged: false,
        }];
        assert_eq!(summarize_scope(&files), "core");
    }

    #[test]
    fn test_summarize_scope_docs() {
        let files = vec![GitFileStatus {
            path: "docx/路线图.md".to_string(),
            status: "M".to_string(),
            staged: false,
        }];
        assert_eq!(summarize_scope(&files), "docs");
    }

    #[test]
    fn test_summarize_scope_project_when_mixed() {
        let files = vec![
            GitFileStatus {
                path: "src-tauri/src/main.rs".to_string(),
                status: "M".to_string(),
                staged: false,
            },
            GitFileStatus {
                path: "src/App.tsx".to_string(),
                status: "M".to_string(),
                staged: false,
            },
        ];
        assert_eq!(summarize_scope(&files), "project");
    }

    #[test]
    fn test_summarize_changes_empty() {
        let files: Vec<GitFileStatus> = vec![];
        assert_eq!(summarize_changes(&files), "update files");
    }

    #[test]
    fn test_summarize_changes_multiple_types() {
        let files = vec![
            GitFileStatus {
                path: "new_file.rs".to_string(),
                status: "A".to_string(),
                staged: true,
            },
            GitFileStatus {
                path: "modified.rs".to_string(),
                status: "M".to_string(),
                staged: false,
            },
            GitFileStatus {
                path: "deleted.rs".to_string(),
                status: "D".to_string(),
                staged: true,
            },
        ];
        assert_eq!(summarize_changes(&files), "1 added, 1 modified, 1 deleted");
    }
}
