use crate::state::ServerState;
use remote_protocol::actions::{Action, ActionResult};
use remote_protocol::capabilities::Capability;
use std::sync::Arc;

pub struct ActionDispatcher {
    state: Arc<ServerState>,
}

impl ActionDispatcher {
    pub fn new(state: Arc<ServerState>) -> Self {
        Self { state }
    }

    pub async fn dispatch(
        &self,
        action_id: &str,
        action: Action,
        client_capabilities: &[Capability],
    ) -> ActionResult {
        Self::dispatch_state(&self.state, action_id, action, client_capabilities).await
    }

    pub async fn dispatch_state(
        state: &ServerState,
        action_id: &str,
        action: Action,
        client_capabilities: &[Capability],
    ) -> ActionResult {
        // 1. Validate action bounds & format
        if let Err(validation_err) = action.validate_bounds() {
            return ActionResult::error(action_id, format!("Validation error: {}", validation_err));
        }

        // 2. Authorize required capability
        let required = action.required_capability();
        if !client_capabilities.contains(&required) {
            return ActionResult::error(
                action_id,
                format!("Permission Denied: missing capability {:?}", required),
            );
        }

        // 3. Dispatch to platform providers
        match action {
            Action::PointerButton {
                button,
                state: btn_state,
            } => {
                match state
                    .input_provider
                    .pointer_button(&button, &btn_state)
                    .await
                {
                    Ok(()) => ActionResult::ok(action_id),
                    Err(e) => ActionResult::error(action_id, e.to_string()),
                }
            }
            Action::PointerScroll { dx, dy } => {
                match state.input_provider.pointer_scroll(dx, dy).await {
                    Ok(()) => ActionResult::ok(action_id),
                    Err(e) => ActionResult::error(action_id, e.to_string()),
                }
            }
            Action::KeyboardKey {
                key,
                state: key_state,
                modifiers,
            } => {
                let mods = modifiers.unwrap_or_default();
                match state
                    .input_provider
                    .key_action(&key, &key_state, &mods)
                    .await
                {
                    Ok(()) => ActionResult::ok(action_id),
                    Err(e) => ActionResult::error(action_id, e.to_string()),
                }
            }
            Action::KeyboardText { text } => match state.input_provider.text_stream(&text).await {
                Ok(()) => ActionResult::ok(action_id),
                Err(e) => ActionResult::error(action_id, e.to_string()),
            },
            Action::KeyboardShortcut { keys } => {
                let mut last_err = None;
                for k in &keys {
                    if let Err(e) = state.input_provider.key_action(k, "down", &[]).await {
                        last_err = Some(e);
                    }
                }
                for k in keys.iter().rev() {
                    let _ = state.input_provider.key_action(k, "up", &[]).await;
                }
                if let Some(err) = last_err {
                    ActionResult::error(action_id, err.to_string())
                } else {
                    ActionResult::ok(action_id)
                }
            }
            Action::MediaCommand {
                action: media_act,
                value,
            } => match state.media_provider.media_command(&media_act, value).await {
                Ok(()) => ActionResult::ok(action_id),
                Err(e) => ActionResult::error(action_id, e.to_string()),
            },
            Action::PresentationCommand {
                action: pres_act,
                slide_index,
            } => {
                match state
                    .presentation_provider
                    .presentation_command(&pres_act, slide_index)
                    .await
                {
                    Ok(()) => ActionResult::ok(action_id),
                    Err(e) => ActionResult::error(action_id, e.to_string()),
                }
            }
            Action::AppsLaunch { app_id } => match state.app_launcher.launch_app(&app_id).await {
                Ok(()) => ActionResult::ok(action_id),
                Err(e) => ActionResult::error(action_id, e.to_string()),
            },
            Action::WindowsAction {
                window_id,
                action: win_act,
                target_display,
            } => {
                match state
                    .window_manager
                    .window_action(&window_id, &win_act, target_display)
                    .await
                {
                    Ok(()) => ActionResult::ok(action_id),
                    Err(e) => ActionResult::error(action_id, e.to_string()),
                }
            }
            Action::ClipboardSet { text } => {
                match state.clipboard_provider.set_clipboard_text(&text).await {
                    Ok(()) => ActionResult::ok(action_id),
                    Err(e) => ActionResult::error(action_id, e.to_string()),
                }
            }
            Action::PowerCommand { action: pwr_act } => {
                match state.power_provider.power_command(&pwr_act).await {
                    Ok(()) => ActionResult::ok(action_id),
                    Err(e) => ActionResult::error(action_id, e.to_string()),
                }
            }
            Action::MacroExecute { macro_id } => {
                let macro_def = {
                    state
                        .macros
                        .lock()
                        .unwrap()
                        .iter()
                        .find(|m| m.id == macro_id)
                        .cloned()
                };
                if let Some(m) = macro_def {
                    match state.macro_engine.execute_macro(&m).await {
                        Ok(()) => ActionResult::ok(action_id),
                        Err(e) => ActionResult::error(action_id, e.to_string()),
                    }
                } else {
                    ActionResult::error(action_id, format!("Macro '{}' not found", macro_id))
                }
            }
        }
    }
}
