import React from 'react';
import { ConnectionState } from '../protocol/client';
import { ForegroundAppState } from '@remote/protocol';
import { Wifi, WifiOff, Laptop } from 'lucide-react';

interface HeaderProps {
  connectionState: ConnectionState;
  foregroundApp: ForegroundAppState | null;
  onOpenPairing: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionState,
  foregroundApp,
  onOpenPairing,
}) => {
  const isConnected = connectionState === 'connected';

  return (
    <header className="flex items-center justify-between px-3 py-2.5 bg-surface/90 backdrop-blur border-b border-white/5 shrink-0 select-none">
      {/* PC Identity & Status Button */}
      <button
        onClick={onOpenPairing}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover transition-colors border border-white/5 active:scale-95"
      >
        <Laptop size={15} className={isConnected ? 'text-primary' : 'text-slate-500'} />
        <span className="text-xs font-semibold text-slate-200">
          {isConnected ? 'Windows PC' : 'Not Connected'}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected
              ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse'
              : connectionState === 'connecting'
              ? 'bg-amber-400 animate-ping'
              : 'bg-rose-500'
          }`}
        />
      </button>

      {/* Foreground App Pill */}
      {foregroundApp && isConnected && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-elevated/70 border border-white/5 rounded-full text-[11px] text-slate-300 font-medium truncate max-w-[160px]">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="truncate">{foregroundApp.processName.replace(/\.exe$/i, '')}</span>
        </div>
      )}

      {/* Connection Indicator */}
      <button
        onClick={onOpenPairing}
        className={`p-2 rounded-xl border transition-colors ${
          isConnected
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}
      >
        {isConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
      </button>
    </header>
  );
};
