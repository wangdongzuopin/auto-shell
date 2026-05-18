use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Conversation {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub mode: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateConversationPayload {
    pub project_id: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default = "default_mode")]
    pub mode: String,
}

fn default_mode() -> String {
    "qa".into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_conversation_defaults() {
        let json = r#"{"project_id":"p1"}"#;
        let payload: CreateConversationPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.project_id, "p1");
        assert_eq!(payload.mode, "qa");
        assert!(payload.title.is_none());
    }

    #[test]
    fn create_conversation_with_title() {
        let json = r#"{"project_id":"p1","title":"new chat","mode":"edit"}"#;
        let payload: CreateConversationPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.title, Some("new chat".into()));
        assert_eq!(payload.mode, "edit");
    }

    #[test]
    fn conversation_serialize_roundtrip() {
        let conv = Conversation {
            id: "c1".into(),
            project_id: "p1".into(),
            title: "chat".into(),
            mode: "qa".into(),
            created_at: 1000,
            updated_at: 2000,
        };
        let json = serde_json::to_string(&conv).unwrap();
        let back: Conversation = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "c1");
        assert_eq!(back.title, "chat");
    }
}
