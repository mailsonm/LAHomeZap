/**
 * Media Interceptor for WhatsApp Web.
 * Captures in-memory audio blob URLs, Audio constructor instances,
 * and AudioContext decodes created by WhatsApp Web's internal players.
 */

const capturedBlobUrls: string[] = [];
const capturedAudios: HTMLAudioElement[] = [];

/**
 * Returns the list of recently captured audio blob URLs.
 */
export function getCapturedAudioUrls(): string[] {
  return [...capturedBlobUrls];
}

/**
 * Returns the most recently captured audio blob URL.
 */
export function getLatestCapturedAudioUrl(): string | null {
  return capturedBlobUrls.length > 0 ? capturedBlobUrls[capturedBlobUrls.length - 1] : null;
}

/**
 * Returns the list of captured Audio element instances in memory.
 */
export function getCapturedAudioElements(): HTMLAudioElement[] {
  return [...capturedAudios];
}

/**
 * Clears captured audio URLs. Used primarily in testing.
 */
export function resetCapturedMediaForTesting(): void {
  capturedBlobUrls.length = 0;
  capturedAudios.length = 0;
}

/**
 * Registers an audio blob URL into the captured list.
 */
export function recordAudioUrl(url: string): void {
  if (!url || typeof url !== 'string') return;
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http')) {
    if (!capturedBlobUrls.includes(url)) {
      capturedBlobUrls.push(url);
      if (capturedBlobUrls.length > 50) {
        capturedBlobUrls.shift();
      }
    }
  }
}

/**
 * Injects main-world interceptor script and listens for audio capture events.
 */
export function initMediaInterceptor(): () => void {
  // Listen for custom events dispatched from the main world interceptor
  const handleBlobEvent = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.url) {
      recordAudioUrl(detail.url);
    }
  };

  const handleAudioEvent = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.src) {
      recordAudioUrl(detail.src);
    }
  };

  const handlePostMessage = (e: MessageEvent) => {
    if (e.data?.type === '__lz_blob_created' && e.data.url) {
      recordAudioUrl(e.data.url);
    } else if (e.data?.type === '__lz_audio_play' && e.data.src) {
      recordAudioUrl(e.data.src);
    }
  };

  window.addEventListener('__lz_blob_created', handleBlobEvent);
  window.addEventListener('__lz_audio_play', handleAudioEvent);
  window.addEventListener('__lz_audio_src', handleAudioEvent);
  window.addEventListener('message', handlePostMessage);

  // Hook directly in content script scope as well
  try {
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      const origCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = function (obj: Blob | MediaSource): string {
        const url = origCreateObjectURL.call(URL, obj);
        if (obj instanceof Blob) {
          if (obj.type.includes('audio') || obj.type.includes('ogg') || obj.type.includes('opus') || obj.size > 200) {
            recordAudioUrl(url);
          }
        }
        return url;
      };
    }
  } catch {
    // Ignore scope hook errors
  }

  // Also check if main world interceptor already populated window.__lz_audio_urls
  try {
    const globalUrls = (window as any).__lz_audio_urls;
    if (Array.isArray(globalUrls)) {
      globalUrls.forEach((u) => recordAudioUrl(u));
    }
  } catch {
    // ignore
  }

  return () => {
    window.removeEventListener('__lz_blob_created', handleBlobEvent);
    window.removeEventListener('__lz_audio_play', handleAudioEvent);
    window.removeEventListener('__lz_audio_src', handleAudioEvent);
    window.removeEventListener('message', handlePostMessage);
  };
}
