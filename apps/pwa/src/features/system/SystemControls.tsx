import React, { useEffect, useRef, useState } from 'react';
import { Lock, Moon, Power, RotateCcw, ShieldAlert } from 'lucide-react';
import { globalRemoteClient } from '../../protocol/client';

type DestructivePowerAction = 'sleep' | 'restart' | 'shutdown';

export const SystemControls: React.FC = () => {
  const [holding, setHolding] = useState<DestructivePowerAction | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const cancel = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
    setHolding(null);
    setProgress(0);
  };

  const begin = (action: DestructivePowerAction) => {
    cancel();
    setHolding(action);
    const started = performance.now();
    intervalRef.current = window.setInterval(
      () => setProgress(Math.min(100, ((performance.now() - started) / 1200) * 100)),
      40
    );
    timerRef.current = window.setTimeout(() => {
      globalRemoteClient.execute({ type: 'power.command', action });
      cancel();
    }, 1200);
  };

  useEffect(() => cancel, []);

  const actions: Array<{
    action: DestructivePowerAction;
    label: string;
    icon: typeof Moon;
    tone: string;
  }> = [
    { action: 'sleep', label: 'Hold to Sleep', icon: Moon, tone: 'text-amber-300' },
    { action: 'restart', label: 'Hold to Restart', icon: RotateCcw, tone: 'text-rose-300' },
    { action: 'shutdown', label: 'Hold to Shut down', icon: Power, tone: 'text-rose-300' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <h2 className="text-sm font-bold text-slate-100">System</h2>
        <p className="mt-1 text-xs text-slate-500">
          Live CPU, memory, battery, and network telemetry are not exposed by this host build.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Power controls
        </h3>
        <button
          onClick={() => globalRemoteClient.execute({ type: 'power.command', action: 'lock' })}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/10 bg-surface p-3 text-sm font-semibold text-slate-200"
        >
          <Lock size={18} className="text-primary" />
          Lock PC
        </button>
        {actions.map(({ action, label, icon: Icon, tone }) => (
          <button
            key={action}
            onPointerDown={() => begin(action)}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
            className="relative flex min-h-14 w-full touch-none items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-surface p-3 text-sm font-semibold text-slate-200"
          >
            {holding === action ? (
              <span
                className="absolute inset-y-0 left-0 bg-rose-500/20"
                style={{ width: `${progress}%` }}
              />
            ) : null}
            <Icon size={18} className={`relative ${tone}`} />
            <span className="relative">{label}</span>
          </button>
        ))}
      </section>
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
        <ShieldAlert size={16} className="shrink-0" />
        Release before the progress completes to cancel.
      </div>
    </div>
  );
};
