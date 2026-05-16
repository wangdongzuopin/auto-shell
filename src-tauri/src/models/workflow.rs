use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: String,
    pub owner_account_id: Option<String>,
    pub edition: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RoleProfile {
    pub id: String,
    pub workspace_id: Option<String>,
    pub name: String,
    pub role_key: String,
    pub description: String,
    pub skill_category: String,
    pub is_builtin: i64,
    pub sort_order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Idea {
    pub id: String,
    pub workspace_id: Option<String>,
    pub project_id: Option<String>,
    pub title: String,
    pub content: String,
    pub source_role_key: String,
    pub status: String,
    pub assessment_summary: String,
    pub current_role_key: String,
    pub next_role_key: String,
    pub created_by_account_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Artifact {
    pub id: String,
    pub idea_id: String,
    pub artifact_type: String,
    pub title: String,
    pub content: String,
    pub role_key: String,
    pub status: String,
    pub created_by_account_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkspacePayload {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub owner_account_id: Option<String>,
    #[serde(default = "default_edition")]
    pub edition: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateIdeaPayload {
    #[serde(default)]
    pub workspace_id: Option<String>,
    #[serde(default)]
    pub project_id: Option<String>,
    pub title: String,
    pub content: String,
    #[serde(default = "default_source_role")]
    pub source_role_key: String,
    #[serde(default)]
    pub created_by_account_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateIdeaStatusPayload {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub assessment_summary: Option<String>,
    #[serde(default)]
    pub current_role_key: Option<String>,
    #[serde(default)]
    pub next_role_key: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub actor_account_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateArtifactPayload {
    pub idea_id: String,
    pub artifact_type: String,
    pub title: String,
    pub content: String,
    pub role_key: String,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub created_by_account_id: Option<String>,
}

fn default_edition() -> String {
    "team".into()
}

fn default_source_role() -> String {
    "operations".into()
}
