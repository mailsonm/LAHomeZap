/**
 * Chatlist scanning to identify conversations with activity in the export
 * window. The chatlist is read first (fast) and each candidate is later opened
 * for the authoritative message-level verification.
 */

import { EXPORT_WINDOW_MS } from '../../constants';
import { SELECTORS } from '../../utils/selectors';

export interface ChatCandidate {
  name: string;
  timestampMs: number | null;
  isAmbiguous: boolean;
}

const TIME_REGEX = /^(\d{1,2}):(\d{2})(?:\s*([ap]\.?m\.?))?$/i;
const YESTERDAY_LABELS = new Set(['ontem', 'ayer', 'yesterday']);

/**
 * Parses the last-message timestamp shown in a chatlist row.
 * - "HH:mm" / "h:mm AM/PM" resolves to today at that hour (exact).
 * - "Ontem" / "Yesterday" resolves as an ambiguous candidate (verification needed).
 * - Weekdays and dates are NOT 24h candidates and return null.
 */
export function parseChatlistTime(
  text: string,
  nowMs: number
): { timestampMs: number | null; isAmbiguous: boolean } | null {
  const clean = (text || '').trim();
  if (!clean) return null;

  const timeMatch = clean.match(TIME_REGEX);
  if (timeMatch) {
    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const ampm = timeMatch[3]?.toLowerCase().replace(/\./g, '');

    if (ampm === 'pm' && hours < 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }

    const now = new Date(nowMs);
    let timestampMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0
    ).getTime();

    // Adjust if clock jitter or timezone puts calculated timestamp in the future (more than 4 hours ahead)
    if (timestampMs > nowMs + 4 * 60 * 60 * 1000) {
      timestampMs -= 24 * 60 * 60 * 1000;
    }

    return { timestampMs, isAmbiguous: false };
  }

  const lower = clean.toLowerCase();
  if (YESTERDAY_LABELS.has(lower)) {
    return { timestampMs: null, isAmbiguous: true };
  }

  return null;
}

/**
 * Decides whether a candidate chat should be opened for verification.
 * Only chats with a recent time (< 24h) or "Ontem" are included.
 * Weekdays and dates are excluded.
 */
export function shouldIncludeCandidate(
  candidate: ChatCandidate,
  nowMs: number,
  windowMs: number
): boolean {
  if (!candidate.name) return false;
  if (candidate.timestampMs === null) return candidate.isAmbiguous;
  const elapsed = nowMs - candidate.timestampMs;
  return elapsed >= -5 * 60 * 1000 && elapsed <= windowMs;
}

/**
 * Extracts the primary visible title of a chatlist row.
 * Prefers visible textContent over the title attribute so contact names take
 * precedence over hidden/tooltip phone numbers.
 */
export function getChatlistRowName(row: Element): string {
  const titleEl =
    row.querySelector('[data-testid="chat-title"]') ??
    row.querySelector(SELECTORS.chatlistRowName);

  if (!titleEl) return '';

  const visibleText = titleEl.textContent?.trim();
  if (visibleText) return visibleText;

  const titleAttr = titleEl.getAttribute('title')?.trim();
  return titleAttr ?? '';
}

/**
 * Compares two chat/contact names for equivalence.
 * Handles exact matches, case/whitespace normalization, phone number digit matching,
 * and substring containment.
 */
export function areChatNamesMatching(
  nameA: string | null | undefined,
  nameB: string | null | undefined
): boolean {
  if (!nameA || !nameB) return false;

  const cleanA = nameA.trim().replace(/\s+/g, ' ');
  const cleanB = nameB.trim().replace(/\s+/g, ' ');
  if (cleanA.toLowerCase() === cleanB.toLowerCase()) return true;

  // Extract phone digits if present
  const digitsA = cleanA.replace(/\D/g, '');
  const digitsB = cleanB.replace(/\D/g, '');
  if (digitsA.length >= 8 && digitsB.length >= 8 && digitsA === digitsB) {
    return true;
  }

  // Substring match for contact name variations
  const lowerA = cleanA.toLowerCase();
  const lowerB = cleanB.toLowerCase();
  if (lowerA.length >= 3 && lowerB.length >= 3 && (lowerA.includes(lowerB) || lowerB.includes(lowerA))) {
    return true;
  }

  return false;
}

/** Scans the WhatsApp chatlist and returns candidate chats with recent activity. */
export function scanActiveChatsFromChatlist(
  nowMs: number,
  windowMs: number = EXPORT_WINDOW_MS
): ChatCandidate[] {
  const rows = document.querySelectorAll(SELECTORS.chatlistRow);
  const candidates: ChatCandidate[] = [];

  rows.forEach((row) => {
    const name = getChatlistRowName(row);
    if (!name) return;

    let parsed: { timestampMs: number | null; isAmbiguous: boolean } | null = null;
    const spans = Array.from(row.querySelectorAll('span'));
    for (let i = spans.length - 1; i >= 0; i -= 1) {
      parsed = parseChatlistTime(spans[i]?.textContent ?? '', nowMs);
      if (parsed) break;
    }

    const hasUnread = Boolean(
      row.querySelector('[aria-label*="não lida"], [aria-label*="unread"], [data-testid*="unread"]')
    );

    const candidate: ChatCandidate = {
      name,
      timestampMs: parsed?.timestampMs ?? null,
      isAmbiguous: parsed?.isAmbiguous ?? hasUnread,
    };

    if (shouldIncludeCandidate(candidate, nowMs, windowMs)) {
      candidates.push(candidate);
    }
  });

  return candidates;
}

/**
 * Dispatches the native mouse/pointer sequence WhatsApp Web listens to for
 * opening a chat. A plain element.click() no longer triggers the new chat list
 * UI, but the full pointerdown -> mousedown -> mouseup -> click sequence works.
 */
function dispatchRowClick(row: HTMLElement): void {
  const opts: MouseEventInit = { bubbles: true, cancelable: true };
  try {
    row.dispatchEvent(new PointerEvent('pointerdown', opts));
    row.dispatchEvent(new MouseEvent('mousedown', opts));
    row.dispatchEvent(new MouseEvent('mouseup', opts));
    row.dispatchEvent(new MouseEvent('click', opts));
  } catch {
    row.dispatchEvent(new MouseEvent('mousedown', opts));
    row.dispatchEvent(new MouseEvent('mouseup', opts));
    row.dispatchEvent(new MouseEvent('click', opts));
  }
}

/** Opens (activates) the chatlist row whose title matches the target chat name. */
export function openChatByName(name: string): boolean {
  const rows = document.querySelectorAll(SELECTORS.chatlistRow);
  for (const row of rows) {
    const rowName = getChatlistRowName(row);
    if (areChatNamesMatching(rowName, name)) {
      dispatchRowClick(row as HTMLElement);
      return true;
    }
  }
  return false;
}