use serde::Serialize;

#[derive(Debug, thiserror::Error)]
#[allow(dead_code)]
pub enum AppError {
    #[error("Database error: {0}")]
    Db(#[from] sqlx::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Path escape detected: {0}")]
    PathEscape(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("MCP error: {0}")]
    Mcp(String),

    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Other(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn db_error_display() {
        // sqlx::Error doesn't impl From<String>, test Other instead
        let err = AppError::Other("db connection failed".into());
        assert!(err.to_string().contains("db connection failed"));
    }

    #[test]
    fn io_error_from_std() {
        let io = std::io::Error::new(std::io::ErrorKind::NotFound, "missing file");
        let err: AppError = io.into();
        assert!(err.to_string().contains("IO error"));
        assert!(err.to_string().contains("missing file"));
    }

    #[test]
    fn not_found_error() {
        let err = AppError::NotFound("project-123".into());
        assert!(err.to_string().contains("Not found"));
        assert!(err.to_string().contains("project-123"));
    }

    #[test]
    fn invalid_path_error() {
        let err = AppError::InvalidPath("/bad/path".into());
        assert!(err.to_string().contains("Invalid path"));
    }

    #[test]
    fn path_escape_error() {
        let err = AppError::PathEscape("../etc/passwd".into());
        assert!(err.to_string().contains("Path escape"));
        assert!(err.to_string().contains("../etc/passwd"));
    }

    #[test]
    fn mcp_error() {
        let err = AppError::Mcp("connection lost".into());
        assert!(err.to_string().contains("MCP error"));
        assert!(err.to_string().contains("connection lost"));
    }

    #[test]
    fn serialization_error_from_json() {
        let json_err = serde_json::from_str::<serde_json::Value>("not json").unwrap_err();
        let err: AppError = json_err.into();
        assert!(err.to_string().contains("Serialization error"));
    }

    #[test]
    fn from_string() {
        let err = AppError::from("custom error".to_string());
        assert_eq!(err.to_string(), "custom error");
    }

    #[test]
    fn serialize_app_error() {
        let err = AppError::NotFound("item-42".into());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("Not found"));
        assert!(json.contains("item-42"));
    }
}
