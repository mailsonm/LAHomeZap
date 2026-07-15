/**
 * Signature formatting and injection logic.
 */

import { SELECTORS } from '../utils/selectors';
import type { Attendant, Settings } from '../types';
import { capitalize, insertTextWithNewlines, isChatInput } from './dom-helpers';

/**
 * Scans the active chat DOM for recent sent messages containing the signature.
 * Prevents multiple signatures from polluting the conversation history.
 */
export function hasRecentSignature(attendantName: string): boolean {
  const sentMessages = document.querySelectorAll(SELECTORS.messageOut);
  if (sentMessages.length === 0) {
    return false;
  }

  const targetText = `Atendente: ${attendantName}`.toLowerCase();
  const targetBold = `*Atendente: ${attendantName}*`.toLowerCase();

  const limit = Math.min(sentMessages.length, 3);
  for (let i = 0; i < limit; i++) {
    const message = sentMessages[sentMessages.length - 1 - i];
    const text = (message.textContent || '').toLowerCase();

    if (text.includes(targetText) || text.includes(targetBold)) {
      return true;
    }
  }

  return false;
}

/**
 * Formats the signature of the active attendant based on its style configurations.
 */
export function formatAttendantSignature(attendant: Attendant, settings: Settings): string {
  let name = attendant.name;
  if (settings.capitalizeInitial) {
    name = capitalize(name);
  }

  // 1. Moldura (brackets)
  if (attendant.moldura) {
    name = `[${name}]`;
  }

  // 2. Itálico (italic)
  if (attendant.italico) {
    name = `_${name}_`;
  }

  // 3. Negrito (bold)
  if (attendant.negrito !== false) { // Default is true if undefined
    name = `*${name}*`;
  }

  // 4. Destaque (blockquote)
  if (attendant.destaque) {
    name = `> ${name}`;
  }

  // 5. Quebra linha (newline after signature)
  if (attendant.quebraLinha !== false) { // Default is true if undefined
    name = `${name}\n`;
  } else {
    name = `${name} `;
  }

  return name;
}

/**
 * Resolves a display name with capitalization applied based on settings.
 */
export function resolveDisplayName(rawName: string, settings: Settings): string {
  return settings.capitalizeInitial ? capitalize(rawName) : rawName;
}

/**
 * Injects the attendant signature block into the given editable input.
 */
export function injectSignatureIntoInput(
  target: HTMLElement,
  attendantName: string,
  attendants: Attendant[],
  settings: Settings
) {
  let name = attendantName;
  if (settings.capitalizeInitial) {
    name = capitalize(name);
  }

  if (settings.dontRepeatInChat && hasRecentSignature(name)) {
    return;
  }

  // Find active attendant object to retrieve format flags
  const activeAtt = attendants.find(a => a.name.toLowerCase() === attendantName.toLowerCase()) || {
    id: 'default',
    name: attendantName,
    isFavorite: true,
    quebraLinha: true,
    negrito: true
  };

  const signature = formatAttendantSignature(activeAtt, settings);

  try {
    insertTextWithNewlines(target, signature);
  } catch (error) {
    console.error('[La Home Zap] Failed to inject signature:', error);
  }
}

/**
 * Handles beforeinput event to inject the signature only when the user starts typing.
 */
export function handleBeforeInput(
  event: InputEvent,
  attendantName: string,
  attendants: Attendant[],
  settings: Settings
) {
  const target = event.target as HTMLElement;
  if (!target || !isChatInput(target)) return;

  const textContent = target.textContent || '';
  if (textContent.trim().length === 0 && event.inputType && event.inputType.startsWith('insert')) {
    event.preventDefault();

    let name = attendantName;
    if (settings.capitalizeInitial) {
      name = capitalize(name);
    }

    if (settings.dontRepeatInChat && hasRecentSignature(name)) {
      // If we skip the signature, we should still insert the user's typed/pasted text
      let typedText = '';
      if (event.inputType === 'insertText') {
        typedText = event.data || '';
      } else if (event.inputType === 'insertFromPaste') {
        typedText = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
      }
      if (typedText) {
        try {
          insertTextWithNewlines(target, typedText);
        } catch (error) {
          console.error('[La Home Zap] Failed to inject text:', error);
        }
      }
      return;
    }

    // Find active attendant object to retrieve format flags
    const activeAtt = attendants.find(a => a.name.toLowerCase() === attendantName.toLowerCase()) || {
      id: 'default',
      name: attendantName,
      isFavorite: true,
      quebraLinha: true,
      negrito: true
    };

    const signature = formatAttendantSignature(activeAtt, settings);

    let typedText = '';
    if (event.inputType === 'insertText') {
      typedText = event.data || '';
    } else if (event.inputType === 'insertFromPaste') {
      typedText = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
    }

    const fullText = signature + typedText;

    try {
      insertTextWithNewlines(target, fullText);
    } catch (error) {
      console.error('[La Home Zap] Failed to inject signature and text:', error);
    }
  }
}
