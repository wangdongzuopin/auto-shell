pub mod project_repo;
pub mod chat_repo;
pub mod knowledge_repo;
pub mod skill_repo;
pub mod search_repo;
pub mod settings_repo;
pub mod checkpoint_repo;

use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: include_str!("../../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add skill role and built-in skills",
            sql: include_str!("../../migrations/002_skill_role.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create file checkpoints table",
            sql: include_str!("../../migrations/003_checkpoints.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

pub async fn init_database(app: &AppHandle) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let app_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("pizz.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePool::connect(&db_url).await?;

    // Run migrations manually since tauri-plugin-sql manages its own pool
    sqlx::query(include_str!("../../migrations/001_initial.sql"))
        .execute(&pool)
        .await?;

    // Run v2 migration (ALTER TABLE may fail if column exists — ignore)
    let _ = sqlx::query(include_str!("../../migrations/002_skill_role.sql"))
        .execute(&pool)
        .await;

    // Run v3 migration (CREATE TABLE IF NOT EXISTS)
    let _ = sqlx::query(include_str!("../../migrations/003_checkpoints.sql"))
        .execute(&pool)
        .await;

    println!("[pizz] Database initialized at {}", db_path.display());
    Ok(pool)
}
