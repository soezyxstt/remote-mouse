import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WindowManager } from '../../apps/pwa/src/features/windows/WindowManager';
import { globalRemoteClient } from '../../apps/pwa/src/protocol/client';

describe('WindowManager Component Unit Tests', () => {
  it('renders window snapping and display controls', () => {
    const sendSpy = vi.spyOn(globalRemoteClient, 'send');
    render(<WindowManager />);

    expect(screen.getByText('Active Window Controls')).toBeInTheDocument();
    expect(screen.getByText('Snap Left')).toBeInTheDocument();
    expect(screen.getByText('Snap Right')).toBeInTheDocument();
    expect(screen.getByText('Maximize')).toBeInTheDocument();
    expect(screen.getByText('Minimize')).toBeInTheDocument();

    const snapLeftBtn = screen.getByRole('button', { name: /snap left/i });
    fireEvent.click(snapLeftBtn);
    expect(sendSpy).toHaveBeenCalledWith('windows.action', {
      windowId: 'foreground',
      action: 'snap_left',
    });
  });

  it('triggers confirmation dialog for destructive power action and dispatches on confirm', () => {
    const sendSpy = vi.spyOn(globalRemoteClient, 'send');
    render(<WindowManager />);

    const restartBtn = screen.getByRole('button', { name: /restart/i });
    fireEvent.click(restartBtn);

    expect(screen.getByText('Confirm restart')).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to restart/i)).toBeInTheDocument();

    const proceedBtn = screen.getByRole('button', { name: /proceed/i });
    fireEvent.click(proceedBtn);

    expect(sendSpy).toHaveBeenCalledWith('power.command', { action: 'restart' });
  });
});
