use notify::{Event, RecursiveMode, Watcher, Config};
use std::path::PathBuf;

pub fn start_watcher(project_id: String, project_path: String) -> Result<(), String> {
    let (tx, mut rx) = std::sync::mpsc::channel();
    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        if let Ok(event) = res {
            let _ = tx.send(event);
        }
    }).map_err(|e| e.to_string())?;

    watcher.watch(PathBuf::from(&project_path).as_path(), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Spawn a thread to handle events
    std::thread::spawn(move || {
        for event in rx {
            if event.kind.is_modify() || event.kind.is_create() {
                for path in event.paths {
                    println!("[AutoForge] File changed: {} (project: {})", path.display(), project_id);
                }
            }
        }
    });

    // Keep watcher alive
    std::mem::forget(watcher);
    Ok(())
}
