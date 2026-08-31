import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Action, validateActionBounds, getRequiredCapabilityForAction } from '@remote/protocol';

describe('Protocol Golden Fixture Parity (TypeScript)', () => {
  const goldenDir = path.resolve(__dirname, '../../packages/protocol/fixtures/golden');

  it('loads and validates all golden action variants', () => {
    const actionsRaw = fs.readFileSync(path.join(goldenDir, 'actions.json'), 'utf-8');
    const actionsMap = JSON.parse(actionsRaw) as Record<string, Action>;

    expect(Object.keys(actionsMap).length).toBeGreaterThanOrEqual(12);

    for (const [key, action] of Object.entries(actionsMap)) {
      expect(action).toHaveProperty('type');
      const validation = validateActionBounds(action);
      expect(validation.valid, `Action ${key} failed validation: ${validation.error}`).toBe(true);

      const reqCap = getRequiredCapabilityForAction(action);
      expect(typeof reqCap).toBe('string');
      expect(reqCap.length).toBeGreaterThan(0);

      // Verify JSON round-trip stability
      const serialized = JSON.stringify(action);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(action);
    }
  });

  it('loads and validates golden queries, events, and results', () => {
    const raw = fs.readFileSync(path.join(goldenDir, 'queries_and_events.json'), 'utf-8');
    const map = JSON.parse(raw);

    expect(map.actionResultOk.status).toBe('ok');
    expect(map.actionResultError.status).toBe('error');
    expect(map.sessionReady.capabilities).toContain('input.mouse');
    expect(map.foregroundAppState.category).toBe('browser');
    expect(map.mediaSessionState.isPlaying).toBe(true);
    expect(map.displayInfo.width).toBe(1920);
    expect(map.fileItem.name).toBe('sample.txt');
  });
});
