import { Capability } from './capabilities';

export type MessageType =
  // Realtime
  | 'input.pointer.delta'
  | 'input.pointer.button'
  | 'input.pointer.scroll'
  | 'keyboard.key'
  | 'keyboard.text'
  // Control
  | 'media.command'
  | 'presentation.command'
  | 'apps.launch'
  | 'windows.action'
  | 'macro.execute'
  | 'power.command'
  // Data
  | 'clipboard.get'
  | 'clipboard.set'
  | 'files.list_roots'
  | 'files.roots'
  | 'files.browse'
  | 'files.items'
  | 'files.read_chunk'
  | 'files.read_file'
  | 'files.content'
  | 'panels.list'
  | 'panels.save'
  // Auth & Session
  | 'auth.pair_request'
  | 'auth.pair_response'
  | 'auth.login_challenge'
  | 'auth.login_response'
  | 'auth.session_ready'
  | 'auth.error'
  // State Sync Broadcasts
  | 'state.foreground_app'
  | 'state.media_session'
  | 'state.displays'
  | 'state.clipboard'
  | 'state.system_status'
  // Generic Acknowledgement
  | 'ack'
  | 'error';

export interface MessageEnvelope<T = unknown> {
  v: 1;
  id: string;
  timestamp: number;
  type: MessageType;
  data: T;
}

// Client -> Server Data Payloads
export interface PointerDeltaData {
  dx: number;
  dy: number;
  dt?: number;
}

export interface PointerButtonData {
  button: 'left' | 'right' | 'middle';
  state: 'down' | 'up' | 'click' | 'double_click';
}

export interface PointerScrollData {
  dx: number;
  dy: number;
}

export interface KeyActionData {
  key: string;
  state: 'down' | 'up' | 'tap';
  modifiers?: Array<'ctrl' | 'alt' | 'shift' | 'win'>;
}

export interface TextStreamData {
  text: string;
}

export interface MediaCommandData {
  action:
    | 'play'
    | 'pause'
    | 'play_pause'
    | 'next'
    | 'prev'
    | 'volume_up'
    | 'volume_down'
    | 'set_volume'
    | 'mute'
    | 'seek';
  value?: number;
}

export interface PresentationCommandData {
  action: 'next' | 'prev' | 'start' | 'stop' | 'black_screen' | 'goto_slide';
  slideIndex?: number;
}

export interface WindowActionData {
  windowId: string;
  action:
    | 'focus'
    | 'minimize'
    | 'maximize'
    | 'restore'
    | 'close'
    | 'snap_left'
    | 'snap_right'
    | 'move_to_display';
  targetDisplay?: number;
}

export interface PairRequestData {
  clientId: string;
  clientName: string;
  token: string;
  publicKey: string;
}

export interface LoginChallengeData {
  nonce: string;
}

export interface LoginResponseData {
  clientId: string;
  signature: string;
  nonce: string;
}

// Server -> Client Data Payloads
export interface SessionReadyData {
  serverName: string;
  serverVersion: string;
  capabilities: Capability[];
  activeDisplayCount: number;
}

export interface ForegroundAppState {
  processName: string;
  windowTitle: string;
  category:
    | 'general'
    | 'media'
    | 'presentation'
    | 'browser'
    | 'development'
    | 'meeting'
    | 'design'
    | 'documents';
}

export interface MediaSessionState {
  title: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  volume: number;
  sourceApp?: string;
}

export interface DisplayInfo {
  index: number;
  name: string;
  width: number;
  height: number;
  isPrimary: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  isDir: boolean;
  sizeBytes?: number;
  modifiedAt?: number;
  extension?: string;
}

export interface VirtualRoot {
  id: string;
  name: string;
  pathAlias: string;
}

export function createEnvelope<T>(type: MessageType, data: T): MessageEnvelope<T> {
  return {
    v: 1,
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 11),
    timestamp: Date.now(),
    type,
    data,
  };
}
