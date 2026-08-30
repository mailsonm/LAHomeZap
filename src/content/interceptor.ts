/**
 * La Home Zap — Main World Media Interceptor
 *
 * Runs in the webpage execution context (world: "MAIN") at document_start.
 * Intercepts WhatsApp Web's internal blob creations, Audio constructors,
 * and media playback to capture audio URLs directly from memory.
 */

(function initMainWorldMediaInterceptor() {
  if ((window as any).__lz_interceptor_initialized) {
    return;
  }
  (window as any).__lz_interceptor_initialized = true;

  const capturedUrls: string[] = ((window as any).__lz_audio_urls = (window as any).__lz_audio_urls || []);

  function broadcastMediaUrl(url: string, source: string) {
    if (!url || typeof url !== 'string') return;
    if (!url.startsWith('blob:') && !url.startsWith('data:') && !url.startsWith('http')) return;

    if (!capturedUrls.includes(url)) {
      capturedUrls.push(url);
      if (capturedUrls.length > 50) {
        capturedUrls.shift();
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent('__lz_blob_created', {
          detail: { url, source },
        })
      );
    } catch {
      // ignore
    }

    try {
      window.postMessage(
        {
          type: '__lz_blob_created',
          url,
          source,
        },
        '*'
      );
    } catch {
      // ignore
    }
  }

  // 1. Intercept URL.createObjectURL
  try {
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = function (object: any): string {
        const url = originalCreateObjectURL.call(URL, object);
        if (object instanceof Blob) {
          const type = (object.type || '').toLowerCase();
          // WhatsApp voice notes and audio blobs (audio/ogg, audio/opus, audio/mp4, audio/webm)
          if (type.includes('audio') || type.includes('ogg') || type.includes('opus') || type.includes('mp4') || type.includes('webm')) {
            broadcastMediaUrl(url, 'createObjectURL');
          }
        }
        return url;
      };
    }
  } catch (err) {
    console.warn('[La Home Zap Interceptor] Failed to patch createObjectURL:', err);
  }

  // 2. Intercept new window.Audio() constructor
  try {
    if (typeof window !== 'undefined' && window.Audio) {
      const OriginalAudio = window.Audio;
      const PatchedAudio = function (this: HTMLAudioElement, src?: string) {
        const instance = new OriginalAudio(src);
        if (src) {
          broadcastMediaUrl(src, 'AudioConstructor');
        }
        instance.addEventListener('play', () => {
          const currentSrc = instance.src || instance.currentSrc;
          if (currentSrc) {
            broadcastMediaUrl(currentSrc, 'AudioPlay');
            window.dispatchEvent(new CustomEvent('__lz_audio_play', { detail: { src: currentSrc } }));
          }
        });
        return instance;
      } as unknown as typeof Audio;

      PatchedAudio.prototype = OriginalAudio.prototype;
      window.Audio = PatchedAudio;
    }
  } catch (err) {
    console.warn('[La Home Zap Interceptor] Failed to patch Audio constructor:', err);
  }

  // 3. Intercept HTMLMediaElement.prototype.play
  try {
    if (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype.play) {
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        const currentSrc = (this as HTMLAudioElement).src || (this as HTMLAudioElement).currentSrc;
        if (currentSrc) {
          broadcastMediaUrl(currentSrc, 'MediaPlay');
          window.dispatchEvent(new CustomEvent('__lz_audio_play', { detail: { src: currentSrc } }));
        }
        return originalPlay.apply(this);
      };
    }
  } catch (err) {
    console.warn('[La Home Zap Interceptor] Failed to patch HTMLMediaElement.prototype.play:', err);
  }

  // 4. Intercept HTMLMediaElement.prototype.src setter
  try {
    if (typeof HTMLMediaElement !== 'undefined') {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
      if (descriptor && descriptor.set) {
        const originalSet = descriptor.set;
        descriptor.set = function (this: HTMLMediaElement, value: string) {
          if (value && typeof value === 'string') {
            broadcastMediaUrl(value, 'MediaSrcSet');
            window.dispatchEvent(new CustomEvent('__lz_audio_src', { detail: { src: value } }));
          }
          return originalSet.call(this, value);
        };
        Object.defineProperty(HTMLMediaElement.prototype, 'src', descriptor);
      }
    }
  } catch (err) {
    console.warn('[La Home Zap Interceptor] Failed to patch HTMLMediaElement.prototype.src:', err);
  }

  console.log('[La Home Zap] Main-world media interceptor active.');
})();
