use crate::auth::AuthManager;
use crate::automation::MacroEngine;
use crate::devices::DeviceRegistry;
use crate::presets::get_builtin_presets;
use crate::traits::*;
use axum::extract::ws::Message;
use remote_protocol::{MacroDefinition, PanelDefinition};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc::UnboundedSender;

#[derive(Clone)]
pub struct ServerState {
    pub auth_manager: Arc<Mutex<AuthManager>>,
    pub device_registry: Arc<Mutex<DeviceRegistry>>,
    pub panels: Arc<Mutex<Vec<PanelDefinition>>>,
    pub macros: Arc<Mutex<Vec<MacroDefinition>>>,
    pub macro_engine: Arc<MacroEngine>,
    pub input_provider: Arc<dyn InputProvider>,
    pub media_provider: Arc<dyn MediaProvider>,
    pub presentation_provider: Arc<dyn PresentationProvider>,
    pub window_manager: Arc<dyn WindowManager>,
    pub app_launcher: Arc<dyn AppLauncher>,
    pub clipboard_provider: Arc<dyn ClipboardProvider>,
    pub file_provider: Arc<dyn FileProvider>,
    pub power_provider: Arc<dyn PowerProvider>,
    pub active_connections: Arc<Mutex<HashMap<String, UnboundedSender<Message>>>>,
}

impl ServerState {
    pub fn new_with_providers(
        input_provider: Arc<dyn InputProvider>,
        media_provider: Arc<dyn MediaProvider>,
        presentation_provider: Arc<dyn PresentationProvider>,
        window_manager: Arc<dyn WindowManager>,
        app_launcher: Arc<dyn AppLauncher>,
        clipboard_provider: Arc<dyn ClipboardProvider>,
        file_provider: Arc<dyn FileProvider>,
        power_provider: Arc<dyn PowerProvider>,
    ) -> Self {
        let macro_engine = Arc::new(MacroEngine::new(
            input_provider.clone(),
            media_provider.clone(),
            window_manager.clone(),
            app_launcher.clone(),
            clipboard_provider.clone(),
            power_provider.clone(),
        ));

        Self {
            auth_manager: Arc::new(Mutex::new(AuthManager::new())),
            device_registry: Arc::new(Mutex::new(DeviceRegistry::new())),
            panels: Arc::new(Mutex::new(get_builtin_presets())),
            macros: Arc::new(Mutex::new(Vec::new())),
            macro_engine,
            input_provider,
            media_provider,
            presentation_provider,
            window_manager,
            app_launcher,
            clipboard_provider,
            file_provider,
            power_provider,
            active_connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}
