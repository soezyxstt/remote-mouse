import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../../apps/pwa/src/components/Header';
import { NavBar } from '../../apps/pwa/src/components/NavBar';
import { AppAwareBanner } from '../../apps/pwa/src/components/AppAwareBanner';
import { FIXTURE_FOREGROUND_MEDIA } from '@remote/protocol';

describe('PWA Component Unit Tests', () => {
  it('renders Header with connection state and handles pairing click', () => {
    const handlePairing = vi.fn();
    render(
      <Header
        connectionState="connected"
        foregroundApp={FIXTURE_FOREGROUND_MEDIA}
        onOpenPairing={handlePairing}
      />
    );

    expect(screen.getByText('Windows PC')).toBeInTheDocument();
    expect(screen.getByText('spotify')).toBeInTheDocument();

    const pairBtn = screen.getByRole('button', { name: /windows pc/i });
    fireEvent.click(pairBtn);
    expect(handlePairing).toHaveBeenCalledTimes(1);
  });

  it('renders scrollable NavBar with all primary routes and handles switching', () => {
    const handleRouteChange = vi.fn();
    render(<NavBar activeRoute="control" onChangeRoute={handleRouteChange} />);

    expect(screen.getByRole('tab', { name: /trackpad/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /keyboard/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /media/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /slides/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /windows/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /clipboard/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /panels/i })).toBeInTheDocument();

    const mediaTab = screen.getByRole('tab', { name: /media/i });
    fireEvent.click(mediaTab);
    expect(handleRouteChange).toHaveBeenCalledWith('media');
  });

  it('renders AppAwareBanner when media app is in foreground and activeRoute is not media', () => {
    const handleSwitch = vi.fn();
    render(
      <AppAwareBanner
        foregroundApp={FIXTURE_FOREGROUND_MEDIA}
        activeRoute="control"
        onSwitchRoute={handleSwitch}
      />
    );

    expect(screen.getByText(/spotify detected/i)).toBeInTheDocument();
    const switchBtn = screen.getByRole('button', { name: /media controls/i });
    fireEvent.click(switchBtn);
    expect(handleSwitch).toHaveBeenCalledWith('media');
  });
});
