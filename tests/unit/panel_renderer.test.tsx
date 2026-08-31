import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicPanelRenderer } from '../../apps/pwa/src/features/panels/DynamicPanelRenderer';
import { FIXTURE_PANELS } from '@remote/protocol';
import { globalRemoteClient } from '../../apps/pwa/src/protocol/client';

describe('DynamicPanelRenderer Unit Tests', () => {
  it('renders components from panel definition and dispatches action on click', () => {
    const sendSpy = vi.spyOn(globalRemoteClient, 'send');
    const panel = FIXTURE_PANELS[0];

    render(<DynamicPanelRenderer panel={panel} />);

    expect(screen.getByText('Terminal')).toBeInTheDocument();
    expect(screen.getByText('Format Code')).toBeInTheDocument();

    const terminalBtn = screen.getByRole('button', { name: /terminal/i });
    fireEvent.click(terminalBtn);

    expect(sendSpy).toHaveBeenCalledWith('apps.launch', { appId: 'wt.exe' });
  });
});
