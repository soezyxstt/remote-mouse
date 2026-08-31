use async_trait::async_trait;
use remote_protocol::traits::*;
use remote_protocol::{DisplayInfo, FileItem, ForegroundAppState, MediaSessionState, VirtualRoot};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone)]
pub struct MockPlatformState {
    pub cursor_pos: (f32, f32),
    pub pointer_history: Vec<(f32, f32)>,
    pub button_history: Vec<(String, String)>,
    pub key_history: Vec<(String, String, Vec<String>)>,
    pub text_history: Vec<String>,
    pub all_inputs_released: bool,
    pub media_state: Option<MediaSessionState>,
    pub media_history: Vec<(String, Option<f32>)>,
    pub presentation_history: Vec<(String, Option<u32>)>,
    pub foreground_app: Option<ForegroundAppState>,
    pub clipboard_text: String,
    pub virtual_files: HashMap<String, Vec<u8>>,
    pub launched_apps: Vec<String>,
    pub window_actions: Vec<(String, String, Option<u32>)>,
    pub power_actions: Vec<String>,
}

impl Default for MockPlatformState {
    fn default() -> Self {
        let mut virtual_files = HashMap::new();
        virtual_files.insert(
            "root_desktop/hello.txt".to_string(),
            b"Hello from remote companion!".to_vec(),
        );
        virtual_files.insert(
            "root_downloads/presentation.pptx".to_string(),
            b"Sample presentation content".to_vec(),
        );

        Self {
            cursor_pos: (500.0, 500.0),
            pointer_history: Vec::new(),
            button_history: Vec::new(),
            key_history: Vec::new(),
            text_history: Vec::new(),
            all_inputs_released: false,
            media_state: Some(MediaSessionState {
                title: "Bohemian Rhapsody".to_string(),
                artist: "Queen".to_string(),
                album: Some("A Night at the Opera".to_string()),
                is_playing: true,
                position_sec: 124.0,
                duration_sec: 354.0,
                volume: 0.8,
                source_app: Some("Spotify".to_string()),
            }),
            media_history: Vec::new(),
            presentation_history: Vec::new(),
            foreground_app: Some(ForegroundAppState {
                process_name: "Code.exe".to_string(),
                window_title: "remote-mouse - Visual Studio Code".to_string(),
                category: "development".to_string(),
            }),
            clipboard_text: "https://github.com/example/remote-mouse".to_string(),
            virtual_files,
            launched_apps: Vec::new(),
            window_actions: Vec::new(),
            power_actions: Vec::new(),
        }
    }
}

#[derive(Clone, Default)]
pub struct MockPlatform {
    pub state: Arc<Mutex<MockPlatformState>>,
}

impl MockPlatform {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(MockPlatformState::default())),
        }
    }
}

#[async_trait]
impl InputProvider for MockPlatform {
    async fn pointer_move_relative(&self, dx: f32, dy: f32) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state.cursor_pos.0 += dx;
        state.cursor_pos.1 += dy;
        state.pointer_history.push((dx, dy));
        Ok(())
    }

    async fn pointer_button(&self, button: &str, btn_state: &str) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state
            .button_history
            .push((button.to_string(), btn_state.to_string()));
        Ok(())
    }

    async fn pointer_scroll(&self, dx: f32, dy: f32) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state.pointer_history.push((dx, dy));
        Ok(())
    }

    async fn key_action(
        &self,
        key: &str,
        key_state: &str,
        modifiers: &[String],
    ) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state
            .key_history
            .push((key.to_string(), key_state.to_string(), modifiers.to_vec()));
        Ok(())
    }

    async fn text_stream(&self, text: &str) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state.text_history.push(text.to_string());
        Ok(())
    }

    async fn release_all_inputs(&self) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state.all_inputs_released = true;
        Ok(())
    }
}

#[async_trait]
impl MediaProvider for MockPlatform {
    async fn media_command(&self, action: &str, value: Option<f32>) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state.media_history.push((action.to_string(), value));
        if let Some(ref mut media) = state.media_state {
            match action {
                "play" => media.is_playing = true,
                "pause" => media.is_playing = false,
                "play_pause" => media.is_playing = !media.is_playing,
                "set_volume" => {
                    if let Some(v) = value {
                        media.volume = v.clamp(0.0, 1.0);
                    }
                }
                "seek" => {
                    if let Some(pos) = value {
                        media.position_sec = pos;
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }

    async fn get_media_state(&self) -> Result<Option<MediaSessionState>, PlatformError> {
        let state = self.state.lock().unwrap();
        Ok(state.media_state.clone())
    }
}

#[async_trait]
impl PresentationProvider for MockPlatform {
    async fn presentation_command(
        &self,
        action: &str,
        slide_index: Option<u32>,
    ) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state
            .presentation_history
            .push((action.to_string(), slide_index));
        Ok(())
    }
}

#[async_trait]
impl WindowManager for MockPlatform {
    async fn get_windows(&self) -> Result<Vec<WindowInfo>, PlatformError> {
        Ok(vec![
            WindowInfo {
                id: "win_1".to_string(),
                title: "Visual Studio Code".to_string(),
                process_name: "Code.exe".to_string(),
                display_index: 0,
                is_maximized: true,
                is_minimized: false,
            },
            WindowInfo {
                id: "win_2".to_string(),
                title: "Google Chrome - GitHub".to_string(),
                process_name: "chrome.exe".to_string(),
                display_index: 0,
                is_maximized: false,
                is_minimized: false,
            },
        ])
    }

    async fn window_action(
        &self,
        window_id: &str,
        action: &str,
        target_display: Option<u32>,
    ) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state
            .window_actions
            .push((window_id.to_string(), action.to_string(), target_display));
        Ok(())
    }

    async fn get_foreground_app(&self) -> Result<Option<ForegroundAppState>, PlatformError> {
        let state = self.state.lock().unwrap();
        Ok(state.foreground_app.clone())
    }

    async fn get_displays(&self) -> Result<Vec<DisplayInfo>, PlatformError> {
        Ok(vec![
            DisplayInfo {
                index: 0,
                name: "Primary Monitor (2560x1440)".to_string(),
                width: 2560,
                height: 1440,
                is_primary: true,
                x: 0,
                y: 0,
                scale_factor: 1.5,
            },
            DisplayInfo {
                index: 1,
                name: "Secondary Monitor (1920x1080)".to_string(),
                width: 1920,
                height: 1080,
                is_primary: false,
                x: 2560,
                y: 0,
                scale_factor: 1.0,
            },
        ])
    }
}

#[async_trait]
impl AppLauncher for MockPlatform {
    async fn launch_app(&self, app_id: &str) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state.launched_apps.push(app_id.to_string());
        Ok(())
    }

