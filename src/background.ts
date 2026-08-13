/**
 * La Home Zap — Background Service Worker
 *
 * Schedules the automatic daily conversation export using chrome.alarms and
 * dispatches a message to the WhatsApp Web content script when it fires.
 * Downloads are handled by the content script itself.
 */

import {
  DEFAULT_EXPORT_CONFIG,
  EXPORT_ALARM_NAME,
  EXPORT_DOWNLOAD_MESSAGE_TYPE,
  EXPORT_DOWNLOAD_SUBDIR,
  EXPORT_MESSAGE_TYPE,
  EXPORT_SYNC_MESSAGE_TYPE,
  STORAGE_KEYS,
} from './constants';
import type { ExportConfig } from './types';
import { computeNextRunMs } from './content/export/schedule';
import { htmlToDataUrl } from './content/export/download';

const ALARM_PERIOD_MINUTES = 24 * 60;
const WHATSAPP_WEB_URL = 'https://web.whatsapp.com/*';

/** Reads the saved export config (falling back to defaults). */
async function readExportConfig(): Promise<ExportConfig> {
  const stored = await chrome.storage.sync.get([STORAGE_KEYS.exportConfig]);
  const raw = stored[STORAGE_KEYS.exportConfig] as Partial<ExportConfig> | undefined;
  return { ...DEFAULT_EXPORT_CONFIG, ...raw };
}

/** Creates or clears the daily alarm to match the current config. */
async function syncDailyExportAlarm(): Promise<void> {
  const config = await readExportConfig();

  if (config.enabled) {
    const when = computeNextRunMs(config.hour, config.minute, Date.now());
    await chrome.alarms.create(EXPORT_ALARM_NAME, {
      when,
      periodInMinutes: ALARM_PERIOD_MINUTES,
    });
    console.log(`[La Home Zap] Daily export scheduled for ${new Date(when).toLocaleString()}.`);
  } else {
    await chrome.alarms.clear(EXPORT_ALARM_NAME);
    console.log('[La Home Zap] Daily export disabled.');
  }
}

/** Locates an open WhatsApp Web tab to receive the export message. */
async function findWhatsAppTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: WHATSAPP_WEB_URL });
  return tabs.find((tab) => tab.id !== undefined) ?? null;
}

/** Tells the content script to run the daily export pipeline. */
async function triggerDailyExport(): Promise<void> {
  const tab = await findWhatsAppTab();
  if (!tab || tab.id === undefined) {
    console.log('[La Home Zap] Daily export skipped: WhatsApp Web is not open.');
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: EXPORT_MESSAGE_TYPE });
  } catch (error) {
    console.warn('[La Home Zap] Daily export could not reach the content script:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  syncDailyExportAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  syncDailyExportAlarm();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[STORAGE_KEYS.exportConfig]) {
    syncDailyExportAlarm();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === EXPORT_ALARM_NAME) {
    triggerDailyExport();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === EXPORT_SYNC_MESSAGE_TYPE) {
    syncDailyExportAlarm().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === EXPORT_DOWNLOAD_MESSAGE_TYPE && message.html && message.filename) {
    htmlToDataUrl(message.html)
      .then((dataUrl) => {
        const subdir = message.subdir ?? EXPORT_DOWNLOAD_SUBDIR;
        chrome.downloads.download(
          {
            url: dataUrl,
            filename: subdir ? `${subdir}/${message.filename}` : message.filename,
            saveAs: false,
            conflictAction: 'uniquify',
          },
          () => sendResponse({ ok: true })
        );
      })
      .catch((err) => {
        console.error('[La Home Zap] Background download failed:', err);
        sendResponse({ ok: false });
      });
    return true;
  }

  return undefined;
});