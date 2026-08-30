import {
  transcribeAudioSource,
  resolveUniqueMessageKey,
  getCachedTranscription,
  saveCachedTranscription,
} from './stt-engine';

const STT_PROCESSED_ATTR = 'data-stt-injected';

/**
 * Scans audio players in the active conversation and injects exactly 1 STT Transcribe button per bubble.
 */
export function scanAndInjectAudioSTT(container: ParentNode = document): void {
  const audioPlayers = container.querySelectorAll(
    'audio, [data-testid="audio-player"], [data-testid="audio-play"], [data-testid="ptt-draft-play"], button[aria-label*="Reproduzir" i], button[aria-label*="Play" i], span[data-icon*="audio"], span[data-icon*="ptt"]'
  );

  audioPlayers.forEach((playerEl) => {
    // Find the message container
    const msgContainer = (
      playerEl.closest('[data-testid="msg-container"]') ||
      playerEl.closest('.message-in, .message-out')
    ) as HTMLElement | null;

    if (!msgContainer) return;

    // Check if button is already injected in this message container
    if (msgContainer.hasAttribute(STT_PROCESSED_ATTR) || msgContainer.querySelector('.stt-bubble-container')) {
      return;
    }
    msgContainer.setAttribute(STT_PROCESSED_ATTR, 'true');

    // Create wrapper button container
    const btnContainer = document.createElement('div');
    btnContainer.className = 'stt-bubble-container';
    btnContainer.style.marginTop = '6px';
    btnContainer.style.marginBottom = '2px';
    btnContainer.style.display = 'flex';
    btnContainer.style.flexDirection = 'column';
    btnContainer.style.gap = '4px';
    btnContainer.style.pointerEvents = 'auto';

    const transcribeBtn = document.createElement('button');
    transcribeBtn.type = 'button';
    transcribeBtn.className = 'stt-transcribe-btn';
    transcribeBtn.innerHTML = '📝 Transcrever Áudio';
    transcribeBtn.style.background = 'rgba(6, 182, 212, 0.15)';
    transcribeBtn.style.color = '#00ced1';
    transcribeBtn.style.border = '1px solid rgba(6, 182, 212, 0.4)';
    transcribeBtn.style.borderRadius = '12px';
    transcribeBtn.style.padding = '4px 10px';
    transcribeBtn.style.fontSize = '11px';
    transcribeBtn.style.fontWeight = '600';
    transcribeBtn.style.cursor = 'pointer';
    transcribeBtn.style.alignSelf = 'flex-start';
    transcribeBtn.style.transition = 'all 0.15s ease';
    transcribeBtn.style.pointerEvents = 'auto';

    transcribeBtn.onmouseenter = () => {
      transcribeBtn.style.background = 'rgba(6, 182, 212, 0.25)';
      transcribeBtn.style.borderColor = '#00ced1';
    };
    transcribeBtn.onmouseleave = () => {
      transcribeBtn.style.background = 'rgba(6, 182, 212, 0.15)';
      transcribeBtn.style.borderColor = 'rgba(6, 182, 212, 0.4)';
    };

    // Auto-check if transcription is already in cache for THIS specific message
    const audioElement = msgContainer.querySelector('audio') as HTMLAudioElement | null;
    const audioSrc = audioElement?.src || audioElement?.currentSrc || '';
    const audioKey = resolveUniqueMessageKey(msgContainer, audioSrc);

    if (audioKey) {
      getCachedTranscription(audioKey).then((cached) => {
        if (cached) {
          renderTranscriptionResult(btnContainer, transcribeBtn, cached, audioKey, msgContainer);
        }
      });
    }

    const runTranscription = async () => {
      transcribeBtn.disabled = true;
      transcribeBtn.innerHTML = '⏳ Escutando áudio...';

      try {
        let currentAudio = msgContainer.querySelector('audio') as HTMLAudioElement | null;
        let src = currentAudio?.src || currentAudio?.currentSrc || audioSrc;

        // Check if WhatsApp has native transcription in DOM
        const nativeTranscriptEl = msgContainer.querySelector(
          '[data-testid="audio-transcript"], span[class*="transcript"]'
        );
        const nativeTranscript = nativeTranscriptEl?.textContent?.trim() || null;

        // If audio src is not yet loaded into an <audio> tag, trigger WhatsApp play button
        if (!src && !nativeTranscript) {
          const playBtn = msgContainer.querySelector(
            'button[aria-label*="Reproduzir" i], button[aria-label*="Play" i], [data-testid="audio-play"], [data-testid="ptt-draft-play"], div[role="button"][aria-label*="reproduzir" i]'
          ) as HTMLElement | null;

          if (playBtn) {
            playBtn.click();
            await new Promise((r) => setTimeout(r, 300));
            currentAudio = msgContainer.querySelector('audio') as HTMLAudioElement | null;
            src = currentAudio?.src || currentAudio?.currentSrc || '';
          }
        }

        // Calculate max duration from visible bubble patterns (e.g. 0:14 vs current pos 0:00 or 0:08)
        const allMatches = Array.from(msgContainer.textContent?.matchAll(/\b(\d{1,2}):(\d{2})\b/g) || []);
        let maxDurationSec = 0;
        for (const match of allMatches) {
          const m = parseInt(match[1], 10);
          const s = parseInt(match[2], 10);
          if (m < 60 && s < 60) {
            const totalSec = m * 60 + s;
            if (totalSec < 3600 && totalSec > maxDurationSec) {
              maxDurationSec = totalSec;
            }
          }
        }

        let durationMs = maxDurationSec * 1000;
        if (currentAudio && Number.isFinite(currentAudio.duration) && currentAudio.duration > 0) {
          durationMs = Math.max(durationMs, currentAudio.duration * 1000);
        }

        const effectiveKey = resolveUniqueMessageKey(msgContainer, src);
        const result = await transcribeAudioSource(src || `audio_${msgContainer.getAttribute('data-id') || Date.now()}`, {
          element: currentAudio,
          key: effectiveKey,
          domTranscript: nativeTranscript,
          durationMs,
          onProgress: (interim) => {
            if (interim) {
              transcribeBtn.innerHTML = `⏳ Transcrevendo: "${interim.slice(-25)}"`;
            }
          },
        });

        renderTranscriptionResult(btnContainer, transcribeBtn, result.text, effectiveKey, msgContainer);
      } catch (err: any) {
        transcribeBtn.disabled = false;
        transcribeBtn.innerHTML = '❌ Erro ao transcrever';
        console.error('[La Home Zap STT] Failed to transcribe:', err);
      }
    };

    transcribeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      runTranscription();
    });

    btnContainer.appendChild(transcribeBtn);

    // Find inner message bubble wrapper to append
    const bubble =
      playerEl.closest('div[class*="bubble"], div[tabindex="-1"], div[role="row"] > div, [data-testid="msg-container"]') ||
      msgContainer;

    bubble.appendChild(btnContainer);
  });
}

