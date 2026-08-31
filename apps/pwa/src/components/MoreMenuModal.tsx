import React from 'react';
import { Layout, Copy, Folder, Layers, X, ChevronRight } from 'lucide-react';

export type SubView = 'windows' | 'clipboard' | 'files' | 'panels' | null;

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSubView: (view: SubView) => void;
}

export const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectSubView,
}) => {
  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'windows' as const,
      title: 'Window & Power Manager',
      subtitle: 'Snap windows, multi-monitor, lock & sleep',
      icon: <Layout size={20} className="text-primary" />,
    },
    {
      id: 'clipboard' as const,
      title: 'Clipboard Companion',
      subtitle: 'Two-way text copy & history',
      icon: <Copy size={20} className="text-accent" />,
    },
    {
      id: 'files' as const,
      title: 'File Companion',
      subtitle: 'Browse whitelisted PC folders',
      icon: <Folder size={20} className="text-emerald-400" />,
    },
    {
      id: 'panels' as const,
      title: 'Custom Panels & Presets',
      subtitle: 'View and switch custom remote layouts',
      icon: <Layers size={20} className="text-amber-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm">Companion Features</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectSubView(item.id);
                onClose();
              }}
              className="flex items-center justify-between bg-surface-elevated hover:bg-surface-hover p-3.5 rounded-2xl border border-white/5 active:scale-[0.99] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-surface rounded-xl border border-white/5">{item.icon}</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{item.title}</h4>
                  <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
