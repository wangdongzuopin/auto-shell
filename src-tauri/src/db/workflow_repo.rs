use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{
    Artifact, CreateArtifactPayload, CreateIdeaPayload, CreateWorkspacePayload, Idea, RoleProfile,
    UpdateIdeaStatusPayload, Workspace,
};

fn now() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

pub async fn list_workspaces(pool: &SqlitePool) -> Result<Vec<Workspace>, AppError> {
    sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces ORDER BY updated_at DESC")
        .fetch_all(pool)
        .await
        .map_err(AppError::from)
}

pub async fn create_workspace(
    pool: &SqlitePool,
    payload: CreateWorkspacePayload,
) -> Result<Workspace, AppError> {
    let id = new_id();
    let ts = now();
    sqlx::query(
        "INSERT INTO workspaces (id, name, description, owner_account_id, edition, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(payload.name.trim())
    .bind(payload.description)
    .bind(payload.owner_account_id)
    .bind(payload.edition)
    .bind(ts)
    .bind(ts)
    .execute(pool)
    .await?;

    get_workspace(pool, &id).await
}

pub async fn get_workspace(pool: &SqlitePool, id: &str) -> Result<Workspace, AppError> {
    sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Workspace not found: {id}")))
}

pub async fn list_role_profiles(
    pool: &SqlitePool,
    workspace_id: Option<&str>,
) -> Result<Vec<RoleProfile>, AppError> {
    sqlx::query_as::<_, RoleProfile>(
        "SELECT * FROM role_profiles
         WHERE workspace_id IS NULL OR workspace_id = ?
         ORDER BY sort_order ASC, name ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

pub async fn list_ideas(
    pool: &SqlitePool,
    workspace_id: Option<&str>,
    project_id: Option<&str>,
) -> Result<Vec<Idea>, AppError> {
    match (workspace_id, project_id) {
        (Some(workspace_id), Some(project_id)) => {
            sqlx::query_as::<_, Idea>(
                "SELECT * FROM ideas WHERE workspace_id = ? AND project_id = ? ORDER BY updated_at DESC",
            )
            .bind(workspace_id)
            .bind(project_id)
            .fetch_all(pool)
            .await
            .map_err(AppError::from)
        }
        (Some(workspace_id), None) => {
            sqlx::query_as::<_, Idea>(
                "SELECT * FROM ideas WHERE workspace_id = ? ORDER BY updated_at DESC",
            )
            .bind(workspace_id)
            .fetch_all(pool)
            .await
            .map_err(AppError::from)
        }
        (None, Some(project_id)) => {
            sqlx::query_as::<_, Idea>(
                "SELECT * FROM ideas WHERE project_id = ? ORDER BY updated_at DESC",
            )
            .bind(project_id)
            .fetch_all(pool)
            .await
            .map_err(AppError::from)
        }
        (None, None) => {
            sqlx::query_as::<_, Idea>("SELECT * FROM ideas ORDER BY updated_at DESC")
                .fetch_all(pool)
                .await
                .map_err(AppError::from)
        }
    }
}

pub async fn create_idea(pool: &SqlitePool, payload: CreateIdeaPayload) -> Result<Idea, AppError> {
    let id = new_id();
    let ts = now();
    let current_role_key = payload.source_role_key.clone();
    sqlx::query(
        "INSERT INTO ideas (
            id, workspace_id, project_id, title, content, source_role_key, status,
            assessment_summary, current_role_key, next_role_key, created_by_account_id,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'draft', '', ?, '', ?, ?, ?)",
    )
    .bind(&id)
    .bind(payload.workspace_id)
    .bind(payload.project_id)
    .bind(payload.title.trim())
    .bind(payload.content)
    .bind(payload.source_role_key)
    .bind(current_role_key)
    .bind(payload.created_by_account_id)
    .bind(ts)
    .bind(ts)
    .execute(pool)
    .await?;

    get_idea(pool, &id).await
}

pub async fn get_idea(pool: &SqlitePool, id: &str) -> Result<Idea, AppError> {
    sqlx::query_as::<_, Idea>("SELECT * FROM ideas WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Idea not found: {id}")))
}

pub async fn update_idea_status(
    pool: &SqlitePool,
    payload: UpdateIdeaStatusPayload,
) -> Result<Idea, AppError> {
    let before = get_idea(pool, &payload.id).await?;
    let ts = now();
    let assessment_summary = payload
        .assessment_summary
        .unwrap_or_else(|| before.assessment_summary.clone());
    let current_role_key = payload
        .current_role_key
        .unwrap_or_else(|| before.current_role_key.clone());
    let next_role_key = payload
        .next_role_key
        .unwrap_or_else(|| before.next_role_key.clone());

    sqlx::query(
        "UPDATE ideas
         SET status = ?, assessment_summary = ?, current_role_key = ?, next_role_key = ?, updated_at = ?
         WHERE id = ?",
    )
    .bind(&payload.status)
    .bind(assessment_summary)
    .bind(&current_role_key)
    .bind(&next_role_key)
    .bind(ts)
    .bind(&payload.id)
    .execute(pool)
    .await?;

    if !next_role_key.is_empty() {
        sqlx::query(
            "INSERT INTO handoffs (
                id, idea_id, from_role_key, to_role_key, status_from, status_to,
                note, created_by_account_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(new_id())
        .bind(&payload.id)
        .bind(before.current_role_key)
        .bind(next_role_key)
        .bind(before.status)
        .bind(&payload.status)
        .bind(payload.note.unwrap_or_default())
        .bind(payload.actor_account_id)
        .bind(ts)
        .execute(pool)
        .await?;
    }

    get_idea(pool, &payload.id).await
}

pub async fn list_artifacts(pool: &SqlitePool, idea_id: &str) -> Result<Vec<Artifact>, AppError> {
    sqlx::query_as::<_, Artifact>(
        "SELECT * FROM artifacts WHERE idea_id = ? ORDER BY updated_at DESC",
    )
    .bind(idea_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

pub async fn create_artifact(
    pool: &SqlitePool,
    payload: CreateArtifactPayload,
) -> Result<Artifact, AppError> {
    let id = new_id();
    let ts = now();
    let status = payload.status.unwrap_or_else(|| "draft".into());
    sqlx::query(
        "INSERT INTO artifacts (
            id, idea_id, artifact_type, title, content, role_key, status,
            created_by_account_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(payload.idea_id)
    .bind(payload.artifact_type)
    .bind(payload.title)
    .bind(payload.content)
    .bind(payload.role_key)
    .bind(status)
    .bind(payload.created_by_account_id)
    .bind(ts)
    .bind(ts)
    .execute(pool)
    .await?;

    sqlx::query_as::<_, Artifact>("SELECT * FROM artifacts WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
}
