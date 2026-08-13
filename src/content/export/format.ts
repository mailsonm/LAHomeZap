/**
 * Locale-independent date/time formatting helpers used by the export report
 * and file naming. Avoids relying on ICU availability in the test runtime.
 */

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Formats a Date as HH:mm (local time). */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formats a Date as dd/mm/yyyy (local time). */
export function formatDay(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}