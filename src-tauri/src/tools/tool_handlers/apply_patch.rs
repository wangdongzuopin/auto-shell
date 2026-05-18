use serde_json::Value;

use crate::db::checkpoint_repo;
use crate::tools::executor::ToolResult;
use crate::tools::security;
use crate::AppState;

const MAX_CHANGES: usize = 12;

pub async fn handle(args: Value, state: &AppState, conversation_id: Option<String>) -> ToolResult {
    let changes = match args["changes"].as_array() {
        Some(changes) if !changes.is_empty() => changes,
        _ => return ToolResult::error("changes is required", "Provide one or more structured replacements."),
    };

    if changes.len() > MAX_CHANGES {
        return ToolResult::error(
            format!("Too many changes requested: {}", changes.len()),
            format!("Apply at most {MAX_CHANGES} changes per call."),
        );
    }

    let mut summaries = Vec::new();
    for change in changes {
        let path = change["path"].as_str().unwrap_or("");
        let find = change["find"].as_str().unwrap_or("");
        let replace = change["replace"].as_str().unwrap_or("");

        if path.is_empty() || find.is_empty() {
            return ToolResult::error(
                "Each change requires path and find",
                "Use exact text replacement with a non-empty find string.",
            );
        }

        let path = match security::validate_write_path(path) {
            Ok(path) => path,
            Err(result) => return result,
        };
        let path_string = path.to_string_lossy().to_string();
        let old = match tokio::fs::read_to_string(&path).await {
            Ok(content) => content,
            Err(e) => return ToolResult::error(e.to_string(), "apply_patch only edits existing UTF-8 text files."),
        };

        let count = old.matches(find).count();
        if count == 0 {
            return ToolResult::error(
                format!("Patch text not found in {}", path_string),
                "Read the latest file content and use an exact find string.",
            );
        }
        if count > 1 && !change["replace_all"].as_bool().unwrap_or(false) {
            return ToolResult::error(
                format!("Patch text matched {count} times in {}", path_string),
                "Make the find string more specific, or set replace_all to true.",
            );
        }

        let new = if change["replace_all"].as_bool().unwrap_or(false) {
            old.replace(find, replace)
        } else {
            old.replacen(find, replace, 1)
        };

        if new == old {
            summaries.push(serde_json::json!({
                "path": path_string,
                "operation": "unchanged",
                "matches": count
            }));
            continue;
        }

        if let Some(ref conv_id) = conversation_id {
            let _ = checkpoint_repo::save_checkpoint(&state.pool, &path_string, conv_id, &old).await;
        }

        if let Err(e) = tokio::fs::write(&path, new).await {
            return ToolResult::error(e.to_string(), "Check file permissions and try again.");
        }

        summaries.push(serde_json::json!({
            "path": path_string,
            "operation": "modify",
            "matches": count
        }));
    }

    ToolResult::ok(serde_json::to_string(&summaries).unwrap_or_default())
}

