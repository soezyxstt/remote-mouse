import {
  Action,
  ActionResult,
  CompanionEvent,
  Query,
  QueryResult,
  validateActionBounds,
} from './actions';
import { Capability } from './capabilities';

export interface ConnectionTarget {
  url: string;
  token?: string;
  clientId?: string;
  clientName?: string;
}

export interface SessionInfo {
  sessionId: string;
  serverName: string;
  serverVersion: string;
  capabilities: Capability[];
}

export type Unsubscribe = () => void;

export interface PointerStream {
  sendDelta(dx: number, dy: number, dt?: number): void;
  releaseAll(): Promise<void>;
  close(): void;
}

export interface CompanionTransport {
  connect(target: ConnectionTarget): Promise<SessionInfo>;
  disconnect(reason?: string): Promise<void>;
  execute(action: Action): Promise<ActionResult>;
  request<Q extends Query>(query: Q): Promise<QueryResult<Q>>;
  subscribe<E extends CompanionEvent>(type: E['type'], listener: (event: E) => void): Unsubscribe;
  getPointerStream(): PointerStream;
  isConnected(): boolean;
}

export class InMemoryCompanionTransport implements CompanionTransport {
  private connected: boolean = false;
  private eventListeners: Map<string, Set<(event: CompanionEvent) => void>> = new Map();
  public executedActions: Action[] = [];
  public sentPointerDeltas: Array<{ dx: number; dy: number; dt?: number }> = [];

  constructor(
    private sessionInfo: SessionInfo = {
      sessionId: 'mem-session-1',
      serverName: 'InMemory-Windows-Mock',
      serverVersion: '0.1.0',
      capabilities: [
        'input.mouse',
        'input.keyboard',
        'media.control',
        'presentation.control',
        'apps.launch',
        'windows.control',
        'clipboard.read',
        'clipboard.write',
        'power.lock',
      ],
    }
  ) {}

  public async connect(target: ConnectionTarget): Promise<SessionInfo> {
    if (!target.url) {
      throw new Error('ConnectionTarget url is required');
    }
    this.connected = true;
    return this.sessionInfo;
  }

  public async disconnect(_reason?: string): Promise<void> {
    this.connected = false;
    this.sentPointerDeltas = [];
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async execute(action: Action): Promise<ActionResult> {
    if (!this.connected) {
      return {
        actionId: 'err-not-connected',
        status: 'error',
        error: 'Transport is not connected',
      };
    }

    const validation = validateActionBounds(action);
    if (!validation.valid) {
      return {
        actionId: 'err-validation',
        status: 'error',
        error: validation.error,
      };
    }

    this.executedActions.push(action);
    return {
      actionId: `act-${this.executedActions.length}`,
      status: 'ok',
    };
  }

  public async request<Q extends Query>(query: Q): Promise<QueryResult<Q>> {
    if (!this.connected) {
      throw new Error('Transport is not connected');
    }

    switch (query.type) {
      case 'files.list_roots':
        return [
          { id: 'root-docs', name: 'Documents', pathAlias: 'C:\\Users\\Mock\\Docs' },
        ] as QueryResult<Q>;

      case 'files.browse':
        return [
          { id: `${query.rootId}:file.txt`, name: 'file.txt', isDir: false, sizeBytes: 1024 },
        ] as QueryResult<Q>;

      case 'clipboard.get':
        return { text: 'In-memory clipboard content', timestamp: Date.now() } as QueryResult<Q>;

      default:
        return [] as QueryResult<Q>;
    }
  }

  public subscribe<E extends CompanionEvent>(
    type: E['type'],
    listener: (event: E) => void
  ): Unsubscribe {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    const set = this.eventListeners.get(type)!;
    const fn = listener as (event: CompanionEvent) => void;
    set.add(fn);
    return () => {
      set.delete(fn);
    };
  }

  public emitEvent<E extends CompanionEvent>(event: E) {
    const set = this.eventListeners.get(event.type);
    if (set) {
      set.forEach((cb) => cb(event));
    }
  }

  public getPointerStream(): PointerStream {
    return {
      sendDelta: (dx, dy, dt) => {
        if (this.connected) {
          this.sentPointerDeltas.push({ dx, dy, dt });
        }
      },
      releaseAll: async () => {
        // Release inputs
      },
      close: () => {},
    };
  }
}
