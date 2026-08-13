import { describe, it, expect } from 'vitest';
import { computeNextRunMs } from '../schedule';

describe('export schedule', () => {
  describe('computeNextRunMs', () => {
    const baseNow = new Date(2026, 7, 5, 15, 30, 0).getTime(); // Aug 5 2026 15:30 local

    it('returns today when the target time is still ahead', () => {
      const expected = new Date(2026, 7, 5, 20, 0, 0).getTime();
      expect(computeNextRunMs(20, 0, baseNow)).toBe(expected);
    });

    it('rolls over to the next day when the target time already passed', () => {
      const expected = new Date(2026, 7, 6, 14, 0, 0).getTime();
      expect(computeNextRunMs(14, 0, baseNow)).toBe(expected);
    });

    it('returns tomorrow when the target time equals now', () => {
      const expected = new Date(2026, 7, 6, 15, 30, 0).getTime();
      expect(computeNextRunMs(15, 30, baseNow)).toBe(expected);
    });

    it('handles midnight boundaries correctly', () => {
      const lateNight = new Date(2026, 7, 5, 23, 59, 0).getTime();
      const expected = new Date(2026, 7, 6, 0, 0, 0).getTime();
      expect(computeNextRunMs(0, 0, lateNight)).toBe(expected);
    });
  });
});