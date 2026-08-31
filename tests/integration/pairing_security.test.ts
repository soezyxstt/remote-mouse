import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockRemoteHarness,
  createEnvelope,
  MessageEnvelope,
  InMemoryCompanionTransport,
  Action,
} from '@remote/protocol';

describe('Pairing and Session Security Integration', () => {
  let harness: MockRemoteHarness;
  let transport: InMemoryCompanionTransport;

  beforeEach(() => {
    harness = new MockRemoteHarness({ initialState: 'disconnected' });
    transport = new InMemoryCompanionTransport();
  });

  it('rejects action execution when transport is disconnected', async () => {
    const action: Action = {
      type: 'pointer.button',
      button: 'left',
      state: 'click',
    };

    const res = await transport.execute(action);
    expect(res.status).toBe('error');
    expect(res.error).toMatch(/not connected/i);
  });

  it('requires pairing and transitions properly upon valid pair request', async () => {
    harness.setState('pairing_required');
    expect(harness.state).toBe('pairing_required');

    const pairMsg = createEnvelope('auth.pair_request', {
      clientId: 'device-sec-1',
      clientName: 'Security Test Phone',
      token: '123456',
      publicKey: 'valid_sec1_key',
    });

    const received: MessageEnvelope[] = [];
    harness.subscribeMessages((msg) => received.push(msg));

    harness.handleClientMessage(pairMsg);

    expect(harness.state).toBe('connected');
    const pairResp = received.find((m) => m.type === 'auth.pair_response');
    expect(pairResp).toBeDefined();
    expect((pairResp?.data as Record<string, unknown>).status).toBe('paired');
  });

  it('verifies in-memory transport connects and executes validated actions', async () => {
    const session = await transport.connect({ url: 'http://localhost:8080' });
    expect(session.serverName).toBe('InMemory-Windows-Mock');
    expect(session.capabilities).toContain('input.mouse');

    const action: Action = {
      type: 'keyboard.text',
      text: 'Hello Security!',
    };

    const res = await transport.execute(action);
    expect(res.status).toBe('ok');
    expect(transport.executedActions).toHaveLength(1);
  });
});
