import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageEnvelope } from '@remote/protocol';
import { WindowManager } from '../../apps/pwa/src/features/windows/WindowManager';
import { globalRemoteClient, MessageListener } from '../../apps/pwa/src/protocol/client';

describe('Apps workspace', () => {
  afterEach(() => vi.restoreAllMocks());

  const renderWithHostData = () => {
    let listener: MessageListener | null = null;
    vi.spyOn(globalRemoteClient, 'subscribeMessages').mockImplementation((next) => {
      listener = next;
      return () => undefined;
    });
    render(<WindowManager />);
    const emit = (message: MessageEnvelope) => act(() => listener?.(message));
    emit({
      v: 1,
      id: 'windows',
      timestamp: 1,
      type: 'windows.items',
      data: [
        {
          id: 'hwnd:1',
          title: 'Project Notes',
          processName: 'notepad.exe',
          displayIndex: 1,
          isMaximized: false,
          isMinimized: false,
        },
      ],
    });
    emit({
      v: 1,
      id: 'apps',
      timestamp: 2,
      type: 'apps.items',
      data: [{ id: 'calc.lnk', name: 'Calculator', executablePath: 'calc.lnk' }],
    });
    emit({
      v: 1,
      id: 'displays',
      timestamp: 3,
      type: 'state.displays',
      data: [
        {
          index: 0,
          name: 'Internal',
          width: 1920,
          height: 1080,
          isPrimary: true,
          x: 0,
          y: 0,
          scaleFactor: 1,
        },
        {
          index: 1,
          name: 'External',
          width: 2560,
          height: 1440,
          isPrimary: false,
          x: 1920,
          y: 0,
          scaleFactor: 1,
        },
      ],
    });
  };

  it('renders live window/display data and dispatches canonical actions', () => {
    const executeSpy = vi.spyOn(globalRemoteClient, 'execute');
    renderWithHostData();
    expect(screen.getByText('Project Notes')).toBeInTheDocument();
    expect(screen.getByText('External')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Project Notes'));
    expect(executeSpy).toHaveBeenCalledWith({
      type: 'windows.action',
      windowId: 'hwnd:1',
      action: 'focus',
      targetDisplay: undefined,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Move to 1' }));
    expect(executeSpy).toHaveBeenCalledWith({
      type: 'windows.action',
      windowId: 'hwnd:1',
      action: 'move_to_display',
      targetDisplay: 0,
    });
  });

  it('pins and launches a real enumerated app', () => {
    const executeSpy = vi.spyOn(globalRemoteClient, 'execute');
    renderWithHostData();
    fireEvent.click(screen.getByRole('button', { name: /pin calculator/i }));
    const calculatorButtons = screen.getAllByRole('button', { name: 'Calculator' });
    fireEvent.click(calculatorButtons[0]);
    expect(executeSpy).toHaveBeenCalledWith({ type: 'apps.launch', appId: 'calc.lnk' });
  });
});
