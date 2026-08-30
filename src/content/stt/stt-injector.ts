import {
  transcribeBlobWithWhisper,
} from './whisper-engine';
import {
  resolveUniqueMessageKey,
  getCachedTranscription,
  saveCachedTranscription,
  deleteCachedTranscription,
} from './stt-engine';
import {
  initMediaInterceptor,
  recordAudioUrl,
  getCapturedAudioUrls,
} from './media-interceptor';
import {
  getAudioBlobDuration,
} from './audio-decoder';

const STT_PROCESSED_ATTR = 'data-stt-injected';

/**
 * Triggers a click on a target element across Pointer, Mouse, and native click handlers.
 */
export function triggerElementClick(el: HTMLElement): void {
  const rect = el.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;

  const mouseOpts: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    buttons: 1,
    button: 0,
    clientX,
    clientY,
    screenX: clientX,
    screenY: clientY,
  };

  try {
    el.dispatchEvent(new PointerEvent('pointerdown', { ...mouseOpts, isPrimary: true, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...mouseOpts, isPrimary: true, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
    el.dispatchEvent(new MouseEvent('click', mouseOpts));
  } catch {
    try {
      el.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
      el.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
      el.dispatchEvent(new MouseEvent('click', mouseOpts));
    } catch {
      // ignore
    }
  }

  try {
    el.click();
  } catch {
    // Ignore click errors
  }
}

/**
 * Searches for a play button or clickable audio trigger in the message bubble.
 */
export function findPlayButton(msgContainer: HTMLElement, preferredPlayer?: Element | null): HTMLElement | null {
  if (preferredPlayer) {
    const btn = (preferredPlayer.closest('button, [role="button"], [tabindex="0"]') || preferredPlayer) as HTMLElement;
    if (btn && !btn.closest('.stt-bubble-container')) {
      return btn;
    }
  }

  // 1. Direct play buttons by aria-label / data-testid
  const directBtn = msgContainer.querySelector(
    'button[aria-label*="Reproduzir" i], button[aria-label*="Play" i], button[aria-label*="Tocar" i], button[aria-label*="Pausar" i], [data-testid="audio-play"], [data-testid="ptt-draft-play"], [data-testid="audio-pause"], [data-testid="audio-download"]'
  ) as HTMLElement | null;
  if (directBtn && !directBtn.closest('.stt-bubble-container')) {
    return directBtn;
  }

  // 2. Specific audio/play icon inside a button or role=button
  const icon = msgContainer.querySelector(
    'span[data-icon="audio-play"], span[data-icon="ptt-play"], span[data-icon="play"], span[data-icon="audio-download"], span[data-icon="ptt-draft-play"], span[data-icon="play-sound"]'
  );
  if (icon) {
    const parent = icon.closest('button, [role="button"], [tabindex]') as HTMLElement | null;
    if (parent && !parent.closest('.stt-bubble-container')) {
      return parent;
    }
    return icon as HTMLElement;
  }

  // 3. Candidate buttons / role=button
  const candidates = Array.from(
    msgContainer.querySelectorAll(
      'button:not(.stt-transcribe-btn):not(.stt-copy-btn):not(.stt-edit-btn):not(.stt-retry-btn), [role="button"]:not(.stt-bubble-container *)'
    )
  ) as HTMLElement[];

  for (const el of candidates) {
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const testId = (el.getAttribute('data-testid') || '').toLowerCase();
    const title = (el.getAttribute('title') || '').toLowerCase();

    if (
      ariaLabel.includes('reproduzir') ||
      ariaLabel.includes('tocar') ||
      ariaLabel.includes('play') ||
      ariaLabel.includes('baixar') ||
      ariaLabel.includes('download') ||
      title.includes('reproduzir') ||
      title.includes('play') ||
      testId.includes('play') ||
      testId.includes('audio') ||
      testId.includes('download')
    ) {
      return el;
    }
  }

  return candidates[0] || null;
}

/**
 * Finds all valid audio elements in document or container with a blob: or media URL.
 */
function findValidAudioElement(container?: ParentNode): HTMLAudioElement | null {
  const root = container || document;
  const audios = Array.from(root.querySelectorAll('audio'));
  for (const a of audios) {
    const src = a.src || a.currentSrc || '';
    if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
      return a;
    }
  }
  return null;
}

/**
 * Robustly extracts the audio blob URL for THIS specific message container,
 * triggering the WhatsApp play button if needed and strictly avoiding cross-bubble audio contamination.
 */
export async function extractAudioSourceFromContainer(
  msgContainer: HTMLElement,
  initialSrc?: string,
  preferredPlayer?: Element | null
): Promise<{ src: string; audioElement: HTMLAudioElement | null }> {
  // Extract target duration from bubble text (e.g. 0:14 -> 14s, 0:09 -> 9s)
  const text = msgContainer.textContent || '';
  const allMatches = Array.from(text.matchAll(/\b(\d{1,2}):(\d{2})\b/g));
  let targetDurationSec = 0;
  for (const match of allMatches) {
    const m = parseInt(match[1], 10);
    const s = parseInt(match[2], 10);
    if (m < 60 && s < 60) {
      const sec = m * 60 + s;
      if (sec > 0 && sec < 1800) {
        targetDurationSec = sec;
        break;
      }
    }
  }

  // 1. Check direct initial src or container-scoped audio element
  if (initialSrc && (initialSrc.startsWith('blob:') || initialSrc.startsWith('data:') || initialSrc.startsWith('http'))) {
    recordAudioUrl(initialSrc);
    return { src: initialSrc, audioElement: msgContainer.querySelector('audio') };
  }

  let currentAudio = findValidAudioElement(msgContainer);
  if (currentAudio) {
    const src = currentAudio.src || currentAudio.currentSrc || '';
    if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
      recordAudioUrl(src);
      return { src, audioElement: currentAudio };
    }
  }

  // 2. Check active audio element playing right now in the document (ONLY if duration matches)
  const allDocAudios = Array.from(document.querySelectorAll('audio'));
  const activePlayingAudio = allDocAudios.find(
    (a) =>
      (a.src?.startsWith('blob:') || a.currentSrc?.startsWith('blob:')) &&
      (!a.paused || a.currentTime > 0) &&
      (targetDurationSec === 0 || !Number.isFinite(a.duration) || a.duration === 0 || Math.abs(a.duration - targetDurationSec) <= 1.5)
  );
  if (activePlayingAudio) {
    const src = activePlayingAudio.src || activePlayingAudio.currentSrc;
    try { activePlayingAudio.pause(); } catch { /* ignore */ }
    recordAudioUrl(src);
    return { src, audioElement: activePlayingAudio };
  }

  // 3. Trigger WhatsApp play button for THIS message bubble to load its specific blob
  const playBtn = findPlayButton(msgContainer, preferredPlayer);
  if (playBtn) {
    let capturedUrl: string | null = null;

    const onCapturedBlob = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.url) {
        capturedUrl = detail.url;
      }
    };
    const onCapturedAudio = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.src) {
        capturedUrl = detail.src;
      }
    };
    const onPostMessage = (e: MessageEvent) => {
      if (e.data?.type === '__lz_blob_created' && e.data.url) {
        capturedUrl = e.data.url;
      } else if ((e.data?.type === '__lz_audio_play' || e.data?.type === '__lz_audio_src') && e.data.src) {
        capturedUrl = e.data.src;
      }
    };

    window.addEventListener('__lz_blob_created', onCapturedBlob);
    window.addEventListener('__lz_audio_play', onCapturedAudio);
    window.addEventListener('__lz_audio_src', onCapturedAudio);
    window.addEventListener('message', onPostMessage);

    try {
      triggerElementClick(playBtn);

      // Poll for up to 3000ms for WhatsApp to attach the audio blob or fire interceptor event
      const startTime = Date.now();
      while (Date.now() - startTime < 3000) {
        if (capturedUrl) {
          Array.from(document.querySelectorAll('audio')).forEach((a) => {
            try { a.pause(); } catch { /* ignore */ }
          });
          return { src: capturedUrl, audioElement: null };
        }

        await new Promise((r) => setTimeout(r, 60));

        if (capturedUrl) {
          Array.from(document.querySelectorAll('audio')).forEach((a) => {
            try { a.pause(); } catch { /* ignore */ }
          });
          return { src: capturedUrl, audioElement: null };
        }

        // Check within msgContainer
        currentAudio = findValidAudioElement(msgContainer);
        if (currentAudio) {
          const src = currentAudio.src || currentAudio.currentSrc || '';
          if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
            try { currentAudio.pause(); } catch { /* ignore */ }
            recordAudioUrl(src);
            return { src, audioElement: currentAudio };
          }
        }

        // Check document-wide for newly active playing audio element matching duration
        const docAudios = Array.from(document.querySelectorAll('audio'));
        for (const a of docAudios) {
          const src = a.src || a.currentSrc || '';
          if (
            src &&
            (src.startsWith('blob:') || src.startsWith('data:')) &&
            (!a.paused || a.currentTime > 0) &&
            (targetDurationSec === 0 || !Number.isFinite(a.duration) || a.duration === 0 || Math.abs(a.duration - targetDurationSec) <= 1.5)
          ) {
            try { a.pause(); } catch { /* ignore */ }
            recordAudioUrl(src);
            return { src, audioElement: a };
          }
        }
      }
    } finally {
      window.removeEventListener('__lz_blob_created', onCapturedBlob);
      window.removeEventListener('__lz_audio_play', onCapturedAudio);
      window.removeEventListener('__lz_audio_src', onCapturedAudio);
      window.removeEventListener('message', onPostMessage);
    }
  }

  // 4. Multi-level Fallback: Duration-based matching from memory registry
  const capturedUrls = getCapturedAudioUrls();
  if (capturedUrls.length > 0) {
    if (targetDurationSec > 0) {
      let bestUrl: string | null = null;
      let minDiff = Infinity;

      for (const url of capturedUrls) {
        const dur = await getAudioBlobDuration(url);
        if (dur > 0) {
          const diff = Math.abs(dur - targetDurationSec);
          if (diff <= 1.5 && diff < minDiff) {
            minDiff = diff;
            bestUrl = url;
          }
        }
      }

      if (bestUrl) {
        return { src: bestUrl, audioElement: null };
      }
    }

    // If only 1 captured url exists, take it directly
    if (capturedUrls.length === 1) {
      return { src: capturedUrls[0], audioElement: null };
    }
    // If multiple, fallback to latest
    return { src: capturedUrls[capturedUrls.length - 1], audioElement: null };
  }

  return { src: '', audioElement: null };
}

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

    if (audioKey && !audioKey.startsWith('stt_unknown_')) {
      getCachedTranscription(audioKey).then((cached) => {
        if (cached) {
          renderTranscriptionResult(btnContainer, transcribeBtn, cached, audioKey, msgContainer);
        }
      });
    }

    const runTranscription = async (forceRetranscribe = false) => {
      transcribeBtn.style.display = 'block';
      transcribeBtn.disabled = true;
      transcribeBtn.style.color = '#00ced1';
      transcribeBtn.style.borderColor = 'rgba(6, 182, 212, 0.4)';
      transcribeBtn.style.background = 'rgba(6, 182, 212, 0.15)';
      transcribeBtn.innerHTML = '⏳ Preparando áudio...';

      try {
        // Check if WhatsApp has native transcription in DOM (unless forcing re-transcription)
        let nativeTranscript: string | null = null;
        if (!forceRetranscribe) {
          const nativeTranscriptEl = msgContainer.querySelector(
            '[data-testid="audio-transcript"], span[class*="transcript"]'
          );
          nativeTranscript = nativeTranscriptEl?.textContent?.trim() || null;
        }

        // Extract audio source and element
        const { src, audioElement: currentAudio } = await extractAudioSourceFromContainer(
          msgContainer,
          audioSrc,
          playerEl
        );

        if (currentAudio) {
          try {
            currentAudio.currentTime = 0;
          } catch {
            // ignore
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

        if (!src && !nativeTranscript) {
          transcribeBtn.disabled = false;
          transcribeBtn.innerHTML = '⚠️ Inicie o áudio e clique para transcrever';
          transcribeBtn.style.color = '#facc15';
          transcribeBtn.style.borderColor = 'rgba(234, 179, 8, 0.5)';
          transcribeBtn.style.background = 'rgba(234, 179, 8, 0.15)';
          return;
        }

        const effectiveKey = resolveUniqueMessageKey(msgContainer, src);
        if (forceRetranscribe) {
          await deleteCachedTranscription(effectiveKey);
        }

        const result = await transcribeBlobWithWhisper(src, {
          element: currentAudio,
          key: effectiveKey,
          domTranscript: nativeTranscript,
          durationMs,
          force: forceRetranscribe,
          fallbackToWebSpeech: false,
          onProgress: (statusText) => {
            if (statusText) {
              transcribeBtn.innerHTML = statusText;
            }
          },
        });

        renderTranscriptionResult(btnContainer, transcribeBtn, result.text, effectiveKey, msgContainer, () => runTranscription(true));
      } catch (err: any) {
        transcribeBtn.disabled = false;
        transcribeBtn.innerHTML = '❌ Erro ao transcrever';
        console.error('[La Home Zap STT] Failed to transcribe:', err);
      }
    };

    transcribeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      runTranscription(false);
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
  _msgContainer?: HTMLElement,
  onRetry?: () => void
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
    retryBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (audioKey) {
        await deleteCachedTranscription(audioKey);
      }
      resultBox?.remove();
      if (onRetry) {
        onRetry();
      } else {
        btn.style.display = 'block';
        btn.disabled = false;
        btn.click();
      }
    });
  }
}

/**
 * Initializes continuous observation and injection of STT buttons in the chat view.
 */
export function initSTTObserver(): () => void {
  const cleanupInterceptor = initMediaInterceptor();
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
    cleanupInterceptor();
    observer.disconnect();
    clearInterval(intervalId);
  };
}
