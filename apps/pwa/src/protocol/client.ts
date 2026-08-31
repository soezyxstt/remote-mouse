import { MessageEnvelope, MessageType, createEnvelope } from '@remote/protocol';
import { resolveClientIdentity, ClientIdentity } from './crypto';

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

    try {
      this.identity = await resolveClientIdentity();
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
            authTier: this.identity.tier,
          });
        } else {
          // Reconnecting established session challenge
          this.send('auth.login_challenge', {
            nonce: this.identity.clientId,
          });
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const env = JSON.parse(event.data) as MessageEnvelope;

          if (env.type === 'auth.session_ready') {
            this.setState('connected');
            this.pairingToken = null;
          } else if (env.type === 'auth.login_challenge') {
            const data = env.data as { nonce?: string };
            if (data.nonce && this.identity?.signChallenge) {
              const signature = await this.identity.signChallenge(data.nonce);
              this.send('auth.login_response', {
                clientId: this.identity.clientId,
                signature,
                nonce: data.nonce,
              });
            } else if (this.identity?.tier === 'local_http_ephemeral') {
              // Local fallback without saved session requires pairing PIN
              this.setState('pairing_required');
            }
          } else if (env.type === 'auth.error') {
            this.setState('pairing_required');
          }

          this.listeners.forEach((l) => l(env));
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
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
    this.setState('disconnected');
  }

  public send<T>(type: MessageType, data: T) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const envelope = createEnvelope(type, data);
      this.ws.send(JSON.stringify(envelope));
    }
  }

  public sendBinaryPointerDelta(dx: number, dy: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setFloat32(0, dx, true);
      view.setFloat32(4, dy, true);
      this.ws.send(buffer);
    }
  }
}

export const globalRemoteClient = new RemoteClient();
