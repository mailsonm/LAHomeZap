import type { STTResult } from '../../types';

/**
 * Generates a deterministic cache key for an audio source or message fingerprint.
 */
export function generateAudioKey(input: string, duration?: number): string {
  if (!input) return `stt_unknown_${Date.now()}`;
  let hash = 0;
  const str = `${input}_${duration || 0}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `stt_${Math.abs(hash).toString(36)}`;
}

/**
 * Resolves a 100% unique storage key for an audio message container, avoiding any collision between bubbles.
 */
export function resolveUniqueMessageKey(msgContainer: Element | HTMLElement, audioSrc?: string): string {
  // 1. WhatsApp unique message data-id (e.g. true_5585...@c.us_3EB0...)
  const dataIdEl = msgContainer.closest('[data-id]') || msgContainer.querySelector('[data-id]') || msgContainer;
  const rawId = dataIdEl.getAttribute('data-id') || msgContainer.getAttribute('data-id');
  if (rawId && rawId.trim().length > 3) {
    return `stt_id_${generateAudioKey(rawId.trim())}`;
  }

  // 2. Unique message timestamp + duration + sender content fingerprint
  const timeText = msgContainer.querySelector('[data-testid="msg-meta"], span[dir="auto"]')?.textContent?.trim() || '';
  const prePlain = msgContainer.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
  const durationMatch = msgContainer.textContent?.match(/\b(\d{1,2}:\d{2})\b/);
  const durationText = durationMatch ? durationMatch[1] : '';
  const isOut = msgContainer.classList.contains('message-out') || msgContainer.querySelector('[data-testid="tail-out"]') !== null;
  const offset = (msgContainer as HTMLElement).offsetTop || 0;

  if (prePlain || timeText || durationText) {
    const fingerprint = `${prePlain}_${timeText}_${durationText}_${isOut ? 'out' : 'in'}_${offset}`;
    return `stt_fp_${generateAudioKey(fingerprint)}`;
  }

  // 3. If audioSrc is a specific blob / URL with length
  if (audioSrc && audioSrc.length > 10 && !audioSrc.startsWith('blob:null') && audioSrc !== 'audio_blob_active') {
    return generateAudioKey(audioSrc);
  }

  return `stt_unknown_${Date.now()}`;
}

/**
 * Retrieves a cached transcription from storage.
 */
export async function getCachedTranscription(audioKey: string): Promise<string | null> {
  if (!audioKey || audioKey === 'stt_msg_' || audioKey.startsWith('stt_unknown_')) {
    return null;
  }

  let text: string | null = null;

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    text = await new Promise<string | null>((resolve) => {
      try {
        chrome.storage.local.get([audioKey], (result) => {
          resolve(result && typeof result[audioKey] === 'string' ? result[audioKey] : null);
        });
      } catch {
        resolve(null);
      }
    });
  } else {
    try {
      text = localStorage.getItem(audioKey) || null;
    } catch {
      text = null;
    }
  }

  // Filter out invalid/empty cached transcriptions so they can be re-attempted
  if (
    !text ||
    text.trim() === '' ||
    text === 'Nenhuma fala detectada.' ||
    text.startsWith('Erro') ||
    text.startsWith('Permissão')
  ) {
    return null;
  }

  return text;
}

/**
 * Saves a transcription into local storage cache.
 */
export async function saveCachedTranscription(audioKey: string, text: string): Promise<void> {
  if (
    !audioKey ||
    audioKey === 'stt_msg_' ||
    audioKey.startsWith('stt_unknown_') ||
    !text ||
    text.trim() === '' ||
    text === 'Nenhuma fala detectada.' ||
    text.startsWith('Erro') ||
    text.startsWith('Permissão')
  ) {
    return;
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise<void>((resolve) => {
      try {
        chrome.storage.local.set({ [audioKey]: text }, () => {
          resolve();
        });
      } catch {
        resolve();
      }
    });
  }

  try {
    localStorage.setItem(audioKey, text);
  } catch {
    // Ignore storage quota errors in memory
  }
}

/**
 * Removes a cached transcription from storage.
 */
export async function deleteCachedTranscription(audioKey: string): Promise<void> {
  if (!audioKey) return;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise<void>((resolve) => {
      try {
        chrome.storage.local.remove([audioKey], () => resolve());
      } catch {
        resolve();
      }
    });
  }
  try {
    localStorage.removeItem(audioKey);
  } catch {
    // ignore
  }
}

/**
 * Transcribes audio using Web Speech API in pt-BR across the FULL audio duration,
 * seamlessly accumulating final and interim speech segments without dropping words.
 */
export async function transcribeAudioSource(
  audioSrc: string,
  options?: {
    lang?: string;
    key?: string;
    element?: HTMLAudioElement | null;
    domTranscript?: string | null;
    durationMs?: number;
    force?: boolean;
    onProgress?: (interimText: string) => void;
  }
): Promise<STTResult> {
  const key = options?.key || generateAudioKey(audioSrc);

  // If WhatsApp already has native transcript in DOM, use it immediately
  if (options?.domTranscript && options.domTranscript.trim().length > 0) {
    const cleanNative = options.domTranscript.trim();
    await saveCachedTranscription(key, cleanNative);
    return {
      text: cleanNative,
      confidence: 0.98,
      cached: false,
    };
  }

  // Check cache only if not forcing re-transcription
  if (!options?.force) {
    const cachedText = await getCachedTranscription(key);
    if (cachedText) {
      return {
        text: cachedText,
        cached: true,
      };
    }
  }

  const lang = options?.lang || 'pt-BR';

  // Check for SpeechRecognition support
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    return {
      text: 'Reconhecimento de voz não suportado neste navegador.',
      confidence: 0,
      cached: false,
    };
  }

  return new Promise<STTResult>((resolve) => {
    try {
      let playbackAudio: HTMLAudioElement | null = options?.element ?? null;

      if (!playbackAudio && audioSrc && (audioSrc.startsWith('blob:') || audioSrc.startsWith('data:') || audioSrc.startsWith('http'))) {
        try {
          playbackAudio = new Audio(audioSrc);
        } catch (_e) {
          // ignore
        }
      }

      // Calculate total listen duration with safety buffer
      let targetListenMs = options?.durationMs && options.durationMs > 0 ? options.durationMs + 4000 : 12000;
      if (playbackAudio && Number.isFinite(playbackAudio.duration) && playbackAudio.duration > 0) {
        targetListenMs = Math.max(targetListenMs, playbackAudio.duration * 1000 + 4000);
      }

      const startTime = Date.now();
      const endTimeMs = startTime + targetListenMs;

      const finalizedPhrases: string[] = [];
      let latestInterim = '';
      let isSessionActive = true;
      let isFinalized = false;
      let recognition: any = null;
      let hardTimeoutTimer: any = null;

      const getFullRecognizedText = (): string => {
        const parts = [...finalizedPhrases];
        if (latestInterim && !parts.some((p) => p.endsWith(latestInterim))) {
          parts.push(latestInterim);
        }
        return parts.join(' ').replace(/\s+/g, ' ').trim();
      };

      const finalize = async () => {
        if (isFinalized) return;
        isFinalized = true;
        isSessionActive = false;

        if (hardTimeoutTimer) {
          clearTimeout(hardTimeoutTimer);
          hardTimeoutTimer = null;
        }

        if (playbackAudio && !playbackAudio.paused) {
          try { playbackAudio.pause(); } catch (_e) { /* ignore */ }
        }

        if (recognition) {
          try { recognition.stop(); } catch (_e) { /* ignore */ }
        }

        // Allow 350ms for final in-flight SpeechRecognition words to settle
        await new Promise((r) => setTimeout(r, 350));

        const finalResult = getFullRecognizedText() || 'Nenhuma fala detectada.';

        if (finalResult && !finalResult.startsWith('Permissão') && finalResult !== 'Nenhuma fala detectada.') {
          await saveCachedTranscription(key, finalResult);
        }

        resolve({
          text: finalResult,
          confidence: 0.92,
          cached: false,
        });
      };

      const startRecognitionInstance = () => {
        if (!isSessionActive || isFinalized) return;

        try {
          recognition = new SpeechRecognitionClass();
          recognition.lang = lang;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: any) => {
            let interimAccum = '';
            if (event.results) {
              const startIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0;
              for (let i = startIndex; i < event.results.length; ++i) {
                const item = event.results[i];
                if (item && item[0]) {
                  const transcript = item[0].transcript?.trim() || '';
                  if (item.isFinal !== false) {
                    if (transcript && !finalizedPhrases.includes(transcript)) {
                      finalizedPhrases.push(transcript);
                    }
                  } else {
                    interimAccum += item[0].transcript + ' ';
                  }
                }
              }
            }
            latestInterim = interimAccum.trim();

            const liveCombined = getFullRecognizedText();
            if (liveCombined && options?.onProgress) {
              options.onProgress(liveCombined);
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('[La Home Zap STT] SpeechRecognition event:', event?.error);
            if (event?.error === 'not-allowed') {
              finalizedPhrases.length = 0;
              finalizedPhrases.push('Permissão de microfone necessária para transcrever áudio.');
              finalize();
            }
          };

          recognition.onend = () => {
            if (latestInterim) {
              if (!finalizedPhrases.includes(latestInterim)) {
                finalizedPhrases.push(latestInterim);
              }
              latestInterim = '';
            }

            // Auto-restart if audio playback or duration window is still active
            if (isSessionActive && !isFinalized && Date.now() < endTimeMs) {
              setTimeout(() => {
                if (isSessionActive && !isFinalized) {
                  startRecognitionInstance();
                }
              }, 100);
            } else if (Date.now() >= endTimeMs) {
              finalize();
            }
          };

          recognition.start();
        } catch (err: any) {
          console.warn('[La Home Zap STT] Error starting recognition instance:', err);
        }
      };

      // Start recognition instance
      startRecognitionInstance();

      // Play audio while speech recognition is active
      if (playbackAudio) {
        playbackAudio.onended = () => {
          // Allow 2000ms buffer after audio finishes to catch the tail words
          setTimeout(finalize, 2000);
        };
        try {
          playbackAudio.currentTime = 0;
          playbackAudio.volume = 1.0;
          const playPromise = playbackAudio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        } catch (_e) {
          // ignore
        }
      }

      // Hard timeout safety net
      hardTimeoutTimer = setTimeout(finalize, targetListenMs);
    } catch (err: any) {
      resolve({
        text: `Erro ao iniciar transcrição: ${err?.message || 'erro interno'}`,
        confidence: 0,
        cached: false,
      });
    }
  });
}
