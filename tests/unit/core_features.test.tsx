import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaRemote } from '../../apps/pwa/src/features/media/MediaRemote';
import { PresentationRemote } from '../../apps/pwa/src/features/presentation/PresentationRemote';
import { ClipboardCompanion } from '../../apps/pwa/src/features/clipboard/ClipboardCompanion';
import { globalRemoteClient } from '../../apps/pwa/src/protocol/client';
import { MediaSessionState } from '@remote/protocol';

describe('Core Companion Feature Suite (Media, Slides, Clipboard)', () => {
  it('renders MediaRemote with playback state and handles play/pause command', () => {
    const sendSpy = vi.spyOn(globalRemoteClient, 'send');
    const mockMedia: MediaSessionState = {
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      isPlaying: true,
      positionSec: 120,
      durationSec: 354,
      volume: 0.75,
    };

    render(<MediaRemote mediaState={mockMedia} />);

    expect(screen.getByText('Bohemian Rhapsody')).toBeInTheDocument();
    expect(screen.getByText('Queen')).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();
    expect(screen.getByText('5:54')).toBeInTheDocument();

    // Click play/pause button
    const buttons = screen.getAllByRole('button');
    const playPauseBtn = buttons.find((b) => b.querySelector('svg.lucide-pause'));
    expect(playPauseBtn).toBeDefined();
    if (playPauseBtn) {
      fireEvent.click(playPauseBtn);
      expect(sendSpy).toHaveBeenCalledWith('media.command', {
        action: 'play_pause',
        value: undefined,
      });
    }
  });

  it('renders PresentationRemote and advances slides with haptic cues', () => {
    const sendSpy = vi.spyOn(globalRemoteClient, 'send');
    render(<PresentationRemote />);

    expect(screen.getByText('Next Slide')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Start (F5)')).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /next slide/i });
    fireEvent.click(nextBtn);
    expect(sendSpy).toHaveBeenCalledWith('presentation.command', { action: 'next' });
  });

  it('renders ClipboardCompanion and sends text buffer to PC', () => {
    const sendSpy = vi.spyOn(globalRemoteClient, 'send');
    render(<ClipboardCompanion />);

    expect(screen.getByText('Send Text to PC Clipboard')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/paste or write text/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/paste or write text/i);
    fireEvent.change(textarea, { target: { value: 'Copied from phone' } });

    const sendBtn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendBtn);

    expect(sendSpy).toHaveBeenCalledWith('clipboard.set', { text: 'Copied from phone' });
  });
});
