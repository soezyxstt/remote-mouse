import { describe, expect, it } from 'vitest';
import {
  GestureRecognizer,
  PointerSample,
} from '../../apps/pwa/src/features/trackpad/gestureRecognizer';

const sample = (
  phase: PointerSample['phase'],
  id: number,
  x: number,
  y: number,
  timestamp: number
): PointerSample => ({ phase, id, x, y, timestamp });

describe('GestureRecognizer', () => {
  it('maps one-finger and two-finger taps without a duplicate left click', () => {
    const recognizer = new GestureRecognizer();
    recognizer.handle(sample('down', 1, 10, 10, 0));
    expect(recognizer.handle(sample('up', 1, 10, 10, 80))).toEqual([
      { type: 'button', button: 'left', state: 'click' },
    ]);

    recognizer.handle(sample('down', 1, 10, 10, 500));
    recognizer.handle(sample('down', 2, 20, 10, 505));
    expect(recognizer.handle(sample('up', 1, 10, 10, 550))).toEqual([]);
    expect(recognizer.handle(sample('up', 2, 20, 10, 560))).toEqual([
      { type: 'button', button: 'right', state: 'click' },
    ]);
  });

  it('emits pinch instead of two-finger scroll', () => {
    const recognizer = new GestureRecognizer();
    recognizer.handle(sample('down', 1, 0, 0, 0));
    recognizer.handle(sample('down', 2, 20, 0, 1));
    expect(recognizer.handle(sample('move', 2, 35, 0, 16))).toEqual([{ type: 'pinch', delta: 15 }]);
  });

  it('holds and releases left click for double-tap drag and cancellation', () => {
    const recognizer = new GestureRecognizer();
    recognizer.handle(sample('down', 1, 0, 0, 0));
    recognizer.handle(sample('up', 1, 0, 0, 50));
    recognizer.handle(sample('down', 1, 0, 0, 200));
    expect(recognizer.handle(sample('move', 1, 20, 0, 220))).toEqual([
      { type: 'button', button: 'left', state: 'down' },
      { type: 'pointer_move', dx: 20, dy: 0 },
    ]);
    expect(recognizer.cancelAll()).toEqual([{ type: 'button', button: 'left', state: 'up' }]);
  });

  it.each([3, 4] as const)('recognizes a %i-finger swipe', (fingers) => {
    const recognizer = new GestureRecognizer();
    for (let id = 1; id <= fingers; id += 1) {
      recognizer.handle(sample('down', id, id * 10, 10, id));
    }
    for (let id = 1; id <= fingers; id += 1) {
      recognizer.handle(sample('move', id, id * 10 + 60, 10, 30));
    }
    for (let id = 1; id < fingers; id += 1) {
      recognizer.handle(sample('up', id, id * 10 + 60, 10, 50));
    }
    expect(recognizer.handle(sample('up', fingers, fingers * 10 + 60, 10, 60))).toEqual([
      { type: 'multi_swipe', fingers, direction: 'right' },
    ]);
  });
});
