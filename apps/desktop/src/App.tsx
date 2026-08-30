import React, { useState } from 'react';
import { Sidebar, DesktopNavView } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { DevicesView } from './views/DevicesView';
import { BuilderView } from './views/BuilderView';
import { PresetsView } from './views/PresetsView';
import { FilesView } from './views/FilesView';
import { SettingsView } from './views/SettingsView';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<DesktopNavView>('dashboard');
  const [serverRunning] = useState<boolean>(true);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'devices':
        return <DevicesView />;
      case 'builder':
        return <BuilderView />;
      case 'presets':
        return <PresetsView />;
      case 'files':
        return <FilesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-slate-100 overflow-hidden font-sans">
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        serverRunning={serverRunning}
      />
      <main className="flex-1 p-8 overflow-y-auto bg-background/50">{renderView()}</main>
    </div>
  );
};
