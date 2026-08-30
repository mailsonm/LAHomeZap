import { describe, it, expect, beforeEach } from 'vitest';
import { scanAndInjectAudioSTT } from '../stt-injector';

describe('STT DOM Injector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
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

  it('handles clicking the transcribe button and rendering transcription result', async () => {
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

    // After click, state should show loading or transcription container
    const container = msgRow.querySelector('.stt-bubble-container');
    expect(container).not.toBeNull();
  });
});
