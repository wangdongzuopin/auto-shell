use tauri::State;

use crate::db::workflow_repo;
use crate::error::AppError;
use crate::models::{
    Artifact, CreateArtifactPayload, CreateIdeaPayload, CreateWorkspacePayload, Idea, RoleProfile,
    UpdateIdeaStatusPayload, Workspace,
};
use crate::AppState;

#[tauri::command]
pub async fn list_workspaces(state: State<'_, AppState>) -> Result<Vec<Workspace>, AppError> {
    workflow_repo::list_workspaces(&state.pool).await
}

#[tauri::command]
pub async fn create_workspace(
    state: State<'_, AppState>,
    payload: CreateWorkspacePayload,
) -> Result<Workspace, AppError> {
    workflow_repo::create_workspace(&state.pool, payload).await
}

#[tauri::command]
pub async fn list_role_profiles(
    state: State<'_, AppState>,
    workspace_id: Option<String>,
) -> Result<Vec<RoleProfile>, AppError> {
    workflow_repo::list_role_profiles(&state.pool, workspace_id.as_deref()).await
}

#[tauri::command]
pub async fn list_ideas(
    state: State<'_, AppState>,
    workspace_id: Option<String>,
    project_id: Option<String>,
) -> Result<Vec<Idea>, AppError> {
    workflow_repo::list_ideas(&state.pool, workspace_id.as_deref(), project_id.as_deref()).await
}

#[tauri::command]
pub async fn create_idea(
    state: State<'_, AppState>,
    payload: CreateIdeaPayload,
) -> Result<Idea, AppError> {
    workflow_repo::create_idea(&state.pool, payload).await
}

#[tauri::command]
pub async fn update_idea_status(
    state: State<'_, AppState>,
    payload: UpdateIdeaStatusPayload,
) -> Result<Idea, AppError> {
    workflow_repo::update_idea_status(&state.pool, payload).await
}

#[tauri::command]
pub async fn list_artifacts(
    state: State<'_, AppState>,
    idea_id: String,
) -> Result<Vec<Artifact>, AppError> {
    workflow_repo::list_artifacts(&state.pool, &idea_id).await
}

#[tauri::command]
pub async fn create_artifact(
    state: State<'_, AppState>,
    payload: CreateArtifactPayload,
) -> Result<Artifact, AppError> {
    workflow_repo::create_artifact(&state.pool, payload).await
}
