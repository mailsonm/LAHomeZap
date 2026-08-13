/**
 * Message extraction from the active WhatsApp Web conversation DOM.
 *
 * Relies on the `data-pre-plain-text` attribute that WhatsApp injects into each
 * message bubble (format: "[hh:mm, dd/MM/yyyy] Sender: "). This yields the
 * timestamp and the sender without depending on WhatsApp's internal Store.
 */

import type { ExportedMessage, MediaKind } from '../../types';
import { EXPORT_WINDOW_MS } from '../../constants';
import { SELECTORS } from '../../utils/selectors';

const MSG_TIMESTAMP_REGEX = /\[(\d{1,2}):(\d{2})(?:\s*([ap]\.?m\.?))?,\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]/i;

const MEDIA_ICON_KIND: Array<[MediaKind, string[]]> = [
  ['image', ['image']],
  ['video', ['video']],
  ['audio', ['audio']],
  ['document', ['document']],
  ['contact', ['contact']],
  ['location', ['location']],
  ['sticker', ['sticker']],
];

/** Parses the WhatsApp bubble timestamp into a local Date timestamp (ms). */
export function parseTimestamp(prePlainText: string): number | null {
  const match = MSG_TIMESTAMP_REGEX.exec(prePlainText);
  if (!match) return null;
  let hh = Number(match[1]);
  const mm = Number(match[2]);
  const ampm = match[3]?.toLowerCase().replace(/\./g, '');
  const p1 = Number(match[4]);
  const p2 = Number(match[5]);
  const rawYyyy = Number(match[6]);
  const yyyy = rawYyyy < 100 ? 2000 + rawYyyy : rawYyyy;

  if (ampm === 'pm' && hh < 12) {
    hh += 12;
  } else if (ampm === 'am' && hh === 12) {
    hh = 0;
  }

  let dd = p1;
  let mo = p2;
  if (mo > 12 && dd <= 12) {
    dd = p2;
    mo = p1;
  }

  return new Date(yyyy, mo - 1, dd, hh, mm, 0, 0).getTime();
}

/**
 * Extracts the message sender from a `data-pre-plain-text` value,
 * e.g. "[14:30, 05/08/2026] Maria: " -> "Maria".
 */
export function parseSender(prePlainText: string): string {
  const idx = prePlainText.indexOf(']');
  if (idx === -1) return '';
  return prePlainText.slice(idx + 1).trim().replace(/:$/, '').trim();
}

/** Returns true when the message timestamp falls inside the export window. */
export function isWithinLast24h(timestampMs: number, nowMs: number): boolean {
  if (timestampMs <= 0) return false;
  const elapsed = nowMs - timestampMs;
  return elapsed >= 0 && elapsed <= EXPORT_WINDOW_MS;
}

/**
 * Detects whether a message row carries media and, if so, which kind.
 * Uses a best-effort heuristic based on data-icon attributes and native tags.
 */
export function classifyMedia(row: HTMLElement): MediaKind | null {
  if (row.querySelector('audio')) return 'audio';
  if (row.querySelector('video')) return 'video';

  for (const [kind, icons] of MEDIA_ICON_KIND) {
    for (const icon of icons) {
      if (row.querySelector(`span[data-icon="${icon}"]`)) return kind;
    }
  }

  if (row.querySelector('img[src]')) return 'image';
  return null;
}

/**
 * Converts a single message DOM row into an ExportedMessage.
 * Returns null when the row carries no timestamp, media or text (e.g. dividers).
 */
export function extractMessageFromRow(row: HTMLElement, index: number): ExportedMessage | null {
  const timestampEl = row.querySelector(SELECTORS.messageTimestamp) as HTMLElement | null;
  const prePlain = timestampEl?.getAttribute('data-pre-plain-text') ?? '';
  const timestampMs = prePlain ? parseTimestamp(prePlain) : null;
  const media = classifyMedia(row);
  const body = timestampEl
    ? (timestampEl.querySelector(SELECTORS.messageText)?.textContent ?? '').trim()
    : '';

  if (timestampMs === null && !media && !body) return null;

  return {
    id: row.getAttribute('data-id') ?? `msg-${index}`,
    body,
    sender: prePlain ? parseSender(prePlain) : '',
    timestampMs: timestampMs ?? 0,
    isOut: Boolean(row.querySelector('[data-testid="tail-out"]')) || row.classList.contains('message-out'),
    media,
  };
}

/**
 * Collects every exported message currently rendered in the given container.
 * When no container is provided, scans the whole document (active chat panel).
 */
export function collectVisibleMessages(container: ParentNode = document): ExportedMessage[] {
  const rows = container.querySelectorAll(SELECTORS.messageRow);
  const messages: ExportedMessage[] = [];
  rows.forEach((row, index) => {
    const message = extractMessageFromRow(row as HTMLElement, index);
    if (message) messages.push(message);
  });
  return messages;
}

/**
 * Pure decision helper for the scroll-up loader: keep scrolling up while the
 * oldest rendered message is still newer than the export cutoff.
 */
export function shouldContinueLoading(
  oldestMs: number | null,
  cutoffMs: number,
  iteration: number,
  maxIterations: number
): boolean {
  if (iteration >= maxIterations) return false;
  if (oldestMs === null || oldestMs <= 0) return false;
  return oldestMs > cutoffMs;
}

/** Locates the scrollable container that holds the conversation messages. */
function findScrollContainer(): HTMLElement | null {
  const firstRow = document.querySelector(SELECTORS.messageRow);
  if (!firstRow) return null;

  let current = firstRow.parentElement;
  while (current) {
    if (current.scrollHeight > current.clientHeight) return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * Scrolls the conversation up to progressively force WhatsApp to render older
 * messages, stopping when the oldest rendered message predates the cutoff.
 */
export async function scrollMessagesToLoad(
  cutoffMs: number,
  options?: { maxIterations?: number; waitMs?: number }
): Promise<void> {
  const maxIterations = options?.maxIterations ?? 40;
  const waitMs = options?.waitMs ?? 400;
  const container = findScrollContainer();
  if (!container) return;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const messages = collectVisibleMessages();
    const oldestMs = messages.reduce<number | null>((oldest, m) => {
      if (m.timestampMs <= 0) return oldest;
      return oldest === null || m.timestampMs < oldest ? m.timestampMs : oldest;
    }, null);

    if (!shouldContinueLoading(oldestMs, cutoffMs, iteration, maxIterations)) break;

    container.scrollTop = 0;
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
  }
}