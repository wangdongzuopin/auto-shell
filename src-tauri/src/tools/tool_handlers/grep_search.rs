use serde_json::Value;

use crate::tools::executor::ToolResult;
use crate::tools::security;

const MAX_MATCHES: usize = 80;
const MAX_FILE_BYTES: u64 = 200_000;

pub async fn handle(args: Value) -> ToolResult {
    let query = args["query"].as_str().unwrap_or("").trim();
    if query.is_empty() {
        return ToolResult::error("query is required", "Provide a non-empty text query.");
    }

    let root = args["root"].as_str().unwrap_or(".");
    let root = match security::validate_root_path(root) {
        Ok(path) => path,
        Err(result) => return result,
    };

    let mut matches = Vec::new();
    let mut stack = vec![root];
    while let Some(dir) = stack.pop() {
        let mut read = match tokio::fs::read_dir(&dir).await {
            Ok(read) => read,
            Err(_) => continue,
        };

        while let Ok(Some(entry)) = read.next_entry().await {
            let name = entry.file_name().to_string_lossy().to_string();
            if security::should_skip_entry(&name) {
                continue;
            }

            let meta = match entry.metadata().await {
                Ok(meta) => meta,
                Err(_) => continue,
            };
            let path = entry.path();
            if meta.is_dir() {
                stack.push(path);
                continue;
            }
            if meta.len() > MAX_FILE_BYTES {
                continue;
            }

            let Ok(content) = tokio::fs::read_to_string(&path).await else {
                continue;
            };
            for (idx, line) in content.lines().enumerate() {
                if line.contains(query) {
                    matches.push(serde_json::json!({
                        "path": path.to_string_lossy(),
                        "line": idx + 1,
                        "text": line.trim()
                    }));
                    if matches.len() >= MAX_MATCHES {
                        return ToolResult::ok(serde_json::to_string(&matches).unwrap_or_default());
                    }
                }
            }
        }
    }

    ToolResult::ok(serde_json::to_string(&matches).unwrap_or_default())
}

