import { describe, it, expect } from 'vitest';
import {
  ALL_CAPABILITIES,
  DEFAULT_DEVICE_CAPABILITIES,
  createEnvelope,
  FIXTURE_SESSION_READY,
  FIXTURE_FOREGROUND_BROWSER,
  FIXTURE_MEDIA_SESSION,
  FIXTURE_DISPLAYS,
  FIXTURE_FILE_ITEMS,
  FIXTURE_PANELS,
} from '@remote/protocol';

describe('Protocol Message Envelopes and Types', () => {
  it('creates valid envelope with version 1 and timestamp', () => {
    const env = createEnvelope('input.pointer.delta', { dx: 10, dy: -5 });
    expect(env.v).toBe(1);
    expect(typeof env.id).toBe('string');
    expect(env.id.length).toBeGreaterThan(0);
    expect(env.timestamp).toBeGreaterThan(0);
    expect(env.type).toBe('input.pointer.delta');
    expect(env.data).toEqual({ dx: 10, dy: -5 });
  });

  it('validates capability list integrity', () => {
    expect(ALL_CAPABILITIES).toContain('input.mouse');
    expect(ALL_CAPABILITIES).toContain('input.keyboard');
    expect(ALL_CAPABILITIES).toContain('power.lock');
    expect(DEFAULT_DEVICE_CAPABILITIES.length).toBeLessThanOrEqual(ALL_CAPABILITIES.length);
  });

  it('validates fixture schema compliance', () => {
    expect(FIXTURE_SESSION_READY.serverName).toBe('Workstation-Win11');
    expect(FIXTURE_SESSION_READY.capabilities.length).toBeGreaterThan(0);
    expect(FIXTURE_FOREGROUND_BROWSER.category).toBe('browser');
    expect(FIXTURE_MEDIA_SESSION.isPlaying).toBe(true);
    expect(FIXTURE_DISPLAYS.length).toBe(2);
    expect(FIXTURE_FILE_ITEMS.length).toBe(3);
    expect(FIXTURE_PANELS.length).toBe(1);
  });
});
