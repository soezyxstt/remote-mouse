use futures_util::{SinkExt, StreamExt};
use platform_mock::MockPlatform;
use remote_core::crypto_session::{KeyAgreement, SessionCipher};
use remote_core::{RemoteServer, ServerState};
use remote_protocol::traits::validate_sandboxed_path;
use remote_protocol::*;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::protocol::Message as TungsteniteMessage;

#[test]
fn test_ecdh_key_agreement_and_session_cipher_establishment() {
    let client_agreement = KeyAgreement::new();
    let server_agreement = KeyAgreement::new();

    let client_pub = client_agreement.public_key_b64.clone();
    let server_pub = server_agreement.public_key_b64.clone();

    let session_salt = b"test_salt_nonce_12345";

    let mut client_cipher = client_agreement
        .derive_session_cipher(&server_pub, session_salt, false)
        .expect("Client ECDH computation succeeds");

    let mut server_cipher = server_agreement
        .derive_session_cipher(&client_pub, session_salt, true)
        .expect("Server ECDH computation succeeds");

    // 1. Client encrypts pointer delta to Server
    let plaintext = b"{\"type\":\"input.pointer.delta\",\"dx\":15.0,\"dy\":-8.0}";
    let client_frame = client_cipher.encrypt(plaintext);

    // Verify wire ciphertext does NOT match plaintext
    assert_ne!(client_frame.ciphertext, String::from_utf8_lossy(plaintext));

    // Server successfully decrypts
    let decrypted_by_server = server_cipher
        .decrypt(&client_frame)
        .expect("Server decrypts client frame with matching ECDH shared secret");
    assert_eq!(decrypted_by_server, plaintext);

    // 2. Server encrypts response to Client (Direction separation)
    let server_response = b"{\"type\":\"ack\",\"status\":\"ok\"}";
    let server_frame = server_cipher.encrypt(server_response);

    // Client successfully decrypts server response
    let decrypted_by_client = client_cipher
        .decrypt(&server_frame)
        .expect("Client decrypts server frame");
    assert_eq!(decrypted_by_client, server_response);
}

#[tokio::test]
async fn test_negative_unauthorized_capability_denial() {
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

    let test_token = state
        .auth_manager
        .lock()
        .unwrap()
        .generate_pairing_token(60);

    let test_port = 18081;
    let server = RemoteServer::new(state.clone(), test_port);
    tokio::spawn(async move {
        let _ = server.run().await;
    });
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    let url = format!("ws://127.0.0.1:{}/ws", test_port);
    let (ws_stream, _) = connect_async(&url).await.expect("connect failed");
    let (mut write, mut read) = ws_stream.split();

    // 1. Pair device
    let pair_msg = MessageEnvelope {
        v: 1,
        id: "pair-neg-1".to_string(),
        timestamp: 1000,
        msg_type: "auth.pair_request".to_string(),
        data: serde_json::to_value(PairRequestData {
            client_id: "phone_restricted".to_string(),
            client_name: "Restricted Phone".to_string(),
            token: test_token,
            public_key: "dGVzdF9wdWJsaWNfa2V5".to_string(),
        })
        .unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&pair_msg).unwrap()))
        .await
        .unwrap();

    let _resp = read.next().await.unwrap().unwrap();

    // 2. Strip capabilities down to mouse only
    {
        let mut registry = state.device_registry.lock().unwrap();
        if let Some(dev) = registry.get_mut("phone_restricted") {
            dev.capabilities = vec![Capability::InputMouse];
        }
    }

    // 3. Attempt unauthorized file access
    let file_req = MessageEnvelope {
        v: 1,
        id: "file-req-1".to_string(),
        timestamp: 1001,
        msg_type: "files.list_roots".to_string(),
        data: serde_json::json!({}),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&file_req).unwrap()))
        .await
        .unwrap();

    let reply = read.next().await.unwrap().unwrap();
    let reply_text = reply.into_text().unwrap();
    let reply_env: MessageEnvelope = serde_json::from_str(&reply_text).unwrap();

    // Server must reject with error
    assert_eq!(reply_env.msg_type, "error");
    assert!(reply_env.data.get("error").is_some());
}

