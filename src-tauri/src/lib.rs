mod db;
mod error;
mod models;
mod state;

mod commands;
mod tools;
mod ai;
mod indexing;

use state::AppState;
use tauri::Manager;

use commands::project_commands;
use commands::file_commands;
use commands::knowledge_commands;
use commands::skill_commands;
use commands::chat_commands;
use commands::settings_commands;
use commands::ai_commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("你好，{}！欢迎使用 AutoForge", name)
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
                .add_migrations("sqlite:autoforge.db", migrations)
                .build(),
        )
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match db::init_database(&handle).await {
                    Ok(pool) => {
                        handle.manage(AppState::new(pool));
                        println!("[AutoForge] AppState initialized");
                    }
                    Err(e) => {
                        eprintln!("[AutoForge] Database init failed: {}", e);
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running AutoForge");
}
