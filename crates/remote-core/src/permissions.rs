use remote_protocol::Capability;

pub struct PermissionChecker;

impl PermissionChecker {
    pub fn is_allowed(device_capabilities: &[Capability], required: Capability) -> bool {
        device_capabilities.contains(&required)
    }

    pub fn map_message_to_capability(msg_type: &str) -> Option<Capability> {
        match msg_type {
            "input.pointer.delta" | "input.pointer.button" | "input.pointer.scroll" => {
                Some(Capability::InputMouse)
            }
            "keyboard.key" | "keyboard.text" => Some(Capability::InputKeyboard),
            "media.command" => Some(Capability::MediaControl),
            "presentation.command" => Some(Capability::PresentationControl),
            "apps.launch" => Some(Capability::AppsLaunch),
            "windows.action" => Some(Capability::WindowsControl),
            "macro.execute" => Some(Capability::AutomationExecute),
            "clipboard.get" => Some(Capability::ClipboardRead),
            "clipboard.set" => Some(Capability::ClipboardWrite),
            "files.list_roots" | "files.browse" | "files.read_chunk" => {
                Some(Capability::FilesRead)
            }
            "files.write" | "files.delete" => Some(Capability::FilesWrite),
            "power.command" => Some(Capability::PowerLock),
            // Pairing and login do not require pre-existing session capability
            "auth.pair_request" | "auth.login_challenge" | "auth.login_response" => None,
            _ => None,
        }
    }
}
