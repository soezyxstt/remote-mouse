use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use chrono::{DateTime, Duration, Utc};
use p256::ecdsa::signature::Verifier;
use p256::ecdsa::{Signature, VerifyingKey};
use p256::pkcs8::DecodePublicKey;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AuthError {
    #[error("Pairing token invalid or expired")]
    InvalidToken,
    #[error("Device not found in registry")]
    DeviceNotFound,
    #[error("Invalid signature / challenge response")]
    InvalidSignature,
    #[error("Device has been blocked or revoked")]
    DeviceRevoked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingToken {
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub is_used: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingPairRequest {
    pub client_id: String,
    pub client_name: String,
    pub public_key: String,
    pub requested_at: DateTime<Utc>,
}

#[derive(Default)]
pub struct AuthManager {
    pub active_tokens: HashMap<String, PairingToken>,
    pub pending_requests: HashMap<String, PendingPairRequest>,
    pub active_challenges: HashMap<String, String>, // client_id -> challenge_nonce
}

impl AuthManager {
    pub fn new() -> Self {
        Self::default()
    }

    /// Generate an ephemeral 6-digit PIN with TTL in seconds
    pub fn generate_pairing_token(&mut self, ttl_seconds: i64) -> String {
        let token: u32 = 100_000 + (rand::random::<u32>() % 900_000);
        let token_str = token.to_string();

        let pair_token = PairingToken {
            token: token_str.clone(),
            expires_at: Utc::now() + Duration::seconds(ttl_seconds),
            is_used: false,
        };

        self.active_tokens.insert(token_str.clone(), pair_token);
        token_str
    }

    /// Validate and consume a single-use pairing token
    pub fn validate_pairing_token(&mut self, token_str: &str) -> Result<(), AuthError> {
        let now = Utc::now();
        if let Some(token) = self.active_tokens.get_mut(token_str) {
            if token.is_used || token.expires_at < now {
                return Err(AuthError::InvalidToken);
            }
            // Mark token as used immediately (single-use enforcement)
            token.is_used = true;
            Ok(())
        } else {
            Err(AuthError::InvalidToken)
        }
    }

    /// Create cryptographic challenge for device login
    pub fn create_login_challenge(&mut self, client_id: &str) -> String {
        let nonce = uuid::Uuid::new_v4().to_string();
        self.active_challenges
            .insert(client_id.to_string(), nonce.clone());
        nonce
    }

    /// Verify login challenge signature
    pub fn verify_signature(
        &mut self,
        client_id: &str,
        public_key_b64: &str,
        signature_b64: &str,
        nonce: &str,
        signed_message: &[u8],
    ) -> Result<(), AuthError> {
        // Validate challenge nonce
        let stored_nonce = self.active_challenges.remove(client_id);
        if stored_nonce.as_deref() != Some(nonce) {
            return Err(AuthError::InvalidSignature);
        }

        // Verify non-empty cryptographic components
        if public_key_b64.is_empty() || signature_b64.is_empty() {
            return Err(AuthError::InvalidSignature);
        }

        // Try cryptographic P-256 ECDSA verification
        if let Ok(pub_bytes) = BASE64.decode(public_key_b64) {
            if let Ok(verifying_key) = VerifyingKey::from_sec1_bytes(&pub_bytes)
                .or_else(|_| VerifyingKey::from_public_key_der(&pub_bytes))
            {
                if let Ok(sig_bytes) = BASE64.decode(signature_b64) {
                    if let Ok(sig) = Signature::from_der(&sig_bytes)
                        .or_else(|_| Signature::from_slice(&sig_bytes))
                    {
                        if verifying_key.verify(signed_message, &sig).is_ok() {
                            return Ok(());
                        } else {
                            return Err(AuthError::InvalidSignature);
                        }
                    }
                }
                return Err(AuthError::InvalidSignature);
            }
        }

        Err(AuthError::InvalidSignature)
    }
}
