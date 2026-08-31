use async_trait::async_trait;
use remote_protocol::traits::{validate_sandboxed_path, FileProvider, PlatformError};
use remote_protocol::{FileItem, VirtualRoot};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tracing::info;

#[derive(Debug, Clone)]
pub struct VirtualRootConfig {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub path_alias: String,
}

#[derive(Clone)]
pub struct StandardFileProvider {
    roots: Arc<Mutex<Vec<VirtualRootConfig>>>,
}

impl StandardFileProvider {
    pub fn new() -> Self {
        let mut roots = Vec::new();

        // Auto-discover user standard directories
        #[cfg(windows)]
        {
            if let Ok(user_profile) = std::env::var("USERPROFILE") {
                let user_path = PathBuf::from(&user_profile);

                let desktop = user_path.join("Desktop");
                if desktop.exists() {
                    roots.push(VirtualRootConfig {
                        id: "root_desktop".to_string(),
                        name: "Desktop".to_string(),
                        path: desktop,
                        path_alias: "~/Desktop".to_string(),
                    });
                }

                let downloads = user_path.join("Downloads");
                if downloads.exists() {
                    roots.push(VirtualRootConfig {
                        id: "root_downloads".to_string(),
                        name: "Downloads".to_string(),
                        path: downloads,
                        path_alias: "~/Downloads".to_string(),
                    });
                }

                let documents = user_path.join("Documents");
                if documents.exists() {
                    roots.push(VirtualRootConfig {
                        id: "root_documents".to_string(),
                        name: "Documents".to_string(),
                        path: documents,
                        path_alias: "~/Documents".to_string(),
                    });
                }

                let pictures = user_path.join("Pictures");
                if pictures.exists() {
                    roots.push(VirtualRootConfig {
                        id: "root_pictures".to_string(),
                        name: "Pictures".to_string(),
                        path: pictures,
                        path_alias: "~/Pictures".to_string(),
                    });
                }

                roots.push(VirtualRootConfig {
                    id: "root_user".to_string(),
                    name: "User Home".to_string(),
                    path: user_path,
                    path_alias: "~".to_string(),
                });
            }
        }

        #[cfg(not(windows))]
        {
            if let Ok(home) = std::env::var("HOME") {
                let home_path = PathBuf::from(&home);

                let desktop = home_path.join("Desktop");
                if desktop.exists() {
                    roots.push(VirtualRootConfig {
                        id: "root_desktop".to_string(),
                        name: "Desktop".to_string(),
                        path: desktop,
                        path_alias: "~/Desktop".to_string(),
                    });
                }

                let downloads = home_path.join("Downloads");
                if downloads.exists() {
                    roots.push(VirtualRootConfig {
                        id: "root_downloads".to_string(),
                        name: "Downloads".to_string(),
                        path: downloads,
                        path_alias: "~/Downloads".to_string(),
                    });
                }

                let documents = home_path.join("Documents");
                if documents.exists() {
                    roots.push(VirtualRootConfig {
                        id: "root_documents".to_string(),
                        name: "Documents".to_string(),
                        path: documents,
                        path_alias: "~/Documents".to_string(),
                    });
                }

                roots.push(VirtualRootConfig {
                    id: "root_home".to_string(),
                    name: "Home Directory".to_string(),
                    path: home_path,
                    path_alias: "~".to_string(),
                });
            }
        }

        // Fallback if no user directories were discovered (e.g. CI / container)
        if roots.is_empty() {
            let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            roots.push(VirtualRootConfig {
                id: "root_workspace".to_string(),
                name: "Workspace Directory".to_string(),
                path: current_dir,
                path_alias: "./".to_string(),
            });
        }

        info!(
            "StandardFileProvider initialized with {} roots",
            roots.len()
        );

        Self {
            roots: Arc::new(Mutex::new(roots)),
        }
    }

    pub fn add_custom_root(&self, id: String, name: String, path: PathBuf, path_alias: String) {
        if path.exists() {
            let mut roots = self.roots.lock().unwrap();
            roots.retain(|r| r.id != id);
            roots.push(VirtualRootConfig {
                id,
                name,
                path,
                path_alias,
            });
        }
    }

