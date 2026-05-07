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
    ]
}
