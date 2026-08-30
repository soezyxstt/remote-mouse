use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Capability {
    #[serde(rename = "input.mouse")]
    InputMouse,
    #[serde(rename = "input.keyboard")]
    InputKeyboard,
    #[serde(rename = "media.control")]
    MediaControl,
    #[serde(rename = "presentation.control")]
    PresentationControl,
    #[serde(rename = "clipboard.read")]
    ClipboardRead,
    #[serde(rename = "clipboard.write")]
    ClipboardWrite,
    #[serde(rename = "files.read")]
    FilesRead,
    #[serde(rename = "files.write")]
    FilesWrite,
    #[serde(rename = "apps.launch")]
    AppsLaunch,
    #[serde(rename = "windows.control")]
    WindowsControl,
    #[serde(rename = "automation.execute")]
    AutomationExecute,
    #[serde(rename = "power.lock")]
    PowerLock,
    #[serde(rename = "power.sleep")]
    PowerSleep,
    #[serde(rename = "power.restart")]
    PowerRestart,
    #[serde(rename = "power.shutdown")]
    PowerShutdown,
}

impl Capability {
    pub fn all() -> Vec<Capability> {
        vec![
            Capability::InputMouse,
            Capability::InputKeyboard,
            Capability::MediaControl,
            Capability::PresentationControl,
            Capability::ClipboardRead,
            Capability::ClipboardWrite,
            Capability::FilesRead,
            Capability::FilesWrite,
            Capability::AppsLaunch,
            Capability::WindowsControl,
            Capability::AutomationExecute,
            Capability::PowerLock,
            Capability::PowerSleep,
            Capability::PowerRestart,
            Capability::PowerShutdown,
        ]
    }

    pub fn default_capabilities() -> Vec<Capability> {
        vec![
            Capability::InputMouse,
            Capability::InputKeyboard,
            Capability::MediaControl,
            Capability::PresentationControl,
            Capability::ClipboardRead,
            Capability::ClipboardWrite,
            Capability::AppsLaunch,
            Capability::WindowsControl,
            Capability::AutomationExecute,
            Capability::PowerLock,
            Capability::PowerSleep,
        ]
    }
}
