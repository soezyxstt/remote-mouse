use crate::crypto_session::{EncryptedFramePayload, SessionCipher};
use crate::devices::TrustedDevice;
use crate::permissions::PermissionChecker;
use crate::state::ServerState;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use remote_protocol::*;
use serde_json::json;
use std::net::SocketAddr;
use tokio::sync::mpsc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing::{error, info};

pub struct RemoteServer {
    pub state: ServerState,
    pub port: u16,
    pub static_pwa_dir: Option<String>,
}

impl RemoteServer {
    pub fn new(state: ServerState, port: u16) -> Self {
        Self {
            state,
            port,
            static_pwa_dir: None,
        }
    }

    pub fn with_static_dir(mut self, path: String) -> Self {
        self.static_pwa_dir = Some(path);
        self
    }

    pub fn create_router(state: ServerState, static_dir: Option<String>) -> Router {
        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        let mut router = Router::new()
            .route("/health", get(health_handler))
            .route("/api/info", get(server_info_handler))
            .route("/ws", get(ws_handler));

        if let Some(dir) = static_dir {
            if std::path::Path::new(&dir).exists() {
                router = router.fallback_service(ServeDir::new(dir));
            }
        }

        router.layer(cors).with_state(state)
    }

    pub async fn run(self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        let router = Self::create_router(self.state, self.static_pwa_dir);

        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) => {
                error!("Failed to bind to {}: {}", addr, e);
                return Err(Box::new(e));
            }
        };

        info!("PC Companion Remote server listening on {}", addr);
        axum::serve(listener, router).await?;
        Ok(())
    }
}

async fn health_handler() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "service": "pc-companion-remote",
        "version": "0.1.0"
    }))
}

