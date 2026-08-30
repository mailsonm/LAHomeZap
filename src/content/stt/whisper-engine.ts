import { pipeline, env } from '@xenova/transformers';
import type { STTResult } from '../../types';
import { decodeAudioBlobToPCM16k } from './audio-decoder';
import {
  generateAudioKey,
  getCachedTranscription,
  saveCachedTranscription,
  transcribeAudioSource,
} from './stt-engine';
// Configure transformers environment for browser-based client-side execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Crucial for Chrome extension content script: disable multi-threading/web workers
// because web.whatsapp.com does not support SharedArrayBuffer (cross-origin isolated).
if (env.backends && env.backends.onnx) {
  env.backends.onnx.logLevel = 'error';
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.proxy = false;
  }
}

const WHISPER_MODEL_ID = 'Xenova/whisper-base';
const WHISPER_PROMPT_PT =
  'Transcrição de áudio em português do Brasil: atendimento, paciente, plantão, escala, agendamento, medicamento, hospital, Hapvida, La Home Care, áudio, mensagem, atalho, botão, gravação.';

let whisperPipelinePromise: Promise<any> | null = null;

/**
 * Resets the in-memory Whisper pipeline singleton. Used primarily in test suites.
 */
export function resetWhisperPipelineForTesting(): void {
  whisperPipelinePromise = null;
}

/**
 * Loads or returns the cached Transformers.js automatic speech recognition pipeline singleton.
 */
export async function getWhisperPipeline(
  onProgress?: (progressData: any) => void
): Promise<any> {
  if (!whisperPipelinePromise) {
    const pipelinePromise = pipeline('automatic-speech-recognition', WHISPER_MODEL_ID, {
      quantized: true,
      progress_callback: onProgress,
    });

    // 180s safety timeout for initial model download on standard connections
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Tempo limite excedido ao carregar modelo Whisper. Verifique sua conexão e tente novamente.')),
        180000
      )
    );

    whisperPipelinePromise = Promise.race([pipelinePromise, timeoutPromise]).catch((err) => {
      whisperPipelinePromise = null; // reset on error so it can retry
      throw err;
    });
  }
  return whisperPipelinePromise;
}

export interface WhisperOptions {
  lang?: string;
  key?: string;
  domTranscript?: string | null;
  element?: HTMLAudioElement | null;
  durationMs?: number;
  force?: boolean;
  onProgress?: (statusText: string) => void;
  fallbackToWebSpeech?: boolean;
}

/**
 * Transcribes an audio blob directly in-memory using Whisper Web (Transformers.js),
 * reading PCM 16kHz audio data without requiring physical microphone access.
 */
export async function transcribeBlobWithWhisper(
  audioSrc: string,
  options?: WhisperOptions
): Promise<STTResult> {
  const fallbackAllowed = options?.fallbackToWebSpeech !== false;

  // 1. Instant check: If WhatsApp already has native transcript in the DOM
  if (options?.domTranscript && options.domTranscript.trim().length > 0) {
    const key = options?.key || generateAudioKey(audioSrc);
    const cleanText = options.domTranscript.trim();
    await saveCachedTranscription(key, cleanText);
    return {
      text: cleanText,
      confidence: 0.98,
      cached: false,
    };
  }

  // 2. Cache check: If previously transcribed and saved in chrome.storage.local (unless forced)
  const key = options?.key || generateAudioKey(audioSrc);
  if (!options?.force) {
    const cachedText = await getCachedTranscription(key);
    if (cachedText) {
      return {
        text: cachedText,
        cached: true,
      };
    }
  }

  try {
    // 3. Audio Decoding: Fetch blob and decode to 16kHz mono Float32Array PCM
    if (options?.onProgress) {
      options.onProgress('⏳ Decodificando áudio...');
    }

    if (
      !audioSrc ||
      typeof audioSrc !== 'string' ||
      (!audioSrc.startsWith('blob:') &&
        !audioSrc.startsWith('data:') &&
        !audioSrc.startsWith('http://') &&
        !audioSrc.startsWith('https://'))
    ) {
      throw new Error('Arquivo de áudio não encontrado ou não inicializado pelo WhatsApp.');
    }

    const pcmData = await decodeAudioBlobToPCM16k(audioSrc);
    if (!pcmData || pcmData.length === 0) {
      throw new Error('Buffer de áudio vazio ou inválido para transcrição.');
    }

    // 4. Model Loading & Inference directly in memory
    if (options?.onProgress) {
      options.onProgress('⏳ Conectando à IA Whisper...');
    }

    const transcriber = await getWhisperPipeline((progressData: any) => {
      if (!options?.onProgress || !progressData) return;
      if (progressData.status === 'progress') {
        if (progressData.total && progressData.total > 0) {
          const percent = Math.round(progressData.progress || (progressData.loaded / progressData.total) * 100);
          options.onProgress(`⏳ Baixando IA: ${percent}%`);
        } else if (progressData.loaded && progressData.loaded > 0) {
          const mb = (progressData.loaded / (1024 * 1024)).toFixed(1);
          options.onProgress(`⏳ Baixando IA: ${mb} MB...`);
        }
      } else if (progressData.status === 'initiate' || progressData.status === 'download') {
        options.onProgress('⏳ Baixando modelo de voz...');
      } else if (progressData.status === 'done' || progressData.status === 'ready') {
        options.onProgress('⏳ Inicializando IA...');
      }
    });

    if (options?.onProgress) {
      options.onProgress('⏳ Transcrevendo áudio com IA...');
    }

    const output = await transcriber(pcmData, {
      language: options?.lang === 'en' ? 'english' : 'portuguese',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      temperature: 0.0,
      initial_prompt: WHISPER_PROMPT_PT,
    });

    const rawText = typeof output?.text === 'string' ? output.text : '';
    const finalText = (typeof rawText === 'string' ? rawText : '').trim() || 'Nenhuma fala detectada.';

    // 6. Save in local cache (only if valid speech detected)
    if (finalText && finalText !== 'Nenhuma fala detectada.' && !finalText.startsWith('Erro')) {
      await saveCachedTranscription(key, finalText);
    }

    return {
      text: finalText,
      confidence: 0.95,
      cached: false,
    };
  } catch (err: any) {
    console.warn('[La Home Zap STT] Whisper pipeline error:', err);

    // 7. Graceful fallback to Web Speech API if audio element or valid source is available
    if (fallbackAllowed && (options?.element || (audioSrc && audioSrc.startsWith('blob:')))) {
      if (options?.onProgress) {
        options.onProgress('⏳ Usando fallback de voz...');
      }
      return transcribeAudioSource(audioSrc, {
        lang: options?.lang || 'pt-BR',
        key,
        element: options?.element,
        domTranscript: options?.domTranscript,
        durationMs: options?.durationMs,
        onProgress: options?.onProgress,
      });
    }

    return {
      text: `Erro ao transcrever: ${err?.message || 'erro interno'}`,
      confidence: 0,
      cached: false,
    };
  }
}
