import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileCompanion } from '../../apps/pwa/src/features/files/FileCompanion';
import { globalRemoteClient } from '../../apps/pwa/src/protocol/client';

describe('FileCompanion Component Unit Tests', () => {
  it('renders virtual roots header and requests roots on mount', () => {
    const sendSpy = vi.spyOn(globalRemoteClient, 'send');
    render(<FileCompanion />);

    expect(screen.getByText('Allowed PC Folders')).toBeInTheDocument();
    expect(sendSpy).toHaveBeenCalledWith('files.list_roots', {});
  });
});
