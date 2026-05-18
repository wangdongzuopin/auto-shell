use serde_json::Value;
use crate::tools::executor::ToolResult;
use crate::tools::security;

pub async fn handle(args: Value) -> ToolResult {
    let path = args["path"].as_str().unwrap_or(".").to_string();
    let path = match security::validate_read_path(&path) {
        Ok(path) => path,
        Err(result) => return result,
    };
    match tokio::fs::read_dir(&path).await {
        Ok(mut read) => {
            let mut entries = Vec::new();
            while let Ok(Some(entry)) = read.next_entry().await {
                let name = entry.file_name().to_string_lossy().to_string();
                if security::should_skip_entry(&name) { continue; }
                let meta = match entry.metadata().await { Ok(m) => m, Err(_) => continue };
                entries.push(serde_json::json!({
                    "name": name,
                    "path": entry.path().to_string_lossy(),
                    "is_dir": meta.is_dir(),
                    "size": meta.len(),
                }));
            }
            ToolResult { success: true, content: serde_json::to_string(&entries).unwrap_or_default() }
        }
        Err(e) => ToolResult { success: false, content: e.to_string() },
    }
}
