/**
 * Message extraction from the active WhatsApp Web conversation DOM.
 *
 * Relies on the `data-pre-plain-text` attribute that WhatsApp injects into each
 * message bubble (format: "[hh:mm, dd/MM/yyyy] Sender: "). This yields the
 * timestamp and the sender without depending on WhatsApp's internal Store.
 * Provides resilient fallbacks for media (audio/video/image) and multiple date/time locales.
 */

import type { ExportedMessage, MediaKind } from '../../types';
import { EXPORT_WINDOW_MS } from '../../constants';
import { SELECTORS } from '../../utils/selectors';
import { areChatNamesMatching } from './active-chats';

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
  if (!prePlainText) return null;
  // Normalize unicode spaces (\u00a0, \u202f, etc.) to standard space
  const clean = prePlainText.replace(/[\s\u00a0\u202f]+/g, ' ').trim();
  const bracketMatch = clean.match(/\[(.*?)\]/);
  const inside = bracketMatch ? bracketMatch[1].trim() : clean;

  // Extract time component: HH:mm with optional AM/PM
  const timeMatch = inside.match(/(\d{1,2})[:.](\d{2})(?:\s*([ap]\.?m\.?))?/i);
  if (!timeMatch) return null;

  let hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);
  const ampm = timeMatch[3]?.toLowerCase().replace(/\./g, '');
  if (ampm === 'pm' && hh < 12) hh += 12;
  else if (ampm === 'am' && hh === 12) hh = 0;

  // ISO date format: YYYY-MM-DD
  const isoMatch = inside.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (isoMatch) {
    const yyyy = Number(isoMatch[1]);
    const mo = Number(isoMatch[2]);
    const dd = Number(isoMatch[3]);
    return new Date(yyyy, mo - 1, dd, hh, mm, 0, 0).getTime();
  }

  // Day/Month/Year or Month/Day/Year format
  const dmyMatch = inside.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dmyMatch) {
    const p1 = Number(dmyMatch[1]);
    const p2 = Number(dmyMatch[2]);
    const rawYyyy = Number(dmyMatch[3]);
    const yyyy = rawYyyy < 100 ? 2000 + rawYyyy : rawYyyy;

    let dd = p1;
    let mo = p2;
    if (mo > 12 && dd <= 12) {
      dd = p2;
      mo = p1;
    }
    return new Date(yyyy, mo - 1, dd, hh, mm, 0, 0).getTime();
  }

  return null;
}

/** Parses visible time string (e.g. "10:07 AM" or "18:23") into ms for a reference date. */
export function parseTimeOnly(text: string, refDateMs: number = Date.now()): number | null {
  if (!text) return null;
  const clean = text.replace(/[\s\u00a0\u202f]+/g, ' ').trim();
  const match = clean.match(/(\d{1,2})[:.](\d{2})(?:\s*([ap]\.?m\.?))?/i);
  if (!match) return null;

  let hh = Number(match[1]);
  const mm = Number(match[2]);
  const ampm = match[3]?.toLowerCase().replace(/\./g, '');
  if (ampm === 'pm' && hh < 12) hh += 12;
  else if (ampm === 'am' && hh === 12) hh = 0;

  const ref = new Date(refDateMs);
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), hh, mm, 0, 0).getTime();
}

/** Parses text from a date divider bubble (e.g. "27/11/2025", "Hoje", "Ontem"). */
export function parseDateDivider(text: string, nowMs: number): number | null {
  if (!text) return null;
  const clean = text.replace(/[\s\u00a0\u202f]+/g, ' ').trim().toLowerCase();
  if (clean === 'hoje' || clean === 'today') {
    return nowMs;
  }
  if (clean === 'ontem' || clean === 'yesterday') {
    return nowMs - 24 * 60 * 60 * 1000;
  }

  const isoMatch = clean.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (isoMatch) {
    const yyyy = Number(isoMatch[1]);
    const mo = Number(isoMatch[2]);
    const dd = Number(isoMatch[3]);
    return new Date(yyyy, mo - 1, dd, 12, 0, 0, 0).getTime();
  }

  const dmyMatch = clean.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dmyMatch) {
    const p1 = Number(dmyMatch[1]);
    const p2 = Number(dmyMatch[2]);
    const rawYyyy = Number(dmyMatch[3]);
    const yyyy = rawYyyy < 100 ? 2000 + rawYyyy : rawYyyy;
    let dd = p1;
    let mo = p2;
    if (mo > 12 && dd <= 12) {
      dd = p2;
      mo = p1;
    }
    return new Date(yyyy, mo - 1, dd, 12, 0, 0, 0).getTime();
  }

  return null;
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
 * Uses a best-effort heuristic based on data-icon attributes, aria labels and native tags.
 */
