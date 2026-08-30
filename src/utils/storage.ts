/**
 * Unified storage abstraction for Lar Home Zap.
 * Automatically uses chrome.storage.sync when available, with localStorage fallback.
 */

const LOG_PREFIX = '[Lar Home Zap]';

/**
 * Returns true if chrome.storage.sync is available in the current context.
 */
export function hasChromeStorage(): boolean {
  try {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.sync
    );
  } catch {
    return false;
  }
}

/**
 * Generic key-value read from storage.
 * Uses chrome.storage.sync when available, otherwise localStorage.
 */
export function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      try {
        chrome.storage.sync.get([key], (result) => {
          if (chrome.runtime.lastError) {
            resolve(fallbackGet(key));
          } else {
            resolve(result?.[key] as T | undefined);
          }
        });
        return;
      } catch {
        resolve(fallbackGet(key));
        return;
      }
    }
    resolve(fallbackGet(key));
  });
}

function fallbackGet<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to read "${key}" from localStorage:`, e);
    return undefined;
  }
}

/**
 * Generic key-value write to storage.
 * Uses chrome.storage.sync when available, otherwise localStorage.
 */
export function storageSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    const data: Record<string, unknown> = { [key]: value };
    if (hasChromeStorage()) {
      try {
        chrome.storage.sync.set(data, () => resolve());
        return;
      } catch {
        fallbackSet(key, value);
        resolve();
        return;
      }
    }
    fallbackSet(key, value);
    resolve();
  });
}

function fallbackSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to write "${key}" to localStorage:`, e);
  }
}

/**
 * Batch read multiple keys from storage.
 */
export function storageGetMultiple(keys: string[]): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      try {
        chrome.storage.sync.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            resolve(fallbackGetMultiple(keys));
          } else {
            resolve(result || {});
          }
        });
        return;
      } catch {
        resolve(fallbackGetMultiple(keys));
        return;
      }
    }
    resolve(fallbackGetMultiple(keys));
  });
}

function fallbackGetMultiple(keys: string[]): Record<string, unknown> {
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
  return result;
}

/**
 * Batch write multiple key-value pairs to storage.
 */
export function storageSetMultiple(data: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      try {
        chrome.storage.sync.set(data, () => resolve());
        return;
      } catch {
        fallbackSetMultiple(data);
        resolve();
        return;
      }
    }
    fallbackSetMultiple(data);
    resolve();
  });
}

function fallbackSetMultiple(data: Record<string, unknown>): void {
  try {
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to write to localStorage:`, e);
  }
}

/**
 * Register a listener for storage changes.
 * Falls back gracefully in non-extension environments.
 */
export function onStorageChanged(
  callback: (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void
): () => void {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (areaName === 'sync') {
          callback(changes);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        try {
          chrome.storage.onChanged.removeListener(listener);
        } catch {
          // ignore
        }
      };
    } catch {
      return () => {};
    }
  }
  return () => {};
}

/**
 * Returns true if chrome.storage.local is available in the current context.
 */
export function hasChromeLocalStorage(): boolean {
  try {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local
    );
  } catch {
    return false;
  }
}

/**
 * Reads data specifically from local storage (chrome.storage.local or localStorage).
 */
export function storageLocalGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (hasChromeLocalStorage()) {
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            resolve(fallbackGet(key));
          } else {
            resolve(result?.[key] as T | undefined);
          }
        });
        return;
      } catch {
        resolve(fallbackGet(key));
        return;
      }
    }
    resolve(fallbackGet(key));
  });
}

/**
 * Writes data specifically to local storage (chrome.storage.local or localStorage).
 */
export function storageLocalSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    if (hasChromeLocalStorage()) {
      try {
        chrome.storage.local.set({ [key]: value }, () => resolve());
        return;
      } catch {
        fallbackSet(key, value);
        resolve();
        return;
      }
    }
    fallbackSet(key, value);
    resolve();
  });
}

/**
 * Removes data specifically from local storage (chrome.storage.local or localStorage).
 */
export function storageLocalRemove(key: string): Promise<void> {
  return new Promise((resolve) => {
    if (hasChromeLocalStorage()) {
      try {
        chrome.storage.local.remove(key, () => resolve());
        return;
      } catch {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        resolve();
        return;
      }
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    resolve();
  });
}
