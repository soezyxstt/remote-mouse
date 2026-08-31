import {
  Action,
  EncryptedFrameData,
  MessageEnvelope,
  MessageType,
  SessionReadyData,
  createEnvelope,
} from '@remote/protocol';
import {
  BrowserSessionCipher,
  ClientIdentity,
  EphemeralKeyAgreement,
  buildSessionTranscript,
  createEphemeralKeyAgreement,
  deriveSessionCipher,
  resolveClientIdentity,
} from './crypto';

export type ConnectionState =
  'disconnected' | 'connecting' | 'pairing_required' | 'connected' | 'error';

export type MessageListener = (env: MessageEnvelope) => void;

export class RemoteClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private state: ConnectionState = 'disconnected';
  private listeners: Set<MessageListener> = new Set();
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private reconnectTimer: number | null = null;
  private retryCount: number = 0;
  private pairingToken: string | null = null;
  private identity: ClientIdentity | null = null;
  private keyAgreement: EphemeralKeyAgreement | null = null;
  private sessionCipher: BrowserSessionCipher | null = null;
  private pendingSessionCipher: BrowserSessionCipher | null = null;
  private outboundChain: Promise<void> = Promise.resolve();
  private inboundChain: Promise<void> = Promise.resolve();

  constructor() {
    const savedHost = localStorage.getItem('remote_host');
    if (savedHost) {
      this.url = savedHost;
    }
  }

  public setHost(hostUrl: string) {
    this.url = hostUrl;
    localStorage.setItem('remote_host', hostUrl);
  }

  public getHost(): string {
    return this.url;
  }

  public setPairingToken(token: string) {
    this.pairingToken = token;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  private setState(newState: ConnectionState) {
    this.state = newState;
    this.stateListeners.forEach((l) => l(newState));
  }

  public subscribeState(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeMessages(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async connect(hostUrl?: string, pairingToken?: string) {
    if (hostUrl) this.setHost(hostUrl);
    if (pairingToken) this.setPairingToken(pairingToken);

    if (!this.url) {
      this.setState('disconnected');
      return;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setState('connecting');
    this.sessionCipher = null;
    this.pendingSessionCipher = null;

    try {
      this.identity = await resolveClientIdentity();
      this.keyAgreement = await createEphemeralKeyAgreement();
      const wsUrl = this.url.replace(/^http/, 'ws') + '/ws';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        this.retryCount = 0;
        if (!this.identity) return;

        if (this.pairingToken) {
          // Fresh pairing handshake
          this.send('auth.pair_request', {
            clientId: this.identity.clientId,
            clientName: this.identity.clientName,
            token: this.pairingToken,
            publicKey: this.identity.publicKey,
            ecdhPublicKey: this.keyAgreement?.publicKeyBase64,
            clientNonce: this.keyAgreement?.clientNonce,
            authTier: this.identity.tier,
          });
        } else {
          // Reconnecting established session challenge
          this.send('auth.login_challenge', {
            clientId: this.identity.clientId,
            ecdhPublicKey: this.keyAgreement?.publicKeyBase64,
            clientNonce: this.keyAgreement?.clientNonce,
          });
        }
      };

      this.ws.onmessage = (event) => {
        this.inboundChain = this.inboundChain
          .then(() => this.handleWireMessage(event.data))
          .catch((error) => {
            console.error('Rejected protected WebSocket message', error);
            this.setState('error');
            this.ws?.close(1008, 'Invalid protected frame');
          });
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.state !== 'pairing_required') {
          this.setState('disconnected');
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.setState('error');
      };
    } catch {
      this.setState('error');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.retryCount), 10000);
    this.retryCount++;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.url) {
        this.connect();
      }
    }, delay);
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionCipher = null;
    this.pendingSessionCipher = null;
    this.keyAgreement = null;
    this.setState('disconnected');
  }

  public send<T>(type: MessageType, data: T) {
    const envelope = createEnvelope(type, data);
    if (!this.sessionCipher) {
      this.sendPlaintext(envelope);
      return;
    }

    this.outboundChain = this.outboundChain
      .then(async () => {
        const encoded = new TextEncoder().encode(JSON.stringify(envelope));
        const encrypted = await this.sessionCipher?.encrypt(encoded);
        if (!encrypted) return;
        this.sendPlaintext(createEnvelope('secure.encrypted_frame', encrypted));
      })
      .catch((error) => {
        console.error('Failed to encrypt outbound message', error);
        this.setState('error');
        this.ws?.close(1011, 'Encryption failed');
      });
  }

  public execute(action: Action) {
    this.send('action.execute', action);
  }

  public sendBinaryPointerDelta(dx: number, dy: number) {
    if (Number.isFinite(dx) && Number.isFinite(dy)) {
      this.send('input.pointer.delta', { dx, dy });
    }
  }

  private sendPlaintext(envelope: MessageEnvelope) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(envelope));
    }
  }

  private async handleWireMessage(raw: unknown) {
    if (typeof raw !== 'string') throw new Error('Binary WebSocket frames are not accepted');
    let env = JSON.parse(raw) as MessageEnvelope;

    if (env.type === 'secure.encrypted_frame') {
      if (!this.sessionCipher) throw new Error('Encrypted frame arrived before session setup');
      const plaintext = await this.sessionCipher.decrypt(env.data as EncryptedFrameData);
      env = JSON.parse(new TextDecoder().decode(plaintext)) as MessageEnvelope;
    } else if (this.sessionCipher && env.type !== 'auth.error') {
      throw new Error('Plaintext application frame arrived after session setup');
    }

    if (env.type === 'auth.session_ready') {
      const data = env.data as SessionReadyData;
      if (!this.keyAgreement || !data.serverEcdhPublicKey || !data.sessionSalt) {
        throw new Error('Session ready message omitted ECDH parameters');
      }
      this.sessionCipher =
        this.pendingSessionCipher ??
        (await deriveSessionCipher(this.keyAgreement, data.serverEcdhPublicKey, data.sessionSalt));
      this.pendingSessionCipher = null;
      this.setState('connected');
      this.pairingToken = null;
    } else if (env.type === 'auth.login_challenge') {
      const data = env.data as {
        nonce?: string;
        serverEcdhPublicKey?: string;
        sessionSalt?: string;
      };
      if (
        !data.nonce ||
        !data.serverEcdhPublicKey ||
        !data.sessionSalt ||
        !this.identity ||
        !this.keyAgreement
      ) {
        throw new Error('Login challenge omitted transcript parameters');
      }
      this.pendingSessionCipher = await deriveSessionCipher(
        this.keyAgreement,
        data.serverEcdhPublicKey,
        data.sessionSalt
      );
      const transcript = buildSessionTranscript({
        clientId: this.identity.clientId,
        challengeNonce: data.nonce,
        clientNonce: this.keyAgreement.clientNonce,
        clientEcdhPublicKey: this.keyAgreement.publicKeyBase64,
        serverEcdhPublicKey: data.serverEcdhPublicKey,
        sessionSalt: data.sessionSalt,
      });
      const signature = await this.identity.signChallenge(transcript);
      this.send('auth.login_response', {
        clientId: this.identity.clientId,
        signature,
        nonce: data.nonce,
      });
    } else if (env.type === 'auth.error') {
      this.setState('pairing_required');
    }

    this.listeners.forEach((listener) => listener(env));
  }
}

export const globalRemoteClient = new RemoteClient();
