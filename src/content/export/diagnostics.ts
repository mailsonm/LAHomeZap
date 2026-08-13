/**
 * TEMPORARY diagnostic tooling for the conversation export pipeline.
 *
 * Dumps facts about the live WhatsApp Web DOM (selectors, chatlist rows and
 * header detection) so broken selectors can be identified from the browser
 * console. Remove after the diagnostics round is complete.
 */

import { SELECTORS } from '../../utils/selectors';
import { getActiveChatName } from '../dom-helpers';
import { areChatNamesMatching, getChatlistRowName } from './active-chats';

/** True when the given selector matches at least one element. */
function has(selector: string): boolean {
  return document.querySelector(selector) !== null;
}

/** Counts elements matching the given selector. */
function count(selector: string): number {
  return document.querySelectorAll(selector).length;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Logs a concise snapshot of the live WhatsApp Web DOM relevant to export. */
export function logExportDiagnostics(label: string): void {
  const chatListRows = Array.from(document.querySelectorAll(SELECTORS.chatlistRow));

  console.group(`[La Home Zap] Export DOM diagnostic — ${label}`);

  console.log('[La Home Zap][diag] headerPresent =', has(SELECTORS.chatHeader));
  console.log('[La Home Zap][diag] #main =', has('#main'));
  console.log('[La Home Zap][diag] #side =', has('#side'));
  console.log('[La Home Zap][diag] #app =', has('#app'));
  console.log('[La Home Zap][diag] conversation-panel =', count('[data-testid="conversation-panel"]'));
  console.log('[La Home Zap][diag] conversation-header =', count('[data-testid="conversation-header"]'));
  console.log('[La Home Zap][diag] conversation-title =', count('[data-testid="conversation-title"]'));
  console.log('[La Home Zap][diag] conversation-info-header =', count('[data-testid="conversation-info-header"]'));
  console.log('[La Home Zap][diag] messageRows (.message-in/out) =', count('.message-in, .message-out'));
  console.log('[La Home Zap][diag] prePlainText =', count('[data-pre-plain-text]'));
  console.log('[La Home Zap][diag] msg-container =', count('[data-testid="msg-container"]'));
  console.log('[La Home Zap][diag] msg-text =', count('[data-testid="msg-text"]'));
  console.log('[La Home Zap][diag] chatlistRows =', chatListRows.length);
  console.log('[La Home Zap][diag] activeChatName =', getActiveChatName());

  const headerEl = document.querySelector('[data-testid="conversation-header"]');
  console.log(
    '[La Home Zap][diag] header innerText (200) =',
    JSON.stringify((headerEl?.textContent ?? '').slice(0, 200))
  );

  const testIdSweep = collectRelevantTestIds();
  console.log('[La Home Zap][diag] relevant data-testid values =', JSON.stringify(testIdSweep));
  console.log('[La Home Zap][diag] app skeleton =', JSON.stringify(collectSkeleton()));

  if (chatListRows.length > 0) {
    const samples = chatListRows.slice(0, 5).map((row) => {
      const titleEl = row.querySelector(SELECTORS.chatlistRowName);
      return {
        title: titleEl?.getAttribute('title') ?? null,
        textContent: titleEl?.textContent?.trim() ?? null,
      };
    });
    console.log('[La Home Zap][diag] chatTitleSamples =', JSON.stringify(samples));
    console.log(
      '[La Home Zap][diag] firstRow outerHTML (500) =',
      JSON.stringify(chatListRows[0]?.outerHTML.slice(0, 500))
    );
  }

  const firstMsg = document.querySelector('[data-testid="msg-container"]');
  console.log(
    '[La Home Zap][diag] first msg-container outerHTML (1100) =',
    JSON.stringify(firstMsg?.outerHTML.slice(0, 1100) ?? null)
  );
  console.log(
    '[La Home Zap][diag] tail-out count =',
    count('[data-testid*="tail-out"]')
  );
  console.log(
    '[La Home Zap][diag] selectable-text count =',
    count('span.selectable-text')
  );

  console.groupEnd();
}

/**
 * Opens the chat for `name` using the same matching logic as openChatByName,
 * trying progressively stronger synthetic events, and logs what the header
 * reports after each attempt. Lets us see whether the click fails or whether
 * only the active-name reader is broken.
 */
export async function runChatSwitchProbe(name: string): Promise<void> {
  const rows = Array.from(document.querySelectorAll(SELECTORS.chatlistRow));
  const row = rows.find((r) => areChatNamesMatching(getChatlistRowName(r), name)) as HTMLElement | undefined;

  console.group(`[La Home Zap] Chat switch probe — target "${name}"`);
  if (!row) {
    console.log('[La Home Zap][probe] row not found in chatlist');
    console.groupEnd();
    return;
  }

  console.log(
    '[La Home Zap][probe] row outerHTML (600) =',
    JSON.stringify(row.outerHTML.slice(0, 600))
  );
  const clickableCells = Array.from(
    row.querySelectorAll(
      '[role="button"], [tabindex], a, [data-testid="cell-frame-title"], [data-testid="chat-title"], [data-testid="conversation-title"]'
    )
  ).map((el) => ({
    tag: el.tagName,
    role: el.getAttribute('role'),
    testid: el.getAttribute('data-testid'),
    tabindex: el.getAttribute('tabindex'),
    text: (el.textContent ?? '').trim().slice(0, 40),
  }));
  console.log('[La Home Zap][probe] clickable cells =', JSON.stringify(clickableCells.slice(0, 8)));
  console.log('[La Home Zap][probe] before click activeChatName =', getActiveChatName());

  const header = () => (document.querySelector('[data-testid="conversation-header"]')?.textContent ?? '').slice(0, 150);
  const switched = () => areChatNamesMatching(getActiveChatName(), name);

  // Attempt 1: plain element.click() on the row
  row.click();
  await sleep(1800);
  console.log('[La Home Zap][probe] after .click() activeChatName =', getActiveChatName());
  console.log('[La Home Zap][probe] after .click() headerText =', JSON.stringify(header()));
  console.log('[La Home Zap][probe] after .click() msgCount =', document.querySelectorAll('[data-testid="msg-container"]').length);

  // Attempt 2: native PointerEvent + MouseEvent sequence on the row
  if (!switched()) {
    const opts: MouseEventInit = { bubbles: true, cancelable: true };
    try {
      row.dispatchEvent(new PointerEvent('pointerdown', opts));
      row.dispatchEvent(new MouseEvent('mousedown', opts));
      row.dispatchEvent(new MouseEvent('mouseup', opts));
      row.dispatchEvent(new MouseEvent('click', opts));
    } catch {
      const mouseOpts = { bubbles: true, cancelable: true };
      row.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
      row.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
      row.dispatchEvent(new MouseEvent('click', mouseOpts));
    }
    await sleep(1800);
    console.log('[La Home Zap][probe] after native pointer+click activeChatName =', getActiveChatName());
    console.log('[La Home Zap][probe] after native pointer+click headerText =', JSON.stringify(header()));
  }

  // Attempt 3: click the title cell / closest interactive ancestor
  if (!switched()) {
    const titleEl =
      row.querySelector('[data-testid="cell-frame-title"]') ??
      row.querySelector('[data-testid="chat-title"]') ??
      row.querySelector('span[dir="auto"]');
    const clickTarget = (titleEl?.closest('[role="button"], [tabindex], a') ?? titleEl) as HTMLElement | null;
    if (clickTarget) {
      clickTarget.click();
      await sleep(1800);
      console.log('[La Home Zap][probe] after inner click activeChatName =', getActiveChatName());
      console.log('[La Home Zap][probe] after inner click headerText =', JSON.stringify(header()));
      console.log('[La Home Zap][probe] clicked cell tag/testid =', clickTarget.tagName, clickTarget.getAttribute('data-testid'));
    } else {
      console.log('[La Home Zap][probe] no inner clickable target found');
    }
  }

  console.groupEnd();
}

const RELEVANT_TESTID_PATTERN =
  /conversation|chat|header|msg|message|pane|thread|panel|title|compose|draw|main|wam-main|dc-messages/i;

/** Collects the unique data-testid values that look relevant to the UI structure. */
function collectRelevantTestIds(): string[] {
  const found = new Set<string>();
  document.querySelectorAll('[data-testid]').forEach((el) => {
    const value = el.getAttribute('data-testid');
    if (value && RELEVANT_TESTID_PATTERN.test(value)) {
      found.add(value);
    }
  });
  return Array.from(found).sort();
}

/** Collects the top-level skeleton of #app for structural insight. */
function collectSkeleton(): { tag: string; id: string | null; cls: string | null; testid: string | null }[] {
  const app = document.querySelector('#app');
  if (!app) return [];
  return Array.from(app.children).slice(0, 12).map((el) => ({
    tag: el.tagName,
    id: (el as HTMLElement).id || null,
    cls: (el as HTMLElement).className
      ? String((el as HTMLElement).className).slice(0, 120)
      : null,
    testid: el.getAttribute('data-testid'),
  }));
}