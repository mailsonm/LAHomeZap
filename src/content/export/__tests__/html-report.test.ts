import { describe, it, expect } from 'vitest';
import type { MediaKind, ExportedMessage } from '../../../types';
import {
  buildHtmlReport,
  escapeHtml,
  mediaLabel,
  groupMessagesByDay,
} from '../html-report';

const message = (overrides: Partial<ExportedMessage> = {}): ExportedMessage => ({
  id: overrides.id ?? 'm1',
  body: overrides.body ?? 'Olá',
  sender: overrides.sender ?? 'Maria',
  timestampMs: overrides.timestampMs ?? new Date(2026, 7, 5, 14, 30, 0).getTime(),
  isOut: overrides.isOut ?? false,
  media: overrides.media ?? null,
  mediaSrc: overrides.mediaSrc,
  documentName: overrides.documentName,
  documentSize: overrides.documentSize,
  transcription: overrides.transcription,
  ...overrides,
});

describe('html-report', () => {
  describe('escapeHtml', () => {
    it('escapes HTML-sensitive characters', () => {
      expect(escapeHtml(`<script>alert("x&y")</script>`)).toBe(
        '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;'
      );
    });

    it('handles empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('mediaLabel', () => {
    it('returns the pt-BR label for known kinds', () => {
      expect(mediaLabel('image')).toContain('Imagem');
      expect(mediaLabel('document')).toContain('Documento');
    });

    it('falls back for unknown kinds', () => {
      expect(mediaLabel('unknown-kind' as MediaKind)).toContain('Mídia');
    });
  });

  describe('groupMessagesByDay', () => {
    it('groups consecutive messages by day', () => {
      const messages = [
        message({ id: 'a', timestampMs: new Date(2026, 7, 5, 10, 0).getTime() }),
        message({ id: 'b', timestampMs: new Date(2026, 7, 5, 11, 0).getTime() }),
        message({ id: 'c', timestampMs: new Date(2026, 7, 4, 10, 0).getTime() }),
      ];

      const groups = groupMessagesByDay(messages);
      expect(groups).toHaveLength(2);
      expect(groups[0].messages).toHaveLength(2);
      expect(groups[0].dayLabel).toBe('05/08/2026');
      expect(groups[1].messages).toHaveLength(1);
    });
  });

  describe('buildHtmlReport', () => {
    const meta = { exportedAt: new Date(2026, 7, 5, 15, 0, 0), exportedBy: 'Coordenação' };

    it('renders a self-contained document with the chat name', () => {
      const html = buildHtmlReport('Maria', [message()], meta);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Maria');
      expect(html).toContain('Coordenação');
      expect(html).toContain('<style>');
    });

    it('renders sender, body and time for incoming messages', () => {
      const html = buildHtmlReport('Maria', [message()], meta);
      expect(html).toContain('Maria');
      expect(html).toContain('Olá');
      expect(html).toContain('14:30');
      expect(html).toContain('message-in');
    });

    it('renders media messages with a placeholder marker and image tag when mediaSrc is present', () => {
      const html = buildHtmlReport(
        'Maria',
        [message({ media: 'image', mediaSrc: 'data:image/jpeg;base64,abc123xyz' })],
        meta
      );
      expect(html).toContain('media-marker');
      expect(html).toContain('Imagem');
      expect(html).toContain('<img src="data:image/jpeg;base64,abc123xyz" class="message-image" alt="Imagem" />');
    });

    it('renders audio messages with native HTML5 audio player when mediaSrc is present', () => {
      const html = buildHtmlReport(
        'Maria',
        [message({ media: 'audio', mediaSrc: 'data:audio/ogg;base64,audio123' })],
        meta
      );
      expect(html).toContain('<audio controls preload="metadata" class="message-audio" src="data:audio/ogg;base64,audio123"></audio>');
    });

    it('renders audio placeholder badge with duration when mediaSrc is not present', () => {
      const html = buildHtmlReport(
        'Maria',
        [message({ media: 'audio', body: '0:14' })],
        meta
      );
      expect(html).toContain('message-audio-placeholder');
      expect(html).toContain('🎤 Áudio');
      expect(html).toContain('(0:14)');
    });

    it('renders video messages with native HTML5 video player when mediaSrc is present', () => {
      const html = buildHtmlReport(
        'Maria',
        [message({ media: 'video', mediaSrc: 'data:video/mp4;base64,video123' })],
        meta
      );
      expect(html).toContain('media-marker');
      expect(html).toContain('Vídeo');
      expect(html).toContain('<video controls preload="metadata" class="message-video" src="data:video/mp4;base64,video123"></video>');
    });

    it('renders document messages with file name, size and offline download button', () => {
      const html = buildHtmlReport(
        'Maria',
        [
          message({
            media: 'document',
            documentName: 'relatorio_paciente.pdf',
            documentSize: '1.4 MB',
            mediaSrc: 'data:application/pdf;base64,JVBERi0xLjQK...',
          }),
        ],
        meta
      );
      expect(html).toContain('Documento');
      expect(html).toContain('relatorio_paciente.pdf');
      expect(html).toContain('(1.4 MB)');
      expect(html).toContain('download="relatorio_paciente.pdf"');
      expect(html).toContain('href="data:application/pdf;base64,JVBERi0xLjQK..."');
    });

    it('renders audio messages with transcription when available', () => {
      const html = buildHtmlReport(
        'Maria',
        [
          message({
            media: 'audio',
            mediaSrc: 'data:audio/ogg;base64,audio123',
            transcription: 'Por favor, enviar os documentos até as 17h.',
          }),
        ],
        meta
      );
      expect(html).toContain('message-transcription');
      expect(html).toContain('Transcrição:');
      expect(html).toContain('Por favor, enviar os documentos até as 17h.');
    });

    it('renders outgoing messages with message-out and custom attendant sender', () => {
      const html = buildHtmlReport(
        'Maria',
        [message({ isOut: true, sender: 'Intimacop', body: 'Mensagem enviada' })],
        meta
      );
      expect(html).toContain('message-out');
      expect(html).toContain('Intimacop');
      expect(html).toContain('Mensagem enviada');
    });

    it('does not leak unescaped message content', () => {
      const html = buildHtmlReport('Maria', [message({ body: '<b>bold</b>' })], meta);
      expect(html).not.toContain('<b>bold</b>');
      expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    });
  });
});