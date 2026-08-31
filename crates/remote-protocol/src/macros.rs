use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ActionIntent {
    #[serde(rename = "keyboard.shortcut")]
    KeyboardShortcut { keys: Vec<String> },
    #[serde(rename = "keyboard.key")]
    KeyboardKey { key: String, modifiers: Vec<String> },
    #[serde(rename = "keyboard.text")]
    KeyboardText { text: String },
    #[serde(rename = "mouse.click")]
    MouseClick { button: String },
    #[serde(rename = "media.control")]
    MediaControl { action: String },
    #[serde(rename = "presentation.control")]
    PresentationControl { action: String },
    #[serde(rename = "apps.launch")]
    AppsLaunch {
        #[serde(rename = "appId")]
        app_id: String,
    },
    #[serde(rename = "windows.snap")]
    WindowsSnap { position: String },
    #[serde(rename = "clipboard.copy_text")]
    ClipboardCopyText { text: String },
    #[serde(rename = "macro.execute")]
    MacroExecute {
        #[serde(rename = "macroId")]
        macro_id: String,
    },
    #[serde(rename = "power.action")]
    PowerAction { action: String },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MacroCondition {
    #[serde(rename = "process_running")]
    ProcessRunning {
        #[serde(rename = "processName")]
        process_name: String,
    },
    #[serde(rename = "window_focused")]
    WindowFocused {
        #[serde(rename = "titleContains")]
        title_contains: String,
    },
    #[serde(rename = "display_count")]
    DisplayCount { min: u32 },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MacroStep {
    #[serde(rename = "action")]
    Action { intent: ActionIntent },
    #[serde(rename = "delay")]
    Delay { ms: u64 },
    #[serde(rename = "condition")]
    Condition {
        condition: MacroCondition,
        #[serde(rename = "onTrue", default, skip_serializing_if = "Option::is_none")]
        on_true: Option<Vec<MacroStep>>,
        #[serde(rename = "onFalse", default, skip_serializing_if = "Option::is_none")]
        on_false: Option<Vec<MacroStep>>,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MacroDefinition {
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub steps: Vec<MacroStep>,
}
