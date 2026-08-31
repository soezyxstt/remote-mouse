import React from 'react';
import { ConnectionState } from '../protocol/client';
import { Laptop, Search, Settings, Zap } from 'lucide-react';

interface HeaderProps {
  connectionState: ConnectionState;
  onOpenPairing: () => void;
  onOpenSearch: () => void;
  onOpenQuickActions: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionState,
  onOpenPairing,
  onOpenSearch,
  onOpenQuickActions,
  onOpenSettings,
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

      <div className="flex items-center gap-1">
        <button
          onClick={onOpenSearch}
          aria-label="Search"
          className="min-h-11 min-w-11 rounded-xl text-slate-300 hover:bg-surface-elevated"
        >
          <Search size={16} className="mx-auto" />
        </button>
        <button
          onClick={onOpenQuickActions}
          aria-label="Quick Actions"
          className="min-h-11 min-w-11 rounded-xl text-slate-300 hover:bg-surface-elevated"
        >
          <Zap size={16} className="mx-auto" />
        </button>
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          className="min-h-11 min-w-11 rounded-xl text-slate-300 hover:bg-surface-elevated"
        >
          <Settings size={16} className="mx-auto" />
        </button>
      </div>
    </header>
  );
};
