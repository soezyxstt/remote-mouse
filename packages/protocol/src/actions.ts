import { Capability } from './capabilities';
import {
  DisplayInfo,
  FileItem,
  ForegroundAppState,
  MediaSessionState,
  VirtualRoot,
} from './messages';
import { PanelDefinition } from './panels';

export type Action =
  | {
      type: 'pointer.button';
      button: 'left' | 'right' | 'middle';
      state: 'down' | 'up' | 'click' | 'double_click';
    }
  | {
      type: 'pointer.scroll';
      dx: number;
      dy: number;
    }
  | {
      type: 'keyboard.key';
      key: string;
      state: 'down' | 'up' | 'tap';
      modifiers?: Array<'ctrl' | 'alt' | 'shift' | 'win'>;
    }
  | {
      type: 'keyboard.text';
      text: string;
    }
  | {
      type: 'keyboard.shortcut';
      keys: string[];
    }
  | {
      type: 'media.command';
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
      value?: number | null;
    }
  | {
      type: 'presentation.command';
      action: 'next' | 'prev' | 'start' | 'stop' | 'black_screen' | 'goto_slide';
      slideIndex?: number | null;
    }
  | {
      type: 'apps.launch';
      appId: string;
    }
  | {
      type: 'windows.action';
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
      targetDisplay?: number | null;
    }
  | {
      type: 'clipboard.set';
      text: string;
    }
  | {
      type: 'power.command';
      action: 'lock' | 'sleep' | 'restart' | 'shutdown';
    }
  | {
      type: 'macro.execute';
      macroId: string;
    };

export interface ActionResult {
  actionId: string;
  status: 'ok' | 'error';
  error?: string | null;
}

export type Query =
  | { type: 'files.list_roots' }
  | { type: 'files.browse'; rootId: string; subpath?: string }
  | { type: 'files.read_file'; rootId: string; subpath: string }
  | { type: 'panels.list' }
  | { type: 'clipboard.get' };

export type QueryResult<Q extends Query> = Q extends { type: 'files.list_roots' }
  ? VirtualRoot[]
  : Q extends { type: 'files.browse' }
    ? FileItem[]
    : Q extends { type: 'files.read_file' }
      ? { rootId: string; subpath: string; filename: string; contentBase64: string; size: number }
      : Q extends { type: 'panels.list' }
        ? PanelDefinition[]
        : Q extends { type: 'clipboard.get' }
          ? { text: string; timestamp: number }
          : unknown;

export type CompanionEvent =
  | { type: 'state.foreground_app'; data: ForegroundAppState }
  | { type: 'state.media_session'; data: MediaSessionState }
  | { type: 'state.displays'; data: DisplayInfo[] }
  | { type: 'state.clipboard'; data: { text: string; timestamp: number } }
  | { type: 'state.system_status'; data: { cpuUsagePercent?: number; ramUsagePercent?: number } };

export function getRequiredCapabilityForAction(action: Action): Capability {
  switch (action.type) {
    case 'pointer.button':
    case 'pointer.scroll':
      return 'input.mouse';
    case 'keyboard.key':
    case 'keyboard.text':
    case 'keyboard.shortcut':
      return 'input.keyboard';
    case 'media.command':
      return 'media.control';
    case 'presentation.command':
      return 'presentation.control';
    case 'apps.launch':
      return 'apps.launch';
    case 'windows.action':
      return 'windows.control';
    case 'clipboard.set':
      return 'clipboard.write';
    case 'power.command':
      switch (action.action) {
        case 'lock':
          return 'power.lock';
        case 'sleep':
          return 'power.sleep';
        case 'restart':
          return 'power.restart';
        case 'shutdown':
          return 'power.shutdown';
      }
      break;
    case 'macro.execute':
      return 'automation.execute';
  }
}

export function validateActionBounds(action: Action): { valid: boolean; error?: string } {
  switch (action.type) {
    case 'pointer.scroll':
      if (
        !Number.isFinite(action.dx) ||
        !Number.isFinite(action.dy) ||
        Number.isNaN(action.dx) ||
        Number.isNaN(action.dy)
      ) {
        return { valid: false, error: 'Scroll deltas must be finite numbers' };
      }
      if (Math.abs(action.dx) > 10000 || Math.abs(action.dy) > 10000) {
        return { valid: false, error: 'Scroll deltas exceed allowable limit' };
      }
      break;

    case 'keyboard.text':
      if (typeof action.text !== 'string' || action.text.length > 65536) {
        return { valid: false, error: 'Text payload exceeds allowable 64KB limit' };
      }
      break;

    case 'clipboard.set':
      if (typeof action.text !== 'string' || action.text.length > 1048576) {
        return { valid: false, error: 'Clipboard text exceeds allowable 1MB limit' };
      }
      break;

    case 'apps.launch':
      if (!action.appId || action.appId.trim().length === 0 || action.appId.length > 256) {
        return { valid: false, error: 'Invalid appId length' };
      }
      break;

    case 'windows.action':
      if (!action.windowId || action.windowId.trim().length === 0) {
        return { valid: false, error: 'Invalid windowId' };
      }
      if (
        action.targetDisplay !== undefined &&
        action.targetDisplay !== null &&
        (!Number.isInteger(action.targetDisplay) ||
          action.targetDisplay < 0 ||
          action.targetDisplay > 64)
      ) {
        return { valid: false, error: 'Invalid target display index' };
      }
      break;
  }

  return { valid: true };
}
