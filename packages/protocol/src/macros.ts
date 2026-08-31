export type ActionIntent =
  | { type: 'keyboard.shortcut'; keys: string[] }
  | { type: 'keyboard.key'; key: string; modifiers: string[] }
  | { type: 'keyboard.text'; text: string }
  | { type: 'mouse.click'; button: 'left' | 'right' | 'middle' }
  | {
      type: 'media.control';
      action: 'play_pause' | 'next' | 'prev' | 'volume_up' | 'volume_down' | 'mute';
    }
  | { type: 'presentation.control'; action: 'next' | 'prev' | 'start' | 'stop' | 'black_screen' }
  | { type: 'apps.launch'; appId: string }
  | { type: 'windows.snap'; position: 'left' | 'right' | 'maximize' | 'minimize' | 'next_display' }
  | { type: 'clipboard.copy_text'; text: string }
  | { type: 'macro.execute'; macroId: string }
  | { type: 'power.action'; action: 'lock' | 'sleep' | 'restart' | 'shutdown' };

export type MacroCondition =
  | { type: 'process_running'; processName: string }
  | { type: 'window_focused'; titleContains: string }
  | { type: 'display_count'; min: number };

export type MacroStep =
  | { type: 'action'; intent: ActionIntent }
  | { type: 'delay'; ms: number }
  | {
      type: 'condition';
      condition: MacroCondition;
      onTrue?: MacroStep[];
      onFalse?: MacroStep[];
    };

export interface MacroDefinition {
  id: string;
  name: string;
  description?: string;
  steps: MacroStep[];
}
