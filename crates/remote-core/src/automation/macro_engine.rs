use crate::traits::*;
use remote_protocol::{ActionIntent, MacroCondition, MacroDefinition, MacroStep};
use std::sync::Arc;
use tokio::time::Duration;
use tracing::{info, warn};

pub struct MacroEngine {
    pub input_provider: Arc<dyn InputProvider>,
    pub media_provider: Arc<dyn MediaProvider>,
    pub window_manager: Arc<dyn WindowManager>,
    pub app_launcher: Arc<dyn AppLauncher>,
    pub clipboard_provider: Arc<dyn ClipboardProvider>,
    pub power_provider: Arc<dyn PowerProvider>,
}

impl MacroEngine {
    pub fn new(
        input_provider: Arc<dyn InputProvider>,
        media_provider: Arc<dyn MediaProvider>,
        window_manager: Arc<dyn WindowManager>,
        app_launcher: Arc<dyn AppLauncher>,
        clipboard_provider: Arc<dyn ClipboardProvider>,
        power_provider: Arc<dyn PowerProvider>,
    ) -> Self {
        Self {
            input_provider,
            media_provider,
            window_manager,
            app_launcher,
            clipboard_provider,
            power_provider,
        }
    }

    pub async fn execute_macro(&self, r#macro: &MacroDefinition) -> Result<(), PlatformError> {
        info!("Executing macro: {} ({})", r#macro.name, r#macro.id);
        self.execute_steps(&r#macro.steps).await
    }

    pub async fn execute_steps(&self, steps: &[MacroStep]) -> Result<(), PlatformError> {
        for step in steps {
            match step {
                MacroStep::Action { intent } => {
                    self.execute_action(intent).await?;
                }
                MacroStep::Delay { ms } => {
                    tokio::time::sleep(Duration::from_millis(*ms)).await;
                }
                MacroStep::Condition {
                    condition,
                    on_true,
                    on_false,
                } => {
                    let condition_met = self.evaluate_condition(condition).await?;
                    if condition_met {
                        if let Some(true_steps) = on_true {
                            Box::pin(self.execute_steps(true_steps)).await?;
                        }
                    } else if let Some(false_steps) = on_false {
                        Box::pin(self.execute_steps(false_steps)).await?;
                    }
                }
            }
        }
        Ok(())
    }

    pub async fn execute_action(&self, intent: &ActionIntent) -> Result<(), PlatformError> {
        match intent {
            ActionIntent::KeyboardShortcut { keys } => {
                for key in keys {
                    self.input_provider.key_action(key, "down", &[]).await?;
                }
                for key in keys.iter().rev() {
                    self.input_provider.key_action(key, "up", &[]).await?;
                }
            }
            ActionIntent::KeyboardKey { key, modifiers } => {
                self.input_provider
                    .key_action(key, "tap", modifiers)
                    .await?;
            }
            ActionIntent::KeyboardText { text } => {
                self.input_provider.text_stream(text).await?;
            }
            ActionIntent::MouseClick { button } => {
                self.input_provider.pointer_button(button, "click").await?;
            }
            ActionIntent::MediaControl { action } => {
                self.media_provider.media_command(action, None).await?;
            }
            ActionIntent::PresentationControl { action } => {
                self.input_provider
                    .key_action(
                        match action.as_str() {
                            "next" => "PageDown",
                            "prev" => "PageUp",
                            "start" => "F5",
                            "stop" => "Escape",
                            "black_screen" => "B",
                            _ => "Space",
                        },
                        "tap",
                        &[],
                    )
                    .await?;
            }
            ActionIntent::AppsLaunch { app_id } => {
                self.app_launcher.launch_app(app_id).await?;
            }
            ActionIntent::WindowsSnap { position } => {
                self.window_manager
                    .window_action("foreground", position, None)
                    .await?;
            }
            ActionIntent::ClipboardCopyText { text } => {
                self.clipboard_provider.set_clipboard_text(text).await?;
            }
            ActionIntent::MacroExecute { macro_id } => {
                warn!("Nested macro execution not implemented: {}", macro_id);
            }
            ActionIntent::PowerAction { action } => {
                self.power_provider.power_command(action).await?;
            }
        }
        Ok(())
    }

    pub async fn evaluate_condition(
        &self,
        condition: &MacroCondition,
    ) -> Result<bool, PlatformError> {
        match condition {
            MacroCondition::ProcessRunning { process_name } => {
                let windows = self.window_manager.get_windows().await?;
                let is_running = windows.iter().any(|w| {
                    w.process_name
                        .to_lowercase()
                        .contains(&process_name.to_lowercase())
                });
                Ok(is_running)
            }
            MacroCondition::WindowFocused { title_contains } => {
                if let Some(fg) = self.window_manager.get_foreground_app().await? {
                    Ok(fg
                        .window_title
                        .to_lowercase()
                        .contains(&title_contains.to_lowercase()))
                } else {
                    Ok(false)
                }
            }
            MacroCondition::DisplayCount { min } => {
                let displays = self.window_manager.get_displays().await?;
                Ok(displays.len() as u32 >= *min)
            }
        }
    }
}
