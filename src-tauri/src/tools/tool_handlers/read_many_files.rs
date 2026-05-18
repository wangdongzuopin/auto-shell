use serde_json::Value;

use crate::tools::executor::ToolResult;
use crate::tools::security;

const MAX_FILES: usize = 12;
const MAX_BYTES_PER_FILE: u64 = 80_000;

pub async fn handle(args: Value) -> ToolResult {
    let files = match args["paths"].as_array() {
        Some(paths) if !paths.is_empty() => paths,
        _ => return ToolResult::error("paths is required", "Provide a non-empty array of file paths."),
    };

    if files.len() > MAX_FILES {
        return ToolResult::error(
            format!("Too many files requested: {}", files.len()),
            format!("Read at most {MAX_FILES} files per call."),
        );
    }

    let mut output = Vec::new();
    for value in files {
        let Some(path) = value.as_str() else {
            output.push(serde_json::json!({
                "path": value,
                "success": false,
                "content": "Path must be a string"
            }));
            continue;
        };
        let safe_path = match security::validate_read_path(path) {
            Ok(path) => path,
            Err(result) => {
                output.push(serde_json::json!({
                    "path": path,
                    "success": false,
                    "content": result.content
                }));
                continue;
            }
        };
        let meta = match tokio::fs::metadata(&safe_path).await {
            Ok(meta) => meta,
            Err(e) => {
                output.push(serde_json::json!({
                    "path": path,
                    "success": false,
                    "content": e.to_string()
                }));
                continue;
            }
        };
        if meta.len() > MAX_BYTES_PER_FILE {
            output.push(serde_json::json!({
                "path": path,
                "success": false,
                "content": format!("File is too large: {} bytes", meta.len())
            }));
            continue;
        }
        match tokio::fs::read_to_string(&safe_path).await {
            Ok(content) => output.push(serde_json::json!({
                "path": safe_path.to_string_lossy(),
                "success": true,
                "content": content
            })),
            Err(e) => output.push(serde_json::json!({
                "path": path,
                "success": false,
                "content": e.to_string()
            })),
        }
    }

    ToolResult::ok(serde_json::to_string(&output).unwrap_or_default())
}

