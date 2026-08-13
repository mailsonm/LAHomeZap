/**
 * Download helpers for exported HTML reports.
 * Prefers chrome.downloads (bypasses Chrome's automatic-download guards when
 * several files are produced), falling back to a plain blob download.
 */

import { EXPORT_DOWNLOAD_SUBDIR, EXPORT_DOWNLOAD_MESSAGE_TYPE } from '../../constants';
import { formatDay } from './format';

/** Normalizes a chat name into a safe filename fragment. */
export function sanitizeFilename(name: string): string {
  const cleaned = (name || '')
    .replace(/[\\/:*?"<>|\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
  return cleaned.slice(0, 80) || 'conversa';
}

/** Builds the full export filename, e.g. conversa_maria_05-08-2026.html. */
export function buildExportFilename(chatName: string, when: Date): string {
  const safeName = sanitizeFilename(chatName);
  const day = formatDay(when).replace(/\//g, '-');
  return `conversa_${safeName}_${day}.html`;
}

/** Converts an HTML string into a base64 data URL. */
export function htmlToDataUrl(html: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Triggers the download of a report. When chrome.downloads is available the
 * file is saved under the configured subdirectory with unique-name handling.
 * In content scripts, delegates to the background service worker via runtime message.
 */
export async function downloadHtml(
  html: string,
  filename: string,
  subdir: string = EXPORT_DOWNLOAD_SUBDIR
): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
    const dataUrl = await htmlToDataUrl(html);
    await chrome.downloads.download({
      url: dataUrl,
      filename: subdir ? `${subdir}/${filename}` : filename,
      saveAs: false,
      conflictAction: 'uniquify',
    });
    return;
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const response = await new Promise<{ ok: boolean }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: EXPORT_DOWNLOAD_MESSAGE_TYPE, html, filename, subdir },
          (res) => resolve(res ?? { ok: false })
        );
      });
      if (response?.ok) return;
    } catch {
      // Fallback to Blob link anchor download below if background is unreachable
    }
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}