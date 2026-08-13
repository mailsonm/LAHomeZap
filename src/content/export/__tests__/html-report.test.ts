import { describe, it, expect } from 'vitest';
import type { MediaKind } from '../../../types';
import {
  buildHtmlReport,
  escapeHtml,
  mediaLabel,
  groupMessagesByDay,
} from '../html-report';

const message = (overrides: Partial<{
  id: string;
  body: string;
  sender: string;
  timestampMs: number;
  isOut: boolean;
  media: 'image' | null;
}> = {}) => ({
  id: overrides.id ?? 'm1',
  body: overrides.body ?? 'Olá',
  sender: overrides.sender ?? 'Maria',
  timestampMs: overrides.timestampMs ?? new Date(2026, 7, 5, 14, 30, 0).getTime(),
  isOut: overrides.isOut ?? false,
  media: overrides.media ?? null,
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

    it('renders media messages with a placeholder marker', () => {
      const html = buildHtmlReport('Maria', [message({ media: 'image' })], meta);
      expect(html).toContain('media-marker');
      expect(html).toContain('Imagem');
    });

    it('does not leak unescaped message content', () => {
      const html = buildHtmlReport('Maria', [message({ body: '<b>bold</b>' })], meta);
      expect(html).not.toContain('<b>bold</b>');
      expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    });
  });
});