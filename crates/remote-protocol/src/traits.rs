use crate::messages::{DisplayInfo, FileItem, ForegroundAppState, MediaSessionState, VirtualRoot};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug, Clone, Serialize, Deserialize)]
pub enum PlatformError {
    #[error("Not supported on current platform: {0}")]
    NotSupported(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("Entity not found: {0}")]
    NotFound(String),
    #[error("Operation failed: {0}")]
    ExecutionFailed(String),
    #[error("Path traversal / symlink escape detected: {0}")]
    PathTraversal(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    pub id: String,
    pub title: String,
    #[serde(rename = "processName")]
    pub process_name: String,
    #[serde(rename = "displayIndex")]
    pub display_index: u32,
    #[serde(rename = "isMaximized")]
    pub is_maximized: bool,
    #[serde(rename = "isMinimized")]
    pub is_minimized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub id: String,
    pub name: String,
    #[serde(rename = "executablePath")]
    pub executable_path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}

#[async_trait]
pub trait InputProvider: Send + Sync {
    async fn pointer_move_relative(&self, dx: f32, dy: f32) -> Result<(), PlatformError>;
    async fn pointer_button(&self, button: &str, state: &str) -> Result<(), PlatformError>;
    async fn pointer_scroll(&self, dx: f32, dy: f32) -> Result<(), PlatformError>;
    async fn key_action(
        &self,
        key: &str,
        state: &str,
        modifiers: &[String],
    ) -> Result<(), PlatformError>;
    async fn text_stream(&self, text: &str) -> Result<(), PlatformError>;
    /// Release all stuck modifier keys (Ctrl, Alt, Shift, Win) and mouse buttons on disconnect
    async fn release_all_inputs(&self) -> Result<(), PlatformError>;
}

#[async_trait]
pub trait MediaProvider: Send + Sync {
    async fn media_command(&self, action: &str, value: Option<f32>) -> Result<(), PlatformError>;
    async fn get_media_state(&self) -> Result<Option<MediaSessionState>, PlatformError>;
}

#[async_trait]
pub trait PresentationProvider: Send + Sync {
    async fn presentation_command(
        &self,
        action: &str,
        slide_index: Option<u32>,
    ) -> Result<(), PlatformError>;
}

#[async_trait]
pub trait WindowManager: Send + Sync {
    async fn get_windows(&self) -> Result<Vec<WindowInfo>, PlatformError>;
    async fn window_action(
        &self,
        window_id: &str,
        action: &str,
        target_display: Option<u32>,
    ) -> Result<(), PlatformError>;
    async fn get_foreground_app(&self) -> Result<Option<ForegroundAppState>, PlatformError>;
    async fn get_displays(&self) -> Result<Vec<DisplayInfo>, PlatformError>;
}

#[async_trait]
pub trait AppLauncher: Send + Sync {
    async fn launch_app(&self, app_id: &str) -> Result<(), PlatformError>;
    async fn list_apps(&self) -> Result<Vec<AppInfo>, PlatformError>;
}

#[async_trait]
pub trait ClipboardProvider: Send + Sync {
    async fn get_clipboard_text(&self) -> Result<String, PlatformError>;
    async fn set_clipboard_text(&self, text: &str) -> Result<(), PlatformError>;
}

#[async_trait]
pub trait FileProvider: Send + Sync {
    async fn list_roots(&self) -> Result<Vec<VirtualRoot>, PlatformError>;
    async fn browse(
        &self,
        root_id: &str,
        subpath: Option<&str>,
    ) -> Result<Vec<FileItem>, PlatformError>;
    async fn read_file(&self, root_id: &str, subpath: &str) -> Result<Vec<u8>, PlatformError>;
    async fn write_file(
        &self,
        root_id: &str,
        subpath: &str,
        data: &[u8],
    ) -> Result<(), PlatformError>;
    async fn delete_file(&self, root_id: &str, subpath: &str) -> Result<(), PlatformError>;
}

#[async_trait]
pub trait PowerProvider: Send + Sync {
    async fn power_command(&self, action: &str) -> Result<(), PlatformError>;
}

/// Security helper to validate canonical paths and prevent symlink/junction escape
pub fn validate_sandboxed_path(root: &Path, subpath: &str) -> Result<PathBuf, PlatformError> {
    // 1. Disallow raw parent traversal indicators
    let clean_subpath = subpath.trim_start_matches(['/', '\\']);
    if clean_subpath.contains("..") {
        return Err(PlatformError::PathTraversal(
            "Parent path traversal (..) forbidden".to_string(),
        ));
    }

    let joined = root.join(clean_subpath);

    // If file exists, check canonical path
    if joined.exists() {
        let canonical_target = joined
            .canonicalize()
            .map_err(|e| PlatformError::ExecutionFailed(e.to_string()))?;
        let canonical_root = root
            .canonicalize()
            .map_err(|e| PlatformError::ExecutionFailed(e.to_string()))?;

        if !canonical_target.starts_with(&canonical_root) {
            return Err(PlatformError::PathTraversal(format!(
                "Symlink / junction escape detected: {:?} is outside root {:?}",
                canonical_target, canonical_root
            )));
        }
        Ok(canonical_target)
    } else {
        Ok(joined)
    }
}
