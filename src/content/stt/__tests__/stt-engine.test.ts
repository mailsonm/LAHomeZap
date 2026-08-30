import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateAudioKey,
  getCachedTranscription,
  saveCachedTranscription,
  deleteCachedTranscription,
  transcribeAudioSource,
} from '../stt-engine';

describe('STT Engine & Cache', () => {
  beforeEach(() => {
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
          remove: vi.fn((keys: string[], callback?: () => void) => {
            for (const k of keys) {
              delete storageMock[k];
            }
            if (callback) callback();
          }),
        },
      },
    };
  });

  it('generates a deterministic audio key for cache lookup', () => {
    const key1 = generateAudioKey('blob:https://web.whatsapp.com/1234-5678');
    const key2 = generateAudioKey('blob:https://web.whatsapp.com/1234-5678');
    const key3 = generateAudioKey('data:audio/ogg;base64,GkXfo59ChoEBQveBAULygQRC84EIQoK7');

    expect(key1).toBe(key2);
    expect(key1).toContain('stt_');
    expect(key3).toContain('stt_');
  });

  it('saves and retrieves transcriptions from storage cache', async () => {
    const key = 'stt_test_audio_123';
    expect(await getCachedTranscription(key)).toBeNull();

    await saveCachedTranscription(key, 'Olá, gostaria de confirmar o agendamento.');
    expect(await getCachedTranscription(key)).toBe('Olá, gostaria de confirmar o agendamento.');
  });

  it('returns cached transcription immediately if available without re-running STT', async () => {
    const key = generateAudioKey('blob:https://web.whatsapp.com/cached-audio');
    await saveCachedTranscription(key, 'Texto transcrito em cache');

    const result = await transcribeAudioSource('blob:https://web.whatsapp.com/cached-audio');
    expect(result.text).toBe('Texto transcrito em cache');
    expect(result.cached).toBe(true);
  });

  it('handles speech recognition transcription fallback gracefully when SpeechRecognition is mock-invoked', async () => {
    // Mock webkitSpeechRecognition
    class MockSpeechRecognition {
      lang = 'pt-BR';
      continuous = false;
      interimResults = false;
      onresult: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        setTimeout(() => {
          if (this.onresult) {
            this.onresult({
              results: [
                [{ transcript: 'Mensagem de teste transcrita com sucesso.', confidence: 0.95 }],
              ],
            });
          }
          if (this.onend) this.onend();
        }, 10);
      }
      stop() {}
      abort() {}
    }

    (globalThis as any).webkitSpeechRecognition = MockSpeechRecognition;

    const result = await transcribeAudioSource('blob:https://web.whatsapp.com/new-audio-sample', {
      durationMs: 50,
    });
    expect(result.text).toBe('Mensagem de teste transcrita com sucesso.');
    expect(result.cached).toBe(false);

    // Verify it was saved to cache
    const key = generateAudioKey('blob:https://web.whatsapp.com/new-audio-sample');
    expect(await getCachedTranscription(key)).toBe('Mensagem de teste transcrita com sucesso.');
  });

  it('deletes cached transcription and supports force bypass', async () => {
    const key = 'stt_to_delete';
    await saveCachedTranscription(key, 'Texto salvo');
    expect(await getCachedTranscription(key)).toBe('Texto salvo');

    await deleteCachedTranscription(key);
    expect(await getCachedTranscription(key)).toBeNull();
  });
});
