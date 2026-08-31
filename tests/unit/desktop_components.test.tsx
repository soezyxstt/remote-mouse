import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../apps/desktop/src/components/Sidebar';
import { DashboardView } from '../../apps/desktop/src/views/DashboardView';
import { DevicesView } from '../../apps/desktop/src/views/DevicesView';
import { FilesView } from '../../apps/desktop/src/views/FilesView';
import { SettingsView } from '../../apps/desktop/src/views/SettingsView';

describe('Desktop Component Unit Tests', () => {
  it('renders Sidebar with navigation items and switches view', () => {
    const handleSelectView = vi.fn();
    render(
      <Sidebar currentView="dashboard" onSelectView={handleSelectView} serverRunning={true} />
    );

    expect(screen.getByText('PC Companion')).toBeInTheDocument();
    expect(screen.getByText('Agent Active')).toBeInTheDocument();

    const devicesBtn = screen.getByRole('button', { name: /trusted devices/i });
    fireEvent.click(devicesBtn);
    expect(handleSelectView).toHaveBeenCalledWith('devices');
  });

  it('renders DashboardView with pairing QR area and local status', () => {
    render(<DashboardView />);
    expect(screen.getByText('Local Agent Ready')).toBeInTheDocument();
    expect(screen.getByText('Pairing Security PIN')).toBeInTheDocument();
  });

  it('renders DevicesView and allows toggling capabilities and blocking', () => {
    render(<DevicesView />);
    expect(screen.getByText('Trusted Devices')).toBeInTheDocument();
    expect(screen.getByText("Adi's iPhone 15")).toBeInTheDocument();

    const blockBtn = screen.getByRole('button', { name: /block/i });
    fireEvent.click(blockBtn);
    expect(screen.getByRole('button', { name: /unblock/i })).toBeInTheDocument();
  });

  it('renders FilesView and lists allowed folder directories', () => {
    render(<FilesView />);
    expect(screen.getByText('Allowed Folders Whitelist')).toBeInTheDocument();
    expect(screen.getByText('Desktop Folder')).toBeInTheDocument();
    expect(screen.getByText('Downloads')).toBeInTheDocument();
  });

  it('renders SettingsView with port and startup configuration', () => {
    render(<SettingsView />);
    expect(screen.getByText('Desktop Agent Settings')).toBeInTheDocument();
    expect(screen.getByText('WebSocket & HTTP Port')).toBeInTheDocument();
    expect(screen.getByText('Start with Windows')).toBeInTheDocument();
  });
});