export function classifyMedia(row: HTMLElement): MediaKind | null {
  if (row.querySelector('audio')) return 'audio';
  if (row.querySelector('video')) return 'video';

  // Audio elements, buttons, aria-labels and icons in WhatsApp Web
  if (
    row.querySelector(
      '[data-testid="audio-player"], [data-testid="audio-play"], [data-testid="ptt-draft-play"], [data-testid="ptt-play"], button[aria-label*="Reproduzir" i], button[aria-label*="Play" i], button[aria-label*="áudio" i], button[aria-label*="audio" i], div[aria-label*="áudio" i], div[aria-label*="audio" i], span[data-icon*="audio"], span[data-icon*="ptt"], span[data-icon*="waveform"], span[data-icon*="mic"]'
    )
  ) {
    return 'audio';
  }

  if (row.querySelector('span[data-icon*="video"]')) return 'video';
  if (row.querySelector('span[data-icon*="image"], span[data-icon*="camera"]')) return 'image';
  if (row.querySelector('span[data-icon*="document"], [data-testid="document-title"]')) return 'document';

  for (const [kind, icons] of MEDIA_ICON_KIND) {
    for (const icon of icons) {
      if (row.querySelector(`span[data-icon="${icon}"]`)) return kind;
    }
  }

  if (row.querySelector('img[src]')) return 'image';
  return null;
}

/**
 * Determines whether a message was sent by the attendant/business (outgoing) or received (incoming).
 */
