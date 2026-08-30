import { describe, it, expect, beforeEach } from 'vitest';
import {
  initMediaInterceptor,
  recordAudioUrl,
  getCapturedAudioUrls,
  getLatestCapturedAudioUrl,
  resetCapturedMediaForTesting,
} from '../media-interceptor';

describe('Media Interceptor', () => {
  beforeEach(() => {
    resetCapturedMediaForTesting();
  });

  it('records audio URLs properly and retrieves latest', () => {
    expect(getLatestCapturedAudioUrl()).toBeNull();

    recordAudioUrl('blob:https://web.whatsapp.com/abc-123');
    recordAudioUrl('blob:https://web.whatsapp.com/def-456');

    expect(getCapturedAudioUrls()).toHaveLength(2);
    expect(getLatestCapturedAudioUrl()).toBe('blob:https://web.whatsapp.com/def-456');
  });

  it('ignores invalid or non-media URLs', () => {
    recordAudioUrl('');
    recordAudioUrl('javascript:void(0)');
    expect(getCapturedAudioUrls()).toHaveLength(0);
  });

  it('listens for custom window events and postMessage', () => {
    const cleanup = initMediaInterceptor();

    window.dispatchEvent(
      new CustomEvent('__lz_blob_created', {
        detail: { url: 'blob:https://web.whatsapp.com/custom-blob-1' },
      })
    );

    window.dispatchEvent(
      new CustomEvent('__lz_audio_play', {
        detail: { src: 'blob:https://web.whatsapp.com/custom-play-1' },
      })
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: '__lz_blob_created', url: 'blob:https://web.whatsapp.com/custom-postmessage-1' },
      })
    );

    expect(getCapturedAudioUrls()).toContain('blob:https://web.whatsapp.com/custom-blob-1');
    expect(getCapturedAudioUrls()).toContain('blob:https://web.whatsapp.com/custom-play-1');
    expect(getCapturedAudioUrls()).toContain('blob:https://web.whatsapp.com/custom-postmessage-1');

    cleanup();
  });
});
