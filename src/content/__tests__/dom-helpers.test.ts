import { describe, it, expect, beforeEach } from 'vitest';
import { capitalize, isChatInput, getChatInput } from '../dom-helpers';

describe('dom-helpers', () => {
  describe('capitalize', () => {
    it('should capitalize the first letter of a word', () => {
      expect(capitalize('mailson')).toBe('Mailson');
      expect(capitalize('la home zap')).toBe('La home zap');
    });

    it('should return empty string if input is empty', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('isChatInput', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should return true for primary chat input matching SELECTORS.chatInput', () => {
      const input = document.createElement('div');
      input.setAttribute('contenteditable', 'true');
      input.setAttribute('data-tab', '10');
      document.body.appendChild(input);

      expect(isChatInput(input)).toBe(true);
    });

    it('should return true for fallback chat input', () => {
      const input = document.createElement('div');
      input.setAttribute('contenteditable', 'true');
      document.body.appendChild(input);

      expect(isChatInput(input)).toBe(true);
    });

    it('should return false for search input', () => {
      const input = document.createElement('div');
      input.setAttribute('contenteditable', 'true');
      input.setAttribute('data-tab', '3');
      document.body.appendChild(input);

      expect(isChatInput(input)).toBe(false);
    });

    it('should return false for random elements', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      expect(isChatInput(div)).toBe(false);
    });
  });

  describe('getChatInput', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should return primary chat input when present', () => {
      const input = document.createElement('div');
      input.setAttribute('contenteditable', 'true');
      input.setAttribute('data-tab', '10');
      document.body.appendChild(input);

      const found = getChatInput();
      expect(found).not.toBeNull();
      expect(found).toBe(input);
    });

    it('should return fallback chat input when primary is absent', () => {
      const input = document.createElement('div');
      input.setAttribute('contenteditable', 'true');
      document.body.appendChild(input);

      const found = getChatInput();
      expect(found).not.toBeNull();
      expect(found).toBe(input);
    });

    it('should return null when neither is present', () => {
      const found = getChatInput();
      expect(found).toBeNull();
    });
  });
});
