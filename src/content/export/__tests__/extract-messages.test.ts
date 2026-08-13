import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseTimestamp,
  parseSender,
  isWithinLast24h,
  classifyMedia,
  extractMessageFromRow,
  collectVisibleMessages,
  shouldContinueLoading,
} from '../extract-messages';

const NOW = new Date(2026, 7, 5, 15, 0, 0).getTime(); // Aug 5 2026 15:00 local

function messageRow(overrides: Partial<{
  isOut: boolean;
  prePlain: string;
  body: string;
  mediaHtml: string;
  dataId: string;
}>): HTMLElement {
  const isOut = overrides.isOut ?? false;
  const prePlain = overrides.prePlain ?? '[14:30, 05/08/2026] Maria: ';
  const body = overrides.body ?? 'Olá, tudo bem?';
  const mediaHtml = overrides.mediaHtml ?? '';
  const dataId = overrides.dataId ?? 'true_5511@c.us_ABC';

  const row = document.createElement('div');
  row.className = isOut ? 'message-out' : 'message-in';
  row.setAttribute('data-id', dataId);
  row.innerHTML = `
    <div class="copyable-text" data-pre-plain-text="${prePlain}">
      <div><span class="selectable-text"><span>${body}</span></span></div>
    </div>
    ${mediaHtml}
  `;
  return row;
}

describe('extract-messages', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('parseTimestamp', () => {
    it('parses 24h WhatsApp pre-plain-text timestamps', () => {
      const expected = new Date(2026, 7, 5, 14, 30, 0).getTime();
      expect(parseTimestamp('[14:30, 05/08/2026] Maria: ')).toBe(expected);
    });

    it('parses 12h AM/PM WhatsApp pre-plain-text timestamps', () => {
      const expectedPm = new Date(2026, 7, 12, 20, 54, 0).getTime();
      expect(parseTimestamp('[8:54 PM, 12/08/2026] Mailson: ')).toBe(expectedPm);

      const expectedAm = new Date(2026, 7, 12, 11, 28, 0).getTime();
      expect(parseTimestamp('[11:28 AM, 12/08/2026] Claro: ')).toBe(expectedAm);
    });

    it('returns null for values without a timestamp', () => {
      expect(parseTimestamp('')).toBeNull();
      expect(parseTimestamp('Maria: ')).toBeNull();
    });
  });

  describe('parseSender', () => {
    it('extracts the sender from the pre-plain-text', () => {
      expect(parseSender('[14:30, 05/08/2026] Maria: ')).toBe('Maria');
    });

    it('handles group sender names', () => {
      expect(parseSender('[09:00, 01/08/2026] Coordenação - João: ')).toBe('Coordenação - João');
    });

    it('returns empty string when no closing bracket is found', () => {
      expect(parseSender('sem formato')).toBe('');
    });
  });

  describe('isWithinLast24h', () => {
    it('includes messages inside the window', () => {
      const oneHourAgo = new Date(2026, 7, 5, 14, 0, 0).getTime();
      expect(isWithinLast24h(oneHourAgo, NOW)).toBe(true);
    });

    it('includes messages exactly at the 24h boundary', () => {
      const boundary = NOW - 24 * 60 * 60 * 1000;
      expect(isWithinLast24h(boundary, NOW)).toBe(true);
    });

    it('excludes messages older than 24h', () => {
      const older = NOW - 24 * 60 * 60 * 1000 - 1;
      expect(isWithinLast24h(older, NOW)).toBe(false);
    });

    it('excludes future timestamps', () => {
      expect(isWithinLast24h(NOW + 60000, NOW)).toBe(false);
    });
  });

  describe('classifyMedia', () => {
    it('detects image media', () => {
      const row = document.createElement('div');
      row.innerHTML = '<span data-icon="image"></span>';
      expect(classifyMedia(row)).toBe('image');
    });

    it('detects audio media', () => {
      const row = document.createElement('div');
      row.innerHTML = '<audio></audio>';
      expect(classifyMedia(row)).toBe('audio');
    });

    it('detects document media', () => {
      const row = document.createElement('div');
      row.innerHTML = '<span data-icon="document"></span>';
      expect(classifyMedia(row)).toBe('document');
    });

    it('returns null for plain text rows', () => {
      const row = document.createElement('div');
      row.textContent = 'só texto';
      expect(classifyMedia(row)).toBeNull();
    });
  });

  describe('extractMessageFromRow', () => {
    it('extracts an incoming text message', () => {
      const row = messageRow({});
      const msg = extractMessageFromRow(row, 0);

      expect(msg).not.toBeNull();
      expect(msg!.sender).toBe('Maria');
      expect(msg!.body).toBe('Olá, tudo bem?');
      expect(msg!.timestampMs).toBe(new Date(2026, 7, 5, 14, 30, 0).getTime());
      expect(msg!.isOut).toBe(false);
      expect(msg!.media).toBeNull();
      expect(msg!.id).toBe('true_5511@c.us_ABC');
    });

    it('extracts an outgoing message', () => {
      const row = messageRow({ isOut: true, prePlain: '[10:00, 05/08/2026] Você: ', body: 'Oi!' });
      const msg = extractMessageFromRow(row, 0);
      expect(msg!.isOut).toBe(true);
      expect(msg!.sender).toBe('Você');
    });

    it('marks media rows with a placeholder kind', () => {
      const row = messageRow({
        body: '',
        prePlain: '[09:00, 05/08/2026] Maria: ',
        mediaHtml: '<span data-icon="image"></span>',
      });
      const msg = extractMessageFromRow(row, 0);
      expect(msg!.media).toBe('image');
    });

    it('returns null for rows that are not messages', () => {
      const row = document.createElement('div');
      row.textContent = 'divisor de data';
      expect(extractMessageFromRow(row, 0)).toBeNull();
    });
  });

  describe('collectVisibleMessages', () => {
    it('collects all rendered message rows in document order', () => {
      const container = document.createElement('div');
      container.appendChild(messageRow({ prePlain: '[10:00, 05/08/2026] Ana: ', body: 'A' }));
      container.appendChild(messageRow({ isOut: true, prePlain: '[10:05, 05/08/2026] Você: ', body: 'B' }));
      document.body.appendChild(container);

      const messages = collectVisibleMessages(container);
      expect(messages).toHaveLength(2);
      expect(messages[0].sender).toBe('Ana');
      expect(messages[1].isOut).toBe(true);
    });
  });

  describe('shouldContinueLoading', () => {
    const cutoff = NOW - 24 * 60 * 60 * 1000;

    it('continues while the oldest message is newer than the cutoff', () => {
      expect(shouldContinueLoading(NOW - 1000, cutoff, 0, 40)).toBe(true);
    });

    it('stops when the oldest message predates the cutoff', () => {
      expect(shouldContinueLoading(cutoff - 1, cutoff, 0, 40)).toBe(false);
    });

    it('stops when the iteration cap is reached', () => {
      expect(shouldContinueLoading(NOW, cutoff, 40, 40)).toBe(false);
    });

    it('stops when no timestamp is available', () => {
      expect(shouldContinueLoading(null, cutoff, 0, 40)).toBe(false);
    });
  });
});