use tauri::State;
use crate::AppState;
use crate::error::AppError;
use crate::db::settings_repo;

const SETTINGS_KEY: &str = "app_settings";
const API_KEY_PATH: &str = "apiKey";

/// Encrypt the `ai.apiKey` field within the settings JSON before storing.
fn encrypt_api_key(json: &str, key_bytes: &[u8; 32]) -> Result<String, String> {
    let mut root: serde_json::Value =
        serde_json::from_str(json).map_err(|e| format!("json parse: {e}"))?;
    if let Some(api_key) = root["ai"][API_KEY_PATH].as_str() {
        if !api_key.is_empty() {
            let encrypted = crate::crypto::encrypt(api_key, key_bytes)?;
            root["ai"][API_KEY_PATH] = serde_json::json!(encrypted);
        }
    }
    Ok(root.to_string())
}

/// Decrypt the `ai.apiKey` field within the settings JSON when reading.
fn decrypt_api_key(json: &str, key_bytes: &[u8; 32]) -> Result<String, String> {
    let mut root: serde_json::Value =
        serde_json::from_str(json).map_err(|e| format!("json parse: {e}"))?;
    if let Some(api_key) = root["ai"][API_KEY_PATH].as_str() {
        if !api_key.is_empty() {
            let decrypted = crate::crypto::decrypt(api_key, key_bytes)?;
            root["ai"][API_KEY_PATH] = serde_json::json!(decrypted);
        }
    }
    Ok(root.to_string())
}

#[tauri::command]
pub async fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, AppError> {
    let raw = settings_repo::get(&state.pool, &key).await?;
    match raw {
        Some(json) if key == SETTINGS_KEY => {
            match decrypt_api_key(&json, &state.encryption_key) {
                Ok(decrypted) => Ok(Some(decrypted)),
                Err(_) => Ok(Some(json)), // fallback: return as-is (may be unencrypted legacy data)
            }
        }
        other => Ok(other),
    }
}

#[tauri::command]
pub async fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), AppError> {
    let stored = if key == SETTINGS_KEY {
        encrypt_api_key(&value, &state.encryption_key)
            .map_err(|e| AppError::Other(e))?
    } else {
        value
    };
    settings_repo::set(&state.pool, &key, &stored).await
}
