import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanAndInjectAudioSTT, initSTTObserver, extractAudioDurationFromBubble } from '../stt-injector';
import * as whisperEngine from '../whisper-engine';
import * as sttEngine from '../stt-engine';

vi.mock('../whisper-engine', () => ({
  transcribeBlobWithWhisper: vi.fn().mockResolvedValue({
    text: 'Transcrição Whisper de teste com sucesso.',
    confidence: 0.96,
    cached: false,
  }),
}));

describe('STT DOM Injector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();

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

  it('injects a Transcrever button into an audio message row', () => {
    const chatContainer = document.createElement('div');
    chatContainer.className = 'conversation-panel';

    const msgRow = document.createElement('div');
    msgRow.setAttribute('data-testid', 'msg-container');
    msgRow.className = 'message-in';

    const audio = document.createElement('audio');
    audio.src = 'blob:https://web.whatsapp.com/audio-test-123';
    msgRow.appendChild(audio);

    chatContainer.appendChild(msgRow);
    document.body.appendChild(chatContainer);

    scanAndInjectAudioSTT(chatContainer);

    const transcribeBtn = msgRow.querySelector('.stt-transcribe-btn');
    expect(transcribeBtn).not.toBeNull();
    expect(transcribeBtn?.textContent).toContain('Transcrever');
  });

  it('does not re-inject button if already present', () => {
    const chatContainer = document.createElement('div');
    const msgRow = document.createElement('div');
    msgRow.setAttribute('data-testid', 'msg-container');
    const audio = document.createElement('audio');
    audio.src = 'blob:https://web.whatsapp.com/audio-test-123';
    msgRow.appendChild(audio);
    chatContainer.appendChild(msgRow);
    document.body.appendChild(chatContainer);

    scanAndInjectAudioSTT(chatContainer);
    scanAndInjectAudioSTT(chatContainer);

    const buttons = msgRow.querySelectorAll('.stt-transcribe-btn');
    expect(buttons.length).toBe(1);
  });

  it('handles clicking the transcribe button and rendering Whisper transcription result', async () => {
    const chatContainer = document.createElement('div');
    const msgRow = document.createElement('div');
    msgRow.setAttribute('data-testid', 'msg-container');
    const audio = document.createElement('audio');
    audio.src = 'blob:https://web.whatsapp.com/audio-test-456';
    msgRow.appendChild(audio);
    chatContainer.appendChild(msgRow);
    document.body.appendChild(chatContainer);

    scanAndInjectAudioSTT(chatContainer);

    const transcribeBtn = msgRow.querySelector('.stt-transcribe-btn') as HTMLButtonElement;
    expect(transcribeBtn).not.toBeNull();

    // Trigger click
    transcribeBtn.click();

    // Allow async execution
    await new Promise((r) => setTimeout(r, 50));

    expect(whisperEngine.transcribeBlobWithWhisper).toHaveBeenCalledWith(
      'blob:https://web.whatsapp.com/audio-test-456',
      expect.objectContaining({
        element: audio,
      })
    );

    // After completion, card should be visible with transcription text
    const resultBox = msgRow.querySelector('.stt-transcription-box');
    expect(resultBox).not.toBeNull();
    expect(resultBox?.textContent).toContain('Transcrição Whisper de teste com sucesso.');
  });

  it('handles copy button interaction', async () => {
    const chatContainer = document.createElement('div');
    const msgRow = document.createElement('div');
    msgRow.setAttribute('data-testid', 'msg-container');
    const audio = document.createElement('audio');
    audio.src = 'blob:https://web.whatsapp.com/audio-copy-test';
    msgRow.appendChild(audio);
    chatContainer.appendChild(msgRow);
    document.body.appendChild(chatContainer);

    // Mock clipboard
    let copiedText = '';
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation((text: string) => {
          copiedText = text;
          return Promise.resolve();
        }),
      },
    });

    scanAndInjectAudioSTT(chatContainer);
    const transcribeBtn = msgRow.querySelector('.stt-transcribe-btn') as HTMLButtonElement;
    transcribeBtn.click();

    await new Promise((r) => setTimeout(r, 50));

    const copyBtn = msgRow.querySelector('.stt-copy-btn') as HTMLButtonElement;
    expect(copyBtn).not.toBeNull();
    copyBtn.click();

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(copiedText).toBe('Transcrição Whisper de teste com sucesso.');
  });

  it('handles edit button interaction to edit and save transcription', async () => {
    const chatContainer = document.createElement('div');
    const msgRow = document.createElement('div');
    msgRow.setAttribute('data-testid', 'msg-container');
    const audio = document.createElement('audio');
    audio.src = 'blob:https://web.whatsapp.com/audio-edit-test';
    msgRow.appendChild(audio);
    chatContainer.appendChild(msgRow);
    document.body.appendChild(chatContainer);

    scanAndInjectAudioSTT(chatContainer);
    const transcribeBtn = msgRow.querySelector('.stt-transcribe-btn') as HTMLButtonElement;
    transcribeBtn.click();

    await new Promise((r) => setTimeout(r, 50));

    const editBtn = msgRow.querySelector('.stt-edit-btn') as HTMLButtonElement;
    const textEl = msgRow.querySelector('.stt-transcription-text') as HTMLElement;
    expect(editBtn).not.toBeNull();
    expect(textEl).not.toBeNull();

    // Click to enter edit mode
    editBtn.click();
    expect(textEl.getAttribute('contenteditable')).toBe('true');
    expect(editBtn.textContent).toContain('Salvar');

    // Modify text
    textEl.textContent = 'Texto corrigido manualmente pelo atendente';

    // Click to save
    editBtn.click();
    expect(textEl.getAttribute('contenteditable')).toBe('false');
    expect(editBtn.textContent).toContain('Editar');
    expect(textEl.getAttribute('data-transcription')).toBe('Texto corrigido manualmente pelo atendente');
  });

  it('handles retry button interaction', async () => {
    const chatContainer = document.createElement('div');
    const msgRow = document.createElement('div');
    msgRow.setAttribute('data-testid', 'msg-container');
    const audio = document.createElement('audio');
    audio.src = 'blob:https://web.whatsapp.com/audio-retry-test';
    msgRow.appendChild(audio);
    chatContainer.appendChild(msgRow);
    document.body.appendChild(chatContainer);

    scanAndInjectAudioSTT(chatContainer);
    const transcribeBtn = msgRow.querySelector('.stt-transcribe-btn') as HTMLButtonElement;
    transcribeBtn.click();

    await new Promise((r) => setTimeout(r, 50));

    const retryBtn = msgRow.querySelector('.stt-retry-btn') as HTMLButtonElement;
    expect(retryBtn).not.toBeNull();

    retryBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(whisperEngine.transcribeBlobWithWhisper).toHaveBeenCalledTimes(2);
  });

  it('renders cached transcription automatically on scan if available', async () => {
    const audioKey = sttEngine.generateAudioKey('blob:https://web.whatsapp.com/audio-pre-cached');
    await sttEngine.saveCachedTranscription(audioKey, 'Transcrição já em cache no storage');

    const chatContainer = document.createElement('div');
    const msgRow = document.createElement('div');
    msgRow.setAttribute('data-testid', 'msg-container');
    const audio = document.createElement('audio');
    audio.src = 'blob:https://web.whatsapp.com/audio-pre-cached';
    msgRow.appendChild(audio);
    chatContainer.appendChild(msgRow);
    document.body.appendChild(chatContainer);

    scanAndInjectAudioSTT(chatContainer);

    await new Promise((r) => setTimeout(r, 50));

    const resultBox = msgRow.querySelector('.stt-transcription-box');
    expect(resultBox).not.toBeNull();
    expect(resultBox?.textContent).toContain('Transcrição já em cache no storage');
  });

  it('correctly discriminates and matches 9s audio vs 14s audio in multi-audio conversations without swapping', async () => {
    const mediaInterceptor = await import('../media-interceptor');
    const audioDecoder = await import('../audio-decoder');

    mediaInterceptor.resetCapturedMediaForTesting();
    mediaInterceptor.recordAudioUrl('blob:https://web.whatsapp.com/audio-14s-blob');
    mediaInterceptor.recordAudioUrl('blob:https://web.whatsapp.com/audio-9s-blob');

    vi.spyOn(audioDecoder, 'getAudioBlobDuration').mockImplementation(async (url: string | Blob) => {
      if (typeof url === 'string' && url.includes('14s')) return 14.2;
      if (typeof url === 'string' && url.includes('9s')) return 9.1;
      return 0;
    });

    const chatContainer = document.createElement('div');

    // Message 1: 14s audio with timestamp 3:37 PM
    const msg1 = document.createElement('div');
    msg1.setAttribute('data-testid', 'msg-container');
    msg1.setAttribute('data-id', 'true_55859999@c.us_MSG14S');
    msg1.innerHTML = `
      <div data-pre-plain-text="[15:37, 30/08/2026] Contato: ">
        <div data-testid="audio-player">
          <button aria-label="Reproduzir áudio" data-testid="audio-play"></button>
          <span dir="auto">0:14</span>
        </div>
        <div data-testid="msg-meta">
          <span dir="auto">3:37 PM</span>
        </div>
      </div>
    `;

    // Message 2: 9s audio with timestamp 3:50 PM
    const msg2 = document.createElement('div');
    msg2.setAttribute('data-testid', 'msg-container');
    msg2.setAttribute('data-id', 'true_55859999@c.us_MSG9S');
    msg2.innerHTML = `
      <div data-pre-plain-text="[15:50, 30/08/2026] Contato: ">
        <div data-testid="audio-player">
          <button aria-label="Reproduzir áudio" data-testid="audio-play"></button>
          <span dir="auto">0:09</span>
        </div>
        <div data-testid="msg-meta">
          <span dir="auto">3:50 PM</span>
        </div>
      </div>
    `;

    chatContainer.appendChild(msg1);
    chatContainer.appendChild(msg2);
    document.body.appendChild(chatContainer);

    // Simulate an idle audio element from previous playback of msg1 left in DOM
    const oldPlayedAudio = document.createElement('audio');
    oldPlayedAudio.src = 'blob:https://web.whatsapp.com/audio-14s-blob';
    oldPlayedAudio.currentTime = 14.0;
    // paused is true in standard DOM audio element
    document.body.appendChild(oldPlayedAudio);

    scanAndInjectAudioSTT(chatContainer);

    // Transcribe Message 2 (the 9-second audio)
    const transcribeBtn2 = msg2.querySelector('.stt-transcribe-btn') as HTMLButtonElement;
    expect(transcribeBtn2).not.toBeNull();
    transcribeBtn2.click();

    await new Promise((r) => setTimeout(r, 100));

    // Message 2 MUST be transcribed with the 9s blob and NOT the 14s blob
    const expectedKey9s = sttEngine.resolveUniqueMessageKey(msg2, 'blob:https://web.whatsapp.com/audio-9s-blob');
    expect(whisperEngine.transcribeBlobWithWhisper).toHaveBeenCalledWith(
      'blob:https://web.whatsapp.com/audio-9s-blob',
      expect.objectContaining({
        key: expectedKey9s,
        durationMs: 9000,
      })
    );
    expect(whisperEngine.transcribeBlobWithWhisper).not.toHaveBeenCalledWith(
      'blob:https://web.whatsapp.com/audio-14s-blob',
      expect.anything()
    );
  });

  it('initializes continuous observer and returns cleanup function', () => {
    const cleanup = initSTTObserver();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  describe('extractAudioDurationFromBubble', () => {
    it('extracts duration from player span while ignoring message send time in msg-meta', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-pre-plain-text="[15:50, 30/08/2026] Contato: ">
          <div data-testid="audio-player">
            <button aria-label="Reproduzir áudio" data-testid="audio-play"></button>
            <span dir="auto">0:09</span>
          </div>
          <div data-testid="msg-meta">
            <span dir="auto">3:50 PM</span>
          </div>
        </div>
      `;
      expect(extractAudioDurationFromBubble(container)).toBe(9);
    });

    it('extracts duration from slider aria-valuemax attribute', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div>
          <div role="slider" aria-valuemax="45" aria-valuenow="0"></div>
          <div data-testid="msg-meta"><span>14:30</span></div>
        </div>
      `;
      expect(extractAudioDurationFromBubble(container)).toBe(45);
    });

    it('extracts duration from slider aria-valuetext attribute (e.g. 1:25 -> 85s)', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div>
          <div role="slider" aria-valuetext="1:25"></div>
          <div data-testid="msg-meta"><span>09:15</span></div>
        </div>
      `;
      expect(extractAudioDurationFromBubble(container)).toBe(85);
    });

    it('picks the maximum duration when both elapsed time (0:00) and total (0:14) are present', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-testid="audio-player">
          <span>0:00</span>
          <span>/</span>
          <span>0:14</span>
        </div>
      `;
      expect(extractAudioDurationFromBubble(container)).toBe(14);
    });

    it('returns 0 for text messages without audio', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="selectable-text">Olá, temos consulta às 14:00</div>
        <div data-testid="msg-meta"><span>10:30</span></div>
      `;
      expect(extractAudioDurationFromBubble(container)).toBe(0);
    });
  });
});

