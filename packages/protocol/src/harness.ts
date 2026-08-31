import {
  FIXTURE_DISPLAYS,
  FIXTURE_FILE_ITEMS,
  FIXTURE_FOREGROUND_BROWSER,
  FIXTURE_MEDIA_SESSION,
  FIXTURE_PANELS,
  FIXTURE_SESSION_READY,
  FIXTURE_VIRTUAL_ROOTS,
} from './fixtures';
import {
  createEnvelope,
  DisplayInfo,
  FileItem,
  ForegroundAppState,
  MediaSessionState,
  MessageEnvelope,
  SessionReadyData,
  VirtualRoot,
} from './messages';
import { PanelDefinition } from './panels';

export type HarnessState =
  'disconnected' | 'connecting' | 'pairing_required' | 'connected' | 'error' | 'empty' | 'loading';

export interface HarnessConfig {
  initialState?: HarnessState;
  sessionReady?: SessionReadyData;
  foregroundApp?: ForegroundAppState | null;
  mediaState?: MediaSessionState | null;
  displays?: DisplayInfo[];
  virtualRoots?: VirtualRoot[];
  fileItems?: FileItem[];
  panels?: PanelDefinition[];
}

export class MockRemoteHarness {
  public state: HarnessState;
  public sessionReady: SessionReadyData;
  public foregroundApp: ForegroundAppState | null;
  public mediaState: MediaSessionState | null;
  public displays: DisplayInfo[];
  public virtualRoots: VirtualRoot[];
  public fileItems: FileItem[];
  public panels: PanelDefinition[];

  public recordedActions: MessageEnvelope[] = [];
  public messageSubscribers: Set<(env: MessageEnvelope) => void> = new Set();
  public stateSubscribers: Set<(state: HarnessState) => void> = new Set();

  constructor(config?: HarnessConfig) {
    this.state = config?.initialState || 'connected';
    this.sessionReady = config?.sessionReady || FIXTURE_SESSION_READY;
    this.foregroundApp =
      config?.foregroundApp !== undefined ? config.foregroundApp : FIXTURE_FOREGROUND_BROWSER;
    this.mediaState = config?.mediaState !== undefined ? config.mediaState : FIXTURE_MEDIA_SESSION;
    this.displays = config?.displays || FIXTURE_DISPLAYS;
    this.virtualRoots = config?.virtualRoots || FIXTURE_VIRTUAL_ROOTS;
    this.fileItems = config?.fileItems || FIXTURE_FILE_ITEMS;
    this.panels = config?.panels || FIXTURE_PANELS;
  }

  public setState(newState: HarnessState) {
    this.state = newState;
    this.stateSubscribers.forEach((cb) => cb(newState));

    if (newState === 'connected') {
      this.emitStateSync();
    }
  }

  public emitMessage<T>(env: MessageEnvelope<T>) {
    this.messageSubscribers.forEach((cb) => cb(env as MessageEnvelope));
  }

  public emitStateSync() {
    this.emitMessage(createEnvelope('auth.session_ready', this.sessionReady));
    if (this.foregroundApp) {
      this.emitMessage(createEnvelope('state.foreground_app', this.foregroundApp));
    }
    if (this.mediaState) {
      this.emitMessage(createEnvelope('state.media_session', this.mediaState));
    }
    this.emitMessage(createEnvelope('state.displays', this.displays));
    this.emitMessage(createEnvelope('panels.list', this.panels));
  }

  public handleClientMessage(envelope: MessageEnvelope) {
    this.recordedActions.push(envelope);

    switch (envelope.type) {
      case 'auth.pair_request':
        this.emitMessage(
          createEnvelope('auth.pair_response', {
            status: 'paired',
            serverPublicKey: 'mock_server_pub_key',
          })
        );
        this.setState('connected');
        break;

      case 'auth.login_challenge':
        this.emitMessage(createEnvelope('auth.session_ready', this.sessionReady));
        this.setState('connected');
        break;

      case 'panels.list':
        this.emitMessage(createEnvelope('panels.list', this.panels));
        break;

      case 'files.list_roots':
        this.emitMessage(createEnvelope('files.roots', this.virtualRoots));
        break;

      case 'files.browse':
        this.emitMessage(createEnvelope('files.items', this.fileItems));
        break;

      case 'clipboard.get':
        this.emitMessage(
          createEnvelope('state.clipboard', {
            text: 'Mock clipboard content from Windows host',
            timestamp: 1725000000,
          })
        );
        break;

      default:
        this.emitMessage(
          createEnvelope('ack', {
            actionId: envelope.id,
            status: 'success',
          })
        );
        break;
    }
  }

  public subscribeMessages(listener: (env: MessageEnvelope) => void): () => void {
    this.messageSubscribers.add(listener);
    return () => this.messageSubscribers.delete(listener);
  }

  public subscribeState(listener: (state: HarnessState) => void): () => void {
    this.stateSubscribers.add(listener);
    listener(this.state);
    return () => this.stateSubscribers.delete(listener);
  }

  public clearRecordedActions() {
    this.recordedActions = [];
  }
}
