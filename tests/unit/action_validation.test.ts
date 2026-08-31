import { describe, it, expect } from 'vitest';
import { Action, validateActionBounds } from '@remote/protocol';

describe('Action Validation Bounds & Property Tests', () => {
  it('rejects infinite or NaN scroll deltas', () => {
    const nanAction: Action = {
      type: 'pointer.scroll',
      dx: NaN,
      dy: 10,
    };
    expect(validateActionBounds(nanAction).valid).toBe(false);

    const infAction: Action = {
      type: 'pointer.scroll',
      dx: 0,
      dy: Infinity,
    };
    expect(validateActionBounds(infAction).valid).toBe(false);
  });

  it('rejects oversized text streams (> 64KB)', () => {
    const oversizedText = 'a'.repeat(70000);
    const textAction: Action = {
      type: 'keyboard.text',
      text: oversizedText,
    };
    const res = validateActionBounds(textAction);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/64KB/i);
  });

  it('rejects empty app IDs', () => {
    const emptyAppAction: Action = {
      type: 'apps.launch',
      appId: '   ',
    };
    expect(validateActionBounds(emptyAppAction).valid).toBe(false);
  });

  it('rejects invalid target display indices', () => {
    const invalidDisplayAction: Action = {
      type: 'windows.action',
      windowId: 'win-1',
      action: 'move_to_display',
      targetDisplay: 999,
    };
    expect(validateActionBounds(invalidDisplayAction).valid).toBe(false);
  });
});
