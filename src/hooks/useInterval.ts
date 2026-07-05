import { useEffect, useRef } from 'react';

/**
 * Custom hook that calls the given callback at a regular interval.
 * Automatically clears the interval on unmount or when deps change.
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Interval in milliseconds, or null to pause
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);

    return () => clearInterval(id);
  }, [delay]);
}
