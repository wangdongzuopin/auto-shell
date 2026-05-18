mod crypto;
mod db;
mod error;
mod git;
mod mcp;
mod models;
mod state;
mod terminal;

pub use terminal::TerminalEvent;

mod ai;
mod commands;
mod indexing;
mod tools;

use state::AppState;
use tauri::Manager;

use commands::project_commands;
use commands::file_commands;
use commands::knowledge_commands;
use commands::skill_commands;
use commands::chat_commands;
use commands::settings_commands;
use commands::ai_commands;
use commands::mcp_commands;
use commands::terminal_commands;
use commands::git_commands;
use commands::undo_commands;
use commands::workflow_commands;

fn load_encryption_key(legacy_path: &std::path::Path) -> [u8; 32] {
    // Primary storage: OS credential manager via keyring
    let kr = keyring::Entry::new("pizz", "encryption-key")
        .expect("Failed to access system credential manager");

    // 1. Key already in credential manager
    if let Ok(password) = kr.get_password() {
        if let Ok(bytes) = crate::crypto::base64_decode(&password) {
            if let Ok(key) = bytes.try_into() {
                return key;
            }
        }
        // Corrupt entry — delete and re-create
        let _ = kr.delete_credential();
    }

    // 2. Migrate from legacy flat file (v0.1.0)
    if legacy_path.exists() {
        if let Ok(bytes) = std::fs::read(legacy_path) {
            if let Ok(key) = <[u8; 32]>::try_from(bytes) {
                let encoded = crate::crypto::base64_encode(&key);
                if kr.set_password(&encoded).is_ok() {
                    let _ = std::fs::remove_file(legacy_path);
                    println!("[pizz] Migrated encryption key to system credential manager");
                }
                return key;
            }
        }
        // Unreadable legacy file — remove it
        let _ = std::fs::remove_file(legacy_path);
    }

    // 3. Fresh key — generate + store in credential manager
    let key = crate::crypto::generate_key();
    let encoded = crate::crypto::base64_encode(&key);
    match kr.set_password(&encoded) {
        Ok(()) => println!("[pizz] Stored new encryption key in system credential manager"),
        Err(e) => eprintln!("[pizz] WARNING: Failed to persist key to credential manager ({e}). Key held in memory only for this session."),
    }
    key
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = db::get_migrations();

    tauri::Builder::default()
        .plugin(tauri_plugin_cors_fetch::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:pizz.db", migrations)
                .build(),
        )
        .setup(|app| {
            let handle = app.handle().clone();

            let key_path = app.path().app_data_dir().unwrap().join(".pizz_key");

            let encryption_key = load_encryption_key(&key_path);

            tauri::async_runtime::spawn(async move {
                match db::init_database(&handle).await {
                    Ok(pool) => {
                        handle.manage(AppState::new(pool, encryption_key));
                        println!("[pizz] AppState initialized");
                    }
                    Err(e) => {
                        eprintln!("[pizz] Database init failed: {}", e);
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Project commands
            project_commands::list_projects,
            project_commands::get_project,
            project_commands::create_project,
            project_commands::update_project,
            project_commands::delete_project,
            // File commands
            file_commands::read_file,
            file_commands::write_file,
            file_commands::list_directory,
            file_commands::search_files,
            // Chat commands
            chat_commands::list_conversations,
            chat_commands::create_conversation,
            chat_commands::delete_conversation,
            chat_commands::list_messages,
            chat_commands::add_message,
            // Knowledge commands
            knowledge_commands::list_knowledge,
            knowledge_commands::get_knowledge,
            knowledge_commands::create_knowledge,
            knowledge_commands::update_knowledge,
            knowledge_commands::delete_knowledge,
            knowledge_commands::search_knowledge,
            // Skill commands
            skill_commands::list_skills,
            skill_commands::list_enabled_skills,
            skill_commands::list_skills_by_role,
            skill_commands::get_skill,
            skill_commands::create_skill,
            skill_commands::update_skill,
            skill_commands::toggle_skill,
            skill_commands::delete_skill,
            // Settings commands
            settings_commands::get_setting,
            settings_commands::set_setting,
            // AI commands
            ai_commands::stream_ai_chat,
            // MCP commands
            mcp_commands::list_mcp_servers,
            mcp_commands::add_mcp_server,
            mcp_commands::remove_mcp_server,
            mcp_commands::start_mcp_server,
            mcp_commands::stop_mcp_server,
            mcp_commands::get_mcp_tools,
            mcp_commands::reconnect_mcp_servers,
            // Terminal commands
            terminal_commands::terminal_spawn,
            terminal_commands::terminal_write,
            terminal_commands::terminal_resize,
            terminal_commands::terminal_kill,
            // Git commands
            git_commands::git_status,
            git_commands::git_diff,
            git_commands::git_log,
            git_commands::git_commit_suggestion,
            // Undo commands
            undo_commands::undo_last_edit,
            undo_commands::list_checkpoints,
            undo_commands::clear_checkpoints,
            // Team workflow commands
            workflow_commands::list_workspaces,
            workflow_commands::create_workspace,
            workflow_commands::list_role_profiles,
            workflow_commands::list_ideas,
            workflow_commands::create_idea,
            workflow_commands::update_idea_status,
            workflow_commands::list_artifacts,
            workflow_commands::create_artifact,
        ])
        .run(tauri::generate_context!())
        .expect("error while running pizz");
}
