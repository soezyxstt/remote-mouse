use platform_mock::MockPlatform;
use remote_core::dispatcher::ActionDispatcher;
use remote_core::state::ServerState;
use remote_protocol::actions::Action;
use remote_protocol::capabilities::Capability;
use std::sync::Arc;

fn setup_dispatcher() -> (ActionDispatcher, Arc<MockPlatform>) {
    let mock = Arc::new(MockPlatform::new());
    let state = Arc::new(ServerState::new_with_providers(
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
    ));
    (ActionDispatcher::new(state), mock)
}

#[tokio::test]
async fn test_action_dispatch_pointer_and_keyboard() {
    let (dispatcher, mock) = setup_dispatcher();
    let caps = vec![Capability::InputMouse, Capability::InputKeyboard];

    // 1. Pointer click
    let click_action = Action::PointerButton {
        button: "left".to_string(),
        state: "click".to_string(),
    };
    let res = dispatcher.dispatch("act-1", click_action, &caps).await;
    assert_eq!(res.status, "ok");
    assert_eq!(res.action_id, "act-1");

    // 2. Keyboard text
    let text_action = Action::KeyboardText {
        text: "typing test".to_string(),
    };
    let res2 = dispatcher.dispatch("act-2", text_action, &caps).await;
    assert_eq!(res2.status, "ok");

    let mock_state = mock.state.lock().unwrap();
    assert_eq!(mock_state.text_history, vec!["typing test".to_string()]);
}

#[tokio::test]
async fn test_action_dispatch_permission_denial() {
    let (dispatcher, _) = setup_dispatcher();
    // Device only has InputMouse
    let caps = vec![Capability::InputMouse];

    // Try power shutdown
    let shutdown_action = Action::PowerCommand {
        action: "shutdown".to_string(),
    };
    let res = dispatcher
        .dispatch("act-power", shutdown_action, &caps)
        .await;
    assert_eq!(res.status, "error");
    assert!(res.error.unwrap().contains("Permission Denied"));
}

#[tokio::test]
async fn test_action_dispatch_bounds_validation() {
    let (dispatcher, _) = setup_dispatcher();
    let caps = vec![Capability::InputMouse];

    let invalid_scroll = Action::PointerScroll {
        dx: 999999.0,
        dy: 0.0,
    };
    let res = dispatcher
        .dispatch("act-scroll", invalid_scroll, &caps)
        .await;
    assert_eq!(res.status, "error");
    assert!(res.error.unwrap().contains("allowable limit"));
}