function renderTranscriptionResult(
  container: HTMLElement,
  btn: HTMLButtonElement,
  text: string,
  audioKey: string,
  _msgContainer?: HTMLElement
): void {
  btn.style.display = 'none';

  let resultBox = container.querySelector('.stt-transcription-box') as HTMLElement | null;
  if (!resultBox) {
    resultBox = document.createElement('div');
    resultBox.className = 'stt-transcription-box';
    resultBox.style.background = 'rgba(6, 182, 212, 0.12)';
    resultBox.style.border = '1px solid rgba(6, 182, 212, 0.35)';
    resultBox.style.borderRadius = '8px';
    resultBox.style.padding = '6px 10px';
    resultBox.style.fontSize = '12px';
    resultBox.style.color = '#e2e8f0';
    resultBox.style.display = 'flex';
    resultBox.style.flexDirection = 'column';
    resultBox.style.gap = '4px';
    resultBox.style.maxWidth = '320px';
    resultBox.style.pointerEvents = 'auto';
    container.appendChild(resultBox);
  }

  resultBox.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
      <span style="font-weight: 700; color: #00ced1; font-size: 10.5px; text-transform: uppercase;">📝 Transcrição</span>
      <div style="display: flex; gap: 6px; align-items: center;">
        <button type="button" class="stt-retry-btn" title="Repetir reconhecimento de voz" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 10.5px; padding: 0;">🔄</button>
        <button type="button" class="stt-edit-btn" style="background: none; border: none; color: #38bdf8; cursor: pointer; font-size: 10.5px; padding: 0;">✏️ Editar</button>
        <button type="button" class="stt-copy-btn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 10.5px; padding: 0;">📋 Copiar</button>
      </div>
    </div>
    <div class="stt-transcription-text" data-transcription="${text.replace(/"/g, '&quot;')}" style="font-style: italic; line-height: 1.35; color: #cbd5e1; word-break: break-word;">
      ${text}
    </div>
  `;

  const copyBtn = resultBox.querySelector('.stt-copy-btn') as HTMLButtonElement | null;
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const contentEl = resultBox?.querySelector('.stt-transcription-text');
      const currentText = contentEl?.textContent?.trim() || text;
      navigator.clipboard.writeText(currentText).then(() => {
        copyBtn.textContent = '✅ Copiado!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copiar';
        }, 1500);
      });
    });
  }

  const editBtn = resultBox.querySelector('.stt-edit-btn') as HTMLButtonElement | null;
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const contentEl = resultBox?.querySelector('.stt-transcription-text') as HTMLElement | null;
      if (!contentEl) return;

      const isEditing = contentEl.getAttribute('contenteditable') === 'true';
      if (!isEditing) {
        contentEl.setAttribute('contenteditable', 'true');
        contentEl.focus();
        contentEl.style.background = 'rgba(0,0,0,0.2)';
        contentEl.style.padding = '4px';
        contentEl.style.borderRadius = '4px';
        editBtn.textContent = '💾 Salvar';
      } else {
        contentEl.setAttribute('contenteditable', 'false');
        contentEl.style.background = 'none';
        contentEl.style.padding = '0';
        editBtn.textContent = '✏️ Editar';
        const newText = contentEl.textContent?.trim() || '';
        contentEl.setAttribute('data-transcription', newText);
        if (audioKey) {
          saveCachedTranscription(audioKey, newText);
        }
      }
    });
  }

  const retryBtn = resultBox.querySelector('.stt-retry-btn') as HTMLButtonElement | null;
  if (retryBtn) {
    retryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resultBox?.remove();
      btn.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '📝 Transcrever Novamente';
      btn.click();
    });
  }
}

/**
 * Initializes continuous observation and injection of STT buttons in the chat view.
 */
export function initSTTObserver(): () => void {
  scanAndInjectAudioSTT();

  const observer = new MutationObserver(() => {
    scanAndInjectAudioSTT();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  const intervalId = setInterval(() => {
    scanAndInjectAudioSTT();
  }, 1000);

  return () => {
    observer.disconnect();
    clearInterval(intervalId);
  };
}
