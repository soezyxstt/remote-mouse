import { describe, it, expect, vi } from 'vitest';
import { MockRemoteHarness, createEnvelope } from '@remote/protocol';

describe('MockRemoteHarness Test Fixture & Server Simulation', () => {
  it('initializes with default connected state and emits state sync', () => {
    const harness = new MockRemoteHarness();
    expect(harness.state).toBe('connected');

    const msgSpy = vi.fn();
    harness.subscribeMessages(msgSpy);

    harness.emitStateSync();
    expect(msgSpy).toHaveBeenCalled();
  });

  it('records client actions and replies with ack', () => {
    const harness = new MockRemoteHarness();
    const clientAction = createEnvelope('input.pointer.button', {
      button: 'left',
      state: 'click',
    });

    const msgSpy = vi.fn();
    harness.subscribeMessages(msgSpy);

    harness.handleClientMessage(clientAction);

    expect(harness.recordedActions).toHaveLength(1);
    expect(harness.recordedActions[0].type).toBe('input.pointer.button');
    expect(msgSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ack',
        data: expect.objectContaining({ actionId: clientAction.id, status: 'success' }),
      })
    );
  });

  it('handles state transitions and notifies subscribers', () => {
    const harness = new MockRemoteHarness({ initialState: 'disconnected' });
    const states: string[] = [];
    harness.subscribeState((s) => states.push(s));

    expect(states).toContain('disconnected');
    harness.setState('connecting');
    harness.setState('connected');

    expect(states).toEqual(['disconnected', 'connecting', 'connected']);
  });
});
