CREATE TABLE IF NOT EXISTS file_checkpoints (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    old_hash TEXT NOT NULL,
    old_content TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_conv ON file_checkpoints(conversation_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_path ON file_checkpoints(file_path);
