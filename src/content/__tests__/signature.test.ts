import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatAttendantSignature, resolveDisplayName, hasRecentSignature, injectSignatureIntoInput, handleKeyDown, handlePaste } from '../signature';
import type { Attendant, Settings } from '../../types';

describe('signature', () => {
  const defaultAttendant: Attendant = {
    id: '1',
    name: 'mailson',
    isFavorite: true,
    quebraLinha: true,
    negrito: true,
    italico: false,
    moldura: false,
    destaque: false,
  };

  const defaultSettings: Settings = {
    quickAccess: true,
    transferAlert: false,
    attendanceControl: true,
    capitalizeInitial: true,
    dontRepeatInChat: false,
  };

  describe('formatAttendantSignature', () => {
    it('should format signature with defaults (negrito, capitalize, quebraLinha)', () => {
      const result = formatAttendantSignature(defaultAttendant, defaultSettings);
      expect(result).toBe('*Mailson*\n');
    });

    it('should format signature without capitalization', () => {
      const settings = { ...defaultSettings, capitalizeInitial: false };
      const result = formatAttendantSignature(defaultAttendant, settings);
      expect(result).toBe('*mailson*\n');
    });

    it('should format with moldura', () => {
      const att = { ...defaultAttendant, moldura: true };
      const result = formatAttendantSignature(att, defaultSettings);
      expect(result).toBe('*\`Mailson\`*\n');
    });

    it('should format with italico', () => {
      const att = { ...defaultAttendant, italico: true };
      const result = formatAttendantSignature(att, defaultSettings);
      expect(result).toBe('*_Mailson_*\n');
    });

    it('should format with destaque', () => {
      const att = { ...defaultAttendant, destaque: true };
      const result = formatAttendantSignature(att, defaultSettings);
      expect(result).toBe('> *Mailson*\n');
    });

    it('should format without quebraLinha', () => {
      const att = { ...defaultAttendant, quebraLinha: false };
      const result = formatAttendantSignature(att, defaultSettings);
      expect(result).toBe('*Mailson* ');
    });
  });

  describe('resolveDisplayName', () => {
    it('should capitalize when capitalizeInitial is true', () => {
      expect(resolveDisplayName('mailson', defaultSettings)).toBe('Mailson');
    });

    it('should not capitalize when capitalizeInitial is false', () => {
      expect(resolveDisplayName('mailson', { ...defaultSettings, capitalizeInitial: false })).toBe('mailson');
    });
  });

  describe('hasRecentSignature', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should return false if there are no sent messages', () => {
      expect(hasRecentSignature('Mailson')).toBe(false);
    });

    it('should return true if a recent sent message contains the signature text (case-insensitive)', () => {
      const msg = document.createElement('div');
      msg.className = 'message-out';
      msg.textContent = 'Olá, sou o atendente: Mailson';
      document.body.appendChild(msg);

      expect(hasRecentSignature('Mailson')).toBe(true);
    });

    it('should return true if a recent sent message contains the bold signature text', () => {
      const msg = document.createElement('div');
      msg.className = 'message-out';
      msg.textContent = 'Mensagem *Atendente: Mailson*';
      document.body.appendChild(msg);

      expect(hasRecentSignature('Mailson')).toBe(true);
    });

    it('should return false if recent messages do not contain the signature', () => {
      const msg = document.createElement('div');
      msg.className = 'message-out';
      msg.textContent = 'Outra mensagem qualquer';
      document.body.appendChild(msg);

      expect(hasRecentSignature('Mailson')).toBe(false);
    });
  });

  describe('injectSignatureIntoInput', () => {
    let input: HTMLDivElement;

    beforeEach(() => {
      document.body.innerHTML = '';
      input = document.createElement('div');
      input.setAttribute('contenteditable', 'true');
      document.body.appendChild(input);
      vi.spyOn(document, 'execCommand').mockImplementation(() => true);
      vi.clearAllMocks();
    });

    it('should inject signature if not present', () => {
      injectSignatureIntoInput(input, 'mailson', [defaultAttendant], defaultSettings);
      expect(document.execCommand).toHaveBeenCalledWith('insertText', false, '*Mailson*');
    });

    it('should respect dontRepeatInChat and skip injection if signature is recent', () => {
      const msg = document.createElement('div');
      msg.className = 'message-out';
      msg.textContent = '*Atendente: Mailson*';
      document.body.appendChild(msg);

      const settings = { ...defaultSettings, dontRepeatInChat: true };
      injectSignatureIntoInput(input, 'mailson', [defaultAttendant], settings);
      expect(document.execCommand).not.toHaveBeenCalled();
    });
  });

  describe('handleKeyDown', () => {
    let input: HTMLDivElement;

    beforeEach(() => {
      document.body.innerHTML = '';
      input = document.createElement('div');
      input.setAttribute('contenteditable', 'true');
      input.setAttribute('data-tab', '10');
      document.body.appendChild(input);
      vi.spyOn(document, 'execCommand').mockImplementation(() => true);
      vi.clearAllMocks();
    });

    it('should inject signature if input is empty and key length is 1 without modifiers', () => {
      handleKeyDown(
        { target: input, key: 'a' } as unknown as KeyboardEvent,
        'mailson',
        [defaultAttendant],
        defaultSettings
      );

      expect(document.execCommand).toHaveBeenCalledWith('insertText', false, '*Mailson*');
    });

    it('should not inject signature if input is not empty', () => {
      input.textContent = 'hello';
      handleKeyDown(
        { target: input, key: 'a' } as unknown as KeyboardEvent,
        'mailson',
        [defaultAttendant],
        defaultSettings
      );

      expect(document.execCommand).not.toHaveBeenCalled();
    });

    it('should not inject signature if key length is not 1', () => {
      handleKeyDown(
        { target: input, key: 'Backspace' } as unknown as KeyboardEvent,
        'mailson',
        [defaultAttendant],
        defaultSettings
      );

      expect(document.execCommand).not.toHaveBeenCalled();
    });

    it('should not inject signature if modifier key is pressed', () => {
      handleKeyDown(
        { target: input, key: 'a', ctrlKey: true } as unknown as KeyboardEvent,
        'mailson',
        [defaultAttendant],
        defaultSettings
      );

      expect(document.execCommand).not.toHaveBeenCalled();
    });
  });

  describe('handlePaste', () => {
    let input: HTMLDivElement;

    beforeEach(() => {
      document.body.innerHTML = '';
      input = document.createElement('div');
      input.setAttribute('contenteditable', 'true');
      input.setAttribute('data-tab', '10');
      document.body.appendChild(input);
      vi.spyOn(document, 'execCommand').mockImplementation(() => true);
      vi.clearAllMocks();
    });

    it('should inject signature if input is empty on paste', () => {
      handlePaste(
        { target: input } as unknown as ClipboardEvent,
        'mailson',
        [defaultAttendant],
        defaultSettings
      );

      expect(document.execCommand).toHaveBeenCalledWith('insertText', false, '*Mailson*');
    });

    it('should not inject signature if input is not empty on paste', () => {
      input.textContent = 'hello';
      handlePaste(
        { target: input } as unknown as ClipboardEvent,
        'mailson',
        [defaultAttendant],
        defaultSettings
      );

      expect(document.execCommand).not.toHaveBeenCalled();
    });
  });
});
