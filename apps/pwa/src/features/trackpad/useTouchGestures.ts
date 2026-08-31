import { useCallback, useEffect, useRef } from 'react';
import { globalRemoteClient } from '../../protocol/client';
import { GestureOutput, GestureRecognizer, SwipeDirection } from './gestureRecognizer';

export interface GestureOptions {
  sensitivity?: number;
  acceleration?: number;
  onMultiFingerSwipe?: (fingers: 3 | 4, direction: SwipeDirection) => void;
}

export function useTouchGestures(options: GestureOptions = {}) {
  const sensitivity = options.sensitivity ?? 1.2;
  const acceleration = options.acceleration ?? 0.05;
  const onMultiFingerSwipe = options.onMultiFingerSwipe;
  const recognizerRef = useRef(new GestureRecognizer());
  const rafIdRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef({ dx: 0, dy: 0 });
  const pinchAccumulatorRef = useRef(0);

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
      if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushPointerDeltas);
    },
    [acceleration, flushPointerDeltas, sensitivity]
  );

  const dispatch = useCallback(
    (outputs: GestureOutput[]) => {
      outputs.forEach((output) => {
        switch (output.type) {
          case 'pointer_move':
            queuePointerDelta(output.dx, output.dy);
            break;
          case 'button':
            globalRemoteClient.execute({
              type: 'pointer.button',
              button: output.button,
              state: output.state,
            });
            break;
          case 'pinch':
            pinchAccumulatorRef.current += output.delta;
            if (Math.abs(pinchAccumulatorRef.current) >= 8) {
              globalRemoteClient.execute({
                type: 'keyboard.shortcut',
                keys: ['Control', pinchAccumulatorRef.current > 0 ? '=' : '-'],
              });
              pinchAccumulatorRef.current = 0;
            }
            break;
          case 'multi_swipe':
            onMultiFingerSwipe?.(output.fingers, output.direction);
            break;
        }
      });
    },
    [onMultiFingerSwipe, queuePointerDelta]
  );

  const sample = useCallback(
    (phase: 'down' | 'move' | 'up' | 'cancel', event: React.PointerEvent<HTMLDivElement>) => {
      dispatch(
        recognizerRef.current.handle({
          phase,
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          timestamp: event.timeStamp || Date.now(),
        })
      );
    },
    [dispatch]
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      sample('down', event);
    },
    [sample]
  );
  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => sample('move', event),
    [sample]
  );
  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => sample('up', event),
    [sample]
  );
  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => sample('cancel', event),
    [sample]
  );

  useEffect(() => {
    const release = () => dispatch(recognizerRef.current.cancelAll());
    const onVisibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      release();
    };
  }, [dispatch]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
