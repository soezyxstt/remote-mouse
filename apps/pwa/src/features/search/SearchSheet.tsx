import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppInfo, PanelDefinition, WindowInfo } from '@remote/protocol';
import { Search, X } from 'lucide-react';
import { NavRoute } from '../../components/NavBar';
import { globalRemoteClient } from '../../protocol/client';
import { searchCapabilities } from './searchEngine';

interface SearchSheetProps {
  open: boolean;
  apps: AppInfo[];
  windows: WindowInfo[];
  panels: PanelDefinition[];
  onClose: () => void;
  onNavigate: (route: NavRoute) => void;
  onOpenPanel: (panelId: string) => void;
}

export const SearchSheet: React.FC<SearchSheetProps> = ({
  open,
  apps,
  windows,
  panels,
  onClose,
  onNavigate,
  onOpenPanel,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(
    () => searchCapabilities(query, { apps, windows, panels }),
    [apps, panels, query, windows]
  );

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/70 p-2 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Universal Search"
    >
      <div className="flex max-h-[80dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 p-3">
          <Search size={18} className="text-primary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps, windows, actions, panels…"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="min-h-11 min-w-11 rounded-xl bg-surface-elevated text-slate-400"
          >
            <X size={16} className="mx-auto" />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="p-5 text-center text-xs text-slate-500">No matching capability.</p>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  if (result.action) globalRemoteClient.execute(result.action);
                  if (result.route) onNavigate(result.route as NavRoute);
                  if (result.panelId) onOpenPanel(result.panelId);
                  onClose();
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-elevated"
              >
                <span className="w-16 shrink-0 text-[9px] font-bold uppercase text-primary">
                  {result.provider}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-xs text-slate-200">{result.title}</strong>
                  <span className="block truncate text-[11px] text-slate-500">
                    {result.subtitle}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
