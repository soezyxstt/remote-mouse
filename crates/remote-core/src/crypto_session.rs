use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use hkdf::Hkdf;
use p256::ecdh::EphemeralSecret;
use p256::PublicKey as P256PublicKey;
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Decryption failed / authentication tag mismatch")]
    DecryptionFailed,
    #[error("Replay packet detected or out-of-order sequence (expected > {expected}, got {received})")]
    ReplayDetected { expected: u64, received: u64 },
    #[error("Base64 decoding failed")]
    Base64Error,
    #[error("Invalid ECDH public key format: {0}")]
    InvalidPublicKey(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedFramePayload {
    pub seq: u64,
    pub nonce: String,
    pub ciphertext: String,
}

pub struct KeyAgreement {
    ephemeral_secret: EphemeralSecret,
    pub public_key_b64: String,
}

impl KeyAgreement {
    /// Generate a fresh ephemeral ECDH P-256 keypair for this session
    pub fn new() -> Self {
        let secret = EphemeralSecret::random(&mut OsRng);
        let public = P256PublicKey::from(&secret);
        let sec1_bytes = public.to_sec1_bytes();
        let public_key_b64 = BASE64.encode(sec1_bytes);

        Self {
            ephemeral_secret: secret,
            public_key_b64,
        }
    }

    /// Compute ECDH shared secret and derive SessionCipher using HKDF
    pub fn derive_session_cipher(
        self,
        peer_public_b64: &str,
        session_nonce_salt: &[u8],
        is_server: bool,
    ) -> Result<SessionCipher, CryptoError> {
        let peer_bytes = BASE64
            .decode(peer_public_b64)
            .map_err(|_| CryptoError::Base64Error)?;

        let peer_public = P256PublicKey::from_sec1_bytes(&peer_bytes)
            .map_err(|e| CryptoError::InvalidPublicKey(e.to_string()))?;

        // Authenticated Diffie-Hellman Shared Secret (IKM)
        let shared_secret = self.ephemeral_secret.diffie_hellman(&peer_public);
        let ikm = shared_secret.raw_secret_bytes();

        Ok(SessionCipher::from_shared_secret(
            ikm.as_slice(),
            session_nonce_salt,
            is_server,
        ))
    }
}

pub struct SessionCipher {
    rx_cipher: Aes256Gcm,
    tx_cipher: Aes256Gcm,
    session_prefix: [u8; 4],
    last_received_seq: u64,
    current_send_seq: u64,
}

impl SessionCipher {
    /// Derive bidirectional AES-256 session keys from ECDH shared secret (IKM) using HKDF-SHA256
    /// Generates distinct Rx and Tx keys to guarantee direction separation
    pub fn from_shared_secret(ecdh_shared_secret: &[u8], salt_nonce: &[u8], is_server: bool) -> Self {
        // HKDF with ECDH shared secret as Input Keying Material (IKM)
        let hk = Hkdf::<Sha256>::new(Some(salt_nonce), ecdh_shared_secret);
        let mut key_material = [0u8; 64];
        hk.expand(b"remote-companion-v1-bidirectional-keys", &mut key_material)
            .expect("HKDF expand 64 bytes valid");

        let client_to_server_key = &key_material[0..32];
        let server_to_client_key = &key_material[32..64];

        let (rx_key, tx_key) = if is_server {
            (client_to_server_key, server_to_client_key)
        } else {
            (server_to_client_key, client_to_server_key)
        };

        let rx_cipher = Aes256Gcm::new_from_slice(rx_key).expect("32-byte key valid");
        let tx_cipher = Aes256Gcm::new_from_slice(tx_key).expect("32-byte key valid");

        // 32-bit random session prefix for deterministic nonce uniqueness
        let mut session_prefix = [0u8; 4];
        rand::thread_rng().fill_bytes(&mut session_prefix);

        Self {
            rx_cipher,
            tx_cipher,
            session_prefix,
            last_received_seq: 0,
            current_send_seq: 0,
        }
    }

    /// Construct 96-bit AES-GCM nonce: [32-bit session prefix] + [64-bit Big-Endian sequence counter]
    fn construct_nonce(&self, seq: u64) -> [u8; 12] {
        let mut nonce = [0u8; 12];
        nonce[0..4].copy_from_slice(&self.session_prefix);
        nonce[4..12].copy_from_slice(&seq.to_be_bytes());
        nonce
    }

    /// Encrypt plaintext message envelope into authenticated frame
    pub fn encrypt(&mut self, plaintext: &[u8]) -> EncryptedFramePayload {
        self.current_send_seq += 1;
        let nonce_bytes = self.construct_nonce(self.current_send_seq);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext_bytes = self
            .tx_cipher
            .encrypt(nonce, plaintext)
            .expect("Encryption with valid key and nonce succeeds");

        EncryptedFramePayload {
            seq: self.current_send_seq,
            nonce: BASE64.encode(nonce_bytes),
            ciphertext: BASE64.encode(ciphertext_bytes),
        }
    }

    /// Decrypt and authenticate incoming frame, enforcing monotonic sequence numbers
    pub fn decrypt(&mut self, payload: &EncryptedFramePayload) -> Result<Vec<u8>, CryptoError> {
        // Monotonic sequence check for anti-replay
        if payload.seq <= self.last_received_seq {
            return Err(CryptoError::ReplayDetected {
                expected: self.last_received_seq + 1,
                received: payload.seq,
            });
        }

        let nonce_bytes = BASE64
            .decode(&payload.nonce)
            .map_err(|_| CryptoError::Base64Error)?;
        if nonce_bytes.len() != 12 {
            return Err(CryptoError::DecryptionFailed);
        }
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext_bytes = BASE64
            .decode(&payload.ciphertext)
            .map_err(|_| CryptoError::Base64Error)?;

        let plaintext = self
            .rx_cipher
            .decrypt(nonce, ciphertext_bytes.as_ref())
            .map_err(|_| CryptoError::DecryptionFailed)?;

        // Update sequence on successful authentication
        self.last_received_seq = payload.seq;
        Ok(plaintext)
    }
}