export function determineMessageDirection(params: {
  row: HTMLElement;
  prePlainSender: string;
  activeChatName?: string;
  exportedBy?: string;
}): boolean {
  const { row, prePlainSender, activeChatName, exportedBy } = params;

  // 1. Explicit DOM tail selectors
  if (row.querySelector('[data-testid="tail-out"]')) return true;
  if (row.querySelector('[data-testid="tail-in"]')) return false;

  // 2. Read receipts / checkmarks (strictly present ONLY on outgoing messages in WhatsApp)
  const hasCheckmarks = Boolean(
    row.querySelector(
      'span[data-icon="msg-dblcheck"], span[data-icon="msg-check"], span[data-icon="msg-time"], span[data-icon="msg-dblcheck-ack"], span[data-icon="msg-check-light"], span[data-icon*="dblcheck"], span[data-icon*="check"]'
    )
  );
  if (hasCheckmarks) return true;

  // 3. Class markers
  if (
    row.classList.contains('message-out') ||
    Boolean(row.querySelector('.message-out')) ||
    row.className.includes('message-out')
  ) {
    return true;
  }
  if (
    row.classList.contains('message-in') ||
    Boolean(row.querySelector('.message-in')) ||
    row.className.includes('message-in')
  ) {
    return false;
  }

  // 4. Sender identity
  const cleanSender = (prePlainSender || '').trim().toLowerCase();
  if (cleanSender === 'você' || cleanSender === 'you') return true;

  if (exportedBy && cleanSender && cleanSender === exportedBy.trim().toLowerCase()) {
    return true;
  }

  // 5. In 1:1 chats, if prePlainSender does NOT match activeChatName, it is from the attendant/business
  if (activeChatName && prePlainSender) {
    if (areChatNamesMatching(prePlainSender, activeChatName)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Converts a single message DOM row into an ExportedMessage.
 * Returns null when the row carries no timestamp, media or text (e.g. dividers).
 */
export function extractMessageFromRow(
  row: HTMLElement,
  index: number,
  options?: { nowMs?: number; currentDateMs?: number; activeChatName?: string; exportedBy?: string }
): ExportedMessage | null {
  const timestampEl = (row.hasAttribute('data-pre-plain-text')
    ? row
    : row.querySelector(SELECTORS.messageTimestamp)) as HTMLElement | null;
  const prePlain = timestampEl?.getAttribute('data-pre-plain-text') ?? '';
  let timestampMs = prePlain ? parseTimestamp(prePlain) : null;

  const media = classifyMedia(row);
  let body = (
    row.querySelector(SELECTORS.messageText)?.textContent ||
    timestampEl?.querySelector(SELECTORS.messageText)?.textContent ||
    ''
  ).trim();

  // Fallback for timestamps when data-pre-plain-text is absent (e.g. audio/media messages)
  if (timestampMs === null) {
    const metaEl = row.querySelector(SELECTORS.messageMeta) || row.querySelector('span[dir="auto"]');
    const metaText = metaEl?.textContent?.trim() ?? '';
    if (metaText) {
      const refDateMs = options?.currentDateMs ?? options?.nowMs ?? Date.now();
      timestampMs = parseTimeOnly(metaText, refDateMs);
    }
  }

  if (timestampMs === null && !media && !body) return null;

  const prePlainSender = prePlain ? parseSender(prePlain) : '';
  const isVoce = prePlainSender.toLowerCase() === 'você' || prePlainSender.toLowerCase() === 'you';

  const isOut = determineMessageDirection({
    row,
    prePlainSender,
    activeChatName: options?.activeChatName,
    exportedBy: options?.exportedBy,
  });

  let sender = '';
  if (isOut) {
    sender = prePlainSender && !isVoce ? prePlainSender : (options?.exportedBy || prePlainSender || 'Você');
  } else {
    sender =
      prePlainSender ||
      row.querySelector('[data-testid="author"], span[class*="author"]')?.textContent?.trim() ||
      options?.activeChatName ||
      '';
  }

  // Media source extraction (Image, Audio, Video, Document)
  let mediaSrc: string | undefined;
  let documentName: string | undefined;
  let documentSize: string | undefined;
  let transcription: string | undefined;

  if (media === 'image') {
    const img = row.querySelector('img') as HTMLImageElement | null;
    if (img?.src) {
      if (img.src.startsWith('data:')) {
        mediaSrc = img.src;
      } else {
        try {
          if (img.complete && img.naturalWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              mediaSrc = canvas.toDataURL('image/jpeg', 0.85);
            }
          }
        } catch {
          // Fallback
        }
        if (!mediaSrc) {
          mediaSrc = img.src;
        }
      }
    }
  } else if (media === 'audio') {
    const audio = row.querySelector('audio') as HTMLAudioElement | null;
    const audioSrc = audio?.src || audio?.currentSrc || (audio?.querySelector('source') as HTMLSourceElement)?.src;
    if (audioSrc) {
      mediaSrc = audioSrc;
    }
    const transcriptionEl = row.querySelector('.stt-transcription-text, [data-transcription]');
    if (transcriptionEl) {
      transcription = (transcriptionEl.getAttribute('data-transcription') || transcriptionEl.textContent || '').trim();
    }
    // Extract audio duration (e.g. 0:14) if body is empty
    if (!body) {
      const durationMatch = row.textContent?.match(/\b(\d{1,2}:\d{2})\b/);
      if (durationMatch) {
        body = durationMatch[1];
      }
    }
  } else if (media === 'video') {
    const video = row.querySelector('video') as HTMLVideoElement | null;
    const videoSrc = video?.src || video?.currentSrc || (video?.querySelector('source') as HTMLSourceElement)?.src;
    if (videoSrc) {
      mediaSrc = videoSrc;
    }
  } else if (media === 'document') {
    const titleWithAttr = row.querySelector('[data-testid="document-title"], span[title], a[download]');
    let docTitle = titleWithAttr?.getAttribute('title') || titleWithAttr?.getAttribute('download');
    
    if (!docTitle) {
      const candidates = row.querySelectorAll('span[dir="auto"], span.selectable-text, div[role="button"] span');
      for (const el of candidates) {
        const text = el.textContent?.trim() || '';
        if (/\.(pdf|docx?|xlsx?|pptx?|txt|zip|rar|csv)$/i.test(text)) {
          docTitle = text;
          break;
        }
      }
    }
    
    if (!docTitle && titleWithAttr) {
      docTitle = titleWithAttr.textContent?.trim();
    }

    documentName = docTitle || undefined;

    const sizeEl = row.querySelector('[data-testid="document-size"], span[class*="document-size"]');
    documentSize = sizeEl?.textContent?.trim() || undefined;

    const docLink = row.querySelector('a[href]') as HTMLAnchorElement | null;
    if (docLink?.href) {
      mediaSrc = docLink.href;
    }
  }

  return {
    id: row.getAttribute('data-id') ?? `msg-${index}`,
    body,
    sender,
    timestampMs: timestampMs ?? 0,
    isOut,
    media,
    mediaSrc,
    documentName,
    documentSize,
    transcription,
  };
}

/** Converts a live blob: URL into a standalone base64 Data URL. */
export async function convertBlobUrlToDataUrl(blobUrl: string): Promise<string> {
  if (!blobUrl || !blobUrl.startsWith('blob:')) return blobUrl;
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || blobUrl);
      reader.onerror = () => resolve(blobUrl);
      reader.readAsDataURL(blob);
    });
  } catch {
    return blobUrl;
  }
}

