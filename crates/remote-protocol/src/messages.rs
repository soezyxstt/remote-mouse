use crate::capabilities::Capability;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MessageEnvelope {
    pub v: u8,
    pub id: String,
    pub timestamp: u64,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub data: serde_json::Value,
}

// Client -> Server Data Payloads

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PointerDeltaData {
    pub dx: f32,
    pub dy: f32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dt: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PointerButtonData {
    pub button: String, // "left", "right", "middle"
    pub state: String,  // "down", "up", "click", "double_click"
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PointerScrollData {
    pub dx: f32,
    pub dy: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct KeyActionData {
    pub key: String,
    pub state: String, // "down", "up", "tap"
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modifiers: Option<Vec<String>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TextStreamData {
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MediaCommandData {
    pub action: String, // "play", "pause", "play_pause", "next", "prev", "volume_up", "volume_down", "set_volume", "mute", "seek"
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub value: Option<f32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PresentationCommandData {
    pub action: String, // "next", "prev", "start", "stop", "black_screen", "goto_slide"
    #[serde(rename = "slideIndex", default, skip_serializing_if = "Option::is_none")]
    pub slide_index: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WindowActionData {
    #[serde(rename = "windowId")]
    pub window_id: String,
    pub action: String, // "focus", "minimize", "maximize", "restore", "close", "snap_left", "snap_right", "move_to_display"
    #[serde(rename = "targetDisplay", default, skip_serializing_if = "Option::is_none")]
    pub target_display: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PairRequestData {
    #[serde(rename = "clientId")]
    pub client_id: String,
    #[serde(rename = "clientName")]
    pub client_name: String,
    pub token: String,
    #[serde(rename = "publicKey")]
    pub public_key: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LoginChallengeData {
    pub nonce: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LoginResponseData {
    #[serde(rename = "clientId")]
    pub client_id: String,
    pub signature: String,
    pub nonce: String,
}

// Server -> Client Data Payloads

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SessionReadyData {
    #[serde(rename = "serverName")]
    pub server_name: String,
    #[serde(rename = "serverVersion")]
    pub server_version: String,
    pub capabilities: Vec<Capability>,
    #[serde(rename = "activeDisplayCount")]
    pub active_display_count: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ForegroundAppState {
    #[serde(rename = "processName")]
    pub process_name: String,
    #[serde(rename = "windowTitle")]
    pub window_title: String,
    pub category: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MediaSessionState {
    pub title: String,
    pub artist: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub album: Option<String>,
    #[serde(rename = "isPlaying")]
    pub is_playing: bool,
    #[serde(rename = "positionSec")]
    pub position_sec: f32,
    #[serde(rename = "durationSec")]
    pub duration_sec: f32,
    pub volume: f32,
    #[serde(rename = "sourceApp", default, skip_serializing_if = "Option::is_none")]
    pub source_app: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub index: u32,
    pub name: String,
    pub width: u32,
    pub height: u32,
    #[serde(rename = "isPrimary")]
    pub is_primary: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FileItem {
    pub id: String,
    pub name: String,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
    #[serde(rename = "sizeBytes", default, skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    #[serde(rename = "modifiedAt", default, skip_serializing_if = "Option::is_none")]
    pub modified_at: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extension: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VirtualRoot {
    pub id: String,
    pub name: String,
    #[serde(rename = "pathAlias")]
    pub path_alias: String,
}
