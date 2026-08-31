use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
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

fn protected_wire(cipher: &mut SessionCipher, inner: &MessageEnvelope) -> String {
    let payload = cipher.encrypt(&serde_json::to_vec(inner).unwrap());
    serde_json::to_string(&MessageEnvelope {
        v: 1,
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: 1000,
        msg_type: "secure.encrypted_frame".to_string(),
        data: serde_json::to_value(payload).unwrap(),
    })
    .unwrap()
}

fn cipher_from_ready(agreement: KeyAgreement, response: TungsteniteMessage) -> SessionCipher {
    let envelope: MessageEnvelope = serde_json::from_str(&response.into_text().unwrap()).unwrap();
    assert_eq!(envelope.msg_type, "auth.session_ready");
    let ready: SessionReadyData = serde_json::from_value(envelope.data).unwrap();
    let salt = BASE64.decode(ready.session_salt).unwrap();
    agreement
        .derive_session_cipher(&ready.server_ecdh_public_key, &salt, false)
        .unwrap()
}

fn decrypt_wire(cipher: &mut SessionCipher, response: TungsteniteMessage) -> MessageEnvelope {
    let outer: MessageEnvelope = serde_json::from_str(&response.into_text().unwrap()).unwrap();
    assert_eq!(outer.msg_type, "secure.encrypted_frame");
    let payload = serde_json::from_value(outer.data).unwrap();
    let plaintext = cipher.decrypt(&payload).unwrap();
    serde_json::from_slice(&plaintext).unwrap()
}

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
    let client_agreement = KeyAgreement::new();
    let client_ecdh_public_key = client_agreement.public_key_b64.clone();
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
            ecdh_public_key: client_ecdh_public_key,
            client_nonce: BASE64.encode([1_u8; 32]),
            auth_tier: "hosted_pwa_webcrypto".to_string(),
        })
        .unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(
            serde_json::to_string(&pair_msg).unwrap(),
        ))
        .await
        .unwrap();

    let ready = read.next().await.unwrap().unwrap();
    let mut client_cipher = cipher_from_ready(client_agreement, ready);

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
        .send(TungsteniteMessage::Text(protected_wire(
            &mut client_cipher,
            &file_req,
        )))
        .await
        .unwrap();

    let reply = read.next().await.unwrap().unwrap();
    let reply_env = decrypt_wire(&mut client_cipher, reply);

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
            "ecdhPublicKey": KeyAgreement::new().public_key_b64,
            "clientNonce": BASE64.encode([9_u8; 32]),
            "authTier": "local_http_ephemeral"
        }),
    };
    write
        .send(TungsteniteMessage::Text(
            serde_json::to_string(&pair_msg).unwrap(),
        ))
        .await
        .unwrap();

    let resp = read.next().await.unwrap().unwrap();
    let resp_env: MessageEnvelope = serde_json::from_str(&resp.into_text().unwrap()).unwrap();
    assert_eq!(resp_env.msg_type, "auth.error");

    assert!(resp_env.data["error"]
        .as_str()
        .unwrap()
        .contains("Secure WebCrypto"));
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

    let identity_public_key = "dGVzdF9wdWJsaWNfa2V5X3NlY3VyZQ==";
    let client_agreement = KeyAgreement::new();
    let client_ecdh_public_key = client_agreement.public_key_b64.clone();

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
            public_key: identity_public_key.to_string(),
            ecdh_public_key: client_ecdh_public_key,
            client_nonce: BASE64.encode([2_u8; 32]),
            auth_tier: "hosted_pwa_webcrypto".to_string(),
        })
        .unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(
            serde_json::to_string(&pair_msg).unwrap(),
        ))
        .await
        .unwrap();

    let ready = read.next().await.unwrap().unwrap();

    // 2. Client derives matching directional keys from the real ECDH secret.
    let mut client_cipher = cipher_from_ready(client_agreement, ready);

    // 3. Encrypt pointer delta message inside AES-GCM frame
    let inner_delta = MessageEnvelope {
        v: 1,
        id: "delta-enc-1".to_string(),
        timestamp: 1001,
        msg_type: "input.pointer.delta".to_string(),
        data: serde_json::to_value(PointerDeltaData {
            dx: 33.0,
            dy: -12.0,
            dt: None,
        })
        .unwrap(),
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
    write
        .send(TungsteniteMessage::Text(wire_text.clone()))
        .await
        .unwrap();

    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Platform must have received the decrypted pointer delta
    {
        let state_guard = mock.state.lock().unwrap();
        assert_eq!(state_guard.cursor_pos, (533.0, 488.0));
    }

    // 4. Replay Attack: Attacker re-sends the captured frame with sequence 1
    write
        .send(TungsteniteMessage::Text(wire_text))
        .await
        .unwrap();

    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Replay was rejected! Cursor position was NOT updated again
    {
        let state_guard = mock.state.lock().unwrap();
        assert_eq!(state_guard.cursor_pos, (533.0, 488.0));
        assert_eq!(state_guard.pointer_history.len(), 1);
    }

    // 5. Plaintext application messages are rejected after session_ready.
    let plaintext_delta = MessageEnvelope {
        v: 1,
        id: "plaintext-bypass".to_string(),
        timestamp: 1003,
        msg_type: "input.pointer.delta".to_string(),
        data: serde_json::json!({ "dx": 100.0, "dy": 100.0 }),
    };
    write
        .send(TungsteniteMessage::Text(
            serde_json::to_string(&plaintext_delta).unwrap(),
        ))
        .await
        .unwrap();
    let denial = read.next().await.unwrap().unwrap();
    let denial_env: MessageEnvelope = serde_json::from_str(&denial.into_text().unwrap()).unwrap();
    assert_eq!(denial_env.msg_type, "auth.error");
    assert_eq!(mock.state.lock().unwrap().pointer_history.len(), 1);
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
                ecdh_public_key: KeyAgreement::new().public_key_b64,
                client_nonce: BASE64.encode([3_u8; 32]),
                auth_tier: "hosted_pwa_webcrypto".to_string(),
            })
            .unwrap(),
        };
        write
            .send(TungsteniteMessage::Text(
                serde_json::to_string(&pair_msg).unwrap(),
            ))
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
                ecdh_public_key: KeyAgreement::new().public_key_b64,
                client_nonce: BASE64.encode([4_u8; 32]),
                auth_tier: "hosted_pwa_webcrypto".to_string(),
            })
            .unwrap(),
        };
        write
            .send(TungsteniteMessage::Text(
                serde_json::to_string(&pair_msg).unwrap(),
            ))
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
            ecdh_public_key: KeyAgreement::new().public_key_b64,
            client_nonce: BASE64.encode([5_u8; 32]),
            auth_tier: "hosted_pwa_webcrypto".to_string(),
        })
        .unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(
            serde_json::to_string(&pair_msg).unwrap(),
        ))
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
        .send(TungsteniteMessage::Text(
            serde_json::to_string(&key_down).unwrap(),
        ))
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

