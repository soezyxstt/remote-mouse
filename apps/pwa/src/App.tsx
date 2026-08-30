import React, { useState } from 'react';
import { useRemoteConnection } from './protocol/useRemoteConnection';
import { Header } from './components/Header';
import { NavBar, NavTab } from './components/NavBar';
import { Trackpad } from './features/trackpad/Trackpad';
import { HybridKeyboard } from './features/keyboard/HybridKeyboard';
import { MediaRemote } from './features/media/MediaRemote';
import { PresentationRemote } from './features/presentation/PresentationRemote';
import { WindowManager } from './features/windows/WindowManager';
import { ClipboardCompanion } from './features/clipboard/ClipboardCompanion';
import { FileCompanion } from './features/files/FileCompanion';
import { DynamicPanelRenderer } from './features/panels/DynamicPanelRenderer';
import { PairingModal } from './components/PairingModal';
import { AppAwareBanner } from './components/AppAwareBanner';
import { MoreMenuModal, SubView } from './components/MoreMenuModal';
import { ArrowLeft, Layers } from 'lucide-react';
import { PanelDefinition } from '@remote/protocol';

export const App: React.FC = () => {
  const { connectionState, foregroundApp, mediaState, panels } = useRemoteConnection();
  const [activeTab, setActiveTab] = useState<NavTab>('general');
  const [subView, setSubView] = useState<SubView>(null);
  const [isPairingOpen, setIsPairingOpen] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [selectedCustomPanel, setSelectedCustomPanel] = useState<PanelDefinition | null>(null);

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'more') {
      setIsMoreMenuOpen(true);
    } else {
      setActiveTab(tab);
      setSubView(null);
      setSelectedCustomPanel(null);
    }
  };

  const renderActiveView = () => {
    // If a custom panel is selected
    if (selectedCustomPanel) {
      return <DynamicPanelRenderer panel={selectedCustomPanel} />;
    }

    // If a subview is selected from More Menu
    if (subView === 'windows') return <WindowManager />;
    if (subView === 'clipboard') return <ClipboardCompanion />;
    if (subView === 'files') return <FileCompanion />;
    if (subView === 'panels') {
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
    }

    // Default primary tabs
    switch (activeTab) {
      case 'general':
        return <Trackpad />;
      case 'keyboard':
        return <HybridKeyboard />;
      case 'media':
        return <MediaRemote mediaState={mediaState} />;
      case 'presentation':
        return <PresentationRemote />;
      default:
        return <Trackpad />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-slate-100 overflow-hidden font-sans select-none">
      {/* Top App Header */}
      <Header
        connectionState={connectionState}
        foregroundApp={foregroundApp}
        onOpenPairing={() => setIsPairingOpen(true)}
      />

      {/* Subview Back Header */}
      {(subView || selectedCustomPanel) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-surface/60 border-b border-white/5 shrink-0">
          <button
            onClick={() => {
              setSubView(null);
              setSelectedCustomPanel(null);
            }}
            className="p-1.5 bg-surface-elevated hover:bg-surface-hover text-slate-300 rounded-lg transition-colors flex items-center gap-1 text-xs"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <span className="text-xs font-bold text-slate-200">
            {selectedCustomPanel?.name || (subView ? subView.toUpperCase() : '')}
          </span>
        </div>
      )}

      {/* App-Aware Recommendation Toast */}
      <AppAwareBanner
        foregroundApp={foregroundApp}
        activeTab={activeTab}
        onSwitchTab={handleTabChange}
      />

      {/* Main Feature Canvas */}
      <main className="flex-1 w-full overflow-hidden relative">{renderActiveView()}</main>

      {/* Bottom Navigation */}
      <NavBar activeTab={activeTab} onChangeTab={handleTabChange} />

      {/* Modals */}
      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        connectionState={connectionState}
      />

      <MoreMenuModal
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        onSelectSubView={(view) => {
          setSubView(view);
          setSelectedCustomPanel(null);
        }}
      />
    </div>
  );
};
