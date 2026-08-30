// Dual-Mode Identity & Keypair Management
// Tier 1 (Primary): Hosted HTTPS PWA with full WebCrypto ECDSA/Ed25519 asymmetric signatures
// Tier 2 (Fallback): Local HTTP Emergency Client with Ephemeral Session tokens (No crypto.subtle requirement)

const CLIENT_ID_KEY = 'remote_mouse_client_id';
const CLIENT_NAME_KEY = 'remote_mouse_client_name';
const CLIENT_PUBKEY_KEY = 'remote_mouse_client_pubkey';
const DB_NAME = 'remote_mouse_keystore';
const STORE_NAME = 'keys';

export type AuthTier = 'hosted_pwa_webcrypto' | 'local_http_ephemeral';

export interface ClientIdentity {
  tier: AuthTier;
  clientId: string;
  clientName: string;
  publicKey: string; // Base64 public key (ECDSA/Ed25519) or ephemeral identifier
  signChallenge?: (nonce: string) => Promise<string>;
}

export async function resolveClientIdentity(): Promise<ClientIdentity> {
  const isSecure = typeof window !== 'undefined' && window.isSecureContext === true && !!window.crypto?.subtle;

  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  let clientName = localStorage.getItem(CLIENT_NAME_KEY);

  if (!clientId) {
    clientId = 'phone_' + generateRandomHex(10);
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  if (!clientName) {
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
    clientName = isIOS ? "User's iPhone" : isAndroid ? "User's Android" : "Mobile Phone";
    localStorage.setItem(CLIENT_NAME_KEY, clientName);
  }

  // Tier 1: Secure Context (Hosted HTTPS PWA) -> Full WebCrypto ECDSA Keypair
  if (isSecure) {
    try {
      const keypair = await getOrCreateWebCryptoKeypair();
      return {
        tier: 'hosted_pwa_webcrypto',
        clientId,
        clientName,
        publicKey: keypair.publicKeyBase64,
        signChallenge: async (nonce: string) => {
          const enc = new TextEncoder();
          const signature = await window.crypto.subtle.sign(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            keypair.privateKey,
            enc.encode(nonce)
          );
          return arrayBufferToBase64(signature);
        },
      };
    } catch (e) {
      console.warn('WebCrypto key generation failed, falling back to ephemeral mode', e);
    }
  }

  // Tier 2: Insecure Context (Local HTTP LAN fallback http://192.168.x.x) -> Ephemeral Token Session
  let ephemeralId = localStorage.getItem(CLIENT_PUBKEY_KEY);
  if (!ephemeralId) {
    ephemeralId = 'ephemeral_' + generateRandomHex(16);
    localStorage.setItem(CLIENT_PUBKEY_KEY, ephemeralId);
  }

  return {
    tier: 'local_http_ephemeral',
    clientId,
    clientName,
    publicKey: ephemeralId,
  };
}

interface WebCryptoKeypairWrapper {
  publicKeyBase64: string;
  privateKey: CryptoKey;
}

async function getOrCreateWebCryptoKeypair(): Promise<WebCryptoKeypairWrapper> {
  const db = await openKeyDB();
  const existing = await getKeyFromDB(db, 'device_keypair');

  if (existing) {
    return existing;
  }

  // Generate ECDSA P-256 keypair
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false, // Private key non-extractable from browser for maximum security
    ['sign', 'verify']
  );

  const exportedPubKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = arrayBufferToBase64(exportedPubKey);

  const wrapper: WebCryptoKeypairWrapper = {
    publicKeyBase64,
    privateKey: keyPair.privateKey,
  };

  await saveKeyToDB(db, 'device_keypair', wrapper);
  return wrapper;
}

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getKeyFromDB(db: IDBDatabase, key: string): Promise<WebCryptoKeypairWrapper | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function saveKeyToDB(db: IDBDatabase, key: string, val: WebCryptoKeypairWrapper): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(val, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(length);
    crypto.getRandomValues(buf);
    for (let i = 0; i < length; i++) {
      result += chars[buf[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}