#[tokio::test]
async fn test_r0_a5_ephemeral_tier_restricts_raw_keyboard_and_files() {
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

    let test_token = state
        .auth_manager
        .lock()
        .unwrap()
        .generate_pairing_token(60);

    let test_port = 18084;
    let server = RemoteServer::new(state.clone(), test_port);
    tokio::spawn(async move {
        let _ = server.run().await;
    });
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    let url = format!("ws://127.0.0.1:{}/ws", test_port);
    let (ws_stream, _) = connect_async(&url).await.expect("connect failed");
    let (mut write, mut read) = ws_stream.split();

    // 1. Pair with authTier = local_http_ephemeral
    let pair_msg = MessageEnvelope {
        v: 1,
        id: "pair-eph-1".to_string(),
        timestamp: 1000,
        msg_type: "auth.pair_request".to_string(),
        data: serde_json::json!({
            "clientId": "phone_ephemeral_lan",
            "clientName": "LAN Browser",
            "token": test_token,
            "publicKey": "ephemeral_lan_key",
            "authTier": "local_http_ephemeral"
        }),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&pair_msg).unwrap()))
        .await
        .unwrap();

    let resp = read.next().await.unwrap().unwrap();
    let resp_env: MessageEnvelope = serde_json::from_str(&resp.into_text().unwrap()).unwrap();
    assert_eq!(resp_env.msg_type, "auth.session_ready");

    // 2. Mouse move & Media & Presentation should SUCCEED
    let move_msg = MessageEnvelope {
        v: 1,
        id: "move-1".to_string(),
        timestamp: 1001,
        msg_type: "input.pointer.delta".to_string(),
        data: serde_json::to_value(PointerDeltaData { dx: 10.0, dy: 10.0, dt: None }).unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&move_msg).unwrap()))
        .await
        .unwrap();

    let pres_msg = MessageEnvelope {
        v: 1,
        id: "pres-1".to_string(),
        timestamp: 1002,
        msg_type: "presentation.command".to_string(),
        data: serde_json::to_value(PresentationCommandData { action: "next".to_string(), slide_index: None }).unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&pres_msg).unwrap()))
        .await
        .unwrap();

    // 3. Raw Keyboard MUST BE DENIED for ephemeral tier (P0 Security Requirement)
    let key_req = MessageEnvelope {
        v: 1,
        id: "key-req-eph".to_string(),
        timestamp: 1003,
        msg_type: "keyboard.key".to_string(),
        data: serde_json::to_value(KeyActionData { key: "r".to_string(), state: "tap".to_string(), modifiers: Some(vec!["win".to_string()]) }).unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&key_req).unwrap()))
        .await
        .unwrap();

    let key_reply = read.next().await.unwrap().unwrap();
    let key_env: MessageEnvelope = serde_json::from_str(&key_reply.into_text().unwrap()).unwrap();
    assert_eq!(key_env.msg_type, "error");
    assert!(key_env.data.get("error").is_some());

    // 4. File browsing MUST BE DENIED
    let file_req = MessageEnvelope {
        v: 1,
        id: "file-req-eph".to_string(),
        timestamp: 1004,
        msg_type: "files.list_roots".to_string(),
        data: serde_json::json!({}),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&file_req).unwrap()))
        .await
        .unwrap();

    let file_reply = read.next().await.unwrap().unwrap();
    let file_env: MessageEnvelope = serde_json::from_str(&file_reply.into_text().unwrap()).unwrap();
    assert_eq!(file_env.msg_type, "error");
    assert!(file_env.data.get("error").is_some());
}