    async fn list_apps(&self) -> Result<Vec<AppInfo>, PlatformError> {
        Ok(vec![
            AppInfo {
                id: "vscode".to_string(),
                name: "Visual Studio Code".to_string(),
                executable_path: "C:\\Program Files\\VS Code\\Code.exe".to_string(),
                icon: Some("code".to_string()),
            },
            AppInfo {
                id: "chrome".to_string(),
                name: "Google Chrome".to_string(),
                executable_path: "C:\\Program Files\\Google\\Chrome\\chrome.exe".to_string(),
                icon: Some("globe".to_string()),
            },
            AppInfo {
                id: "spotify".to_string(),
                name: "Spotify".to_string(),
                executable_path: "C:\\Users\\User\\AppData\\Roaming\\Spotify\\Spotify.exe"
                    .to_string(),
                icon: Some("music".to_string()),
            },
        ])
    }
}

#[async_trait]
impl ClipboardProvider for MockPlatform {
    async fn get_clipboard_text(&self) -> Result<String, PlatformError> {
        let state = self.state.lock().unwrap();
        Ok(state.clipboard_text.clone())
    }

    async fn set_clipboard_text(&self, text: &str) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state.clipboard_text = text.to_string();
        Ok(())
    }
}

#[async_trait]
impl FileProvider for MockPlatform {
    async fn list_roots(&self) -> Result<Vec<VirtualRoot>, PlatformError> {
        Ok(vec![
            VirtualRoot {
                id: "root_desktop".to_string(),
                name: "Desktop".to_string(),
                path_alias: "~/Desktop".to_string(),
            },
            VirtualRoot {
                id: "root_downloads".to_string(),
                name: "Downloads".to_string(),
                path_alias: "~/Downloads".to_string(),
            },
        ])
    }

    async fn browse(
        &self,
        root_id: &str,
        _subpath: Option<&str>,
    ) -> Result<Vec<FileItem>, PlatformError> {
        let state = self.state.lock().unwrap();
        let prefix = format!("{}/", root_id);
        let mut items = Vec::new();

        for (k, v) in state.virtual_files.iter() {
            if let Some(relative) = k.strip_prefix(&prefix) {
                items.push(FileItem {
                    id: format!("{}:{}", root_id, relative),
                    name: relative.to_string(),
                    is_dir: false,
                    size_bytes: Some(v.len() as u64),
                    modified_at: Some(1725000000),
                    extension: relative.split('.').next_back().map(|s| s.to_string()),
                });
            }
        }

        Ok(items)
    }

    async fn read_file(&self, root_id: &str, subpath: &str) -> Result<Vec<u8>, PlatformError> {
        let key = format!("{}/{}", root_id, subpath.trim_start_matches('/'));
        let state = self.state.lock().unwrap();
        state
            .virtual_files
            .get(&key)
            .cloned()
            .ok_or(PlatformError::NotFound(key))
    }

    async fn write_file(
        &self,
        root_id: &str,
        subpath: &str,
        data: &[u8],
    ) -> Result<(), PlatformError> {
        let key = format!("{}/{}", root_id, subpath.trim_start_matches('/'));
        let mut state = self.state.lock().unwrap();
        state.virtual_files.insert(key, data.to_vec());
        Ok(())
    }

    async fn delete_file(&self, root_id: &str, subpath: &str) -> Result<(), PlatformError> {
        let key = format!("{}/{}", root_id, subpath.trim_start_matches('/'));
        let mut state = self.state.lock().unwrap();
        state.virtual_files.remove(&key);
        Ok(())
    }
}

#[async_trait]
impl PowerProvider for MockPlatform {
    async fn power_command(&self, action: &str) -> Result<(), PlatformError> {
        let mut state = self.state.lock().unwrap();
        state.power_actions.push(action.to_string());
        Ok(())
    }
}
