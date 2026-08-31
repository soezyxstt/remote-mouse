import React, { useState } from 'react';
import { globalRemoteClient } from '../../protocol/client';
import {
  Layout,
  Maximize2,
  Minimize2,
  Monitor,
  Lock,
  Moon,
  RotateCcw,
  Power,
  ShieldAlert,
} from 'lucide-react';

export const WindowManager: React.FC = () => {
  const [sensitiveAction, setSensitiveAction] = useState<string | null>(null);

  const handleSnap = (action: string) => {
    globalRemoteClient.send('windows.action', {
      windowId: 'foreground',
      action,
    });
  };

  const handlePower = (action: string) => {
    setSensitiveAction(action);
  };

  const confirmPowerAction = () => {
    if (sensitiveAction) {
      globalRemoteClient.send('power.command', { action: sensitiveAction });
      setSensitiveAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-3 gap-4 overflow-y-auto select-none">
      {/* Window Snapping & Display Controls */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Active Window Controls
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSnap('snap_left')}
            className="p-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-slate-200 transition-all active:scale-95"
          >
            <Layout size={16} className="text-primary" />
            <span>Snap Left</span>
          </button>

          <button
            onClick={() => handleSnap('snap_right')}
            className="p-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-slate-200 transition-all active:scale-95"
          >
            <Layout size={16} className="text-primary -scale-x-100" />
            <span>Snap Right</span>
          </button>

          <button
            onClick={() => handleSnap('maximize')}
            className="p-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-slate-200 transition-all active:scale-95"
          >
            <Maximize2 size={16} className="text-emerald-400" />
            <span>Maximize</span>
          </button>

          <button
            onClick={() => handleSnap('minimize')}
            className="p-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-slate-200 transition-all active:scale-95"
          >
            <Minimize2 size={16} className="text-amber-400" />
            <span>Minimize</span>
          </button>
        </div>
      </div>

      {/* Multi-Monitor Switching */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Multi-Monitor Move
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSnap('move_to_display_0')}
            className="p-3 bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/5 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-slate-300 active:scale-95 transition-all"
          >
            <Monitor size={15} />
            <span>Display 1</span>
          </button>

          <button
            onClick={() => handleSnap('move_to_display_1')}
            className="p-3 bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/5 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-slate-300 active:scale-95 transition-all"
          >
            <Monitor size={15} />
            <span>Display 2</span>
          </button>
        </div>
      </div>

      {/* Power Management */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Power Controls
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handlePower('lock')}
            className="p-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-slate-300 active:scale-95 transition-all"
          >
            <Lock size={15} className="text-primary" />
            <span>Lock PC</span>
          </button>

          <button
            onClick={() => handlePower('sleep')}
            className="p-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-slate-300 active:scale-95 transition-all"
          >
            <Moon size={15} className="text-amber-400" />
            <span>Sleep</span>
          </button>

          <button
            onClick={() => handlePower('restart')}
            className="p-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-slate-300 active:scale-95 transition-all"
          >
            <RotateCcw size={15} className="text-rose-400" />
            <span>Restart...</span>
          </button>

          <button
            onClick={() => handlePower('shutdown')}
            className="p-3 bg-surface hover:bg-rose-950/40 active:bg-rose-900 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-rose-300 active:scale-95 transition-all"
          >
            <Power size={15} className="text-rose-400" />
            <span>Shutdown...</span>
          </button>
        </div>
      </div>

      {/* Sensitive Confirmation Dialog */}
      {sensitiveAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-rose-500/30 rounded-3xl p-5 max-w-xs w-full flex flex-col items-center text-center gap-3 shadow-2xl">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full">
              <ShieldAlert size={28} />
            </div>

            <h3 className="font-bold text-slate-100 capitalize">Confirm {sensitiveAction}</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to {sensitiveAction} the connected PC?
            </p>

            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={() => setSensitiveAction(null)}
                className="flex-1 py-2.5 bg-surface-elevated hover:bg-surface-hover rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={confirmPowerAction}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-xl text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition-colors"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
