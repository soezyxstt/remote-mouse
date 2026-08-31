import React from 'react';
import {
  MousePointer,
  Keyboard,
  Music,
  Presentation,
  LayoutGrid,
  ClipboardCopy,
  FolderTree,
  Sliders,
  Settings,
} from 'lucide-react';

export type NavRoute =
  | 'control'
  | 'keyboard'
  | 'apps'
  | 'panels'
  | 'clipboard'
  | 'files'
  | 'media'
  | 'slides'
  | 'system';

interface NavBarProps {
  activeRoute: NavRoute;
  onChangeRoute: (route: NavRoute) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ activeRoute, onChangeRoute }) => {
  const tabs: Array<{ id: NavRoute; label: string; icon: React.ReactNode }> = [
    { id: 'control', label: 'Control', icon: <MousePointer size={18} /> },
    { id: 'keyboard', label: 'Keyboard', icon: <Keyboard size={18} /> },
    { id: 'apps', label: 'Apps', icon: <LayoutGrid size={18} /> },
    { id: 'panels', label: 'Panels', icon: <Sliders size={18} /> },
    { id: 'clipboard', label: 'Clipboard', icon: <ClipboardCopy size={18} /> },
    { id: 'files', label: 'Files', icon: <FolderTree size={18} /> },
    { id: 'media', label: 'Media', icon: <Music size={18} /> },
    { id: 'slides', label: 'Slides', icon: <Presentation size={18} /> },
    { id: 'system', label: 'System', icon: <Settings size={18} /> },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Main Navigation"
      className="flex items-center gap-1.5 px-3 py-2 bg-surface/95 backdrop-blur border-t border-white/5 shrink-0 select-none overflow-x-auto no-scrollbar pb-safe"
    >
      {tabs.map((tab) => {
        const isActive = activeRoute === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChangeRoute(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] py-1 px-2.5 rounded-2xl transition-all shrink-0 active:scale-95 ${
              isActive
                ? 'text-primary font-bold bg-primary/10 shadow-sm shadow-primary/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
