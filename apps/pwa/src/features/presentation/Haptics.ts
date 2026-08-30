// Haptics abstraction with graceful iOS Safari degradation

export interface HapticsController {
  supported: boolean;
  pulse(pattern?: number | number[]): void;
}

export const Haptics: HapticsController = {
  supported: typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function',
  pulse(pattern: number | number[] = 30) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Graceful no-op on platforms without Vibration API support (e.g. iOS Safari)
    }
  },
};
