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
        let staged = st.starts_with(|c: char| c.is_alphabetic());
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
}
