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

const NOW = new Date(2026, 7, 15, 15, 0, 0).getTime(); // Aug 15 2026 15:00 local

function messageRow(overrides: Partial<{
  isOut: boolean;
  prePlain: string;
  body: string;
  mediaHtml: string;
  dataId: string;
  extraHtml: string;
}>): HTMLElement {
  const isOut = overrides.isOut ?? false;
  const prePlain = overrides.prePlain;
  const body = overrides.body ?? 'Olá, tudo bem?';
  const mediaHtml = overrides.mediaHtml ?? '';
  const dataId = overrides.dataId ?? 'true_5511@c.us_ABC';
  const extraHtml = overrides.extraHtml ?? '';

  const row = document.createElement('div');
  row.className = isOut ? 'message-out' : 'message-in';
  row.setAttribute('data-id', dataId);
  row.setAttribute('data-testid', 'msg-container');

  const prePlainAttr = prePlain !== undefined ? `data-pre-plain-text="${prePlain}"` : '';

  row.innerHTML = `
    <div class="copyable-text" ${prePlainAttr}>
      <div><span class="selectable-text"><span>${body}</span></span></div>
    </div>
    ${mediaHtml}
    ${extraHtml}
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

    it('handles narrow no-break space and non-breaking space before AM/PM', () => {
      const expected = new Date(2026, 7, 15, 18, 23, 0).getTime();
      expect(parseTimestamp('[6:23\u202fPM, 15/08/2026] Mailson: ')).toBe(expected);
      expect(parseTimestamp('[6:23\u00a0PM, 15/08/2026] Mailson: ')).toBe(expected);
    });

    it('parses timestamps where date comes first [DD/MM/YYYY, HH:mm]', () => {
      const expected = new Date(2026, 7, 15, 18, 23, 0).getTime();
      expect(parseTimestamp('[15/08/2026, 18:23] Mailson: ')).toBe(expected);
      expect(parseTimestamp('[15/08/2026, 6:23 PM] Mailson: ')).toBe(expected);
    });

    it('parses ISO date format [YYYY-MM-DD, HH:mm]', () => {
      const expected = new Date(2026, 7, 15, 18, 23, 0).getTime();
      expect(parseTimestamp('[2026-08-15, 18:23] Mailson: ')).toBe(expected);
    });

    it('parses timestamps with hyphen or dot separators', () => {
      const expected = new Date(2026, 7, 15, 18, 23, 0).getTime();
      expect(parseTimestamp('[18:23 - 15/08/2026] Mailson: ')).toBe(expected);
      expect(parseTimestamp('[18:23, 15.08.2026] Mailson: ')).toBe(expected);
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
      const oneHourAgo = new Date(2026, 7, 15, 14, 0, 0).getTime();
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
      const row = messageRow({ prePlain: '[14:30, 15/08/2026] Maria: ' });
      const msg = extractMessageFromRow(row, 0);

      expect(msg).not.toBeNull();
      expect(msg!.sender).toBe('Maria');
      expect(msg!.body).toBe('Olá, tudo bem?');
      expect(msg!.timestampMs).toBe(new Date(2026, 7, 15, 14, 30, 0).getTime());
      expect(msg!.isOut).toBe(false);
      expect(msg!.media).toBeNull();
      expect(msg!.id).toBe('true_5511@c.us_ABC');
    });

    it('extracts an outgoing message with Você sender', () => {
      const row = messageRow({ isOut: true, prePlain: '[10:00, 15/08/2026] Você: ', body: 'Oi!' });
      const msg = extractMessageFromRow(row, 0);
      expect(msg!.isOut).toBe(true);
      expect(msg!.sender).toBe('Você');
    });

    it('detects outgoing message when checkmark icons are present even if tail-out is missing', () => {
      const row = document.createElement('div');
      row.setAttribute('data-id', 'msg-123');
      row.innerHTML = `
        <div class="copyable-text" data-pre-plain-text="[18:22, 15/08/2026] Intimacop: ">
          <div><span class="selectable-text"><span>Texto enviado</span></span></div>
        </div>
        <span data-icon="msg-dblcheck"></span>
      `;
      const msg = extractMessageFromRow(row, 0, { exportedBy: 'Intimacop' });
      expect(msg).not.toBeNull();
      expect(msg!.isOut).toBe(true);
      expect(msg!.sender).toBe('Intimacop');
    });

    it('detects outgoing message when sender in prePlain matches exportedBy', () => {
      const row = document.createElement('div');
      row.setAttribute('data-id', 'msg-124');
      row.innerHTML = `
        <div class="copyable-text" data-pre-plain-text="[18:22, 15/08/2026] Intimacop: ">
          <div><span class="selectable-text"><span>Texto enviado 2</span></span></div>
        </div>
      `;
      const msg = extractMessageFromRow(row, 0, { exportedBy: 'Intimacop' });
      expect(msg).not.toBeNull();
      expect(msg!.isOut).toBe(true);
    });

    it('identifies outgoing message in 1:1 chat when sender is not the client name', () => {
      const row = document.createElement('div');
      row.setAttribute('data-id', 'msg-125');
      row.innerHTML = `
        <div class="copyable-text" data-pre-plain-text="[18:22, 15/08/2026] Intimacop: ">
          <div><span class="selectable-text"><span>Texto do atendente</span></span></div>
        </div>
      `;
      const msg = extractMessageFromRow(row, 0, { activeChatName: 'Mailson Maia' });
      expect(msg).not.toBeNull();
      expect(msg!.isOut).toBe(true);
      expect(msg!.sender).toBe('Intimacop');
    });

    it('identifies incoming message in 1:1 chat when sender matches the client name', () => {
      const row = document.createElement('div');
      row.setAttribute('data-id', 'msg-126');
      row.innerHTML = `
        <div class="copyable-text" data-pre-plain-text="[18:22, 15/08/2026] Mailson Maia: ">
          <div><span class="selectable-text"><span>Texto do cliente</span></span></div>
        </div>
      `;
      const msg = extractMessageFromRow(row, 0, { activeChatName: 'Mailson Maia' });
      expect(msg).not.toBeNull();
      expect(msg!.isOut).toBe(false);
      expect(msg!.sender).toBe('Mailson Maia');
    });

    it('extracts image message and captures mediaSrc from img element', () => {
      const row = messageRow({
        body: 'legenda',
        prePlain: '[09:00, 15/08/2026] Maria: ',
        mediaHtml: '<img src="data:image/jpeg;base64,sample123" />',
      });
      const msg = extractMessageFromRow(row, 0);
      expect(msg!.media).toBe('image');
      expect(msg!.mediaSrc).toBe('data:image/jpeg;base64,sample123');
    });

    it('extracts an audio message without data-pre-plain-text using visible meta time', () => {
      const row = document.createElement('div');
      row.className = 'message-in';
      row.setAttribute('data-id', 'audio-123');
      row.innerHTML = `
        <audio src="blob:..."></audio>
        <div data-testid="msg-meta">
          <span>10:07 AM</span>
        </div>
      `;
      const msg = extractMessageFromRow(row, 0, { nowMs: NOW });
      expect(msg).not.toBeNull();
      expect(msg!.media).toBe('audio');
      expect(msg!.mediaSrc).toBe('blob:...');
      expect(msg!.timestampMs).toBeGreaterThan(0);
      const d = new Date(msg!.timestampMs);
      expect(d.getHours()).toBe(10);
      expect(d.getMinutes()).toBe(7);
    });

    it('extracts a video message with mediaSrc', () => {
      const row = document.createElement('div');
      row.className = 'message-in';
      row.setAttribute('data-id', 'video-123');
      row.innerHTML = `
        <video src="https://example.com/sample.mp4"></video>
        <div data-testid="msg-meta">
          <span>11:15 AM</span>
        </div>
      `;
      const msg = extractMessageFromRow(row, 0, { nowMs: NOW });
      expect(msg).not.toBeNull();
      expect(msg!.media).toBe('video');
      expect(msg!.mediaSrc).toBe('https://example.com/sample.mp4');
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
      container.appendChild(messageRow({ prePlain: '[10:00, 15/08/2026] Ana: ', body: 'A' }));
      container.appendChild(messageRow({ isOut: true, prePlain: '[10:05, 15/08/2026] Você: ', body: 'B' }));
      document.body.appendChild(container);

      const messages = collectVisibleMessages(container);
      expect(messages).toHaveLength(2);
      expect(messages[0].sender).toBe('Ana');
      expect(messages[1].isOut).toBe(true);
    });

    it('respects past date divider so old audio messages from 2025 are not exported as today', () => {
      const container = document.createElement('div');
      // Divider for 27/11/2025
      const divider = document.createElement('div');
      divider.textContent = '27/11/2025';
      container.appendChild(divider);

      // Audio message from 27/11/2025
      const audioRow = document.createElement('div');
      audioRow.setAttribute('data-testid', 'msg-container');
      audioRow.innerHTML = `
        <audio></audio>
        <div data-testid="msg-meta"><span>10:07 AM</span></div>
      `;
      container.appendChild(audioRow);

      const messages = collectVisibleMessages(container, { nowMs: NOW });
      expect(messages).toHaveLength(1);
      const msgDate = new Date(messages[0].timestampMs);
      expect(msgDate.getFullYear()).toBe(2025);
      expect(msgDate.getMonth()).toBe(10); // November (0-indexed 10)
      expect(msgDate.getDate()).toBe(27);
      expect(isWithinLast24h(messages[0].timestampMs, NOW)).toBe(false);
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

  describe('resolveMessagesMedia', () => {
    it('passes through messages without blob media', async () => {
      const { resolveMessagesMedia } = await import('../extract-messages');
      const messages = [
        {
          id: '1',
          body: 'Hello',
          sender: 'Maria',
          timestampMs: 1000,
          isOut: false,
          media: null,
        },
      ];
      const resolved = await resolveMessagesMedia(messages);
      expect(resolved).toEqual(messages);
    });
  });

  describe('extractMessageFromRow documents & transcriptions', () => {
    it('extracts document name, size and href when message is a document', () => {
      const row = messageRow({
        prePlain: '[14:30, 05/08/2026] Maria: ',
        body: 'Segue o relatório em anexo',
        mediaHtml: `
          <span data-icon="document"></span>
          <span title="exame_sangue.pdf" class="selectable-text">exame_sangue.pdf</span>
          <span data-testid="document-size">1.2 MB</span>
          <a href="blob:https://web.whatsapp.com/doc-blob-123">Download</a>
        `,
      });

      const extracted = extractMessageFromRow(row, 0);
      expect(extracted?.media).toBe('document');
      expect(extracted?.documentName).toBe('exame_sangue.pdf');
      expect(extracted?.documentSize).toBe('1.2 MB');
      expect(extracted?.mediaSrc).toBe('blob:https://web.whatsapp.com/doc-blob-123');
    });

    it('extracts transcription text when audio row has transcription element', () => {
      const row = messageRow({
        prePlain: '[14:30, 05/08/2026] Maria: ',
        mediaHtml: `
          <audio src="blob:https://web.whatsapp.com/audio-blob-456"></audio>
          <div class="stt-transcription-text" data-transcription="Transcrição realizada do áudio">
            Transcrição realizada do áudio
          </div>
        `,
      });

      const extracted = extractMessageFromRow(row, 0);
      expect(extracted?.media).toBe('audio');
      expect(extracted?.transcription).toBe('Transcrição realizada do áudio');
      expect(extracted?.mediaSrc).toBe('blob:https://web.whatsapp.com/audio-blob-456');
    });
  });
});