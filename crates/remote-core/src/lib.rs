pub mod auth;
pub mod automation;
pub mod crypto_session;
pub mod devices;
pub mod files;
pub mod licensing;
pub mod permissions;
pub mod presets;
pub mod server;
pub mod state;
pub mod traits;

pub use auth::{AuthError, AuthManager, PairingToken, PendingPairRequest};
pub use automation::MacroEngine;
pub use crypto_session::{CryptoError, EncryptedFramePayload, KeyAgreement, SessionCipher};
pub use devices::{DeviceRegistry, TrustedDevice};
pub use files::{StandardFileProvider, VirtualRootConfig};
pub use licensing::{LicenseTier, LicensingManager};
pub use permissions::PermissionChecker;
pub use presets::get_builtin_presets;
pub use server::RemoteServer;
pub use state::ServerState;
pub use traits::*;

#[cfg(test)]
mod tests {
    use super::*;
    use platform_mock::MockPlatform;
    use remote_protocol::*;
    use std::sync::Arc;

    fn create_test_state() -> (ServerState, Arc<MockPlatform>) {
        let mock = Arc::new(MockPlatform::new());
        let state = ServerState::new_with_providers(
            mock.clone(),
            mock.clone(),
            mock.clone(),
            mock.clone(),
            mock.clone(),
            mock.clone(),
            mock.clone(),
            mock.clone(),
        );
        (state, mock)
    }

    #[tokio::test]
    async fn test_pairing_and_auth_flow() {
        let (state, _) = create_test_state();

        // 1. Generate pairing token on desktop
        let token = state.auth_manager.lock().unwrap().generate_pairing_token(60);
        assert_eq!(token.len(), 6);

        // Try second pairing with same token (should fail because single-use)
        let mut auth = state.auth_manager.lock().unwrap();
        let first_validate = auth.validate_pairing_token(&token);
        assert!(first_validate.is_ok());

        let second_validate = auth.validate_pairing_token(&token);
        assert!(second_validate.is_err());
    }

    #[tokio::test]
    async fn test_input_dispatch_to_mock_platform() {
        let (state, mock) = create_test_state();

        let dev = TrustedDevice {
            id: "phone_test".to_string(),
            name: "Test Phone".to_string(),
            public_key: "key".to_string(),
            capabilities: vec![Capability::InputMouse, Capability::InputKeyboard],
            created_at: 1000,
            last_seen_at: 1000,
            is_blocked: false,
        };
        state.device_registry.lock().unwrap().register(dev);

        state
            .input_provider
            .pointer_move_relative(15.0, -8.0)
            .await
            .unwrap();

        let state_guard = mock.state.lock().unwrap();
        assert_eq!(state_guard.cursor_pos, (515.0, 492.0));
        assert_eq!(state_guard.pointer_history.len(), 1);
    }

    #[tokio::test]
    async fn test_macro_engine_execution() {
        let (state, mock) = create_test_state();

        let macro_def = MacroDefinition {
            id: "macro_test".to_string(),
            name: "Test Macro".to_string(),
            description: None,
            steps: vec![
                MacroStep::Action {
                    intent: ActionIntent::AppsLaunch {
                        app_id: "vscode".to_string(),
                    },
                },
                MacroStep::Action {
                    intent: ActionIntent::ClipboardCopyText {
                        text: "Macro ran successfully".to_string(),
                    },
                },
            ],
        };

        state
            .macro_engine
            .execute_macro(&macro_def)
            .await
            .unwrap();

        let state_guard = mock.state.lock().unwrap();
        assert_eq!(state_guard.launched_apps, vec!["vscode".to_string()]);
        assert_eq!(state_guard.clipboard_text, "Macro ran successfully");
    }

    #[test]
    fn test_permission_gatekeeper() {
        let caps = vec![Capability::InputMouse, Capability::MediaControl];

        assert!(PermissionChecker::is_allowed(
            &caps,
            Capability::InputMouse
        ));
        assert!(PermissionChecker::is_allowed(
            &caps,
            Capability::MediaControl
        ));

        assert!(!PermissionChecker::is_allowed(
            &caps,
            Capability::FilesRead
        ));
        assert!(!PermissionChecker::is_allowed(
            &caps,
            Capability::PowerShutdown
        ));
    }
}
