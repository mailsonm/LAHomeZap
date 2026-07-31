/**
 * Unified storage abstraction for Lar Home Zap.
 * Automatically uses chrome.storage.sync when available, with localStorage fallback.
 */

const LOG_PREFIX = '[Lar Home Zap]';

/**
 * Returns true if chrome.storage.sync is available in the current context.
 */
export function hasChromeStorage(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.storage &&
    !!chrome.storage.sync
  );
}

/**
 * Generic key-value read from storage.
 * Uses chrome.storage.sync when available, otherwise localStorage.
 */
export function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      chrome.storage.sync.get([key], (result) => {
        resolve(result[key] as T | undefined);
      });
    } else {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          resolve(JSON.parse(raw) as T);
        } else {
          resolve(undefined);
        }
      } catch (e) {
        console.warn(`${LOG_PREFIX} Failed to read "${key}" from localStorage:`, e);
        resolve(undefined);
      }
    }
  });
}

/**
 * Generic key-value write to storage.
 * Uses chrome.storage.sync when available, otherwise localStorage.
 */
export function storageSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    const data: Record<string, unknown> = { [key]: value };
    if (hasChromeStorage()) {
      chrome.storage.sync.set(data, () => resolve());
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      } catch (e) {
        console.warn(`${LOG_PREFIX} Failed to write "${key}" to localStorage:`, e);
        resolve();
      }
    }
  });
}

/**
 * Batch read multiple keys from storage.
 */
export function storageGetMultiple(keys: string[]): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      chrome.storage.sync.get(keys, (result) => resolve(result));
    } else {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            result[key] = JSON.parse(raw);
          }
        } catch (e) {
          console.warn(`${LOG_PREFIX} Failed to read "${key}" from localStorage:`, e);
        }
      }
      resolve(result);
    }
  });
}

/**
 * Batch write multiple key-value pairs to storage.
 */
export function storageSetMultiple(data: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      chrome.storage.sync.set(data, () => resolve());
    } else {
      try {
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, JSON.stringify(value));
        }
        resolve();
      } catch (e) {
        console.warn(`${LOG_PREFIX} Failed to write to localStorage:`, e);
        resolve();
      }
    }
  });
}

/**
 * Register a listener for storage changes.
 * Falls back gracefully in non-extension environments.
 */
export function onStorageChanged(
  callback: (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void
): () => void {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'sync') {
        callback(changes);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
  // No-op cleanup for non-extension environments
  return () => {};
}

/**
 * Returns true if chrome.storage.local is available in the current context.
 */
export function hasChromeLocalStorage(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.storage &&
    !!chrome.storage.local
  );
}

/**
 * Reads data specifically from local storage (chrome.storage.local or localStorage).
 * Recommended for large items like attachment dataUrls.
 */
export function storageLocalGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (hasChromeLocalStorage()) {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] as T | undefined);
      });
    } else {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          resolve(JSON.parse(raw) as T);
        } else {
          resolve(undefined);
        }
      } catch (e) {
        console.warn(`${LOG_PREFIX} Failed to read "${key}" from localStorage:`, e);
        resolve(undefined);
      }
    }
  });
}

/**
 * Writes data specifically to local storage (chrome.storage.local or localStorage).
 * Recommended for large items like attachment dataUrls.
 */
export function storageLocalSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    if (hasChromeLocalStorage()) {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      } catch (e) {
        console.warn(`${LOG_PREFIX} Failed to write "${key}" to localStorage:`, e);
        resolve();
      }
    }
  });
}

/**
 * Removes data specifically from local storage (chrome.storage.local or localStorage).
 */
export function storageLocalRemove(key: string): Promise<void> {
  return new Promise((resolve) => {
    if (hasChromeLocalStorage()) {
      chrome.storage.local.remove(key, () => resolve());
    } else {
      try {
        localStorage.removeItem(key);
        resolve();
      } catch (e) {
        console.warn(`${LOG_PREFIX} Failed to remove "${key}" from localStorage:`, e);
        resolve();
      }
    }
  });
}

