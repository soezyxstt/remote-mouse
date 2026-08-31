import React from 'react';
import { ActionIntent, PanelComponent, PanelDefinition } from '@remote/protocol';
import { globalRemoteClient } from '../../protocol/client';
import { Trackpad } from '../trackpad/Trackpad';
import { Music } from 'lucide-react';

interface DynamicPanelRendererProps {
  panel: PanelDefinition;
}

export const DynamicPanelRenderer: React.FC<DynamicPanelRendererProps> = ({ panel }) => {
  const handleAction = (action?: ActionIntent) => {
    if (!action) return;

    switch (action.type) {
      case 'mouse.click':
        globalRemoteClient.send('input.pointer.button', {
          button: action.button,
          state: 'click',
        });
        break;
      case 'keyboard.key':
        globalRemoteClient.send('keyboard.key', {
          key: action.key,
          state: 'tap',
          modifiers: action.modifiers || [],
        });
        break;
      case 'keyboard.shortcut':
        for (const key of action.keys) {
          globalRemoteClient.send('keyboard.key', { key, state: 'down' });
        }
        for (const key of [...action.keys].reverse()) {
          globalRemoteClient.send('keyboard.key', { key, state: 'up' });
        }
        break;
      case 'keyboard.text':
        globalRemoteClient.send('keyboard.text', { text: action.text });
        break;
      case 'media.control':
        globalRemoteClient.send('media.command', { action: action.action });
        break;
      case 'presentation.control':
        globalRemoteClient.send('presentation.command', { action: action.action });
        break;
      case 'apps.launch':
        globalRemoteClient.send('apps.launch', { appId: action.appId });
        break;
      case 'windows.snap':
        globalRemoteClient.send('windows.action', {
          windowId: 'foreground',
          action: `snap_${action.position}`,
        });
        break;
      case 'clipboard.copy_text':
        globalRemoteClient.send('clipboard.set', { text: action.text });
        break;
      case 'macro.execute':
        globalRemoteClient.send('macro.execute', { macroId: action.macroId });
        break;
      case 'power.action':
        globalRemoteClient.send('power.command', { action: action.action });
        break;
      default:
        break;
    }
  };

  const renderComponent = (comp: PanelComponent) => {
    const { grid, type, label, variant } = comp;

    const style: React.CSSProperties = {
      gridColumnStart: grid.x + 1,
      gridColumnEnd: grid.x + 1 + grid.w,
      gridRowStart: grid.y + 1,
      gridRowEnd: grid.y + 1 + grid.h,
    };

    if (type === 'trackpad') {
      return (
        <div key={comp.id} style={style} className="h-full w-full">
          <Trackpad />
        </div>
      );
    }

    if (type === 'button') {
      const isPrimary = variant === 'primary';
      const isSecondary = variant === 'secondary';

      return (
        <button
          key={comp.id}
          style={style}
          onClick={() => handleAction(comp.action)}
          className={`flex items-center justify-center gap-2 rounded-2xl p-3 font-semibold text-xs transition-all active:scale-[0.98] border shadow-sm ${
            isPrimary
              ? 'bg-primary hover:bg-primary-hover active:bg-blue-700 text-white border-primary/50 shadow-primary/20'
              : isSecondary
                ? 'bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 text-slate-200 border-white/10'
                : 'bg-surface hover:bg-surface-elevated text-slate-300 border-white/5'
          }`}
        >
          <span>{label || 'Action'}</span>
        </button>
      );
    }

    if (type === 'media_display') {
      return (
        <div
          key={comp.id}
          style={style}
          className="bg-surface rounded-2xl border border-white/10 p-4 flex flex-col items-center justify-center text-center gap-2"
        >
          <Music size={32} className="text-primary animate-pulse" />
          <span className="text-xs font-bold text-slate-200">Media Playback Active</span>
        </div>
      );
    }

    return (
      <div
        key={comp.id}
        style={style}
        className="bg-surface-elevated/40 rounded-xl border border-white/5 p-2 flex items-center justify-center text-xs text-slate-400"
      >
        {label || comp.type}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-12 gap-2 h-full w-full p-2 auto-rows-[minmax(56px,auto)] overflow-y-auto">
      {panel.components.map((comp) => renderComponent(comp))}
    </div>
  );
};