/** Resolves all blob URLs within exported messages into persistent base64 Data URLs. */
export async function resolveMessagesMedia(messages: ExportedMessage[]): Promise<ExportedMessage[]> {
  return Promise.all(
    messages.map(async (msg) => {
      if (msg.mediaSrc && msg.mediaSrc.startsWith('blob:')) {
        const dataUrl = await convertBlobUrlToDataUrl(msg.mediaSrc);
        return { ...msg, mediaSrc: dataUrl };
      }
      return msg;
    })
  );
}

/**
 * Collects every exported message currently rendered in the given container.
 * When no container is provided, scans the whole document (active chat panel).
 */
export function collectVisibleMessages(
  container: ParentNode = document,
  options?: { nowMs?: number; activeChatName?: string; exportedBy?: string }
): ExportedMessage[] {
  const nowMs = options?.nowMs ?? Date.now();
  let currentDateMs = nowMs;

  const messages: ExportedMessage[] = [];
  const processedRows = new Set<Element>();

  try {
    const treeWalker = document.createTreeWalker(
      container as Node,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    let currentNode = treeWalker.nextNode() as HTMLElement | null;
    while (currentNode) {
      if (!currentNode.matches(SELECTORS.messageRow)) {
        const text = currentNode.children.length === 0 ? currentNode.textContent?.trim() : '';
        if (text && text.length <= 25) {
          const parsedDivider = parseDateDivider(text, nowMs);
          if (parsedDivider !== null) {
            currentDateMs = parsedDivider;
          }
        }
      } else {
        const row = currentNode;
        if (!processedRows.has(row)) {
          processedRows.add(row);
          const message = extractMessageFromRow(row, messages.length, {
            nowMs,
            currentDateMs,
            activeChatName: options?.activeChatName,
            exportedBy: options?.exportedBy,
          });
          if (message) {
            if (message.timestampMs > 0) {
              currentDateMs = message.timestampMs;
            }
            messages.push(message);
          }
        }
      }
      currentNode = treeWalker.nextNode() as HTMLElement | null;
    }
  } catch {
    // Fallback if treeWalker is not available
  }

  if (messages.length === 0) {
    const rows = container.querySelectorAll(SELECTORS.messageRow);
    rows.forEach((row, index) => {
      const message = extractMessageFromRow(row as HTMLElement, index, {
        nowMs,
        currentDateMs,
        activeChatName: options?.activeChatName,
        exportedBy: options?.exportedBy,
      });
      if (message) messages.push(message);
    });
  }

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
  options?: { maxIterations?: number; waitMs?: number; exportedBy?: string }
): Promise<void> {
  const maxIterations = options?.maxIterations ?? 40;
  const waitMs = options?.waitMs ?? 400;
  const container = findScrollContainer();
  if (!container) return;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const messages = collectVisibleMessages(document, { exportedBy: options?.exportedBy });
    const oldestMs = messages.reduce<number | null>((oldest, m) => {
      if (m.timestampMs <= 0) return oldest;
      return oldest === null || m.timestampMs < oldest ? m.timestampMs : oldest;
    }, null);

    if (!shouldContinueLoading(oldestMs, cutoffMs, iteration, maxIterations)) break;

    container.scrollTop = 0;
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
  }
}