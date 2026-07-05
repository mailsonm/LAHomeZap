import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hasChromeStorage, storageGet, storageSet, storageGetMultiple, storageSetMultiple } from '../storage';

describe('storage utility', () => {
  describe('environment detection', () => {
    it('should detect chrome storage sync presence', () => {
      // In tests, chrome mock is setup by global test setup
      expect(hasChromeStorage()).toBe(true);
    });

    it('should handle chrome storage sync absence', () => {
      const originalChrome = (globalThis as any).chrome;
      delete (globalThis as any).chrome;

      expect(hasChromeStorage()).toBe(false);

      (globalThis as any).chrome = originalChrome;
    });
  });

  describe('with chrome storage sync (extension environment)', () => {
    it('should set and get values from chrome storage sync', async () => {
      await storageSet('myKey', 'myVal');
      const val = await storageGet<string>('myKey');
      expect(val).toBe('myVal');
    });

    it('should support batch read and write operations', async () => {
      const data = { key1: 'value1', key2: 'value2' };
      await storageSetMultiple(data);

      const result = await storageGetMultiple(['key1', 'key2', 'key3']);
      expect(result.key1).toBe('value1');
      expect(result.key2).toBe('value2');
      expect(result.key3).toBeUndefined();
    });
  });

  describe('without chrome storage sync (localStorage fallback)', () => {
    let originalChrome: any;

    beforeEach(() => {
      originalChrome = (globalThis as any).chrome;
      delete (globalThis as any).chrome;
      localStorage.clear();
    });

    afterEach(() => {
      (globalThis as any).chrome = originalChrome;
    });

    it('should fallback to localStorage for single get and set', async () => {
      await storageSet('fallbackKey', { test: 123 });
      const val = await storageGet<{ test: number }>('fallbackKey');
      
      expect(val).toEqual({ test: 123 });
      expect(localStorage.getItem('fallbackKey')).toBe(JSON.stringify({ test: 123 }));
    });

    it('should fallback to localStorage for multiple get and set', async () => {
      const data = { fall1: 'abc', fall2: 456 };
      await storageSetMultiple(data);

      const result = await storageGetMultiple(['fall1', 'fall2', 'fall3']);
      expect(result.fall1).toBe('abc');
      expect(result.fall2).toBe(456);
      expect(result.fall3).toBeUndefined();
    });
  });
});
