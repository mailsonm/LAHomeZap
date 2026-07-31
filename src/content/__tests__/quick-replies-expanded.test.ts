import { describe, it, expect } from 'vitest';
import type { QuickReply, QuickReplyAttachment } from '../../types';
import { dataUrlToFile } from '../kanban/quickReplySender';

describe('QuickReplies Expanded & Attachments Unit Tests', () => {
  it('should support quick reply objects with up to 4000 characters of text', () => {
    const longText = 'A'.repeat(4000);
    const reply: QuickReply = {
      id: '123',
      shortcut: 'longomessage',
      text: longText,
    };

    expect(reply.text.length).toBe(4000);
    expect(reply.shortcut).toBe('longomessage');
  });

  it('should support attaching images and PDFs to a QuickReply object', () => {
    const attachment: QuickReplyAttachment = {
      id: 'att-1',
      name: 'relatorio_atendimento.pdf',
      type: 'application/pdf',
      size: 102450,
      dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
    };

    const reply: QuickReply = {
      id: '456',
      shortcut: 'pdfdoc',
      text: 'Segue em anexo o relatório solicitado.',
      attachment,
    };

    expect(reply.attachment).toBeDefined();
    expect(reply.attachment?.name).toBe('relatorio_atendimento.pdf');
    expect(reply.attachment?.type).toBe('application/pdf');
  });

  it('should convert dataUrl to File object correctly', () => {
    const fakeDataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ='; // "Hello World"
    const file = dataUrlToFile(fakeDataUrl, 'test.txt', 'text/plain');

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('test.txt');
    expect(file.type).toBe('text/plain');
    expect(file.size).toBe(11);
  });

  it('should dispatch attachment to DOM chat input via ClipboardEvent', async () => {
    const { dispatchAttachmentToWhatsApp } = await import('../kanban/quickReplySender');
    const { storageLocalSet } = await import('../../utils/storage');

    // Create mock chat input footer in DOM
    const footer = document.createElement('footer');
    const input = document.createElement('div');
    input.setAttribute('contenteditable', 'true');
    footer.appendChild(input);
    document.body.appendChild(footer);

    let eventDispatched: any = null;
    input.addEventListener('paste', (e) => {
      eventDispatched = e;
    });

    const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await storageLocalSet('attachment_test123', fakeDataUrl);

    const attachment: QuickReplyAttachment = {
      id: 'att-123',
      name: 'logo.png',
      type: 'image/png',
      size: 70,
    };

    const success = await dispatchAttachmentToWhatsApp('test123', attachment);

    expect(success).toBe(true);
    expect(eventDispatched).not.toBeNull();
    expect(eventDispatched?.type).toBe('paste');

    document.body.removeChild(footer);
  });
});

