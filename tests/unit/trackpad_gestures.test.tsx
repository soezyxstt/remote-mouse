import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Trackpad } from '../../apps/pwa/src/features/trackpad/Trackpad';
import { HybridKeyboard } from '../../apps/pwa/src/features/keyboard/HybridKeyboard';
import { globalRemoteClient } from '../../apps/pwa/src/protocol/client';

describe('Trackpad & Hybrid Keyboard Feature Tests', () => {
  it('renders Trackpad with left/right buttons and drag lock toggle', () => {
    const sendSpy = vi.spyOn(globalRemoteClient, 'send');
    render(<Trackpad />);

    expect(screen.getByText('TRACKPAD')).toBeInTheDocument();
    expect(screen.getByText('Left Click')).toBeInTheDocument();
    expect(screen.getByText('Right Click')).toBeInTheDocument();

    const leftBtn = screen.getByText('Left Click');
    fireEvent.pointerDown(leftBtn);
    expect(sendSpy).toHaveBeenCalledWith('input.pointer.button', {
      button: 'left',
      state: 'down',
    });

    fireEvent.pointerUp(leftBtn);
    expect(sendSpy).toHaveBeenCalledWith('input.pointer.button', {
      button: 'left',
      state: 'up',
    });

    const dragLockBtn = screen.getByText('Drag Lock');
    fireEvent.click(dragLockBtn);
    expect(sendSpy).toHaveBeenCalledWith('input.pointer.button', {
      button: 'left',
      state: 'down',
    });
  });

  it('renders HybridKeyboard with text stream input and modifier toggles', () => {
    const sendSpy = vi.spyOn(globalRemoteClient, 'send');
    render(<HybridKeyboard />);

    expect(screen.getByPlaceholderText(/type to send/i)).toBeInTheDocument();
    expect(screen.getByText('ctrl')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();

    // Toggle ctrl modifier
    const ctrlBtn = screen.getByText('ctrl');
    fireEvent.click(ctrlBtn);

    // Send key 'c' with modifier
    const escBtn = screen.getByText('Esc');
    fireEvent.click(escBtn);
    expect(sendSpy).toHaveBeenCalledWith('keyboard.key', {
      key: 'Escape',
      state: 'tap',
      modifiers: ['ctrl'],
    });
  });
});
