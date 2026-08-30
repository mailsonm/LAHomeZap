/**
 * Daily export pipeline shared by the manual sidebar flow and the automatic
 * background alarm. Scans the chatlist, opens each candidate chat, extracts
 * the messages inside the 24h window and builds the printable HTML reports.
 */

import type { Attendant, ExportResultFile, ExportedMessage } from '../../types';
import { EXPORT_WINDOW_MS, FALLBACK_ATTENDANT_NAME, STORAGE_KEYS } from '../../constants';
import { storageGet } from '../../utils/storage';
import { getActiveChatName } from '../dom-helpers';
import { scanActiveChatsFromChatlist, openChatByName, areChatNamesMatching } from './active-chats';
import {
  collectVisibleMessages,
  isWithinLast24h,
  scrollMessagesToLoad,
  resolveMessagesMedia,
} from './extract-messages';
import { buildHtmlReport } from './html-report';
import { buildExportFilename, sanitizeFilename } from './download';

export interface ExportProgress {
  chatName: string;
  status: 'collecting' | 'exported' | 'empty' | 'error';
  messageCount: number;
}

export interface DailyExportOutcome {
  files: ExportResultFile[];
  skipped: string[];
  errors: string[];
}

/** Merges historical messages with newly collected messages, avoiding duplicates. */
export function mergeExportedMessages(
  existing: ExportedMessage[],
  incoming: ExportedMessage[]
): ExportedMessage[] {
  const seen = new Set<string>();
  const result: ExportedMessage[] = [];

  const makeKey = (m: ExportedMessage) =>
    m.id && !m.id.startsWith('msg-')
      ? m.id
      : `${m.timestampMs}_${m.sender}_${m.body}_${m.media ?? ''}`;

  for (const msg of existing) {
    const key = makeKey(msg);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(msg);
    }
  }

  for (const msg of incoming) {
    const key = makeKey(msg);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(msg);
    } else {
      const existingIdx = result.findIndex((r) => makeKey(r) === key);
      if (existingIdx >= 0 && msg.mediaSrc && !result[existingIdx].mediaSrc) {
        result[existingIdx] = { ...result[existingIdx], mediaSrc: msg.mediaSrc };
      }
    }
  }

  return result.sort((a, b) => a.timestampMs - b.timestampMs);
}

/** Reads stored cumulative export history for a specific chat from chrome.storage.local. */
export async function getStoredChatHistory(chatName: string): Promise<ExportedMessage[]> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const key = `export_history_${sanitizeFilename(chatName)}`;
      const data = await chrome.storage.local.get([key]);
      return (data[key] as ExportedMessage[]) || [];
    }
  } catch {
    // Fallback if storage fails
  }
  return [];
}

/** Saves cumulative export history for a specific chat in chrome.storage.local. */
export async function saveStoredChatHistory(
  chatName: string,
  messages: ExportedMessage[]
): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const key = `export_history_${sanitizeFilename(chatName)}`;
      await chrome.storage.local.set({ [key]: messages });
    }
  } catch {
    // Fallback
  }
}

/** Resolves the attendant name to print on the reports. */
async function resolveExportedBy(): Promise<string> {
  try {
    const [attendants, activeAttendant] = await Promise.all([
      storageGet<Attendant[]>(STORAGE_KEYS.attendants),
      storageGet<string>(STORAGE_KEYS.activeAttendant),
    ]);
    if (activeAttendant) return activeAttendant;
    const favorite = attendants?.find((a) => a.isFavorite);
    return favorite?.name ?? FALLBACK_ATTENDANT_NAME;
  } catch {
    return FALLBACK_ATTENDANT_NAME;
  }
}

/** Polls until the active chat header matches the expected chat name. */
function waitForChatOpen(name: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      const active = getActiveChatName();
      if (active && areChatNamesMatching(active, name)) {
        resolve(true);
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });
}

/**
 * Runs the full export pipeline for chats with activity in the last 24h.
 */
export async function runDailyExport(
  options: {
    now?: number;
    waitForChatOpenTimeout?: number;
    onProgress?: (progress: ExportProgress) => void;
  } = {}
): Promise<DailyExportOutcome> {
  const nowMs = options.now ?? Date.now();
  const waitTimeout = options.waitForChatOpenTimeout ?? 8000;
  const cutoffMs = nowMs - EXPORT_WINDOW_MS;
  const exportedBy = await resolveExportedBy();
  const candidates = scanActiveChatsFromChatlist(nowMs);

  const outcome: DailyExportOutcome = { files: [], skipped: [], errors: [] };

  for (const candidate of candidates) {
    options.onProgress?.({ chatName: candidate.name, status: 'collecting', messageCount: 0 });

    try {
      if (!openChatByName(candidate.name)) {
        throw new Error('chat not found in chatlist');
      }
      const opened = await waitForChatOpen(candidate.name, waitTimeout);
      if (!opened) {
        throw new Error('timeout waiting for chat to open');
      }

      await scrollMessagesToLoad(cutoffMs, { exportedBy });

      const rawMessages = collectVisibleMessages(document, {
        nowMs,
        activeChatName: candidate.name,
        exportedBy,
      })
        .filter((m) => isWithinLast24h(m.timestampMs, nowMs))
        .sort((a, b) => a.timestampMs - b.timestampMs);

      if (rawMessages.length === 0) {
        outcome.skipped.push(candidate.name);
        options.onProgress?.({ chatName: candidate.name, status: 'empty', messageCount: 0 });
        continue;
      }

      // Resolve any blob URLs to persistent base64 Data URLs
      const currentMessages = await resolveMessagesMedia(rawMessages);

      // Merge with previously exported history for this chat
      const previousMessages = await getStoredChatHistory(candidate.name);
      const combinedMessages = mergeExportedMessages(previousMessages, currentMessages);
      await saveStoredChatHistory(candidate.name, combinedMessages);

      const html = buildHtmlReport(candidate.name, combinedMessages, {
        exportedAt: new Date(nowMs),
        exportedBy,
      });

      outcome.files.push({
        chatName: candidate.name,
        filename: buildExportFilename(candidate.name, new Date(nowMs)),
        html,
        messageCount: combinedMessages.length,
      });
      options.onProgress?.({
        chatName: candidate.name,
        status: 'exported',
        messageCount: combinedMessages.length,
      });
    } catch (error) {
      outcome.errors.push(candidate.name);
      options.onProgress?.({ chatName: candidate.name, status: 'error', messageCount: 0 });
      console.warn(`[La Home Zap] Export failed for chat "${candidate.name}":`, error);
    }
  }

  return outcome;
}