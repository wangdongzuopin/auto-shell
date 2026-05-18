use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct KnowledgeEntry {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: String,
    pub source: String,
    pub project_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateKnowledgePayload {
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_source")]
    pub source: String,
    pub project_id: Option<String>,
}

fn default_source() -> String {
    "manual".into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_knowledge_defaults() {
        let json = r#"{"title":"k","content":"v"}"#;
        let payload: CreateKnowledgePayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.title, "k");
        assert_eq!(payload.source, "manual");
        assert!(payload.tags.is_empty());
        assert!(payload.project_id.is_none());
    }

    #[test]
    fn create_knowledge_with_tags() {
        let json = r#"{"title":"k","content":"v","tags":["rust","ai"],"project_id":"p1"}"#;
        let payload: CreateKnowledgePayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.tags, vec!["rust", "ai"]);
        assert_eq!(payload.project_id, Some("p1".into()));
    }

    #[test]
    fn update_knowledge_partial() {
        let json = r#"{"id":"k1","title":"updated"}"#;
        let payload: UpdateKnowledgePayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.title, Some("updated".into()));
        assert!(payload.content.is_none());
        assert!(payload.tags.is_none());
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateKnowledgePayload {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
}
