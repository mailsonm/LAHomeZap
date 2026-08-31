/**
 * Audio Decoder & Resampler for Client-Side STT
 *
 * Converts WhatsApp audio streams (Blob / ArrayBuffer / Ogg / MP4)
 * into a single-channel 16,000 Hz Float32Array PCM suitable for Whisper inference.
 */

/**
 * Resamples an audio buffer from an arbitrary sample rate to the target sample rate using linear interpolation.
 */
export function resampleAudioBuffer(
  audioData: Float32Array,
  origSampleRate: number,
  targetSampleRate: number = 16000
): Float32Array {
  if (audioData.length === 0) {
    return new Float32Array(0);
  }

  if (origSampleRate === targetSampleRate) {
    return audioData;
  }

  const sampleRateRatio = origSampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const origIndex = i * sampleRateRatio;
    const indexFloor = Math.floor(origIndex);
    const indexCeil = Math.min(audioData.length - 1, indexFloor + 1);
    const fraction = origIndex - indexFloor;
    result[i] = audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction;
  }

  return result;
}

/**
 * Downmixes multi-channel audio data from an AudioBuffer into a single mono Float32Array.
 */
export function downmixToMono(audioBuffer: AudioBuffer): Float32Array {
  const numChannels = audioBuffer.numberOfChannels;
  if (numChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  const length = audioBuffer.getChannelData(0).length;
  const mono = new Float32Array(length);

  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i];
    }
  }

  for (let i = 0; i < length; i++) {
    mono[i] /= numChannels;
  }

  return mono;
}

/**
 * Fetches raw binary data from an audio URL (blob:, data:, or http:).
 */
export async function fetchAudioArrayBuffer(audioSrc: string): Promise<ArrayBuffer> {
  if (
    !audioSrc ||
    typeof audioSrc !== 'string' ||
    (!audioSrc.startsWith('blob:') &&
      !audioSrc.startsWith('data:') &&
      !audioSrc.startsWith('http://') &&
      !audioSrc.startsWith('https://'))
  ) {
    throw new Error('URL de áudio inválida ou áudio não carregado no WhatsApp.');
  }

  const response = await fetch(audioSrc);
  if (!response.ok) {
    throw new Error(`Falha ao carregar áudio (${response.status}: ${response.statusText})`);
  }
  return await response.arrayBuffer();
}

/**
 * Decodes any audio source (blob URL, Blob instance, or ArrayBuffer) into 16kHz mono PCM Float32Array.
 */
export async function decodeAudioBlobToPCM16k(
  audioInput: string | Blob | ArrayBuffer
): Promise<Float32Array> {
  let arrayBuffer: ArrayBuffer;

  if (typeof audioInput === 'string') {
    arrayBuffer = await fetchAudioArrayBuffer(audioInput);
  } else if (audioInput instanceof Blob) {
    arrayBuffer = await audioInput.arrayBuffer();
  } else {
    arrayBuffer = audioInput;
  }

  const AudioContextClass =
    (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('AudioContext não suportado neste navegador para decodificação.');
  }

  // Attempt to initialize AudioContext natively at 16000Hz for high-fidelity anti-aliased resampling
  let audioCtx: AudioContext;
  try {
    audioCtx = new AudioContextClass({ sampleRate: 16000 });
  } catch {
    audioCtx = new AudioContextClass();
  }

  try {
    // decodeAudioData consumes the arrayBuffer, so pass a clone if needed
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const monoData = downmixToMono(decodedBuffer);

    if (decodedBuffer.sampleRate === 16000) {
      return monoData;
    }

    return resampleAudioBuffer(monoData, decodedBuffer.sampleRate, 16000);
  } finally {
    if (typeof audioCtx.close === 'function') {
      try {
        await audioCtx.close();
      } catch (_e) {
        // ignore context close failures
      }
    }
  }
}

const blobDurationCache = new Map<string, number>();

/**
 * Resets the in-memory blob duration cache. Used primarily in test suites.
 */
export function resetBlobDurationCacheForTesting(): void {
  blobDurationCache.clear();
}

/**
 * Quickly extracts the duration (in seconds) of an audio blob by decoding its buffer.
 */
export async function getAudioBlobDuration(audioInput: string | Blob): Promise<number> {
  if (typeof audioInput === 'string' && blobDurationCache.has(audioInput)) {
    return blobDurationCache.get(audioInput)!;
  }
  try {
    let arrayBuffer: ArrayBuffer;
    if (typeof audioInput === 'string') {
      arrayBuffer = await fetchAudioArrayBuffer(audioInput);
    } else {
      arrayBuffer = await audioInput.arrayBuffer();
    }
    const AudioContextClass =
      (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!AudioContextClass) return 0;
    const audioCtx = new AudioContextClass();
    try {
      const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      const dur = decoded.duration || 0;
      if (typeof audioInput === 'string' && dur > 0) {
        blobDurationCache.set(audioInput, dur);
      }
      return dur;
    } finally {
      if (typeof audioCtx.close === 'function') {
        try {
          await audioCtx.close();
        } catch (_e) {
          // ignore context close failures
        }
      }
    }
  } catch {
    // ignore decoding failures
    return 0;
  }
}
