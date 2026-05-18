use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
    #[serde(default = "default_metadata")]
    pub metadata: String,
}

fn default_metadata() -> String {
    "{}".into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_message_payload_minimal() {
        let json = r#"{"conversation_id":"c1","role":"user","content":"hello"}"#;
        let payload: AddMessagePayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.role, "user");
        assert_eq!(payload.content, "hello");
        assert!(payload.metadata.is_none());
    }

    #[test]
    fn message_default_metadata() {
        let msg = Message {
            id: "m1".into(),
            conversation_id: "c1".into(),
            role: "assistant".into(),
            content: "hi".into(),
            timestamp: 0,
            metadata: default_metadata(),
        };
        assert_eq!(msg.metadata, "{}");
    }
}

#[derive(Debug, Deserialize)]
pub struct AddMessagePayload {
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    #[serde(default)]
    pub metadata: Option<String>,
}
