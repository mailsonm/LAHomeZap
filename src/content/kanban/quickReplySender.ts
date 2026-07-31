import type { QuickReplyAttachment } from '../../types';
import { storageLocalGet } from '../../utils/storage';

/**
 * Converts a Base64 Data URL string to a JavaScript File object.
 */
export function dataUrlToFile(dataUrl: string, fileName: string, fallbackType: string): File {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : fallbackType;
  const base64Data = parts.length > 1 ? parts[1] : parts[0];
  const binaryStr = atob(base64Data);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return new File([bytes], fileName, { type: mime });
}

/**
 * Dispatches an attachment (Image or PDF) to the WhatsApp Web chat window.
 * Uses a synthetic paste DataTransfer event on the active chat box or file input trigger.
 */
export async function dispatchAttachmentToWhatsApp(replyId: string, attachmentMeta: QuickReplyAttachment): Promise<boolean> {
  try {
    let dataUrl = attachmentMeta.dataUrl;

    if (!dataUrl) {
      dataUrl = await storageLocalGet<string>(`attachment_${replyId}`);
    }

    if (!dataUrl) {
      console.warn('[Lar Home Zap] Attachment dataUrl not found for reply:', replyId);
      return false;
    }

    const file = dataUrlToFile(dataUrl, attachmentMeta.name, attachmentMeta.type);
    const chatInput = document.querySelector<HTMLElement>('footer [contenteditable="true"], div[contenteditable="true"][data-tab]');

    if (!chatInput) {
      console.warn('[Lar Home Zap] Active chat input box not found in DOM.');
      return false;
    }

    chatInput.focus();

    // Create DataTransfer container with file
    let dataTransfer: DataTransfer | any;
    if (typeof DataTransfer !== 'undefined') {
      dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
    } else {
      dataTransfer = { items: { add: () => {} }, files: [file] };
    }

    // Dispatch synthetic paste event
    let pasteEvent: Event;
    if (typeof ClipboardEvent !== 'undefined') {
      pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      });
    } else {
      pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      (pasteEvent as any).clipboardData = dataTransfer;
    }

    chatInput.dispatchEvent(pasteEvent);
    return true;
  } catch (err) {
    console.error('[Lar Home Zap] Failed to dispatch attachment to WhatsApp:', err);
    return false;
  }
}
