import { describe, it, expect, beforeEach } from 'vitest';
import { runDailyExport } from '../pipeline';

const NOW = new Date(2026, 7, 5, 15, 0, 0).getTime();

function buildChatlist() {
  const row = document.createElement('div');
  row.setAttribute('data-testid', 'cell-frame-container');
  row.innerHTML = `<span data-testid="chat-title">Maria</span><span>14:30</span>`;
  document.body.appendChild(row);
}

function buildConversationPanel() {
  const main = document.createElement('div');
  main.id = 'main';
  main.innerHTML = `
    <header data-testid="conversation-header">
      <span dir="auto" title="Maria">Maria</span>
    </header>
    <div class="message-in" data-id="m1">
      <div class="copyable-text" data-pre-plain-text="[14:30, 05/08/2026] Maria: ">
        <div><span class="selectable-text"><span>Olá, tudo bem?</span></span></div>
      </div>
    </div>
    <div class="message-out" data-id="m2">
      <div class="copyable-text" data-pre-plain-text="[14:31, 05/08/2026] Você: ">
        <div><span class="selectable-text"><span>Sim! E você?</span></span></div>
      </div>
    </div>
    <div class="message-in" data-id="m3">
      <div class="copyable-text" data-pre-plain-text="[14:00, 02/08/2026] Maria: ">
        <div><span class="selectable-text"><span>Mensagem antiga</span></span></div>
      </div>
    </div>
  `;
  document.body.appendChild(main);
}

describe('runDailyExport', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exports only messages inside the 24h window', async () => {
    buildChatlist();
    buildConversationPanel();

    const outcome = await runDailyExport({ now: NOW });

    expect(outcome.files).toHaveLength(1);
    expect(outcome.files[0].chatName).toBe('Maria');
    expect(outcome.files[0].messageCount).toBe(2);
    expect(outcome.files[0].filename).toBe('conversa_Maria.html');
    expect(outcome.files[0].html).toContain('Maria');
    expect(outcome.files[0].html).toContain('Olá, tudo bem?');
    expect(outcome.files[0].html).not.toContain('Mensagem antiga');
    expect(outcome.skipped).toEqual([]);
    expect(outcome.errors).toEqual([]);
  });

  it('reports chats without 24h activity as skipped', async () => {
    buildChatlist();
    const main = document.createElement('div');
    main.id = 'main';
    main.innerHTML = `
      <header data-testid="conversation-header">
        <span dir="auto" title="Maria">Maria</span>
      </header>
      <div class="message-in" data-id="m1">
        <div class="copyable-text" data-pre-plain-text="[14:00, 02/08/2026] Maria: ">
          <div><span class="selectable-text"><span>Mensagem antiga</span></span></div>
        </div>
      </div>
    `;
    document.body.appendChild(main);

    const outcome = await runDailyExport({ now: NOW });

    expect(outcome.files).toHaveLength(0);
    expect(outcome.skipped).toEqual(['Maria']);
  });

  it('reports errors when a chat fails to open on time', async () => {
    buildChatlist();
    buildConversationPanel();

    // Change the conversation header so the opened chat never matches,
    // forcing waitForChatOpen to time out quickly.
    const headerTitle = document.querySelector('[data-testid="conversation-header"] span[dir="auto"]') as HTMLElement;
    headerTitle.setAttribute('title', 'Outra Pessoa');
    headerTitle.textContent = 'Outra Pessoa';

    const outcome = await runDailyExport({ now: NOW, waitForChatOpenTimeout: 300 });

    expect(outcome.files).toHaveLength(0);
    expect(outcome.errors).toEqual(['Maria']);
  });

  describe('mergeExportedMessages', () => {
    it('merges historical and new messages without duplication', async () => {
      const { mergeExportedMessages } = await import('../pipeline');
      const existing = [
        { id: '1', body: 'Msg 1', sender: 'Maria', timestampMs: 1000, isOut: false, media: null },
        { id: '2', body: 'Msg 2', sender: 'Você', timestampMs: 2000, isOut: true, media: null },
      ];
      const incoming = [
        { id: '2', body: 'Msg 2', sender: 'Você', timestampMs: 2000, isOut: true, media: null },
        { id: '3', body: 'Msg 3', sender: 'Maria', timestampMs: 3000, isOut: false, media: null },
      ];

      const merged = mergeExportedMessages(existing, incoming);
      expect(merged).toHaveLength(3);
      expect(merged.map((m) => m.id)).toEqual(['1', '2', '3']);
    });
  });
});