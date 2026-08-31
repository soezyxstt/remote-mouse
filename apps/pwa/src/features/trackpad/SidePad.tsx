import React, { useRef } from 'react';
import { Volume2, ZoomIn } from 'lucide-react';
import { globalRemoteClient } from '../../protocol/client';

export type SidePadMode = 'scroll' | 'volume' | 'zoom' | 'custom';

interface SidePadProps {
  mode: SidePadMode;
  sensitivity?: number;
  width?: number;
  compact?: boolean;
  onCustomDelta?: (delta: number) => void;
}

export const SidePad: React.FC<SidePadProps> = ({
  mode,
  sensitivity = 1,
  width = 42,
  compact = false,
  onCustomDelta,
}) => {
  const points = useRef(new Map<number, number>());
  const discreteAccumulator = useRef(0);

  const dispatchDelta = (delta: number) => {
    const adjusted = delta * sensitivity;
    if (mode === 'scroll') {
      globalRemoteClient.execute({ type: 'pointer.scroll', dx: 0, dy: adjusted * -0.8 });
      return;
    }
    if (mode === 'custom') {
      onCustomDelta?.(adjusted);
      return;
    }
    discreteAccumulator.current += adjusted;
    if (Math.abs(discreteAccumulator.current) < 14) return;
    const positive = discreteAccumulator.current > 0;
    discreteAccumulator.current = 0;
    if (mode === 'volume') {
      globalRemoteClient.execute({
        type: 'media.command',
        action: positive ? 'volume_down' : 'volume_up',
      });
    } else {
      globalRemoteClient.execute({
        type: 'keyboard.shortcut',
        keys: ['Control', positive ? '-' : '='],
      });
    }
  };

  const label =
    mode === 'scroll'
      ? 'Scroll'
      : mode === 'volume'
        ? 'Volume'
        : mode === 'zoom'
          ? 'Zoom'
          : 'Custom';

  return (
    <div
      role="group"
      aria-label={`${label} Side Pad`}
      aria-valuetext={`${label} touch surface`}
      tabIndex={0}
      style={{ width }}
      className={`touch-none shrink-0 rounded-2xl border border-white/10 bg-surface-elevated/90 active:border-primary/50 flex flex-col items-center justify-center gap-2 text-slate-500 ${
        compact ? 'min-h-24' : 'min-h-40'
      }`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        points.current.set(event.pointerId, event.clientY);
      }}
      onPointerMove={(event) => {
        const previousY = points.current.get(event.pointerId);
        if (previousY === undefined) return;
        points.current.set(event.pointerId, event.clientY);
        dispatchDelta((event.clientY - previousY) / Math.max(1, points.current.size));
      }}
      onPointerUp={(event) => points.current.delete(event.pointerId)}
      onPointerCancel={(event) => points.current.delete(event.pointerId)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp') dispatchDelta(-20);
        if (event.key === 'ArrowDown') dispatchDelta(20);
      }}
    >
      {mode === 'volume' ? <Volume2 size={15} /> : mode === 'zoom' ? <ZoomIn size={15} /> : null}
      <div className="h-14 w-1 rounded-full bg-slate-600/50" />
      {!compact && (
        <span className="text-[9px] font-semibold uppercase [writing-mode:vertical-rl]">
          {label}
        </span>
      )}
    </div>
  );
};
