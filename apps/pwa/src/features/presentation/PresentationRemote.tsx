import React, { useState, useEffect } from 'react';
import { globalRemoteClient } from '../../protocol/client';
import { Haptics } from './Haptics';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  EyeOff,
  RotateCcw,
  Clock,
} from 'lucide-react';

export const PresentationRemote: React.FC = () => {
  const [seconds, setSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [visualFlash, setVisualFlash] = useState<boolean>(false);

  useEffect(() => {
    let interval: number;
    if (timerRunning) {
      interval = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const triggerFeedback = () => {
    Haptics.pulse(30);
    setVisualFlash(true);
    setTimeout(() => setVisualFlash(false), 120);
  };

  const handleCommand = (action: string) => {
    triggerFeedback();
    globalRemoteClient.send('presentation.command', { action });
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`flex flex-col h-full w-full p-3 gap-3 select-none transition-colors duration-100 ${
        visualFlash ? 'bg-primary/10' : ''
      }`}
    >
      {/* Presentation Timer Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <span className="font-mono text-base font-bold text-slate-100">
            {formatTimer(seconds)}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              timerRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-primary/20 text-primary border border-primary/30'
            }`}
          >
            {timerRunning ? 'Pause' : 'Start Timer'}
          </button>

          <button
            onClick={() => {
              setSeconds(0);
              setTimerRunning(false);
            }}
            className="p-1.5 bg-surface-elevated text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Main Slide Navigation Zone (Giant touch pads) */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        <button
          onClick={() => handleCommand('prev')}
          className="bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/10 active:border-primary/50 rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-md text-slate-300 active:text-white"
        >
          <ChevronLeft size={48} className="opacity-80" />
          <span className="font-semibold text-sm">Previous</span>
        </button>

        <button
          onClick={() => handleCommand('next')}
          className="bg-primary/90 hover:bg-primary active:bg-blue-700 border border-primary/40 rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 text-white"
        >
          <ChevronRight size={48} />
          <span className="font-bold text-sm">Next Slide</span>
        </button>
      </div>

      {/* Auxiliary Presentation Commands */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleCommand('start')}
          className="py-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <Play size={14} className="text-emerald-400" />
          <span>Start (F5)</span>
        </button>

        <button
          onClick={() => handleCommand('black_screen')}
          className="py-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <EyeOff size={14} className="text-amber-400" />
          <span>Black (B)</span>
        </button>

        <button
          onClick={() => handleCommand('stop')}
          className="py-3 bg-surface hover:bg-surface-elevated active:bg-slate-700 border border-white/10 rounded-2xl text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <Square size={14} className="text-rose-400" />
          <span>Exit (Esc)</span>
        </button>
      </div>
    </div>
  );
};
