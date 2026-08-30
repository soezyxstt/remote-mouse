import React from 'react';
import { MousePointer, Keyboard, Music, Presentation, MoreHorizontal } from 'lucide-react';

export type NavTab = 'general' | 'keyboard' | 'media' | 'presentation' | 'more';

interface NavBarProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ activeTab, onChangeTab }) => {
  const tabs: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'Trackpad', icon: <MousePointer size={18} /> },
    { id: 'keyboard', label: 'Keyboard', icon: <Keyboard size={18} /> },
    { id: 'media', label: 'Media', icon: <Music size={18} /> },
    { id: 'presentation', label: 'Slides', icon: <Presentation size={18} /> },
    { id: 'more', label: 'More', icon: <MoreHorizontal size={18} /> },
  ];

  return (
    <nav className="flex items-center justify-around px-2 py-2 bg-surface/95 backdrop-blur border-t border-white/5 shrink-0 select-none pb-safe">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
              isActive
                ? 'text-primary font-bold bg-primary/10 shadow-sm shadow-primary/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span className="text-[10px]">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
