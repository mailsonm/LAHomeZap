import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runBgWhisperInference } from '../background';

// Mock @xenova/transformers
vi.mock('@xenova/transformers', () => {
  const mockPipelineFn = vi.fn().mockImplementation((_pcm, options) => {
    return Promise.resolve({
      text: ' Transcrição executada com sucesso no Background Worker.',
      language: options?.language || 'portuguese',
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

describe('Background Service Worker — Whisper Inference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs Whisper inference on a Float32Array PCM input and returns trimmed text', async () => {
    const pcm = new Float32Array([0.01, -0.02, 0.05, 0.03]);
    const text = await runBgWhisperInference(pcm, 'portuguese');

    expect(text).toBe('Transcrição executada com sucesso no Background Worker.');
  });

  it('runs Whisper inference when PCM is passed as a standard number array', async () => {
    const pcmArray = [0.01, -0.02, 0.05, 0.03];
    const text = await runBgWhisperInference(pcmArray, 'portuguese');

    expect(text).toBe('Transcrição executada com sucesso no Background Worker.');
  });
});
