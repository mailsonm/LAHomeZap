/**
 * Shared DOM helper utilities for the La Home Zap content script.
 */

import { SELECTORS } from '../utils/selectors';

/**
 * Helper to capitalize the first letter of a string.
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Checks if the element is the WhatsApp Web main text input (not the search bar).
 */
export function isChatInput(element: HTMLElement): boolean {
  if (element.matches(SELECTORS.chatInput)) {
    return true;
  }

  if (element.matches(SELECTORS.chatInputFallback)) {
    if (element.matches(SELECTORS.searchInput)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Inserts text into a contenteditable element simulating Shift+Enter for newlines.
 * This ensures compatibility with Draft.js used in WhatsApp Web.
 */
export function insertTextWithNewlines(input: HTMLElement, text: string) {
  input.focus();
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      try {
        document.execCommand('insertText', false, lines[i]);
      } catch (e) {
        console.error('[La Home Zap] execCommand fail:', e);
      }
    }

    // Dispatch Shift+Enter event to create a real newline
    if (i !== lines.length - 1) {
      const shiftEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(shiftEnterEvent);
    }
  }
}

/**
 * Helper to dynamically wait for a DOM element.
 */
export function waitForElement(selector: string, timeout = 3000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el as HTMLElement);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el as HTMLElement);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Gets the active chat/contact name from the conversation header.
 * Uses a 4-tier fallback strategy for resilience against WhatsApp DOM changes.
 */
export function getActiveChatName(): string | null {
  const headerElement = document.querySelector(SELECTORS.chatHeader);
  if (!headerElement) {
    return null;
  }

  // 1. Look for span with dir="auto" that has a title
  const titleElement = headerElement.querySelector('span[dir="auto"][title]') as HTMLElement;
  if (titleElement && titleElement.title) {
    return titleElement.title.trim();
  }

  // 2. Look inside the conversation-info-header container (using innerText line breaks)
  const infoHeader = headerElement.querySelector(SELECTORS.conversationInfoHeader) as HTMLElement;
  if (infoHeader) {
    const text = (infoHeader.innerText || '').trim();
    if (text) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        return lines[0];
      }
    }
  }

  // 3. Fallback to the first span with dir="auto" that has text inside the header
  const spans = Array.from(headerElement.querySelectorAll('span[dir="auto"]')) as HTMLElement[];
  for (const span of spans) {
    const text = (span.textContent || '').trim();
    // Avoid picking up status text like "online" or "last seen"
    if (text && !text.includes('visto por último') && !text.toLowerCase().includes('online') && !text.toLowerCase().includes('digitando')) {
      return text;
    }
  }

  // 4. Generic fallback for any span with a title
  const anyTitleEl = headerElement.querySelector('[title]') as HTMLElement;
  if (anyTitleEl && anyTitleEl.getAttribute('title')) {
    return anyTitleEl.getAttribute('title')!.trim();
  }

  return null;
}

/**
 * Finds the WhatsApp chat input element (tries primary, then fallback selector).
 */
export function getChatInput(): HTMLDivElement | null {
  return (
    document.querySelector(SELECTORS.chatInput) ||
    document.querySelector(SELECTORS.chatInputFallback)
  ) as HTMLDivElement | null;
}

/**
 * Clicks the WhatsApp send button after a short delay.
 */
export function clickSendButton(delayMs = 150) {
  setTimeout(() => {
    const sendBtn = document.querySelector(SELECTORS.sendButton) as HTMLElement;
    if (sendBtn) {
      sendBtn.click();
    }
  }, delayMs);
}

/**
 * Checks if WhatsApp Web's full-screen media viewer lightbox is open.
 */
export function isMediaViewerOpen(): boolean {
  if (document.querySelector('[data-animate-media-viewer="true"], [data-testid="media-viewer"], [data-testid="media-viewer-modal"]')) {
    return true;
  }

  const dialog = document.querySelector('div[role="dialog"], div[data-animate-modal-popup="true"]');
  if (dialog) {
    const hasMediaControls = dialog.querySelector(
      'span[data-icon="x-viewer"], span[data-icon="zoom-in"], span[data-icon="rotate"], [data-testid="media-viewer-close-btn"]'
    );
    if (hasMediaControls) return true;
  }

  return false;
}
