import { useState, useEffect, useCallback } from 'react';
import { storageGet, storageSet, onStorageChanged } from '../utils/storage';

/**
 * Custom hook for reactive storage-backed state.
 * Reads from chrome.storage.sync (or localStorage fallback) on mount
 * and automatically updates when storage changes externally.
 */
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  // Load from storage on mount
  useEffect(() => {
    storageGet<T>(key).then((stored) => {
      if (stored !== undefined) {
        setValue(stored);
      }
    });
  }, [key]);

  // Listen for external storage changes
  useEffect(() => {
    const unsubscribe = onStorageChanged((changes) => {
      if (changes[key]) {
        const newValue = changes[key].newValue as T | undefined;
        if (newValue !== undefined) {
          setValue(newValue);
        }
      }
    });
    return unsubscribe;
  }, [key]);

  // Setter that writes to storage
  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const nextValue = typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater;
        storageSet(key, nextValue);
        return nextValue;
      });
    },
    [key]
  );

  return [value, set];
}

/**
 * Batch-read hook for multiple storage keys.
 * Returns the merged result object and a setter for individual keys.
 */
export function useStorageMultiple(
  keys: string[],
  defaults: Record<string, unknown>
): [Record<string, unknown>, (key: string, value: unknown) => void] {
  const [values, setValues] = useState<Record<string, unknown>>(defaults);

  // Load all keys on mount
  useEffect(() => {
    const loadAll = async () => {
      const result: Record<string, unknown> = { ...defaults };
      for (const key of keys) {
        const stored = await storageGet<unknown>(key);
        if (stored !== undefined) {
          result[key] = stored;
        }
      }
      setValues(result);
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keysJoined = keys.join(',');
  // Listen for external changes to any of the watched keys
  useEffect(() => {
    const unsubscribe = onStorageChanged((changes) => {
      const keysList = keysJoined.split(',');
      for (const key of keysList) {
        if (changes[key]) {
          const newValue = changes[key].newValue;
          setValues((prev) => ({
            ...prev,
            [key]: newValue !== undefined ? newValue : prev[key],
          }));
        }
      }
    });
    return unsubscribe;
  }, [keysJoined]);

  // Setter for individual key
  const set = useCallback(
    (key: string, value: unknown) => {
      setValues((prev) => {
        const next = { ...prev, [key]: value };
        storageSet(key, value);
        return next;
      });
    },
    []
  );

  return [values, set];
}