#[tokio::test]
async fn test_r0_a6_session_confidentiality_and_replay_denial() {
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

    let test_token = state
        .auth_manager
        .lock()
        .unwrap()
        .generate_pairing_token(60);

    let test_port = 18085;
    let server = RemoteServer::new(state.clone(), test_port);
    tokio::spawn(async move {
        let _ = server.run().await;
    });
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    let url = format!("ws://127.0.0.1:{}/ws", test_port);
    let (ws_stream, _) = connect_async(&url).await.expect("connect failed");
    let (mut write, mut read) = ws_stream.split();

    let client_pub_key = "dGVzdF9wdWJsaWNfa2V5X3NlY3VyZQ==";

    // 1. Pair
    let pair_msg = MessageEnvelope {
        v: 1,
        id: "pair-secure-1".to_string(),
        timestamp: 1000,
        msg_type: "auth.pair_request".to_string(),
        data: serde_json::to_value(PairRequestData {
            client_id: "phone_encrypted".to_string(),
            client_name: "Encrypted Phone".to_string(),
            token: test_token.clone(),
            public_key: client_pub_key.to_string(),
        })
        .unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&pair_msg).unwrap()))
        .await
        .unwrap();

    let _resp = read.next().await.unwrap().unwrap();

    // 2. Client sets up matching SessionCipher (is_server: false)
    let mut client_cipher = SessionCipher::from_shared_secret(
        client_pub_key.as_bytes(),
        test_token.as_bytes(),
        false,
    );

    // 3. Encrypt pointer delta message inside AES-GCM frame
    let inner_delta = MessageEnvelope {
        v: 1,
        id: "delta-enc-1".to_string(),
        timestamp: 1001,
        msg_type: "input.pointer.delta".to_string(),
        data: serde_json::to_value(PointerDeltaData { dx: 33.0, dy: -12.0, dt: None }).unwrap(),
    };
    let inner_json = serde_json::to_vec(&inner_delta).unwrap();
    let encrypted_payload = client_cipher.encrypt(&inner_json);

    // Frame sequence is 1
    assert_eq!(encrypted_payload.seq, 1);

    let outer_msg = MessageEnvelope {
        v: 1,
        id: "outer-1".to_string(),
        timestamp: 1002,
        msg_type: "secure.encrypted_frame".to_string(),
        data: serde_json::to_value(&encrypted_payload).unwrap(),
    };

    // Verify wire plaintext does NOT leak "input.pointer.delta"
    let wire_text = serde_json::to_string(&outer_msg).unwrap();
    assert!(!wire_text.contains("input.pointer.delta"));

    // Send encrypted frame
    write.send(TungsteniteMessage::Text(wire_text.clone())).await.unwrap();

    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Platform must have received the decrypted pointer delta
    {
        let state_guard = mock.state.lock().unwrap();
        assert_eq!(state_guard.cursor_pos, (533.0, 488.0));
    }

    // 4. Replay Attack: Attacker re-sends the captured frame with sequence 1
    write.send(TungsteniteMessage::Text(wire_text)).await.unwrap();

    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Replay was rejected! Cursor position was NOT updated again
    {
        let state_guard = mock.state.lock().unwrap();
        assert_eq!(state_guard.cursor_pos, (533.0, 488.0));
        assert_eq!(state_guard.pointer_history.len(), 1);
    }
}

#[tokio::test]
async fn test_negative_reused_pairing_token_denial() {
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

    let test_token = state
        .auth_manager
        .lock()
        .unwrap()
        .generate_pairing_token(60);

    let test_port = 18082;
    let server = RemoteServer::new(state.clone(), test_port);
    tokio::spawn(async move {
        let _ = server.run().await;
    });
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    let url = format!("ws://127.0.0.1:{}/ws", test_port);

    // First pairing (succeeds)
    {
        let (ws_stream, _) = connect_async(&url).await.expect("connect failed");
        let (mut write, mut read) = ws_stream.split();
        let pair_msg = MessageEnvelope {
            v: 1,
            id: "pair-1".to_string(),
            timestamp: 1000,
            msg_type: "auth.pair_request".to_string(),
            data: serde_json::to_value(PairRequestData {
                client_id: "phone_1".to_string(),
                client_name: "Phone 1".to_string(),
                token: test_token.clone(),
                public_key: "key1".to_string(),
            })
            .unwrap(),
        };
        write
            .send(TungsteniteMessage::Text(serde_json::to_string(&pair_msg).unwrap()))
            .await
            .unwrap();
        let resp = read.next().await.unwrap().unwrap();
        let env: MessageEnvelope = serde_json::from_str(&resp.into_text().unwrap()).unwrap();
        assert_eq!(env.msg_type, "auth.session_ready");
    }

    // Second pairing with SAME token (MUST FAIL)
    {
        let (ws_stream, _) = connect_async(&url).await.expect("connect failed");
        let (mut write, mut read) = ws_stream.split();
        let pair_msg = MessageEnvelope {
            v: 1,
            id: "pair-2".to_string(),
            timestamp: 1001,
            msg_type: "auth.pair_request".to_string(),
            data: serde_json::to_value(PairRequestData {
                client_id: "phone_2".to_string(),
                client_name: "Phone 2".to_string(),
                token: test_token,
                public_key: "key2".to_string(),
            })
            .unwrap(),
        };
        write
            .send(TungsteniteMessage::Text(serde_json::to_string(&pair_msg).unwrap()))
            .await
            .unwrap();
        let resp = read.next().await.unwrap().unwrap();
        let env: MessageEnvelope = serde_json::from_str(&resp.into_text().unwrap()).unwrap();
        assert_eq!(env.msg_type, "auth.error");
    }
}

