// Browser identity and protected-session primitives. WebCrypto is deliberately
// required: an insecure-context fallback would make post-auth traffic readable
// and forgeable by any peer on the LAN.

const CLIENT_ID_KEY = 'remote_mouse_client_id';
const CLIENT_NAME_KEY = 'remote_mouse_client_name';
const DB_NAME = 'remote_mouse_keystore';
const STORE_NAME = 'keys';

export type AuthTier = 'hosted_pwa_webcrypto';

export interface ClientIdentity {
  tier: AuthTier;
  clientId: string;
  clientName: string;
  publicKey: string;
  signChallenge: (transcript: string) => Promise<string>;
}

export interface EphemeralKeyAgreement {
  privateKey: CryptoKey;
  publicKeyBase64: string;
  clientNonce: string;
}

export interface EncryptedFramePayload {
  seq: number;
  nonce: string;
  ciphertext: string;
}

export class BrowserSessionCipher {
  private sendSequence = 0;
  private receivedSequence = 0;
  private receivedNoncePrefix: string | null = null;
  private readonly sendNoncePrefix = crypto.getRandomValues(new Uint8Array(4));

  constructor(
    private readonly receiveKey: CryptoKey,
    private readonly sendKey: CryptoKey
  ) {}

  async encrypt(plaintext: Uint8Array): Promise<EncryptedFramePayload> {
    this.sendSequence += 1;
    const nonce = new Uint8Array(12);
    nonce.set(this.sendNoncePrefix, 0);
    new DataView(nonce.buffer).setBigUint64(4, BigInt(this.sendSequence), false);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
      this.sendKey,
      toArrayBuffer(plaintext)
    );

    return {
      seq: this.sendSequence,
      nonce: arrayBufferToBase64(nonce),
      ciphertext: arrayBufferToBase64(ciphertext),
    };
  }

  async decrypt(payload: EncryptedFramePayload): Promise<Uint8Array> {
    if (!Number.isSafeInteger(payload.seq) || payload.seq !== this.receivedSequence + 1) {
      throw new Error('Encrypted frame is replayed or out of order');
    }

    const nonce = base64ToBytes(payload.nonce);
    if (nonce.byteLength !== 12) throw new Error('Encrypted frame nonce is invalid');
    const nonceSequence = new DataView(toArrayBuffer(nonce)).getBigUint64(4, false);
    if (nonceSequence !== BigInt(payload.seq)) throw new Error('Encrypted frame nonce is invalid');
    const prefix = Array.from(nonce.slice(0, 4)).join(':');
    if (this.receivedNoncePrefix !== null && prefix !== this.receivedNoncePrefix) {
      throw new Error('Encrypted frame nonce prefix changed');
    }
    const ciphertext = base64ToBytes(payload.ciphertext);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
      this.receiveKey,
      toArrayBuffer(ciphertext)
    );
    this.receivedSequence = payload.seq;
    this.receivedNoncePrefix = prefix;
    return new Uint8Array(plaintext);
  }
}

export async function resolveClientIdentity(): Promise<ClientIdentity> {
  const isSecure =
    typeof window !== 'undefined' && window.isSecureContext === true && !!window.crypto?.subtle;

  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  let clientName = localStorage.getItem(CLIENT_NAME_KEY);

  if (!clientId) {
    clientId = 'phone_' + generateRandomHex(10);
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  if (!clientName) {
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
    clientName = isIOS ? "User's iPhone" : isAndroid ? "User's Android" : 'Mobile Phone';
    localStorage.setItem(CLIENT_NAME_KEY, clientName);
  }

  if (!isSecure) {
    throw new Error(
      'Secure pairing requires HTTPS (or localhost) with WebCrypto. Plain HTTP LAN control is disabled.'
    );
  }

  const keypair = await getOrCreateWebCryptoKeypair();
  return {
    tier: 'hosted_pwa_webcrypto',
    clientId,
    clientName,
    publicKey: keypair.publicKeyBase64,
    signChallenge: async (transcript: string) => {
      const signature = await window.crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        keypair.privateKey,
        new TextEncoder().encode(transcript)
      );
      return arrayBufferToBase64(signature);
    },
  };
}

export async function createEphemeralKeyAgreement(): Promise<EphemeralKeyAgreement> {
  const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
    'deriveBits',
  ]);
  const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const clientNonceBytes = crypto.getRandomValues(new Uint8Array(32));
  return {
    privateKey: keyPair.privateKey,
    publicKeyBase64: arrayBufferToBase64(publicKey),
    clientNonce: arrayBufferToBase64(clientNonceBytes),
  };
}

export async function deriveSessionCipher(
  agreement: EphemeralKeyAgreement,
  serverPublicKeyBase64: string,
  sessionSaltBase64: string
): Promise<BrowserSessionCipher> {
  const serverPublicKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(base64ToBytes(serverPublicKeyBase64)),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: serverPublicKey },
    agreement.privateKey,
    256
  );
  const hkdfKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']);
  const keyMaterial = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toArrayBuffer(base64ToBytes(sessionSaltBase64)),
      info: new TextEncoder().encode('remote-companion-v1-bidirectional-keys'),
    },
    hkdfKey,
    512
  );
  const bytes = new Uint8Array(keyMaterial);
  const clientToServer = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(bytes.slice(0, 32)),
    'AES-GCM',
    false,
    ['encrypt']
  );
  const serverToClient = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(bytes.slice(32, 64)),
    'AES-GCM',
    false,
    ['decrypt']
  );
  return new BrowserSessionCipher(serverToClient, clientToServer);
}

export function buildSessionTranscript(input: {
  clientId: string;
  challengeNonce: string;
  clientNonce: string;
  clientEcdhPublicKey: string;
  serverEcdhPublicKey: string;
  sessionSalt: string;
}): string {
  return [
    'remote-companion-v1',
    input.clientId,
    input.challengeNonce,
    input.clientNonce,
    input.clientEcdhPublicKey,
    input.serverEcdhPublicKey,
    input.sessionSalt,
  ].join('\n');
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

function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferView): string {
  const raw = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < raw.byteLength; i++) {
    binary += String.fromCharCode(raw[i]);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
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
