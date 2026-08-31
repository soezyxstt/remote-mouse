import React, { useEffect, useState } from 'react';
import { Hand, Lock, MousePointer, Sliders, Unlock } from 'lucide-react';
import { globalRemoteClient } from '../../protocol/client';
import { SidePad, SidePadMode } from './SidePad';
import { useTouchGestures } from './useTouchGestures';

type Side = 'left' | 'right';

const readNumber = (key: string, fallback: number) => {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const Trackpad: React.FC = () => {
  const [sensitivity, setSensitivity] = useState(() => readNumber('trackpad_sensitivity', 1.2));
  const [sidePadWidth, setSidePadWidth] = useState(() => readNumber('sidepad_width', 42));
  const [sidePadSide, setSidePadSide] = useState<Side>(
    () => (localStorage.getItem('sidepad_side') as Side | null) ?? 'right'
  );
  const [sidePadMode, setSidePadMode] = useState<SidePadMode>(
    () => (localStorage.getItem('sidepad_mode') as SidePadMode | null) ?? 'scroll'
  );
  const [dragLock, setDragLock] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('trackpad_sensitivity', String(sensitivity));
    localStorage.setItem('sidepad_width', String(sidePadWidth));
    localStorage.setItem('sidepad_side', sidePadSide);
    localStorage.setItem('sidepad_mode', sidePadMode);
  }, [sensitivity, sidePadMode, sidePadSide, sidePadWidth]);

  const gestures = useTouchGestures({
    sensitivity,
    onMultiFingerSwipe: (fingers, direction) => {
      const keys =
        fingers === 4
          ? direction === 'left'
            ? ['Control', 'Meta', 'ArrowRight']
            : direction === 'right'
              ? ['Control', 'Meta', 'ArrowLeft']
              : direction === 'up'
                ? ['Meta', 'Tab']
                : ['Meta', 'd']
          : direction === 'left'
            ? ['Alt', 'Tab']
            : direction === 'right'
              ? ['Alt', 'Shift', 'Tab']
              : direction === 'up'
                ? ['Meta', 'Tab']
                : ['Meta', 'd'];
      globalRemoteClient.execute({ type: 'keyboard.shortcut', keys });
    },
  });

  useEffect(
    () => () => {
      if (dragLock) {
        globalRemoteClient.execute({ type: 'pointer.button', button: 'left', state: 'up' });
      }
    },
    [dragLock]
  );

  const toggleDragLock = () => {
    const next = !dragLock;
    setDragLock(next);
    globalRemoteClient.execute({
      type: 'pointer.button',
      button: 'left',
      state: next ? 'down' : 'up',
    });
  };

  const clickBar = (button: 'left' | 'right', state: 'down' | 'up') => {
    globalRemoteClient.execute({ type: 'pointer.button', button, state });
  };

  const sidePad = <SidePad mode={sidePadMode} width={sidePadWidth} sensitivity={sensitivity} />;

  return (
    <div className="flex h-full w-full select-none flex-col gap-2 overflow-hidden p-2">
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-surface/80 px-2 py-1 text-xs text-slate-400 backdrop-blur">
        <button
          onClick={toggleDragLock}
          className={`flex min-h-11 items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
            dragLock
              ? 'bg-primary font-medium text-white shadow-md shadow-primary/30'
              : 'bg-surface-elevated text-slate-300'
          }`}
        >
          {dragLock ? <Lock size={13} /> : <Unlock size={13} />}
          <span>Drag Lock</span>
        </button>
        <span className="hidden text-[10px] sm:block">Pinch zoom · Side Pad {sidePadMode}</span>
        <button
          aria-label="Trackpad settings"
          onClick={() => setShowSettings((value) => !value)}
          className="min-h-11 min-w-11 rounded-lg bg-surface-elevated p-2 text-slate-300"
        >
          <Sliders size={15} className="mx-auto" />
        </button>
      </div>

      {showSettings && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-surface-elevated p-3 text-xs sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-slate-300">
            Sensitivity {sensitivity.toFixed(1)}×
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={sensitivity}
              onChange={(event) => setSensitivity(Number(event.target.value))}
              className="accent-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-slate-300">
            Side Pad mode
            <select
              value={sidePadMode}
              onChange={(event) => setSidePadMode(event.target.value as SidePadMode)}
              className="rounded-lg bg-surface px-2 py-1.5"
            >
              <option value="scroll">Scroll</option>
              <option value="volume">Volume</option>
              <option value="zoom">Zoom</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-slate-300">
            Placement
            <select
              value={sidePadSide}
              onChange={(event) => setSidePadSide(event.target.value as Side)}
              className="rounded-lg bg-surface px-2 py-1.5"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-slate-300">
            Width {sidePadWidth}px
            <input
              type="range"
              min="32"
              max="64"
              step="2"
              value={sidePadWidth}
              onChange={(event) => setSidePadWidth(Number(event.target.value))}
              className="accent-primary"
            />
          </label>
        </div>
      )}

      <div
        className={`flex min-h-0 flex-1 gap-2 ${sidePadSide === 'left' ? 'flex-row-reverse' : ''}`}
      >
        <div
          {...gestures}
          aria-label="Trackpad touch surface"
          className="touch-none relative flex flex-1 cursor-crosshair items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-surface/90 to-surface-elevated/90 backdrop-blur-md transition-colors active:border-primary/40"
        >
          <div className="pointer-events-none flex flex-col items-center gap-1 text-center text-slate-500/50">
            <Hand size={32} className="opacity-40" />
            <span className="text-xs font-medium tracking-wide">TRACKPAD</span>
            <span className="max-w-64 text-[10px] opacity-70">
              1-finger move/tap · 2-finger tap/pinch · double-tap drag
            </span>
          </div>
        </div>
        {sidePad}
      </div>

      <div className="grid h-11 grid-cols-2 gap-2">
        {(['left', 'right'] as const).map((button) => (
          <button
            key={button}
            onPointerDown={() => clickBar(button, 'down')}
            onPointerUp={() => clickBar(button, 'up')}
            onPointerCancel={() => clickBar(button, 'up')}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface-elevated text-xs font-medium capitalize text-slate-200 transition-all active:scale-[0.98] active:bg-primary active:text-white"
          >
            <MousePointer size={14} className={button === 'right' ? 'rotate-90' : ''} />
            {button === 'left' ? 'Left Click' : 'Right Click'}
          </button>
        ))}
      </div>
    </div>
  );
};
