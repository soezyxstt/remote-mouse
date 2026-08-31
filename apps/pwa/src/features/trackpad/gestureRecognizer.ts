export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export type GestureOutput =
  | { type: 'pointer_move'; dx: number; dy: number }
  | { type: 'button'; button: 'left' | 'right'; state: 'click' | 'down' | 'up' }
  | { type: 'pinch'; delta: number }
  | { type: 'multi_swipe'; fingers: 3 | 4; direction: SwipeDirection };

export interface PointerSample {
  phase: 'down' | 'move' | 'up' | 'cancel';
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

interface Point {
  x: number;
  y: number;
  startX: number;
  startY: number;
}

const TAP_MS = 280;
const TAP_SLOP = 12;
const DOUBLE_TAP_MS = 320;
const SWIPE_DISTANCE = 44;

export class GestureRecognizer {
  private points = new Map<number, Point>();
  private startedAt = 0;
  private maximumPointers = 0;
  private moved = false;
  private lastTapAt = Number.NEGATIVE_INFINITY;
  private doubleTapCandidate = false;
  private dragActive = false;
  private pinchDistance: number | null = null;
  private multiStart: { x: number; y: number } | null = null;
  private multiLast: { x: number; y: number } | null = null;

  handle(sample: PointerSample): GestureOutput[] {
    switch (sample.phase) {
      case 'down':
        return this.down(sample);
      case 'move':
        return this.move(sample);
      case 'up':
        return this.finish(sample, false);
      case 'cancel':
        return this.finish(sample, true);
    }
  }

  cancelAll(): GestureOutput[] {
    const output: GestureOutput[] = this.dragActive
      ? [{ type: 'button', button: 'left', state: 'up' }]
      : [];
    this.reset();
    return output;
  }

  private down(sample: PointerSample): GestureOutput[] {
    if (this.points.size === 0) {
      this.startedAt = sample.timestamp;
      this.maximumPointers = 0;
      this.moved = false;
      this.doubleTapCandidate = sample.timestamp - this.lastTapAt <= DOUBLE_TAP_MS;
    }
    this.points.set(sample.id, {
      x: sample.x,
      y: sample.y,
      startX: sample.x,
      startY: sample.y,
    });
    this.maximumPointers = Math.max(this.maximumPointers, this.points.size);
    if (this.points.size === 2) this.pinchDistance = this.distanceBetweenFirstTwo();
    if (this.points.size === 3 || this.points.size === 4) {
      this.multiStart = this.centroid();
      this.multiLast = this.multiStart;
    }
    return [];
  }

  private move(sample: PointerSample): GestureOutput[] {
    const point = this.points.get(sample.id);
    if (!point) return [];
    const dx = sample.x - point.x;
    const dy = sample.y - point.y;
    point.x = sample.x;
    point.y = sample.y;
    if (Math.hypot(sample.x - point.startX, sample.y - point.startY) > TAP_SLOP) {
      this.moved = true;
    }

    if (this.points.size === 1 && this.maximumPointers === 1) {
      const output: GestureOutput[] = [];
      if (this.doubleTapCandidate && this.moved && !this.dragActive) {
        this.dragActive = true;
        output.push({ type: 'button', button: 'left', state: 'down' });
      }
      output.push({ type: 'pointer_move', dx, dy });
      return output;
    }

    if (this.points.size === 2) {
      const nextDistance = this.distanceBetweenFirstTwo();
      const previousDistance = this.pinchDistance ?? nextDistance;
      this.pinchDistance = nextDistance;
      const delta = nextDistance - previousDistance;
      return Math.abs(delta) >= 0.5 ? [{ type: 'pinch', delta }] : [];
    }

    if (this.points.size === 3 || this.points.size === 4) {
      this.multiLast = this.centroid();
    }
    return [];
  }

  private finish(sample: PointerSample, cancelled: boolean): GestureOutput[] {
    const point = this.points.get(sample.id);
    if (!point) return [];
    point.x = sample.x;
    point.y = sample.y;
    if (this.points.size >= 3) this.multiLast = this.centroid();
    this.points.delete(sample.id);

    if (this.points.size > 0) return [];
    const output: GestureOutput[] = [];
    const duration = sample.timestamp - this.startedAt;

    if (this.dragActive) {
      output.push({ type: 'button', button: 'left', state: 'up' });
    } else if (!cancelled && !this.moved && duration <= TAP_MS) {
      if (this.maximumPointers === 1) {
        output.push({ type: 'button', button: 'left', state: 'click' });
        this.lastTapAt = sample.timestamp;
      } else if (this.maximumPointers === 2) {
        output.push({ type: 'button', button: 'right', state: 'click' });
      }
    } else if (
      !cancelled &&
      (this.maximumPointers === 3 || this.maximumPointers === 4) &&
      this.multiStart &&
      this.multiLast
    ) {
      const dx = this.multiLast.x - this.multiStart.x;
      const dy = this.multiLast.y - this.multiStart.y;
      if (Math.hypot(dx, dy) >= SWIPE_DISTANCE) {
        const direction: SwipeDirection =
          Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        output.push({
          type: 'multi_swipe',
          fingers: this.maximumPointers,
          direction,
        });
      }
    }
    this.reset();
    return output;
  }

  private distanceBetweenFirstTwo(): number {
    const [a, b] = [...this.points.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private centroid(): { x: number; y: number } {
    const values = [...this.points.values()];
    return {
      x: values.reduce((sum, point) => sum + point.x, 0) / values.length,
      y: values.reduce((sum, point) => sum + point.y, 0) / values.length,
    };
  }

  private reset() {
    this.points.clear();
    this.maximumPointers = 0;
    this.moved = false;
    this.doubleTapCandidate = false;
    this.dragActive = false;
    this.pinchDistance = null;
    this.multiStart = null;
    this.multiLast = null;
  }
}
