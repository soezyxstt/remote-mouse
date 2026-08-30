use remote_protocol::Capability;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustedDevice {
    pub id: String,
    pub name: String,
    #[serde(rename = "publicKey")]
    pub public_key: String, // Base64 encoded Ed25519 public key
    pub capabilities: Vec<Capability>,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    #[serde(rename = "lastSeenAt")]
    pub last_seen_at: u64,
    pub is_blocked: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DeviceRegistry {
    pub devices: HashMap<String, TrustedDevice>,
}

impl DeviceRegistry {
    pub fn new() -> Self {
        Self {
            devices: HashMap::new(),
        }
    }

    pub fn register(&mut self, device: TrustedDevice) {
        self.devices.insert(device.id.clone(), device);
    }

    pub fn get(&self, id: &str) -> Option<&TrustedDevice> {
        self.devices.get(id)
    }

    pub fn get_mut(&mut self, id: &str) -> Option<&mut TrustedDevice> {
        self.devices.get_mut(id)
    }

    pub fn revoke(&mut self, id: &str) -> bool {
        self.devices.remove(id).is_some()
    }

    pub fn set_blocked(&mut self, id: &str, blocked: bool) -> bool {
        if let Some(dev) = self.devices.get_mut(id) {
            dev.is_blocked = blocked;
            true
        } else {
            false
        }
    }

    pub fn update_last_seen(&mut self, id: &str, timestamp: u64) {
        if let Some(dev) = self.devices.get_mut(id) {
            dev.last_seen_at = timestamp;
        }
    }
}
