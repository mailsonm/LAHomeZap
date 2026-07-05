/**
 * Global test setup for Vitest.
 * Provides DOM environment and stubs for browser extension APIs.
 */

import { vi, beforeEach } from 'vitest';
import '@vitest/coverage-v8';

// --- Mock chrome.storage API ---
type StorageMap = Record<string, unknown>;

function createStorageArea(initial: StorageMap = {}) {
  const store: StorageMap = { ...initial };
  const listeners: Array<(changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, area: string) => void> = [];

  return {
    get: (keys: string | string[], cb?: (result: Record<string, unknown>) => void) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const k of keysArray) {
        if (k in store) result[k] = store[k];
      }
      if (cb) cb(result);
      return Promise.resolve(result);
    },
    set: (data: Record<string, unknown>, cb?: () => void) => {
      const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {};
      for (const [k, v] of Object.entries(data)) {
        changes[k] = { oldValue: store[k], newValue: v };
        store[k] = v;
      }
      // Notify listeners asynchronously (mimicking chrome.runtime behavior)
      setTimeout(() => {
        for (const listener of listeners) {
          listener(changes, 'sync');
        }
      }, 0);
      if (cb) cb();
      return Promise.resolve();
    },
    _store: store,
    _listeners: listeners,
  };
}

// Reset-able chrome mock
function setupChromeMock() {
  const storageArea = createStorageArea();
  (globalThis as any).chrome = {
    storage: {
      sync: storageArea,
      onChanged: {
        addListener: (listener: any) => storageArea._listeners.push(listener),
        removeListener: (listener: any) => {
          const idx = storageArea._listeners.indexOf(listener);
          if (idx >= 0) storageArea._listeners.splice(idx, 1);
        },
      },
    },
    runtime: {},
  };
  return storageArea;
}

beforeEach(() => {
  setupChromeMock();
  localStorage.clear();
});

// Stub matchMedia (not implemented in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Stub document.execCommand for content editable interactions
document.execCommand = vi.fn(() => true);
