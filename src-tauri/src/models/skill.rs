use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub content: String,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub skill_type: String,
    pub category: String,
    pub role: String,
    pub enabled: bool,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateSkillPayload {
    pub name: String,
    pub description: String,
    pub content: String,
    #[serde(default = "default_skill_type")]
    pub skill_type: String,
    #[serde(default = "default_category")]
    pub category: String,
    #[serde(default = "default_role")]
    pub role: String,
}

fn default_skill_type() -> String {
    "imported".into()
}

fn default_category() -> String {
    "通用".into()
}

fn default_role() -> String {
    "both".into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_skill_payload_defaults() {
        let json = r#"{"name":"test","description":"a skill","content":"do x"}"#;
        let payload: CreateSkillPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.name, "test");
        assert_eq!(payload.skill_type, "imported");
        assert_eq!(payload.category, "通用");
        assert_eq!(payload.role, "both");
    }

    #[test]
    fn create_skill_payload_explicit_role() {
        let json = r#"{"name":"s","description":"d","content":"c","role":"developer"}"#;
        let payload: CreateSkillPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.role, "developer");
    }

    #[test]
    fn update_skill_payload_partial() {
        let json = r#"{"id":"abc","name":"renamed"}"#;
        let payload: UpdateSkillPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.id, "abc");
        assert_eq!(payload.name, Some("renamed".into()));
        assert!(payload.description.is_none());
        assert!(payload.content.is_none());
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateSkillPayload {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub category: Option<String>,
    pub role: Option<String>,
}
