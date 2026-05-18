use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub id: String,
    pub project_id: String,
    pub path: String,
    pub hash: String,
    pub size: i64,
    pub modified_at: i64,
    pub indexed_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub hash: String,
    pub size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryListing {
    pub path: String,
    pub entries: Vec<DirEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_content_serialize() {
        let fc = FileContent {
            path: "/tmp/test.txt".into(),
            content: "hello".into(),
            hash: "abc123".into(),
            size: 5,
        };
        let json = serde_json::to_string(&fc).unwrap();
        let back: FileContent = serde_json::from_str(&json).unwrap();
        assert_eq!(back.path, "/tmp/test.txt");
        assert_eq!(back.content, "hello");
    }

    #[test]
    fn dir_entry_serialize() {
        let entry = DirEntry {
            name: "src".into(),
            path: "/proj/src".into(),
            is_dir: true,
            size: 0,
        };
        let json = serde_json::to_string(&entry).unwrap();
        let back: DirEntry = serde_json::from_str(&json).unwrap();
        assert!(back.is_dir);
        assert_eq!(back.name, "src");
    }

    #[test]
    fn directory_listing_serialize() {
        let listing = DirectoryListing {
            path: "/proj".into(),
            entries: vec![
                DirEntry { name: "file.rs".into(), path: "/proj/file.rs".into(), is_dir: false, size: 100 },
            ],
        };
        let json = serde_json::to_string(&listing).unwrap();
        let back: DirectoryListing = serde_json::from_str(&json).unwrap();
        assert_eq!(back.entries.len(), 1);
    }
}
