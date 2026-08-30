import React, { useState } from 'react';
import { ForegroundAppState } from '@remote/protocol';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { NavTab } from './NavBar';

interface AppAwareBannerProps {
  foregroundApp: ForegroundAppState | null;
  activeTab: NavTab;
  onSwitchTab: (tab: NavTab) => void;
}

export const AppAwareBanner: React.FC<AppAwareBannerProps> = ({
  foregroundApp,
  activeTab,
  onSwitchTab,
}) => {
  const [dismissedApp, setDismissedApp] = useState<string | null>(null);

  if (!foregroundApp) return null;

  const category = foregroundApp.category;
  const isMedia = category === 'media' && activeTab !== 'media';
  const isPresentation = category === 'presentation' && activeTab !== 'presentation';

  if (!isMedia && !isPresentation) return null;
  if (dismissedApp === foregroundApp.processName) return null;

  const targetTab: NavTab = isMedia ? 'media' : 'presentation';
  const targetLabel = isMedia ? 'Media Controls' : 'Presentation Remote';

  return (
    <div className="mx-2 mb-2 p-2.5 bg-gradient-to-r from-primary/20 via-surface-elevated to-surface border border-primary/30 rounded-2xl flex items-center justify-between shadow-lg shadow-black/20 animate-fade-in select-none">
      <div className="flex items-center gap-2 truncate">
        <Sparkles size={16} className="text-primary shrink-0 animate-spin-slow" />
        <div className="truncate">
          <p className="text-[11px] font-medium text-slate-300 truncate">
            {foregroundApp.processName.replace(/\.exe$/i, '')} detected
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onSwitchTab(targetTab)}
          className="px-2.5 py-1 bg-primary hover:bg-primary-hover active:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all active:scale-95"
        >
          <span>{targetLabel}</span>
          <ChevronRight size={12} />
        </button>

        <button
          onClick={() => setDismissedApp(foregroundApp.processName)}
          className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
