use serde_json::Value;
use crate::tools::executor::ToolResult;
use std::process::Command;
use std::time::Duration;

pub async fn handle(args: Value) -> ToolResult {
    let cmd = args["command"].as_str().unwrap_or("");
    let cwd = args["cwd"].as_str().unwrap_or(".");

    if cmd.trim().is_empty() {
        return ToolResult {
            success: false,
            content: "command is empty".into(),
        };
    }

    let child = Command::new(if cfg!(windows) { "cmd" } else { "sh" })
        .arg(if cfg!(windows) { "/C" } else { "-c" })
        .arg(cmd)
        .current_dir(cwd)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn();

    let mut child = match child {
        Ok(c) => c,
        Err(e) => {
            return ToolResult {
                success: false,
                content: format!("spawn error: {e}"),
            }
        }
    };

    // Wait with timeout
    let timeout = Duration::from_secs(30);
    let output = 'out: {
        for _ in 0..30 {
            match child.try_wait() {
                Ok(Some(_status)) => break 'out child.wait_with_output(),
                Ok(None) => tokio::time::sleep(Duration::from_secs(1)).await,
                Err(e) => {
                    return ToolResult {
                        success: false,
                        content: format!("wait error: {e}"),
                    }
                }
            }
        }
        let _ = child.kill();
        return ToolResult {
            success: false,
            content: format!("Command timed out after {}s", timeout.as_secs()),
        };
    };

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            let stderr_section = if stderr.is_empty() { String::new() } else { format!("[stderr]\n{stderr}") };
            let newline = if !stdout.is_empty() && !stderr.is_empty() { "\n" } else { "" };
            let combined = format!("{stdout}{newline}{stderr_section}");
            ToolResult {
                success: out.status.success(),
                content: if combined.is_empty() {
                    format!("exit code: {}", out.status.code().unwrap_or(-1))
                } else {
                    combined
                },
            }
        }
        Err(e) => ToolResult {
            success: false,
            content: format!("output error: {e}"),
        },
    }
}
