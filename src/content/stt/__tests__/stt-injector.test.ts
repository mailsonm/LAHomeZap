import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanAndInjectAudioSTT, initSTTObserver } from '../stt-injector';
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

  it('initializes continuous observer and returns cleanup function', () => {
    const cleanup = initSTTObserver();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
