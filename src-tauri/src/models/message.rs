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

#[derive(Debug, Deserialize)]
pub struct AddMessagePayload {
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    #[serde(default)]
    pub metadata: Option<String>,
}
