import { describe, expect, it } from 'vitest';
import {
  BrowserSessionCipher,
  createEphemeralKeyAgreement,
  deriveSessionCipher,
} from '../../apps/pwa/src/protocol/crypto';

const toBase64 = (bytes: ArrayBuffer): string =>
  Buffer.from(new Uint8Array(bytes)).toString('base64');

async function createServerCipher(clientPublicKeyBase64: string, salt: Uint8Array) {
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
    'deriveBits',
  ]);
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    Buffer.from(clientPublicKeyBase64, 'base64'),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const secret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeys.privateKey,
    256
  );
  const hkdf = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits']);
  const material = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode('remote-companion-v1-bidirectional-keys'),
    },
    hkdf,
    512
  );
  const bytes = new Uint8Array(material);
  const receiveKey = await crypto.subtle.importKey('raw', bytes.slice(0, 32), 'AES-GCM', false, [
    'decrypt',
  ]);
  const sendKey = await crypto.subtle.importKey('raw', bytes.slice(32), 'AES-GCM', false, [
    'encrypt',
  ]);
  const publicKey = await crypto.subtle.exportKey('raw', serverKeys.publicKey);
  return {
    cipher: new BrowserSessionCipher(receiveKey, sendKey),
    publicKeyBase64: toBase64(publicKey),
  };
}

describe('protected browser session', () => {
  it('uses ECDH-derived directional keys and rejects replayed frames', async () => {
    const clientAgreement = await createEphemeralKeyAgreement();
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const server = await createServerCipher(clientAgreement.publicKeyBase64, salt);
    const client = await deriveSessionCipher(
      clientAgreement,
      server.publicKeyBase64,
      Buffer.from(salt).toString('base64')
    );

    const request = new TextEncoder().encode('{"type":"input.pointer.delta"}');
    const protectedRequest = await client.encrypt(request);
    expect(protectedRequest.ciphertext).not.toContain('input.pointer.delta');
    const decryptedRequest = await server.cipher.decrypt(protectedRequest);
    expect(new TextDecoder().decode(decryptedRequest)).toBe(new TextDecoder().decode(request));
    await expect(server.cipher.decrypt(protectedRequest)).rejects.toThrow(/replayed|out of order/i);

    const response = new TextEncoder().encode('{"type":"action.result"}');
    const protectedResponse = await server.cipher.encrypt(response);
    const decryptedResponse = await client.decrypt(protectedResponse);
    expect(new TextDecoder().decode(decryptedResponse)).toBe(new TextDecoder().decode(response));
  });
});
