import React, { useState } from 'react';
import { useRemoteConnection } from './protocol/useRemoteConnection';
import { Header } from './components/Header';
import { NavBar, NavRoute } from './components/NavBar';
import { ControlView } from './features/control/ControlView';
import { HybridKeyboard } from './features/keyboard/HybridKeyboard';
import { MediaRemote } from './features/media/MediaRemote';
import { PresentationRemote } from './features/presentation/PresentationRemote';
import { WindowManager } from './features/windows/WindowManager';
import { ClipboardCompanion } from './features/clipboard/ClipboardCompanion';
import { FileCompanion } from './features/files/FileCompanion';
import { DynamicPanelRenderer } from './features/panels/DynamicPanelRenderer';
import { PairingModal } from './components/PairingModal';
import { AppAwareBanner } from './components/AppAwareBanner';
import { ArrowLeft, Layers } from 'lucide-react';
import { PanelDefinition } from '@remote/protocol';
import { SystemControls } from './features/system/SystemControls';
import { SearchSheet } from './features/search/SearchSheet';
import { QuickActionsSheet } from './features/search/QuickActionsSheet';
import { X } from 'lucide-react';

export const App: React.FC = () => {
  const { connectionState, foregroundApp, mediaState, panels, apps, windows } =
    useRemoteConnection();
  const [activeRoute, setActiveRoute] = useState<NavRoute>('control');
  const [isPairingOpen, setIsPairingOpen] = useState<boolean>(false);
  const [selectedCustomPanel, setSelectedCustomPanel] = useState<PanelDefinition | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleRouteChange = (route: NavRoute) => {
    setActiveRoute(route);
    setSelectedCustomPanel(null);
  };

  const renderActiveView = () => {
    if (selectedCustomPanel) {
      return <DynamicPanelRenderer panel={selectedCustomPanel} />;
    }

    switch (activeRoute) {
      case 'control':
        return <ControlView foregroundApp={foregroundApp} />;
      case 'keyboard':
        return <HybridKeyboard />;
      case 'media':
        return <MediaRemote mediaState={mediaState} />;
      case 'slides':
        return <PresentationRemote />;
      case 'apps':
        return <WindowManager />;
      case 'system':
        return <SystemControls />;
      case 'clipboard':
        return <ClipboardCompanion />;
      case 'files':
        return <FileCompanion />;
      case 'panels':
        return (
          <div className="flex flex-col h-full w-full p-3 gap-3 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Available Panels ({panels.length})
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {panels.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedCustomPanel(p)}
                  className="flex items-center justify-between bg-surface hover:bg-surface-elevated p-3.5 rounded-2xl border border-white/10 text-left transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{p.name}</h4>
                      <p className="text-[11px] text-slate-400 capitalize">{p.category} Preset</p>
                    </div>
                  </div>
                  <span className="text-xs text-primary font-medium">Open</span>
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return <ControlView foregroundApp={foregroundApp} />;
    }
  };

  return (
    <div className="flex flex-col h-full h-dvh w-full bg-background text-slate-100 overflow-hidden font-sans select-none pt-safe pb-safe">
      {/* Top App Header */}
      <Header
        connectionState={connectionState}
        onOpenPairing={() => setIsPairingOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenQuickActions={() => setIsQuickActionsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Custom Panel Back Header */}
      {selectedCustomPanel && (
        <div className="flex items-center gap-2 px-3 py-2 bg-surface/60 border-b border-white/5 shrink-0">
          <button
            onClick={() => setSelectedCustomPanel(null)}
            className="p-1.5 bg-surface-elevated hover:bg-surface-hover text-slate-300 rounded-lg transition-colors flex items-center gap-1 text-xs"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <span className="text-xs font-bold text-slate-200">{selectedCustomPanel.name}</span>
        </div>
      )}

      {/* App-Aware Recommendation Toast */}
      <AppAwareBanner
        foregroundApp={foregroundApp}
        activeRoute={activeRoute}
        onSwitchRoute={handleRouteChange}
      />

      {/* Main Feature Canvas */}
      <main className="flex-1 w-full overflow-hidden relative">{renderActiveView()}</main>

      {/* Bottom Navigation */}
      <NavBar activeRoute={activeRoute} onChangeRoute={handleRouteChange} />

      {/* Pairing Modal */}
      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        connectionState={connectionState}
      />
      <SearchSheet
        open={isSearchOpen}
        apps={apps}
        windows={windows}
        panels={panels}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleRouteChange}
        onOpenPanel={(panelId) => {
          const panel = panels.find((candidate) => candidate.id === panelId);
          if (panel) setSelectedCustomPanel(panel);
        }}
      />
      <QuickActionsSheet
        open={isQuickActionsOpen}
        foregroundApp={foregroundApp}
        onClose={() => setIsQuickActionsOpen(false)}
        onNavigate={handleRouteChange}
      />
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 p-2 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <div className="w-full rounded-3xl border border-white/10 bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Settings</h2>
                <p className="text-[11px] text-slate-500">
                  Trackpad and Side Pad preferences are available from Control.
                </p>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close settings"
                className="min-h-11 min-w-11 rounded-xl bg-surface-elevated"
              >
                <X size={16} className="mx-auto" />
              </button>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('trackpad_sensitivity');
                localStorage.removeItem('sidepad_width');
                localStorage.removeItem('sidepad_side');
                localStorage.removeItem('sidepad_mode');
                localStorage.removeItem('control_context_percent');
              }}
              className="min-h-11 rounded-xl bg-surface-elevated px-3 text-xs font-semibold text-slate-200"
            >
              Reset control preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
