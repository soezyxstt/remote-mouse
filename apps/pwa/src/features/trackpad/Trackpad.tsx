import React, { useState } from 'react';
import { useTouchGestures } from './useTouchGestures';
import { globalRemoteClient } from '../../protocol/client';
import { Lock, Unlock, Sliders, MousePointer, Hand } from 'lucide-react';

export const Trackpad: React.FC = () => {
  const [sensitivity, setSensitivity] = useState<number>(1.2);
  const [naturalScroll, setNaturalScroll] = useState<boolean>(true);
  const [dragLock, setDragLock] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useTouchGestures({
    sensitivity,
    naturalScroll,
    onThreeFingerSwipe: (dir) => {
      // 3-finger swipe snap
      if (dir === 'left') {
        globalRemoteClient.send('windows.action', { windowId: 'foreground', action: 'snap_left' });
      } else if (dir === 'right') {
        globalRemoteClient.send('windows.action', { windowId: 'foreground', action: 'snap_right' });
      }
    },
  });

  React.useEffect(() => {
    return () => {
      if (dragLock) {
        globalRemoteClient.send('input.pointer.button', { button: 'left', state: 'up' });
      }
    };
  }, [dragLock]);

  const toggleDragLock = () => {
    const next = !dragLock;
    setDragLock(next);
    globalRemoteClient.send('input.pointer.button', {
      button: 'left',
      state: next ? 'down' : 'up',
    });
  };

  const handleLeftButton = (state: 'down' | 'up') => {
    globalRemoteClient.send('input.pointer.button', {
      button: 'left',
      state,
    });
  };

  const handleRightButton = (state: 'down' | 'up') => {
    globalRemoteClient.send('input.pointer.button', {
      button: 'right',
      state,
    });
  };

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden p-2 gap-2">
      {/* Top Quick Settings Pill */}
      <div className="flex items-center justify-between px-2 py-1 bg-surface/80 backdrop-blur rounded-xl border border-white/5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDragLock}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
              dragLock
                ? 'bg-primary text-white font-medium shadow-md shadow-primary/30'
                : 'bg-surface-elevated text-slate-300'
            }`}
          >
            {dragLock ? <Lock size={13} /> : <Unlock size={13} />}
            <span>Drag Lock</span>
          </button>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-300 transition-colors"
        >
          <Sliders size={14} />
        </button>
      </div>

      {/* Expandable Trackpad Settings */}
      {showSettings && (
        <div className="bg-surface-elevated border border-white/10 rounded-xl p-3 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Sensitivity ({sensitivity.toFixed(1)}x)</span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-32 accent-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Natural Scrolling</span>
            <input
              type="checkbox"
              checked={naturalScroll}
              onChange={(e) => setNaturalScroll(e.target.checked)}
              className="accent-primary w-4 h-4 rounded"
            />
          </div>
        </div>
      )}

      {/* Main Touchpad Surface */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="flex-1 bg-gradient-to-b from-surface/90 to-surface-elevated/90 backdrop-blur-md rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center cursor-crosshair active:border-primary/40 transition-colors touch-none"
      >
        <div className="text-center text-slate-500/40 pointer-events-none flex flex-col items-center gap-1">
          <Hand size={32} className="opacity-30" />
          <span className="text-xs font-medium tracking-wide">TRACKPAD</span>
          <span className="text-[10px] opacity-60">
            1-Finger Move · 1-Tap Click · 2-Finger Scroll
          </span>
        </div>

        {/* Subtle Edge Scroll Guide */}
        <div className="absolute right-0 top-0 bottom-0 w-8 border-l border-white/5 bg-white/[0.01] pointer-events-none flex items-center justify-center">
          <div className="h-12 w-0.5 bg-slate-600/30 rounded-full" />
        </div>
      </div>

      {/* Physical Click Bar */}
      <div className="grid grid-cols-2 gap-2 h-16">
        <button
          onPointerDown={() => handleLeftButton('down')}
          onPointerUp={() => handleLeftButton('up')}
          className="flex items-center justify-center gap-2 bg-surface-elevated active:bg-primary border border-white/10 active:border-primary rounded-xl font-medium text-slate-200 active:text-white transition-all shadow-sm active:scale-[0.98] text-sm"
        >
          <MousePointer size={16} />
          <span>Left Click</span>
        </button>

        <button
          onPointerDown={() => handleRightButton('down')}
          onPointerUp={() => handleRightButton('up')}
          className="flex items-center justify-center gap-2 bg-surface-elevated active:bg-slate-700 border border-white/10 active:border-slate-500 rounded-xl font-medium text-slate-200 active:text-white transition-all shadow-sm active:scale-[0.98] text-sm"
        >
          <MousePointer size={16} className="rotate-90" />
          <span>Right Click</span>
        </button>
      </div>
    </div>
  );
};
