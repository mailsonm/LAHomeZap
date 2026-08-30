import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resampleAudioBuffer,
  downmixToMono,
  decodeAudioBlobToPCM16k,
} from '../audio-decoder';

describe('Audio Decoder & PCM Resampler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('resampleAudioBuffer', () => {
    it('returns the same array when original and target sample rates match', () => {
      const input = new Float32Array([0.1, 0.5, -0.3, 0.8]);
      const resampled = resampleAudioBuffer(input, 16000, 16000);
      expect(resampled.length).toBe(4);
      expect(resampled[0]).toBeCloseTo(0.1);
      expect(resampled[1]).toBeCloseTo(0.5);
    });

    it('downsamples audio from 48kHz to 16kHz (3:1 ratio)', () => {
      // 6 samples at 48kHz -> should produce 2 samples at 16kHz
      const input = new Float32Array([0.0, 0.2, 0.4, 0.6, 0.8, 1.0]);
      const resampled = resampleAudioBuffer(input, 48000, 16000);
      expect(resampled.length).toBe(2);
      expect(resampled[0]).toBeCloseTo(0.0);
      expect(resampled[1]).toBeCloseTo(0.6);
    });

    it('upsamples audio from 8kHz to 16kHz with linear interpolation', () => {
      const input = new Float32Array([0.0, 1.0]);
      const resampled = resampleAudioBuffer(input, 8000, 16000);
      expect(resampled.length).toBe(4);
      expect(resampled[0]).toBeCloseTo(0.0);
      expect(resampled[1]).toBeCloseTo(0.5);
    });

    it('handles empty input gracefully', () => {
      const input = new Float32Array([]);
      const resampled = resampleAudioBuffer(input, 44100, 16000);
      expect(resampled.length).toBe(0);
    });
  });

  describe('downmixToMono', () => {
    it('returns channel 0 directly if mono (1 channel)', () => {
      const ch0 = new Float32Array([0.2, -0.4, 0.6]);
      const mockAudioBuffer = {
        numberOfChannels: 1,
        getChannelData: (ch: number) => (ch === 0 ? ch0 : new Float32Array([])),
      };

      const mono = downmixToMono(mockAudioBuffer as any);
      expect(mono).toBe(ch0);
    });

    it('averages stereo channels into a single mono Float32Array', () => {
      const left = new Float32Array([0.2, 0.4, -0.6]);
      const right = new Float32Array([0.4, 0.2, 0.2]);
      const mockAudioBuffer = {
        numberOfChannels: 2,
        getChannelData: (ch: number) => (ch === 0 ? left : right),
      };

      const mono = downmixToMono(mockAudioBuffer as any);
      expect(mono.length).toBe(3);
      expect(mono[0]).toBeCloseTo(0.3); // (0.2 + 0.4) / 2
      expect(mono[1]).toBeCloseTo(0.3); // (0.4 + 0.2) / 2
      expect(mono[2]).toBeCloseTo(-0.2); // (-0.6 + 0.2) / 2
    });
  });

  describe('decodeAudioBlobToPCM16k', () => {
    it('fetches blob URL and decodes using AudioContext to 16kHz mono PCM', async () => {
      const mockPcm48k = new Float32Array([0.0, 0.1, 0.2, 0.3, 0.4, 0.5]);
      const mockAudioBuffer = {
        numberOfChannels: 1,
        sampleRate: 48000,
        getChannelData: () => mockPcm48k,
      };

      // Mock AudioContext
      const mockDecodeAudioData = vi.fn().mockResolvedValue(mockAudioBuffer);
      const mockClose = vi.fn().mockResolvedValue(undefined);
      class MockAudioContext {
        decodeAudioData = mockDecodeAudioData;
        close = mockClose;
      }
      (globalThis as any).AudioContext = MockAudioContext;

      // Mock fetch
      const mockArrayBuffer = new ArrayBuffer(16);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      } as any);

      const pcm16k = await decodeAudioBlobToPCM16k('blob:https://web.whatsapp.com/test-audio-123');

      expect(globalThis.fetch).toHaveBeenCalledWith('blob:https://web.whatsapp.com/test-audio-123');
      expect(mockDecodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
      expect(pcm16k.length).toBe(2); // 6 samples at 48kHz -> 2 samples at 16kHz
      expect(pcm16k[0]).toBeCloseTo(0.0);
    });

    it('accepts raw ArrayBuffer directly without fetching', async () => {
      const mockPcm16k = new Float32Array([0.1, 0.2, 0.3]);
      const mockAudioBuffer = {
        numberOfChannels: 1,
        sampleRate: 16000,
        getChannelData: () => mockPcm16k,
      };

      const mockDecodeAudioData = vi.fn().mockResolvedValue(mockAudioBuffer);
      const mockClose = vi.fn().mockResolvedValue(undefined);
      class MockAudioContext {
        decodeAudioData = mockDecodeAudioData;
        close = mockClose;
      }
      (globalThis as any).AudioContext = MockAudioContext;

      const rawBuffer = new ArrayBuffer(8);
      const pcm16k = await decodeAudioBlobToPCM16k(rawBuffer);

      expect(mockDecodeAudioData).toHaveBeenCalledWith(rawBuffer);
      expect(pcm16k.length).toBe(3);
    });

    it('throws meaningful error if fetch fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      await expect(decodeAudioBlobToPCM16k('blob:invalid-audio')).rejects.toThrow(
        /Falha ao carregar áudio/
      );
    });
  });
});