async fn server_info_handler(State(state): State<ServerState>) -> impl IntoResponse {
    let dev_count = state.device_registry.lock().unwrap().devices.len();
    Json(json!({
        "name": "PC Companion Remote",
        "version": "0.1.0",
        "pairedDevices": dev_count,
        "activeConnections": state.active_connections.lock().unwrap().len()
    }))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<ServerState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: ServerState) {
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
    let conn_id = uuid::Uuid::new_v4().to_string();

    // Store outgoing sender
    {
        state
            .active_connections
            .lock()
            .unwrap()
            .insert(conn_id.clone(), tx.clone());
    }

    // Spawn writer task
    let writer_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    let mut authenticated_device: Option<TrustedDevice> = None;
    let mut session_cipher: Option<SessionCipher> = None;

    // Incoming message loop
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => {
                if let Ok(env) = serde_json::from_str::<MessageEnvelope>(&text) {
                    if env.msg_type == "secure.encrypted_frame" {
                        let decrypted_opt = if let Some(ref mut cipher) = session_cipher {
                            if let Ok(payload) = serde_json::from_value::<EncryptedFramePayload>(env.data.clone()) {
                                cipher.decrypt(&payload).ok()
                            } else {
                                None
                            }
                        } else {
                            None
                        };

                        if let Some(decrypted_bytes) = decrypted_opt {
                            if let Ok(inner_env) = serde_json::from_slice::<MessageEnvelope>(&decrypted_bytes) {
                                let response = handle_message(&inner_env, &state, &mut authenticated_device, &mut session_cipher, &conn_id).await;
                                if let Some(resp_env) = response {
                                    if let Some(ref mut cipher) = session_cipher {
                                        let resp_bytes = serde_json::to_vec(&resp_env).unwrap_or_default();
                                        let encrypted_resp = cipher.encrypt(&resp_bytes);
                                        let outer_env = MessageEnvelope {
                                            v: 1,
                                            id: uuid::Uuid::new_v4().to_string(),
                                            timestamp: Utc::now().timestamp_millis() as u64,
                                            msg_type: "secure.encrypted_frame".to_string(),
                                            data: serde_json::to_value(encrypted_resp).unwrap(),
                                        };
                                        if let Ok(resp_json) = serde_json::to_string(&outer_env) {
                                            let _ = tx.send(Message::Text(resp_json));
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        let response = handle_message(&env, &state, &mut authenticated_device, &mut session_cipher, &conn_id).await;
                        if let Some(resp_env) = response {
                            if let Ok(resp_json) = serde_json::to_string(&resp_env) {
                                let _ = tx.send(Message::Text(resp_json));
                            }
                        }
                    }
                }
            }
            Message::Binary(bin) => {
                // High-speed binary pointer delta: [dx: f32 (4 bytes), dy: f32 (4 bytes)]
                if authenticated_device.is_some() && bin.len() >= 8 {
                    let dx = f32::from_le_bytes(bin[0..4].try_into().unwrap());
                    let dy = f32::from_le_bytes(bin[4..8].try_into().unwrap());
                    let _ = state.input_provider.pointer_move_relative(dx, dy).await;
                }
            }
            Message::Ping(p) => {
                let _ = tx.send(Message::Pong(p));
            }
            Message::Close(_) => {
                break;
            }
            _ => {}
        }
    }

    // Safety cleanup: release all remote keys and mouse buttons to prevent stuck input
    let _ = state.input_provider.release_all_inputs().await;

    // Clean up connection
    {
        state
            .active_connections
            .lock()
            .unwrap()
            .remove(&conn_id);
    }
    let _ = writer_task.await;
}

async fn handle_message(
    env: &MessageEnvelope,
    state: &ServerState,
    auth_device: &mut Option<TrustedDevice>,
    session_cipher: &mut Option<SessionCipher>,
    _conn_id: &str,
) -> Option<MessageEnvelope> {
    let now = Utc::now().timestamp_millis() as u64;

    // 1. Auth and Pairing Handshakes
    if env.msg_type == "auth.pair_request" {
        if let Ok(req) = serde_json::from_value::<PairRequestData>(env.data.clone()) {
            let mut auth = state.auth_manager.lock().unwrap();
            let token_valid = auth.validate_pairing_token(&req.token);

            if token_valid.is_ok() {
                let is_ephemeral = env
                    .data
                    .get("authTier")
                    .and_then(|v| v.as_str())
                    == Some("local_http_ephemeral");

                // If ephemeral fallback, strictly grant Mouse, Media, Presentation only (NO arbitrary raw keyboard or files)
                let caps = if is_ephemeral {
                    vec![
                        Capability::InputMouse,
                        Capability::MediaControl,
                        Capability::PresentationControl,
                    ]
                } else {
                    Capability::default_capabilities()
                };

                let dev = TrustedDevice {
                    id: req.client_id.clone(),
                    name: req.client_name.clone(),
                    public_key: req.public_key.clone(),
                    capabilities: caps.clone(),
                    created_at: now,
                    last_seen_at: now,
                    is_blocked: false,
                };
                state
                    .device_registry
                    .lock()
                    .unwrap()
                    .register(dev.clone());
                *auth_device = Some(dev.clone());

                // Derive AES-256 session cipher with directional keys (is_server: true)
                *session_cipher = Some(SessionCipher::from_shared_secret(
                    req.public_key.as_bytes(),
                    req.token.as_bytes(),
                    true,
                ));

                return Some(MessageEnvelope {
                    v: 1,
                    id: uuid::Uuid::new_v4().to_string(),
                    timestamp: now,
                    msg_type: "auth.session_ready".to_string(),
                    data: serde_json::to_value(SessionReadyData {
                        server_name: "Windows PC Agent".to_string(),
                        server_version: "0.1.0".to_string(),
                        capabilities: caps,
                        active_display_count: 1,
                    })
                    .unwrap(),
                });
            } else {
                return Some(MessageEnvelope {
                    v: 1,
                    id: uuid::Uuid::new_v4().to_string(),
                    timestamp: now,
                    msg_type: "auth.error".to_string(),
                    data: json!({ "error": "Invalid or expired pairing token" }),
                });
            }
        }
    }

    if env.msg_type == "auth.login_challenge" {
        if let Ok(challenge_req) = serde_json::from_value::<LoginChallengeData>(env.data.clone()) {
            let mut auth = state.auth_manager.lock().unwrap();
            let nonce = auth.create_login_challenge(&challenge_req.nonce);
            return Some(MessageEnvelope {
                v: 1,
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: now,
                msg_type: "auth.login_challenge".to_string(),
                data: json!({ "nonce": nonce }),
            });
        }
    }

    if env.msg_type == "auth.login_response" {
        if let Ok(login_req) = serde_json::from_value::<LoginResponseData>(env.data.clone()) {
            let device_opt = {
                state
                    .device_registry
                    .lock()
                    .unwrap()
                    .get(&login_req.client_id)
                    .cloned()
            };

            if let Some(dev) = device_opt {
                if dev.is_blocked {
                    return Some(MessageEnvelope {
                        v: 1,
                        id: uuid::Uuid::new_v4().to_string(),
                        timestamp: now,
                        msg_type: "auth.error".to_string(),
                        data: json!({ "error": "Device is blocked" }),
                    });
                }

                let mut auth = state.auth_manager.lock().unwrap();
                let verify_res = auth.verify_signature(
                    &login_req.client_id,
                    &dev.public_key,
                    &login_req.signature,
                    &login_req.nonce,
                );

                if verify_res.is_ok() {
                    *auth_device = Some(dev.clone());

                    // Establish session cipher with ECDSA challenge nonce as salt and directional keys
                    *session_cipher = Some(SessionCipher::from_shared_secret(
                        dev.public_key.as_bytes(),
                        login_req.nonce.as_bytes(),
                        true,
                    ));

                    return Some(MessageEnvelope {
                        v: 1,
                        id: uuid::Uuid::new_v4().to_string(),
                        timestamp: now,
                        msg_type: "auth.session_ready".to_string(),
                        data: serde_json::to_value(SessionReadyData {
                            server_name: "Windows PC Agent".to_string(),
                            server_version: "0.1.0".to_string(),
                            capabilities: dev.capabilities,
                            active_display_count: 1,
                        })
                        .unwrap(),
                    });
                }
            }

            return Some(MessageEnvelope {
                v: 1,
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: now,
                msg_type: "auth.error".to_string(),
                data: json!({ "error": "Authentication failed" }),
            });
        }
    }

    // 2. Enforce Capability Permissions for Authenticated Sessions
    let current_dev = match auth_device {
        Some(d) => d,
        None => {
            return Some(MessageEnvelope {
                v: 1,
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: now,
                msg_type: "auth.error".to_string(),
                data: json!({ "error": "Unauthorized: pairing or login required" }),
            });
        }
    };

    if let Some(req_cap) = PermissionChecker::map_message_to_capability(&env.msg_type) {
        if !PermissionChecker::is_allowed(&current_dev.capabilities, req_cap) {
            return Some(MessageEnvelope {
                v: 1,
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: now,
                msg_type: "error".to_string(),
                data: json!({ "error": format!("Permission denied for capability: {:?}", req_cap) }),
            });
        }
    }

    // 3. Dispatch Handlers
    match env.msg_type.as_str() {
        // Realtime Input
        "input.pointer.delta" => {
            if let Ok(d) = serde_json::from_value::<PointerDeltaData>(env.data.clone()) {
                let _ = state.input_provider.pointer_move_relative(d.dx, d.dy).await;
            }
            None
        }
        "input.pointer.button" => {
            if let Ok(b) = serde_json::from_value::<PointerButtonData>(env.data.clone()) {
                let _ = state.input_provider.pointer_button(&b.button, &b.state).await;
            }
            None
        }
        "input.pointer.scroll" => {
            if let Ok(s) = serde_json::from_value::<PointerScrollData>(env.data.clone()) {
                let _ = state.input_provider.pointer_scroll(s.dx, s.dy).await;
            }
            None
        }
        "keyboard.key" => {
            if let Ok(k) = serde_json::from_value::<KeyActionData>(env.data.clone()) {
                let empty = vec![];
                let mods = k.modifiers.as_ref().unwrap_or(&empty);
                let _ = state
                    .input_provider
                    .key_action(&k.key, &k.state, mods)
                    .await;
            }
            None
        }
        "keyboard.text" => {
            if let Ok(t) = serde_json::from_value::<TextStreamData>(env.data.clone()) {
                let _ = state.input_provider.text_stream(&t.text).await;
            }
            None
        }

        // Media & Presentation
        "media.command" => {
            if let Ok(m) = serde_json::from_value::<MediaCommandData>(env.data.clone()) {
                let _ = state.media_provider.media_command(&m.action, m.value).await;
            }
            None
        }
        "presentation.command" => {
            if let Ok(p) = serde_json::from_value::<PresentationCommandData>(env.data.clone()) {
                let _ = state
                    .presentation_provider
                    .presentation_command(&p.action, p.slide_index)
                    .await;
            }
            None
        }

        // Apps & Windows
        "apps.launch" => {
            if let Some(app_id) = env.data.get("appId").and_then(|v| v.as_str()) {
                let _ = state.app_launcher.launch_app(app_id).await;
            }
            None
        }
        "windows.action" => {
            if let Ok(w) = serde_json::from_value::<WindowActionData>(env.data.clone()) {
                let _ = state
                    .window_manager
                    .window_action(&w.window_id, &w.action, w.target_display)
                    .await;
            }
            None
        }

        // Macros
        "macro.execute" => {
            if let Some(macro_id) = env.data.get("macroId").and_then(|v| v.as_str()) {
                let macro_opt = {
                    state
                        .macros
                        .lock()
                        .unwrap()
                        .iter()
                        .find(|m| m.id == macro_id)
                        .cloned()
                };
                if let Some(m) = macro_opt {
                    let _ = state.macro_engine.execute_macro(&m).await;
                }
            }
            None
        }

        // Clipboard
        "clipboard.get" => {
            let text = state
                .clipboard_provider
                .get_clipboard_text()
                .await
                .unwrap_or_default();
            Some(MessageEnvelope {
                v: 1,
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: now,
                msg_type: "state.clipboard".to_string(),
                data: json!({ "text": text }),
            })
        }
        "clipboard.set" => {
            if let Some(text) = env.data.get("text").and_then(|v| v.as_str()) {
                let _ = state.clipboard_provider.set_clipboard_text(text).await;
            }
            None
        }

        // Files
        "files.list_roots" => {
            let roots = state.file_provider.list_roots().await.unwrap_or_default();
            Some(MessageEnvelope {
                v: 1,
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: now,
                msg_type: "files.roots".to_string(),
                data: serde_json::to_value(roots).unwrap(),
            })
        }
        "files.browse" => {
            let root_id = env.data.get("rootId").and_then(|v| v.as_str()).unwrap_or("");
            let subpath = env.data.get("subpath").and_then(|v| v.as_str());
            let items = state
                .file_provider
                .browse(root_id, subpath)
                .await
                .unwrap_or_default();
            Some(MessageEnvelope {
                v: 1,
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: now,
                msg_type: "files.items".to_string(),
                data: serde_json::to_value(items).unwrap(),
            })
        }

        // Panels
        "panels.list" => {
            let panels = state.panels.lock().unwrap().clone();
            Some(MessageEnvelope {
                v: 1,
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: now,
                msg_type: "panels.list".to_string(),
                data: serde_json::to_value(panels).unwrap(),
            })
        }

        _ => None,
    }
}
