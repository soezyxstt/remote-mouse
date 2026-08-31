import React from 'react';
import { Hand } from 'lucide-react';
import { useTouchGestures } from './useTouchGestures';
import { SidePad, SidePadMode } from './SidePad';

interface MiniTrackpadProps {
  sidePadMode?: SidePadMode;
}

export const MiniTrackpad: React.FC<MiniTrackpadProps> = ({ sidePadMode = 'scroll' }) => {
  const gestures = useTouchGestures({ sensitivity: 1.1 });
  return (
    <div className="flex gap-2 h-32 shrink-0" aria-label="Mini Trackpad with Side Pad">
      <div
        {...gestures}
        className="touch-none flex-1 rounded-2xl border border-white/10 bg-gradient-to-b from-surface to-surface-elevated flex items-center justify-center text-slate-500 active:border-primary/50"
        aria-label="Mini Trackpad"
      >
        <div className="pointer-events-none flex items-center gap-2 text-[10px] font-semibold uppercase">
          <Hand size={15} /> Mini Trackpad
        </div>
      </div>
      <SidePad mode={sidePadMode} width={36} compact />
    </div>
  );
};
