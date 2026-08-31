import React, { useEffect, useRef, useState } from 'react';
import { ForegroundAppState } from '@remote/protocol';
import { GripHorizontal, Pin, RotateCcw } from 'lucide-react';
import { globalRemoteClient } from '../../protocol/client';
import { Trackpad } from '../trackpad/Trackpad';

interface ControlViewProps {
  foregroundApp: ForegroundAppState | null;
}

export const ControlView: React.FC<ControlViewProps> = ({ foregroundApp }) => {
  const [contextPercent, setContextPercent] = useState(
    () => Number(localStorage.getItem('control_context_percent')) || 28
  );
  const [pinned, setPinned] = useState(
    () => localStorage.getItem('control_context_pinned') === 'true'
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem('control_context_percent', String(contextPercent));
    localStorage.setItem('control_context_pinned', String(pinned));
  }, [contextPercent, pinned]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const category = foregroundApp?.category ?? 'general';
  const title = foregroundApp
    ? foregroundApp.processName.replace(/\.exe$/i, '')
    : 'General controls';
  const contextActions =
    category === 'media'
      ? [
          {
            label: 'Previous',
            run: () => globalRemoteClient.execute({ type: 'media.command', action: 'prev' }),
          },
          {
            label: 'Play / Pause',
            run: () => globalRemoteClient.execute({ type: 'media.command', action: 'play_pause' }),
          },
          {
            label: 'Next',
            run: () => globalRemoteClient.execute({ type: 'media.command', action: 'next' }),
          },
        ]
      : category === 'presentation'
        ? [
            {
              label: 'Previous slide',
              run: () =>
                globalRemoteClient.execute({ type: 'presentation.command', action: 'prev' }),
            },
            {
              label: 'Next slide',
              run: () =>
                globalRemoteClient.execute({ type: 'presentation.command', action: 'next' }),
            },
          ]
        : category === 'browser'
          ? [
              {
                label: 'Back',
                run: () =>
                  globalRemoteClient.execute({
                    type: 'keyboard.shortcut',
                    keys: ['Alt', 'ArrowLeft'],
                  }),
              },
              {
                label: 'New tab',
                run: () =>
                  globalRemoteClient.execute({ type: 'keyboard.shortcut', keys: ['Control', 't'] }),
              },
              {
                label: 'Close tab',
                run: () =>
                  globalRemoteClient.execute({ type: 'keyboard.shortcut', keys: ['Control', 'w'] }),
              },
            ]
          : [
              {
                label: 'Task view',
                run: () =>
                  globalRemoteClient.execute({ type: 'keyboard.shortcut', keys: ['Meta', 'Tab'] }),
              },
              {
                label: 'Show desktop',
                run: () =>
                  globalRemoteClient.execute({ type: 'keyboard.shortcut', keys: ['Meta', 'd'] }),
              },
            ];

  const beginResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pinned) return;
    resizeCleanupRef.current?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    const update = (pointerEvent: PointerEvent) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const percent = ((pointerEvent.clientY - bounds.top) / bounds.height) * 100;
      setContextPercent(Math.min(55, Math.max(18, percent)));
    };
    const stop = () => {
      window.removeEventListener('pointermove', update);
      window.removeEventListener('pointerup', stop);
      resizeCleanupRef.current = null;
    };
    resizeCleanupRef.current = stop;
    window.addEventListener('pointermove', update);
    window.addEventListener('pointerup', stop, { once: true });
  };

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col overflow-hidden">
      <section
        style={{ height: `${contextPercent}%` }}
        className="min-h-28 shrink-0 overflow-y-auto p-2 pb-1"
      >
        <div className="h-full rounded-2xl border border-white/10 bg-surface p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                {category} context
              </span>
              <h2 className="truncate text-sm font-bold text-slate-100">{title}</h2>
              <p className="truncate text-[10px] text-slate-500">
                {foregroundApp?.windowTitle ?? 'Adaptive shortcuts stay under your control.'}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPinned((value) => !value)}
                aria-label={pinned ? 'Unpin context size' : 'Pin context size'}
                className={`min-h-11 min-w-11 rounded-xl ${pinned ? 'bg-primary/20 text-primary' : 'bg-surface-elevated text-slate-400'}`}
              >
                <Pin size={14} className="mx-auto" />
              </button>
              <button
                onClick={() => setContextPercent(28)}
                aria-label="Reset context size"
                className="min-h-11 min-w-11 rounded-xl bg-surface-elevated text-slate-400"
              >
                <RotateCcw size={14} className="mx-auto" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {contextActions.map((action) => (
              <button
                key={action.label}
                onClick={action.run}
                className="min-h-11 rounded-xl bg-surface-elevated px-3 text-xs font-semibold text-slate-200"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <button
        onPointerDown={beginResize}
        aria-label="Resize context and trackpad"
        disabled={pinned}
        className="flex h-5 shrink-0 touch-none items-center justify-center text-slate-600 disabled:opacity-30"
      >
        <GripHorizontal size={22} />
      </button>
      <div className="min-h-0 flex-1">
        <Trackpad />
      </div>
    </div>
  );
};
