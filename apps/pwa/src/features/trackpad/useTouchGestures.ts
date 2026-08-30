import { useRef, useCallback } from 'react';
import { globalRemoteClient } from '../../protocol/client';

export interface GestureOptions {
  sensitivity?: number;
  acceleration?: number;
  naturalScroll?: boolean;
  onThreeFingerSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void;
}

interface TouchPoint {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startTime: number;
}

export function useTouchGestures(options: GestureOptions = {}) {
  const sensitivity = options.sensitivity ?? 1.2;
  const acceleration = options.acceleration ?? 0.05;
  const naturalScroll = options.naturalScroll ?? true;
  const onThreeFingerSwipe = options.onThreeFingerSwipe;

  const touchesRef = useRef<Map<number, TouchPoint>>(new Map());
  const isDraggingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const flushPointerDeltas = useCallback(() => {
    const { dx, dy } = pendingDeltaRef.current;
    if (dx !== 0 || dy !== 0) {
      globalRemoteClient.sendBinaryPointerDelta(dx, dy);
      pendingDeltaRef.current = { dx: 0, dy: 0 };
    }
    rafIdRef.current = null;
  }, []);

  const queuePointerDelta = useCallback(
    (rawDx: number, rawDy: number) => {
      const distance = Math.hypot(rawDx, rawDy);
      const factor = sensitivity * (1 + distance * acceleration);
      pendingDeltaRef.current.dx += rawDx * factor;
      pendingDeltaRef.current.dy += rawDy * factor;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(flushPointerDeltas);
      }
    },
    [sensitivity, acceleration, flushPointerDeltas]
  );

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point: TouchPoint = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      startTime: Date.now(),
    };
    touchesRef.current.set(e.pointerId, point);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const point = touchesRef.current.get(e.pointerId);
      if (!point) return;

      const dx = e.clientX - point.lastX;
      const dy = e.clientY - point.lastY;
      point.lastX = e.clientX;
      point.lastY = e.clientY;

      const touchCount = touchesRef.current.size;

      if (touchCount === 1) {
        queuePointerDelta(dx, dy);
      } else if (touchCount === 2) {
        // Two finger scroll
        const scrollMultiplier = naturalScroll ? -0.1 : 0.1;
        globalRemoteClient.send('input.pointer.scroll', {
          dx: dx * 0.05,
          dy: dy * scrollMultiplier,
        });
      }
    },
    [queuePointerDelta, naturalScroll]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const point = touchesRef.current.get(e.pointerId);
      if (!point) return;

      const duration = Date.now() - point.startTime;
      const totalDx = Math.abs(e.clientX - point.startX);
      const totalDy = Math.abs(e.clientY - point.startY);
      const totalDist = Math.hypot(totalDx, totalDy);
      const touchCount = touchesRef.current.size;

      touchesRef.current.delete(e.pointerId);

      // Tap detection (quick duration and small movement)
      if (duration < 280 && totalDist < 12) {
        if (touchCount === 1) {
          // Left click
          globalRemoteClient.send('input.pointer.button', {
            button: 'left',
            state: 'click',
          });
        } else if (touchCount === 2) {
          // Right click
          globalRemoteClient.send('input.pointer.button', {
            button: 'right',
            state: 'click',
          });
        }
      }

      // Three-finger swipe gesture detection
      if (touchCount === 3 && totalDist > 40 && duration < 600) {
        if (totalDx > totalDy) {
          onThreeFingerSwipe?.(e.clientX > point.startX ? 'right' : 'left');
        } else {
          onThreeFingerSwipe?.(e.clientY > point.startY ? 'down' : 'up');
        }
      }
    },
    [onThreeFingerSwipe]
  );

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    touchesRef.current.delete(e.pointerId);
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    isDraggingRef,
  };
}
