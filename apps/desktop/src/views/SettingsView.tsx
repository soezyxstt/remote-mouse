import React, { useState } from 'react';

export const SettingsView: React.FC = () => {
  const [port, setPort] = useState<number>(8080);
  const [autoStart, setAutoStart] = useState<boolean>(true);
  const [pauseRemote, setPauseRemote] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-6 max-w-4xl select-none">
      <div>
        <h2 className="text-lg font-bold text-slate-100">Desktop Agent Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure server network ports, system startup, and agent behavior.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Network Port */}
        <div className="p-5 bg-surface rounded-2xl border border-white/5 flex items-center justify-between shadow-md">
          <div>
            <h4 className="text-xs font-bold text-slate-200">WebSocket & HTTP Port</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Local TCP port used for serving PWA and realtime input
            </p>
          </div>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value))}
            className="w-24 bg-surface-elevated text-slate-200 text-xs px-3 py-2 rounded-xl border border-white/10 outline-none font-mono"
          />
        </div>

        {/* Auto-start Toggle */}
        <div className="p-5 bg-surface rounded-2xl border border-white/5 flex items-center justify-between shadow-md">
          <div>
            <h4 className="text-xs font-bold text-slate-200">Start with Windows</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automatically launch desktop agent minimized to system tray on login
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
            className="accent-primary w-5 h-5 rounded cursor-pointer"
          />
        </div>

        {/* Pause Remote Toggle */}
        <div className="p-5 bg-surface rounded-2xl border border-white/5 flex items-center justify-between shadow-md">
          <div>
            <h4 className="text-xs font-bold text-slate-200">Pause Remote Access</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Temporarily reject incoming client commands without revoking trusted devices
            </p>
          </div>
          <input
            type="checkbox"
            checked={pauseRemote}
            onChange={(e) => setPauseRemote(e.target.checked)}
            className="accent-rose-500 w-5 h-5 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
