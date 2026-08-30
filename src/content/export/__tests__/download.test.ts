import { describe, it, expect, vi, afterEach } from 'vitest';
import { sanitizeFilename, buildExportFilename, htmlToDataUrl, downloadHtml } from '../download';

describe('download', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeFilename', () => {
    it('replaces runs of unsafe characters with a single underscore', () => {
      expect(sanitizeFilename('Maria/João: "teste"?')).toBe('Maria_João_teste');
    });

    it('collapses repeated underscores', () => {
      expect(sanitizeFilename('a   b')).toBe('a_b');
    });

    it('falls back to a default when the result is empty', () => {
      expect(sanitizeFilename('///')).toBe('conversa');
      expect(sanitizeFilename('')).toBe('conversa');
    });

    it('truncates long names', () => {
      expect(sanitizeFilename('x'.repeat(200))).toHaveLength(80);
    });
  });

  describe('buildExportFilename', () => {
    it('builds a unified conversation filename', () => {
      const when = new Date(2026, 7, 5, 15, 0, 0);
      expect(buildExportFilename('Maria', when)).toBe('conversa_Maria.html');
    });

    it('sanitizes the chat name inside the filename', () => {
      const when = new Date(2026, 7, 5, 15, 0, 0);
      expect(buildExportFilename('Hapvida/Solicitações', when)).toBe(
        'conversa_Hapvida_Solicitações.html'
      );
    });
  });

  describe('htmlToDataUrl', () => {
    it('resolves to a base64 data url', async () => {
      const dataUrl = await htmlToDataUrl('<html>olá</html>');
      expect(dataUrl.startsWith('data:text/html;charset=utf-8;base64,')).toBe(true);
    });
  });

  describe('downloadHtml', () => {
    it('uses chrome.downloads when available with overwrite conflictAction', async () => {
      const download = vi.fn().mockResolvedValue(1);
      (globalThis as any).chrome.downloads = { download };

      await downloadHtml('<html>a</html>', 'conversa_Maria.html');

      expect(download).toHaveBeenCalledTimes(1);
      const options = download.mock.calls[0][0];
      expect(options.filename).toBe('LaHomeZap/conversa_Maria.html');
      expect(options.url.startsWith('data:text/html;charset=utf-8;base64,')).toBe(true);
      expect(options.saveAs).toBe(false);
      expect(options.conflictAction).toBe('overwrite');
      delete (globalThis as any).chrome.downloads;
    });

    it('falls back to a blob anchor click without chrome.downloads', async () => {
      const originalCreateElement = document.createElement.bind(document);
      const click = vi.fn();
      const createElement = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') Object.defineProperty(el, 'click', { value: click });
        return el;
      });

      await downloadHtml('<html>a</html>', 'conversa_Maria.html');

      expect(createElement).toHaveBeenCalledWith('a');
      expect(click).toHaveBeenCalledTimes(1);
    });
  });
});