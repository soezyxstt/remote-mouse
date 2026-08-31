import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppInfo, DisplayInfo, MessageEnvelope, WindowInfo } from '@remote/protocol';
import {
  AppWindow,
  ExternalLink,
  Maximize2,
  Minimize2,
  Monitor,
  Pin,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { globalRemoteClient } from '../../protocol/client';

const loadPinned = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem('pinned_app_ids') ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
};

export const WindowManager: React.FC = () => {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [pinnedIds, setPinnedIds] = useState(loadPinned);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    globalRemoteClient.send('windows.list', {});
    globalRemoteClient.send('apps.list', {});
    globalRemoteClient.send('displays.list', {});
  }, []);

  useEffect(() => {
    const unsubscribe = globalRemoteClient.subscribeMessages((message: MessageEnvelope) => {
      if (message.type === 'windows.items') setWindows(message.data as WindowInfo[]);
      if (message.type === 'apps.items') setApps(message.data as AppInfo[]);
      if (message.type === 'state.displays') setDisplays(message.data as DisplayInfo[]);
      if (message.type === 'error')
        setError(String((message.data as { error?: string }).error ?? 'Host query failed'));
      if (['windows.items', 'apps.items', 'state.displays'].includes(message.type))
        setLoading(false);
    });
    refresh();
    return unsubscribe;
  }, [refresh]);

  useEffect(() => {
    localStorage.setItem('pinned_app_ids', JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  const normalizedFilter = filter.trim().toLowerCase();
  const filteredWindows = useMemo(
    () =>
      windows.filter((window) =>
        `${window.title} ${window.processName}`.toLowerCase().includes(normalizedFilter)
      ),
    [normalizedFilter, windows]
  );
  const filteredApps = useMemo(
    () => apps.filter((app) => app.name.toLowerCase().includes(normalizedFilter)),
    [apps, normalizedFilter]
  );
  const pinnedApps = apps.filter((app) => pinnedIds.includes(app.id));

  const runWindowAction = (
    windowId: string,
    action: 'focus' | 'minimize' | 'maximize' | 'restore' | 'close' | 'move_to_display',
    targetDisplay?: number
  ) => {
    globalRemoteClient.execute({ type: 'windows.action', windowId, action, targetDisplay });
    window.setTimeout(refresh, 180);
  };

  const togglePinned = (appId: string) => {
    setPinnedIds((current) =>
      current.includes(appId) ? current.filter((id) => id !== appId) : [...current, appId]
    );
  };

  return (
    <div className="flex h-full w-full select-none flex-col gap-3 overflow-y-auto p-3">
      <div className="flex items-center gap-2">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-surface px-3 text-slate-400">
          <Search size={15} />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter apps and windows"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
          />
        </label>
        <button
          onClick={refresh}
          aria-label="Refresh Apps workspace"
          className="min-h-11 min-w-11 rounded-xl border border-white/10 bg-surface-elevated text-slate-300"
        >
          <RefreshCw size={16} className={`mx-auto ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"
        >
          {error}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Pinned launchers
        </h2>
        {pinnedApps.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
            Pin an installed launcher below for one-tap access.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pinnedApps.map((app) => (
              <button
                key={app.id}
                onClick={() => globalRemoteClient.execute({ type: 'apps.launch', appId: app.id })}
                className="min-h-14 rounded-xl border border-white/10 bg-surface p-3 text-left text-xs font-semibold text-slate-200"
              >
                <ExternalLink size={14} className="mb-2 text-primary" />
                {app.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Running windows ({filteredWindows.length})
        </h2>
        {filteredWindows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
            {loading ? 'Loading live windows…' : 'No matching controllable windows.'}
          </p>
        ) : (
          filteredWindows.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-surface p-3">
              <button
                onClick={() => runWindowAction(item.id, 'focus')}
                className="mb-3 flex w-full items-start gap-3 text-left"
              >
                <span className="rounded-xl bg-primary/15 p-2 text-primary">
                  <AppWindow size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-slate-100">{item.title}</strong>
                  <span className="text-[11px] text-slate-500">
                    {item.processName} · Display {item.displayIndex + 1}
                  </span>
                </span>
              </button>
              <div className="flex flex-wrap gap-1.5">
                <button
                  aria-label={`Minimize ${item.title}`}
                  onClick={() => runWindowAction(item.id, 'minimize')}
                  className="rounded-lg bg-surface-elevated p-2 text-slate-300"
                >
                  <Minimize2 size={14} />
                </button>
                <button
                  aria-label={`Maximize ${item.title}`}
                  onClick={() =>
                    runWindowAction(item.id, item.isMaximized ? 'restore' : 'maximize')
                  }
                  className="rounded-lg bg-surface-elevated p-2 text-slate-300"
                >
                  <Maximize2 size={14} />
                </button>
                {displays.map((display) => (
                  <button
                    key={display.index}
                    onClick={() => runWindowAction(item.id, 'move_to_display', display.index)}
                    className="rounded-lg bg-surface-elevated px-2.5 py-2 text-[10px] text-slate-300"
                  >
                    Move to {display.index + 1}
                  </button>
                ))}
                <button
                  aria-label={`Close ${item.title}`}
                  onClick={() => runWindowAction(item.id, 'close')}
                  className="ml-auto rounded-lg bg-rose-500/10 p-2 text-rose-300"
                >
                  <X size={14} />
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Displays ({displays.length})
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {displays.map((display) => (
            <div
              key={display.index}
              className="rounded-2xl border border-white/10 bg-surface p-3 text-xs"
            >
              <Monitor size={18} className="mb-2 text-primary" />
              <strong className="block text-slate-200">{display.name}</strong>
              <span className="text-slate-500">
                {display.width}×{display.height} · ({display.x}, {display.y})
                {display.isPrimary ? ' · Primary' : ''}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Installed launchers ({filteredApps.length})
        </h2>
        <div className="space-y-1.5">
          {filteredApps.slice(0, 100).map((app) => (
            <div
              key={app.id}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/5 bg-surface px-3"
            >
              <button
                onClick={() => globalRemoteClient.execute({ type: 'apps.launch', appId: app.id })}
                className="min-w-0 flex-1 truncate text-left text-xs font-medium text-slate-200"
              >
                {app.name}
              </button>
              <button
                aria-label={`${pinnedIds.includes(app.id) ? 'Unpin' : 'Pin'} ${app.name}`}
                onClick={() => togglePinned(app.id)}
                className={pinnedIds.includes(app.id) ? 'text-primary' : 'text-slate-500'}
              >
                <Pin size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
        Virtual desktops are unavailable because this build does not use undocumented Windows APIs.
      </section>
    </div>
  );
};
