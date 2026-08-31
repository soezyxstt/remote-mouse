use crate::capabilities::Capability;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Action {
    #[serde(rename = "pointer.button")]
    PointerButton { button: String, state: String },
    #[serde(rename = "pointer.scroll")]
    PointerScroll { dx: f32, dy: f32 },
    #[serde(rename = "keyboard.key")]
    KeyboardKey {
        key: String,
        state: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        modifiers: Option<Vec<String>>,
    },
    #[serde(rename = "keyboard.text")]
    KeyboardText { text: String },
    #[serde(rename = "keyboard.shortcut")]
    KeyboardShortcut { keys: Vec<String> },
    #[serde(rename = "media.command")]
    MediaCommand {
        action: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        value: Option<f32>,
    },
    #[serde(rename = "presentation.command")]
    PresentationCommand {
        action: String,
        #[serde(
            rename = "slideIndex",
            default,
            skip_serializing_if = "Option::is_none"
        )]
        slide_index: Option<u32>,
    },
    #[serde(rename = "apps.launch")]
    AppsLaunch {
        #[serde(rename = "appId")]
        app_id: String,
    },
    #[serde(rename = "windows.action")]
    WindowsAction {
        #[serde(rename = "windowId")]
        window_id: String,
        action: String,
        #[serde(
            rename = "targetDisplay",
            default,
            skip_serializing_if = "Option::is_none"
        )]
        target_display: Option<u32>,
    },
    #[serde(rename = "clipboard.set")]
    ClipboardSet { text: String },
    #[serde(rename = "power.command")]
    PowerCommand { action: String },
    #[serde(rename = "macro.execute")]
    MacroExecute {
        #[serde(rename = "macroId")]
        macro_id: String,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ActionResult {
    #[serde(rename = "actionId")]
    pub action_id: String,
    pub status: String, // "ok" | "error"
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ActionResult {
    pub fn ok(action_id: impl Into<String>) -> Self {
        Self {
            action_id: action_id.into(),
            status: "ok".to_string(),
            error: None,
        }
    }

    pub fn error(action_id: impl Into<String>, msg: impl Into<String>) -> Self {
        Self {
            action_id: action_id.into(),
            status: "error".to_string(),
            error: Some(msg.into()),
        }
    }
}

impl Action {
    pub fn required_capability(&self) -> Capability {
        match self {
            Action::PointerButton { .. } | Action::PointerScroll { .. } => Capability::InputMouse,
            Action::KeyboardKey { .. }
            | Action::KeyboardText { .. }
            | Action::KeyboardShortcut { .. } => Capability::InputKeyboard,
            Action::MediaCommand { .. } => Capability::MediaControl,
            Action::PresentationCommand { .. } => Capability::PresentationControl,
            Action::AppsLaunch { .. } => Capability::AppsLaunch,
            Action::WindowsAction { .. } => Capability::WindowsControl,
            Action::ClipboardSet { .. } => Capability::ClipboardWrite,
            Action::PowerCommand { action } => match action.as_str() {
                "lock" => Capability::PowerLock,
                "sleep" => Capability::PowerSleep,
                "restart" => Capability::PowerRestart,
                "shutdown" => Capability::PowerShutdown,
                _ => Capability::PowerLock,
            },
            Action::MacroExecute { .. } => Capability::AutomationExecute,
        }
    }

    pub fn validate_bounds(&self) -> Result<(), String> {
        match self {
            Action::PointerScroll { dx, dy } => {
                if !dx.is_finite() || !dy.is_finite() {
                    return Err("Scroll deltas must be finite numbers".to_string());
                }
                if dx.abs() > 10000.0 || dy.abs() > 10000.0 {
                    return Err("Scroll deltas exceed allowable limit".to_string());
                }
            }
            Action::KeyboardText { text } => {
                if text.len() > 65536 {
                    return Err("Text payload exceeds allowable 64KB limit".to_string());
                }
            }
            Action::ClipboardSet { text } => {
                if text.len() > 1048576 {
                    return Err("Clipboard text exceeds allowable 1MB limit".to_string());
                }
            }
            Action::AppsLaunch { app_id } => {
                if app_id.trim().is_empty() || app_id.len() > 256 {
                    return Err("Invalid appId length".to_string());
                }
            }
            Action::WindowsAction {
                window_id,
                target_display,
                ..
            } => {
                if window_id.trim().is_empty() {
                    return Err("Invalid windowId".to_string());
                }
                if let Some(td) = target_display {
                    if *td > 64 {
                        return Err("Invalid target display index".to_string());
                    }
                }
            }
            _ => {}
        }
        Ok(())
    }
}
