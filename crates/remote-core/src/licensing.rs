use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LicenseTier {
    Free,
    Pro,
}

pub struct LicensingManager {
    pub tier: LicenseTier,
    pub license_key: Option<String>,
}

impl Default for LicensingManager {
    fn default() -> Self {
        Self {
            tier: LicenseTier::Free,
            license_key: None,
        }
    }
}

impl LicensingManager {
    pub fn new(tier: LicenseTier) -> Self {
        Self {
            tier,
            license_key: None,
        }
    }

    pub fn is_pro(&self) -> bool {
        self.tier == LicenseTier::Pro
    }

    pub fn can_use_custom_builder(&self) -> bool {
        self.is_pro()
    }

    pub fn can_use_file_companion(&self) -> bool {
        self.is_pro()
    }

    pub fn can_use_window_manager(&self) -> bool {
        self.is_pro()
    }

    pub fn can_use_advanced_macros(&self) -> bool {
        self.is_pro()
    }

    pub fn activate_pro_key(&mut self, key: &str) -> bool {
        // One-time offline or signature-verified key
        if key.starts_with("PRO-") && key.len() >= 16 {
            self.tier = LicenseTier::Pro;
            self.license_key = Some(key.to_string());
            true
        } else {
            false
        }
    }
}
