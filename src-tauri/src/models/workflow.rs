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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_workspace_defaults() {
        let json = r#"{"name":"my ws"}"#;
        let payload: CreateWorkspacePayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.name, "my ws");
        assert_eq!(payload.edition, "team");
        assert!(payload.description.is_empty());
    }

    #[test]
    fn create_idea_defaults() {
        let json = r#"{"title":"idea","content":"desc"}"#;
        let payload: CreateIdeaPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.title, "idea");
        assert_eq!(payload.source_role_key, "operations");
        assert!(payload.workspace_id.is_none());
    }

    #[test]
    fn update_idea_status() {
        let json = r#"{"id":"i1","status":"assessed","assessment_summary":"good"}"#;
        let payload: UpdateIdeaStatusPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.id, "i1");
        assert_eq!(payload.status, "assessed");
        assert_eq!(payload.assessment_summary, Some("good".into()));
    }

    #[test]
    fn create_artifact_payload() {
        let json = r#"{"idea_id":"i1","artifact_type":"prd","title":"PRD","content":"doc","role_key":"product_management"}"#;
        let payload: CreateArtifactPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.artifact_type, "prd");
        assert_eq!(payload.status, None);
    }

    #[test]
    fn workspace_serialize_roundtrip() {
        let ws = Workspace {
            id: "w1".into(),
            name: "Test".into(),
            description: "desc".into(),
            owner_account_id: None,
            edition: "team".into(),
            created_at: 0,
            updated_at: 1,
        };
        let json = serde_json::to_string(&ws).unwrap();
        let back: Workspace = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "w1");
    }
}
