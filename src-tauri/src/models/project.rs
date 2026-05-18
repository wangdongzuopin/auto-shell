use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub path: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectPayload {
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectPayload {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_project_payload() {
        let json = r#"{"name":"My Project","path":"/home/user/proj"}"#;
        let payload: CreateProjectPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.name, "My Project");
        assert_eq!(payload.path, "/home/user/proj");
        assert!(payload.description.is_empty());
    }

    #[test]
    fn update_project_partial() {
        let json = r#"{"id":"p1","name":"Renamed"}"#;
        let payload: UpdateProjectPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.name, Some("Renamed".into()));
        assert!(payload.description.is_none());
    }
}
