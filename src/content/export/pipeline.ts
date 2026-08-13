/**
 * Daily export pipeline shared by the manual sidebar flow and the automatic
 * background alarm. Scans the chatlist, opens each candidate chat, extracts
 * the messages inside the 24h window and builds the printable HTML reports.
 */

import type { Attendant, ExportResultFile } from '../../types';
import { EXPORT_WINDOW_MS, FALLBACK_ATTENDANT_NAME, STORAGE_KEYS } from '../../constants';
import { storageGet } from '../../utils/storage';
import { getActiveChatName } from '../dom-helpers';
import { scanActiveChatsFromChatlist, openChatByName, areChatNamesMatching } from './active-chats';
import { collectVisibleMessages, isWithinLast24h, scrollMessagesToLoad } from './extract-messages';
import { buildHtmlReport } from './html-report';
import { buildExportFilename } from './download';
import { logExportDiagnostics, runChatSwitchProbe } from './diagnostics';

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

  // TEMPORARY diagnostics: dump live DOM facts at the start of the run.
  logExportDiagnostics('run start');
  // TEMPORARY: probe only runs against the new WhatsApp DOM structure, and
  // picks a chat that is NOT already open so the switch is actually exercised.
  if (candidates.length > 0 && document.querySelector('[data-testid="msg-container"]')) {
    const active = getActiveChatName();
    const target = candidates.find((c) => !areChatNamesMatching(c.name, active)) ?? candidates[0];
    await runChatSwitchProbe(target.name);
  }

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

      await scrollMessagesToLoad(cutoffMs);

      const messages = collectVisibleMessages()
        .filter((m) => isWithinLast24h(m.timestampMs, nowMs))
        .sort((a, b) => a.timestampMs - b.timestampMs);

      if (messages.length === 0) {
        outcome.skipped.push(candidate.name);
        options.onProgress?.({ chatName: candidate.name, status: 'empty', messageCount: 0 });
        continue;
      }

      const html = buildHtmlReport(candidate.name, messages, {
        exportedAt: new Date(nowMs),
        exportedBy,
      });

      outcome.files.push({
        chatName: candidate.name,
        filename: buildExportFilename(candidate.name, new Date(nowMs)),
        html,
        messageCount: messages.length,
      });
      options.onProgress?.({
        chatName: candidate.name,
        status: 'exported',
        messageCount: messages.length,
      });
    } catch (error) {
      outcome.errors.push(candidate.name);
      options.onProgress?.({ chatName: candidate.name, status: 'error', messageCount: 0 });
      // TEMPORARY diagnostics: dump live DOM facts when a chat fails to open.
      logExportDiagnostics(`failed — ${candidate.name}`);
      console.warn(`[La Home Zap] Export failed for chat "${candidate.name}":`, error);
    }
  }

  return outcome;
}