#[tokio::test]
async fn test_negative_binary_pointer_capability_denial() {
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

    let test_port = 18086;
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
        id: "pair-bin-test".to_string(),
        timestamp: 1000,
        msg_type: "auth.pair_request".to_string(),
        data: serde_json::to_value(PairRequestData {
            client_id: "phone_bin_restricted".to_string(),
            client_name: "Restricted Binary Phone".to_string(),
            token: test_token,
            public_key: "dGVzdF9wdWJsaWNfa2V5".to_string(),
            ecdh_public_key: KeyAgreement::new().public_key_b64,
            client_nonce: BASE64.encode([6_u8; 32]),
            auth_tier: "hosted_pwa_webcrypto".to_string(),
        })
        .unwrap(),
    };
    write
        .send(TungsteniteMessage::Text(
            serde_json::to_string(&pair_msg).unwrap(),
        ))
        .await
        .unwrap();

    let _resp = read.next().await.unwrap().unwrap();

    // Initial position is 500.0, 500.0
    {
        let state_guard = mock.state.lock().unwrap();
        assert_eq!(state_guard.cursor_pos, (500.0, 500.0));
    }

    // 2. Revoke InputMouse capability from live registry
    {
        let mut registry = state.device_registry.lock().unwrap();
        if let Some(dev) = registry.get_mut("phone_bin_restricted") {
            dev.capabilities = vec![Capability::MediaControl]; // NO InputMouse
        }
    }

    // 3. Send raw binary pointer delta: dx = 25.0, dy = 35.0
    let mut bin = Vec::new();
    bin.extend_from_slice(&25.0f32.to_le_bytes());
    bin.extend_from_slice(&35.0f32.to_le_bytes());
    write.send(TungsteniteMessage::Binary(bin)).await.unwrap();

    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Must NOT have moved because capability was revoked!
    {
        let state_guard = mock.state.lock().unwrap();
        assert_eq!(
            state_guard.cursor_pos,
            (500.0, 500.0),
            "Binary pointer frame must be rejected without input.mouse capability"
        );
        assert_eq!(state_guard.pointer_history.len(), 0);
    }
}

