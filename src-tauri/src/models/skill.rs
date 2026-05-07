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

#[derive(Debug, Deserialize)]
pub struct UpdateSkillPayload {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub category: Option<String>,
    pub role: Option<String>,
}
