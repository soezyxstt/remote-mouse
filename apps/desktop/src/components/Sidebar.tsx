import React from 'react';
import {
  Laptop,
  Smartphone,
  Wrench,
  Layers,
  FolderLock,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export type DesktopNavView =
  | 'dashboard'
  | 'devices'
  | 'builder'
  | 'presets'
  | 'files'
  | 'settings';

interface SidebarProps {
  currentView: DesktopNavView;
  onSelectView: (view: DesktopNavView) => void;
  serverRunning: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  serverRunning,
}) => {
  const navItems: Array<{ id: DesktopNavView; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard & Pair', icon: <Laptop size={18} /> },
    { id: 'devices', label: 'Trusted Devices', icon: <Smartphone size={18} /> },
    { id: 'builder', label: 'Remote Builder', icon: <Wrench size={18} /> },
    { id: 'presets', label: 'Presets & Macros', icon: <Layers size={18} /> },
    { id: 'files', label: 'Allowed Folders', icon: <FolderLock size={18} /> },
    { id: 'settings', label: 'Agent Settings', icon: <Settings size={18} /> },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-white/5 flex flex-col justify-between p-4 select-none shrink-0">
      <div className="flex flex-col gap-6">
        {/* Logo & Status */}
        <div className="flex items-center gap-3 px-2">
          <div className="p-2.5 bg-primary/20 text-primary rounded-2xl border border-primary/30 shadow-md shadow-primary/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 leading-tight">PC Companion</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-[11px] text-slate-400 font-medium">
                {serverRunning ? 'Agent Active' : 'Stopped'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-surface-elevated/50 rounded-xl border border-white/5 text-[11px] text-slate-500 flex flex-col gap-0.5">
        <span className="font-semibold text-slate-400">Desktop Agent v0.1.0</span>
        <span>Local-first · Encrypted</span>
      </div>
    </aside>
  );
};
