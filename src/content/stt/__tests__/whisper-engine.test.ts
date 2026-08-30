import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  transcribeBlobWithWhisper,
  resetWhisperPipelineForTesting,
} from '../whisper-engine';
import * as audioDecoder from '../audio-decoder';
import * as sttEngine from '../stt-engine';

// Mock @xenova/transformers
vi.mock('@xenova/transformers', () => {
  const mockPipelineFn = vi.fn().mockImplementation((_audioData, _options) => {
    return Promise.resolve({
      text: ' Olá, gostaria de confirmar o agendamento da visita médica.',
    });
  });

  return {
    pipeline: vi.fn().mockResolvedValue(mockPipelineFn),
    env: {
      allowLocalModels: false,
      useBrowserCache: true,
      backends: {
        onnx: {
          wasm: {},
        },
      },
    },
  };
});

describe('Whisper Engine (Transformers.js Client-Side)', () => {
  beforeEach(() => {
    resetWhisperPipelineForTesting();
    vi.restoreAllMocks();

    // Mock chrome.storage.local
    const storageMock: Record<string, any> = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn((keys: string[], callback: (result: Record<string, any>) => void) => {
            const res: Record<string, any> = {};
            for (const k of keys) {
              if (storageMock[k] !== undefined) res[k] = storageMock[k];
            }
            callback(res);
          }),
          set: vi.fn((items: Record<string, any>, callback?: () => void) => {
            Object.assign(storageMock, items);
            if (callback) callback();
          }),
        },
      },
    };
  });

  it('returns cached transcription immediately if available in storage', async () => {
    const key = sttEngine.generateAudioKey('blob:https://web.whatsapp.com/test-cached-1');
    await sttEngine.saveCachedTranscription(key, 'Texto transcrito em cache');

    const result = await transcribeBlobWithWhisper('blob:https://web.whatsapp.com/test-cached-1');
    expect(result.text).toBe('Texto transcrito em cache');
    expect(result.cached).toBe(true);
  });

  it('uses native DOM transcript immediately when provided', async () => {
    const result = await transcribeBlobWithWhisper('blob:https://web.whatsapp.com/test-native-1', {
      domTranscript: 'Transcrição nativa do WhatsApp',
    });
    expect(result.text).toBe('Transcrição nativa do WhatsApp');
    expect(result.cached).toBe(false);

    // Verify cache was saved
    const key = sttEngine.generateAudioKey('blob:https://web.whatsapp.com/test-native-1');
    expect(await sttEngine.getCachedTranscription(key)).toBe('Transcrição nativa do WhatsApp');
  });

  it('decodes audio blob to PCM and executes Whisper pipeline in Portuguese', async () => {
    const mockPcm = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    vi.spyOn(audioDecoder, 'decodeAudioBlobToPCM16k').mockResolvedValue(mockPcm);

    const progressMessages: string[] = [];
    const result = await transcribeBlobWithWhisper('blob:https://web.whatsapp.com/audio-voice-note', {
      onProgress: (status) => progressMessages.push(status),
    });

    expect(audioDecoder.decodeAudioBlobToPCM16k).toHaveBeenCalledWith('blob:https://web.whatsapp.com/audio-voice-note');
    expect(result.text).toBe('Olá, gostaria de confirmar o agendamento da visita médica.');
    expect(result.cached).toBe(false);
    expect(progressMessages.length).toBeGreaterThan(0);

    // Verify saved to cache
    const key = sttEngine.generateAudioKey('blob:https://web.whatsapp.com/audio-voice-note');
    expect(await sttEngine.getCachedTranscription(key)).toBe('Olá, gostaria de confirmar o agendamento da visita médica.');
  });

  it('gracefully falls back to Web Speech API if Whisper pipeline throws an error', async () => {
    vi.spyOn(audioDecoder, 'decodeAudioBlobToPCM16k').mockRejectedValue(new Error('WASM memory allocation failed'));
    const spyFallback = vi.spyOn(sttEngine, 'transcribeAudioSource').mockResolvedValue({
      text: 'Texto via fallback Web Speech API',
      confidence: 0.85,
      cached: false,
    });

    const result = await transcribeBlobWithWhisper('blob:https://web.whatsapp.com/audio-broken', {
      fallbackToWebSpeech: true,
    });

    expect(spyFallback).toHaveBeenCalled();
    expect(result.text).toBe('Texto via fallback Web Speech API');
  });
});
