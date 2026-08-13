/**
 * Pure scheduling helpers for the automatic daily export alarm.
 * Kept free of chrome/DOM dependencies so the service worker can reuse them.
 */

/**
 * Computes the timestamp of the next occurrence of the given local time
 * (HH:mm). If the requested time has already passed today, the result rolls
 * over to tomorrow.
 */
export function computeNextRunMs(hour: number, minute: number, nowMs: number): number {
  const now = new Date(nowMs);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (next.getTime() <= nowMs) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}