/**
 * La Home Zap — Background Service Worker
 *
 * Schedules the automatic daily conversation export using chrome.alarms and
 * dispatches a message to the WhatsApp Web content script when it fires.
 * Downloads are handled by the content script itself.
 * Runs Whisper Web (Transformers.js) in the background with full extension network permissions.
 */

import { pipeline, env } from '@xenova/transformers';
import {
  DEFAULT_EXPORT_CONFIG,
  EXPORT_ALARM_NAME,
  EXPORT_DOWNLOAD_MESSAGE_TYPE,
  EXPORT_DOWNLOAD_SUBDIR,
  EXPORT_MESSAGE_TYPE,
  EXPORT_SYNC_MESSAGE_TYPE,
  WHISPER_TRANSCRIBE_MESSAGE_TYPE,
  STORAGE_KEYS,
} from './constants';
import type { ExportConfig } from './types';
import { computeNextRunMs } from './content/export/schedule';
import { htmlToDataUrl } from './content/export/download';

// Configure transformers environment for service worker context
env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends?.onnx) {
  env.backends.onnx.logLevel = 'error';
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.proxy = false;
  }
}

const WHISPER_PROMPT_PT =
  'Transcrição de áudio em português do Brasil: atendimento, paciente, plantão, escala, agendamento, medicamento, hospital, Hapvida, La Home Care, áudio, mensagem, atalho, botão, gravação.';

let bgWhisperPipelinePromise: Promise<any> | null = null;

async function getBgWhisperPipeline(): Promise<any> {
  if (!bgWhisperPipelinePromise) {
    bgWhisperPipelinePromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
      quantized: true,
    }).catch((err) => {
      bgWhisperPipelinePromise = null;
      throw err;
    });
  }
  return bgWhisperPipelinePromise;
}

export async function runBgWhisperInference(pcmArray: number[] | Float32Array, lang = 'portuguese'): Promise<string> {
  const pcm = pcmArray instanceof Float32Array ? pcmArray : new Float32Array(pcmArray);
  const transcriber = await getBgWhisperPipeline();
  const output = await transcriber(pcm, {
    language: lang,
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
    temperature: 0.0,
    initial_prompt: WHISPER_PROMPT_PT,
  });
  return (typeof output?.text === 'string' ? output.text : '').trim();
}

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

if (typeof chrome !== 'undefined') {
  chrome.runtime?.onInstalled?.addListener(() => {
    syncDailyExportAlarm();
  });

  chrome.runtime?.onStartup?.addListener(() => {
    syncDailyExportAlarm();
  });

  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[STORAGE_KEYS.exportConfig]) {
      syncDailyExportAlarm();
    }
  });

  chrome.alarms?.onAlarm?.addListener((alarm) => {
    if (alarm.name === EXPORT_ALARM_NAME) {
      triggerDailyExport();
    }
  });

  chrome.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
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
              conflictAction: 'overwrite',
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

    if (message?.type === WHISPER_TRANSCRIBE_MESSAGE_TYPE && message.pcm) {
      runBgWhisperInference(message.pcm, message.lang || 'portuguese')
        .then((text) => {
          sendResponse({ success: true, text });
        })
        .catch((err) => {
          console.error('[La Home Zap Background] Whisper inference error:', err);
          sendResponse({ success: false, error: err?.message || 'Inference error' });
        });
      return true;
    }

    return undefined;
  });
}