#[tokio::test]
async fn test_negative_input_safety_release_on_disconnect() {
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

    let test_token = state
        .auth_manager
        .lock()
        .unwrap()
        .generate_pairing_token(60);

    let test_port = 18083;
    let server = RemoteServer::new(state.clone(), test_port);
    tokio::spawn(async move {
        let _ = server.run().await;
    });
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    let url = format!("ws://127.0.0.1:{}/ws", test_port);
    let (ws_stream, _) = connect_async(&url).await.expect("connect failed");
    let (mut write, mut read) = ws_stream.split();

    // 1. Pair
    let pair_msg = MessageEnvelope {
        v: 1,
        id: "pair-safety".to_string(),
        timestamp: 1000,
        msg_type: "auth.pair_request".to_string(),
        data: serde_json::to_value(PairRequestData {
            client_id: "phone_safety".to_string(),
            client_name: "Phone Safety".to_string(),
            token: test_token,
            public_key: "key".to_string(),
        })
        .unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&pair_msg).unwrap()))
        .await
        .unwrap();
    let _ = read.next().await.unwrap().unwrap();

    // 2. Client sends Hold Key (down)
    let key_down = MessageEnvelope {
        v: 1,
        id: "key-down".to_string(),
        timestamp: 1001,
        msg_type: "keyboard.key".to_string(),
        data: serde_json::to_value(KeyActionData {
            key: "Control".to_string(),
            state: "down".to_string(),
            modifiers: None,
        })
        .unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(serde_json::to_string(&key_down).unwrap()))
        .await
        .unwrap();

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // 3. Sudden socket termination / Wi-Fi drop
    drop(write);
    drop(read);

    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Platform must have triggered release_all_inputs
    let state_guard = mock.state.lock().unwrap();
    assert!(state_guard.all_inputs_released);
}

#[test]
fn test_path_traversal_sandboxing() {
    let dummy_root = Path::new("/tmp/test_remote_root");

    // Attack 1: Classic parent directory traversal
    let attack_1 = validate_sandboxed_path(dummy_root, "../../etc/passwd");
    assert!(attack_1.is_err());

    // Attack 2: Windows backslash traversal
    let attack_2 = validate_sandboxed_path(dummy_root, "..\\..\\Windows\\System32");
    assert!(attack_2.is_err());

    // Safe path
    let safe = validate_sandboxed_path(dummy_root, "documents/report.pdf");
    assert!(safe.is_ok());
}

#[test]
fn test_real_symlink_escape_denial() {
    let base_temp = std::env::temp_dir().join(format!("remote_test_{}", uuid::Uuid::new_v4()));
    let allowed_root = base_temp.join("allowed_root");
    let outside_secret = base_temp.join("outside_secret");

    let _ = fs::create_dir_all(&allowed_root);
    let _ = fs::create_dir_all(&outside_secret);

    let secret_file = outside_secret.join("id_rsa");
    let _ = fs::write(&secret_file, b"FAKE_SECRET_KEY");

    let symlink_path = allowed_root.join("secret_link");

    #[cfg(unix)]
    let _ = std::os::unix::fs::symlink(&outside_secret, &symlink_path);

    #[cfg(windows)]
    let _ = std::os::windows::fs::symlink_dir(&outside_secret, &symlink_path);

    if symlink_path.exists() {
        // Attempt to access secret through the symlink inside allowed_root
        let result = validate_sandboxed_path(&allowed_root, "secret_link/id_rsa");
        // Canonical check MUST detect escape and reject
        assert!(
            result.is_err(),
            "Symlink escaping allowed root must be rejected!"
        );
    }

    // Cleanup temp
    let _ = fs::remove_dir_all(&base_temp);
}