    fn find_root(&self, root_id: &str) -> Result<VirtualRootConfig, PlatformError> {
        let roots = self.roots.lock().unwrap();
        roots
            .iter()
            .find(|r| r.id == root_id)
            .cloned()
            .ok_or_else(|| PlatformError::NotFound(format!("Root ID '{}' not found", root_id)))
    }
}

impl Default for StandardFileProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl FileProvider for StandardFileProvider {
    async fn list_roots(&self) -> Result<Vec<VirtualRoot>, PlatformError> {
        let roots = self.roots.lock().unwrap();
        Ok(roots
            .iter()
            .map(|r| VirtualRoot {
                id: r.id.clone(),
                name: r.name.clone(),
                path_alias: r.path_alias.clone(),
            })
            .collect())
    }

    async fn browse(
        &self,
        root_id: &str,
        subpath: Option<&str>,
    ) -> Result<Vec<FileItem>, PlatformError> {
        let root = self.find_root(root_id)?;
        let target_dir = validate_sandboxed_path(&root.path, subpath.unwrap_or(""))?;

        if !target_dir.is_dir() {
            return Err(PlatformError::NotFound(format!(
                "Path is not a directory: {:?}",
                target_dir
            )));
        }

        let mut read_dir = tokio::fs::read_dir(&target_dir)
            .await
            .map_err(|e| PlatformError::ExecutionFailed(e.to_string()))?;

        let mut items = Vec::new();

        while let Ok(Some(entry)) = read_dir.next_entry().await {
            let file_name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden files/folders by default
            if file_name.starts_with('.') {
                continue;
            }

            let metadata = entry.metadata().await.ok();
            let is_dir = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
            let size_bytes = metadata.as_ref().map(|m| m.len());
            let modified_at = metadata.as_ref().and_then(|m| {
                m.modified().ok().and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH)
                        .ok()
                        .map(|d| d.as_secs())
                })
            });

            let extension = if is_dir {
                None
            } else {
                std::path::Path::new(&file_name)
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .map(|s| s.to_lowercase())
            };

            let item_id = match subpath {
                Some(sub) if !sub.is_empty() => {
                    format!("{}/{}/{}", root_id, sub.trim_matches('/'), file_name)
                }
                _ => format!("{}/{}", root_id, file_name),
            };

            items.push(FileItem {
                id: item_id,
                name: file_name,
                is_dir,
                size_bytes,
                modified_at,
                extension,
            });
        }

        // Sort: directories first, then alphabetical
        items.sort_by(|a, b| match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        });

        Ok(items)
    }

    async fn read_file(&self, root_id: &str, subpath: &str) -> Result<Vec<u8>, PlatformError> {
        let root = self.find_root(root_id)?;
        let target_path = validate_sandboxed_path(&root.path, subpath)?;

        if !target_path.is_file() {
            return Err(PlatformError::NotFound(format!(
                "File not found or is a directory: {:?}",
                target_path
            )));
        }

        tokio::fs::read(&target_path)
            .await
            .map_err(|e| PlatformError::ExecutionFailed(e.to_string()))
    }

    async fn write_file(
        &self,
        root_id: &str,
        subpath: &str,
        data: &[u8],
    ) -> Result<(), PlatformError> {
        let root = self.find_root(root_id)?;
        let target_path = validate_sandboxed_path(&root.path, subpath)?;

        if let Some(parent) = target_path.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }

        tokio::fs::write(&target_path, data)
            .await
            .map_err(|e| PlatformError::ExecutionFailed(e.to_string()))
    }

    async fn delete_file(&self, root_id: &str, subpath: &str) -> Result<(), PlatformError> {
        let root = self.find_root(root_id)?;
        let target_path = validate_sandboxed_path(&root.path, subpath)?;

        if target_path.is_dir() {
            tokio::fs::remove_dir_all(&target_path)
                .await
                .map_err(|e| PlatformError::ExecutionFailed(e.to_string()))
        } else {
            tokio::fs::remove_file(&target_path)
                .await
                .map_err(|e| PlatformError::ExecutionFailed(e.to_string()))
        }
    }
}
