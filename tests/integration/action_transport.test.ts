import { describe, it, expect, beforeEach } from 'vitest';
import { MockRemoteHarness, createEnvelope, MessageEnvelope } from '@remote/protocol';

describe('Action and Transport Integration with Mock Harness', () => {
  let harness: MockRemoteHarness;

  beforeEach(() => {
    harness = new MockRemoteHarness({ initialState: 'connected' });
  });

  it('completes pairing exchange and updates state to connected', () => {
    harness.setState('pairing_required');
    expect(harness.state).toBe('pairing_required');

    const pairRequest = createEnvelope('auth.pair_request', {
      clientId: 'client-test-123',
      clientName: 'iPhone 15 Pro',
      token: '849201',
      publicKey: 'client_pubkey_b64',
    });

    const receivedMessages: MessageEnvelope[] = [];
    harness.subscribeMessages((msg) => receivedMessages.push(msg));

    harness.handleClientMessage(pairRequest);

    expect(harness.state).toBe('connected');
    expect(harness.recordedActions).toHaveLength(1);
    expect(receivedMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'auth.pair_response',
          data: expect.objectContaining({ status: 'paired' }),
        }),
      ])
    );
  });

  it('dispatches pointer and media actions and records them faithfully', () => {
    const pointerDelta = createEnvelope('input.pointer.delta', {
      dx: 45.5,
      dy: -20.2,
    });
    const mediaPlay = createEnvelope('media.command', {
      action: 'play_pause',
    });

    harness.handleClientMessage(pointerDelta);
    harness.handleClientMessage(mediaPlay);

    expect(harness.recordedActions).toHaveLength(2);
    expect(harness.recordedActions[0].type).toBe('input.pointer.delta');
    expect(harness.recordedActions[1].type).toBe('media.command');
  });

  it('queries virtual file roots and browse items', () => {
    const responses: MessageEnvelope[] = [];
    harness.subscribeMessages((msg) => responses.push(msg));

    harness.handleClientMessage(createEnvelope('files.list_roots', {}));
    harness.handleClientMessage(createEnvelope('files.browse', { rootId: 'root-docs' }));

    const rootsMsg = responses.find((m) => m.type === 'files.roots');
    const itemsMsg = responses.find((m) => m.type === 'files.items');

    expect(rootsMsg).toBeDefined();
    expect(itemsMsg).toBeDefined();
    expect((itemsMsg?.data as import('@remote/protocol').FileItem[]).length).toBeGreaterThan(0);
  });
});
