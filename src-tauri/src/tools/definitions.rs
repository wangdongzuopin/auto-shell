#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

pub fn all_tools() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "read_file".into(),
            description: "Read the contents of a file".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "The file path to read" }
                },
                "required": ["path"]
            }),
        },
        ToolDefinition {
            name: "read_many_files".into(),
            description: "Read several UTF-8 text files in one safe call. Limited to workspace files and small batches.".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "paths": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "File paths to read"
                    }
                },
                "required": ["paths"]
            }),
        },
        ToolDefinition {
            name: "write_file".into(),
            description: "Write content to a file".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "The file path to write" },
                    "content": { "type": "string", "description": "The content to write" }
                },
                "required": ["path", "content"]
            }),
        },
        ToolDefinition {
            name: "apply_patch".into(),
            description: "Safely apply exact text replacements to existing workspace files. Saves undo checkpoints before writing.".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "changes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "path": { "type": "string", "description": "File path to edit" },
                                "find": { "type": "string", "description": "Exact text to replace" },
                                "replace": { "type": "string", "description": "Replacement text" },
                                "replace_all": { "type": "boolean", "description": "Replace all matches instead of exactly one" }
                            },
                            "required": ["path", "find", "replace"]
                        }
                    }
                },
                "required": ["changes"]
            }),
        },
        ToolDefinition {
            name: "list_directory".into(),
            description: "List files and directories in a given path".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "The directory path to list" }
                },
                "required": ["path"]
            }),
        },
        ToolDefinition {
            name: "grep_search".into(),
            description: "Search exact text across workspace files, skipping secrets and build output. Returns path, line, and matching text.".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "Exact text query" },
                    "root": { "type": "string", "description": "Directory to search, default workspace root" }
                },
                "required": ["query"]
            }),
        },
        ToolDefinition {
            name: "search_code".into(),
            description: "Search for code in the project files using full-text search".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "The search query" }
                },
                "required": ["query"]
            }),
        },
        ToolDefinition {
            name: "search_knowledge".into(),
            description: "Search the knowledge base for relevant entries".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "The search query" }
                },
                "required": ["query"]
            }),
        },
        ToolDefinition {
            name: "get_knowledge".into(),
            description: "Get a knowledge base entry by ID".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "The knowledge entry ID" }
                },
                "required": ["id"]
            }),
        },
        ToolDefinition {
            name: "create_knowledge".into(),
            description: "Create a new knowledge base entry".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "title": { "type": "string", "description": "Title of the entry" },
                    "content": { "type": "string", "description": "Content of the entry" },
                    "tags": { "type": "array", "items": { "type": "string" }, "description": "Tags for categorization" }
                },
                "required": ["title", "content"]
            }),
        },
        ToolDefinition {
            name: "list_skills".into(),
            description: "List all enabled skills".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolDefinition {
            name: "run_command".into(),
            description: "Run a shell command and return stdout/stderr output. Use for build, test, git, and other CLI operations. Timeout: 30s.".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "The shell command to run" },
                    "cwd": { "type": "string", "description": "Working directory for the command (default: current project root)" }
                },
                "required": ["command"]
            }),
        },
        ToolDefinition {
            name: "git_status".into(),
            description: "Get Git repository status: current branch, changed files, staged/unstaged, recent commits".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "repo_path": { "type": "string", "description": "Path to the git repository (default: current project root)" }
                },
                "required": []
            }),
        },
        ToolDefinition {
            name: "git_diff".into(),
            description: "Get Git diff (unified format) for unstaged or staged changes. Use before making commits to review changes.".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "repo_path": { "type": "string", "description": "Path to the git repository (default: current project root)" },
                    "staged": { "type": "boolean", "description": "If true, show staged changes; otherwise show unstaged" }
                },
                "required": []
            }),
        },
        ToolDefinition {
            name: "undo_last_edit".into(),
            description: "Undo the last file edit in the current conversation. Restores a file to its state before the most recent write_file call.".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "file_path": { "type": "string", "description": "Path to the file to undo" },
                    "conversation_id": { "type": "string", "description": "Current conversation ID" }
                },
                "required": ["file_path", "conversation_id"]
            }),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_tools_non_empty() {
        let tools = all_tools();
        assert!(!tools.is_empty());
    }

    #[test]
    fn every_tool_has_name_and_description() {
        for tool in all_tools() {
            assert!(!tool.name.is_empty(), "tool has empty name");
            assert!(!tool.description.is_empty(), "{} has empty description", tool.name);
        }
    }

    #[test]
    fn every_tool_has_valid_parameters() {
        for tool in all_tools() {
            let params = &tool.parameters;
            assert!(params.is_object(), "{} parameters is not an object", tool.name);
            assert!(params.get("type").is_some(), "{} missing type field", tool.name);
        }
    }

    #[test]
    fn required_tools_exist() {
        let tools = all_tools();
        let names: Vec<&str> = tools.iter().map(|t| t.name.as_str()).collect();
        let expected = [
            "read_file", "read_many_files", "write_file", "apply_patch",
            "list_directory", "grep_search", "search_code", "search_knowledge",
            "get_knowledge", "create_knowledge", "list_skills", "run_command",
            "git_status", "git_diff", "undo_last_edit",
        ];
        for name in expected {
            assert!(names.contains(&name), "missing tool: {name}");
        }
    }

    #[test]
    fn tool_count_matches_executor() {
        // executor.rs has 15 tool match arms
        assert_eq!(all_tools().len(), 15);
    }
}