#[tokio::test]
async fn test_negative_ecdsa_forged_signature_denial() {
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

    // Register a known device with a valid P-256 public key
    let signing_key = p256::ecdsa::SigningKey::random(&mut rand::thread_rng());
    let verifying_key = signing_key.verifying_key();
    let sec1_pub = verifying_key.to_encoded_point(false);
    let pub_b64 = base64::engine::general_purpose::STANDARD.encode(sec1_pub.as_bytes());

    let dev = remote_core::devices::TrustedDevice {
        id: "phone_ecdsa".to_string(),
        name: "ECDSA Device".to_string(),
        public_key: pub_b64.clone(),
        capabilities: vec![Capability::InputMouse],
        created_at: 1000,
        last_seen_at: 1000,
        is_blocked: false,
    };
    state.device_registry.lock().unwrap().register(dev);

    let test_port = 18087;
    let server = RemoteServer::new(state.clone(), test_port);
    tokio::spawn(async move {
        let _ = server.run().await;
    });
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    let url = format!("ws://127.0.0.1:{}/ws", test_port);
    let (ws_stream, _) = connect_async(&url).await.expect("connect failed");
    let (mut write, mut read) = ws_stream.split();

    // 1. Request login challenge
    let attacker_agreement = KeyAgreement::new();
    let challenge_req = MessageEnvelope {
        v: 1,
        id: "chal-req-1".to_string(),
        timestamp: 1000,
        msg_type: "auth.login_challenge".to_string(),
        data: serde_json::json!({
            "clientId": "phone_ecdsa",
            "ecdhPublicKey": attacker_agreement.public_key_b64,
            "clientNonce": BASE64.encode([8_u8; 32]),
        }),
    };
    write
        .send(TungsteniteMessage::Text(
            serde_json::to_string(&challenge_req).unwrap(),
        ))
        .await
        .unwrap();

    let chal_resp = read.next().await.unwrap().unwrap();
    let chal_env: MessageEnvelope = serde_json::from_str(&chal_resp.into_text().unwrap()).unwrap();
    assert_eq!(chal_env.msg_type, "auth.login_challenge");
    let nonce = chal_env.data["nonce"].as_str().unwrap().to_string();

    // 2. Attacker submits forged signature
    let forged_sig_b64 = base64::engine::general_purpose::STANDARD.encode(vec![0u8; 64]);
    let login_resp = MessageEnvelope {
        v: 1,
        id: "login-resp-1".to_string(),
        timestamp: 1001,
        msg_type: "auth.login_response".to_string(),
        data: serde_json::json!({
            "clientId": "phone_ecdsa",
            "signature": forged_sig_b64,
            "nonce": nonce
        }),
    };
    write
        .send(TungsteniteMessage::Text(
            serde_json::to_string(&login_resp).unwrap(),
        ))
        .await
        .unwrap();

    let reply = read.next().await.unwrap().unwrap();
    let reply_env: MessageEnvelope = serde_json::from_str(&reply.into_text().unwrap()).unwrap();

    // Authentication MUST fail!
    assert_eq!(reply_env.msg_type, "auth.error");
    assert!(reply_env.data["error"]
        .as_str()
        .unwrap()
        .contains("Authentication failed"));
}
