use futures_util::{SinkExt, StreamExt};
use platform_mock::MockPlatform;
use remote_core::{RemoteServer, ServerState};
use remote_protocol::*;
use std::sync::Arc;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::protocol::Message as TungsteniteMessage;

#[tokio::test]
async fn test_e2e_websocket_server_and_client_flow() {
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

    // Generate pairing token
    let test_token = state
        .auth_manager
        .lock()
        .unwrap()
        .generate_pairing_token(60);

    let test_port = 18080;
    let server = RemoteServer::new(state.clone(), test_port);

    // Spawn server in background
    tokio::spawn(async move {
        let _ = server.run().await;
    });

    // Allow server socket to bind
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    // Connect WebSocket client
    let url = format!("ws://127.0.0.1:{}/ws", test_port);
    let (ws_stream, _) = connect_async(&url).await.expect("Failed to connect to ws server");
    let (mut write, mut read) = ws_stream.split();

    // 1. Send Pairing Request
    let pair_msg = MessageEnvelope {
        v: 1,
        id: "test-pair-1".to_string(),
        timestamp: 1000,
        msg_type: "auth.pair_request".to_string(),
        data: serde_json::to_value(PairRequestData {
            client_id: "client_phone_e2e".to_string(),
            client_name: "Test E2E Phone".to_string(),
            token: test_token,
            public_key: "dGVzdF9rZXk=".to_string(),
        })
        .unwrap(),
    };

    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&pair_msg).unwrap()))
        .await
        .unwrap();

    // Read response (session_ready)
    let response = read.next().await.unwrap().unwrap();
    let text = response.into_text().unwrap();
    let resp_env: MessageEnvelope = serde_json::from_str(&text).unwrap();
    assert_eq!(resp_env.msg_type, "auth.session_ready");

    // 2. Send Pointer Delta
    let delta_msg = MessageEnvelope {
        v: 1,
        id: "msg-delta-1".to_string(),
        timestamp: 1001,
        msg_type: "input.pointer.delta".to_string(),
        data: serde_json::to_value(PointerDeltaData {
            dx: 45.0,
            dy: -20.0,
            dt: Some(16),
        })
        .unwrap(),
    };

    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&delta_msg).unwrap()))
        .await
        .unwrap();

    // 3. Send Media Play/Pause
    let media_msg = MessageEnvelope {
        v: 1,
        id: "msg-media-1".to_string(),
        timestamp: 1002,
        msg_type: "media.command".to_string(),
        data: serde_json::to_value(MediaCommandData {
            action: "play_pause".to_string(),
            value: None,
        })
        .unwrap(),
    };

    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&media_msg).unwrap()))
        .await
        .unwrap();

    // 4. Send Keyboard Key Action
    let key_msg = MessageEnvelope {
        v: 1,
        id: "msg-key-1".to_string(),
        timestamp: 1003,
        msg_type: "keyboard.key".to_string(),
        data: serde_json::to_value(KeyActionData {
            key: "Escape".to_string(),
            state: "tap".to_string(),
            modifiers: Some(vec!["ctrl".to_string()]),
        })
        .unwrap(),
    };

    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&key_msg).unwrap()))
        .await
        .unwrap();

    // 5. Send Power Command (Lock PC)
    let power_msg = MessageEnvelope {
        v: 1,
        id: "msg-power-1".to_string(),
        timestamp: 1004,
        msg_type: "power.command".to_string(),
        data: serde_json::json!({
            "action": "lock"
        }),
    };

    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&power_msg).unwrap()))
        .await
        .unwrap();

    // 6. Send Clipboard Set & Get
    let clip_set = MessageEnvelope {
        v: 1,
        id: "msg-clip-set".to_string(),
        timestamp: 1005,
        msg_type: "clipboard.set".to_string(),
        data: serde_json::json!({
            "text": "Copied from PWA test"
        }),
    };

    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&clip_set).unwrap()))
        .await
        .unwrap();

    let clip_get = MessageEnvelope {
        v: 1,
        id: "msg-clip-get".to_string(),
        timestamp: 1006,
        msg_type: "clipboard.get".to_string(),
        data: serde_json::json!({}),
    };

    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&clip_get).unwrap()))
        .await
        .unwrap();

    let clip_resp = read.next().await.unwrap().unwrap();
    let clip_env: MessageEnvelope = serde_json::from_str(&clip_resp.into_text().unwrap()).unwrap();
    assert_eq!(clip_env.msg_type, "state.clipboard");
    assert_eq!(
        clip_env.data.get("text").and_then(|v| v.as_str()),
        Some("Copied from PWA test")
    );

    // 7. Send File Read
    let file_read = MessageEnvelope {
        v: 1,
        id: "msg-file-read".to_string(),
        timestamp: 1007,
        msg_type: "files.read_file".to_string(),
        data: serde_json::json!({
            "rootId": "root_desktop",
            "subpath": "hello.txt"
        }),
    };

    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&file_read).unwrap()))
        .await
        .unwrap();

    let file_resp = read.next().await.unwrap().unwrap();
    let file_env: MessageEnvelope = serde_json::from_str(&file_resp.into_text().unwrap()).unwrap();
    assert_eq!(file_env.msg_type, "files.content");
    assert_eq!(
        file_env.data.get("filename").and_then(|v| v.as_str()),
        Some("hello.txt")
    );

    // Allow async dispatcher to process
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Verify mock platform states
    let state_guard = mock.state.lock().unwrap();
    assert_eq!(state_guard.cursor_pos, (545.0, 480.0));
    assert_eq!(state_guard.pointer_history, vec![(45.0, -20.0)]);
    assert_eq!(state_guard.media_history, vec![("play_pause".to_string(), None)]);
    assert_eq!(
        state_guard.key_history,
        vec![("Escape".to_string(), "tap".to_string(), vec!["ctrl".to_string()])]
    );
    assert_eq!(state_guard.power_actions, vec!["lock".to_string()]);
    assert_eq!(state_guard.clipboard_text, "Copied from PWA test");
}
