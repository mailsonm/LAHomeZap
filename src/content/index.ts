/**
 * La Home Zap — Content Script Bootstrap
 *
 * This is the entry point for the WhatsApp Web content script.
 * It initializes configuration, sets up event listeners, and coordinates
 * the modular subsystems for signature, attendance, transfer, collision, and badges.
 */

import { SELECTORS } from '../utils/selectors';
import { hasChromeStorage, onStorageChanged, storageSet } from '../utils/storage';
import type { Attendant, Settings, ActiveAttendances } from '../types';
import { DEFAULT_SETTINGS, FALLBACK_ATTENDANT_NAME } from '../constants';
import { injectKanban, checkAndInjectPhrasebar } from './kanban/index';
import { isChatInput, getChatInput } from './dom-helpers';
import { resolveDisplayName, injectSignatureIntoInput } from './signature';
import { checkAndInjectAttendanceButton } from './attendance';
import { triggerTransferAutomation } from './transfer';
import { checkAndInjectChatlistBadges } from './badges';

// ---------------------------------------------------------------------------
// Module-level cached state
// ---------------------------------------------------------------------------

let cachedAttendantName = FALLBACK_ATTENDANT_NAME;
let cachedAttendants: Attendant[] = [];
let cachedSettings: Settings = DEFAULT_SETTINGS;
let activeAttendances: ActiveAttendances = {};
let shouldReinjectSignature = false;

// Mutable ref object for passing to functions that need to update lastAlertedChat
const lastAlertedChatRef = { value: null as string | null };

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

function updateAttendantCache(attendantsList: Attendant[]) {
  cachedAttendants = attendantsList || [];
  if (Array.isArray(attendantsList) && attendantsList.length > 0) {
    const favorite = attendantsList.find(a => a.isFavorite);
    cachedAttendantName = favorite ? favorite.name : attendantsList[0].name;
  } else {
    cachedAttendantName = FALLBACK_ATTENDANT_NAME;
  }
}

function updateActiveAttendancesState(updated: ActiveAttendances) {
  activeAttendances = updated;
  storageSet('activeAttendances', updated);
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

function initExtensionConfig() {
  if (hasChromeStorage()) {
    chrome.storage.sync.get(['attendants', 'settings', 'activeAttendances'], (result) => {
      if (result.attendants) updateAttendantCache(result.attendants);
      if (result.settings) cachedSettings = { ...DEFAULT_SETTINGS, ...result.settings };
      if (result.activeAttendances) activeAttendances = result.activeAttendances;
    });

    onStorageChanged((changes) => {
      if (changes.attendants) updateAttendantCache(changes.attendants.newValue as Attendant[]);
      if (changes.settings) cachedSettings = { ...DEFAULT_SETTINGS, ...changes.settings.newValue as Partial<Settings> };
      if (changes.activeAttendances) activeAttendances = (changes.activeAttendances.newValue || {}) as ActiveAttendances;
    });
  } else {
    // Fallback to localStorage for development
    try {
      const localAttendants = localStorage.getItem('attendants');
      const localSettings = localStorage.getItem('settings');
      const localAttendances = localStorage.getItem('activeAttendances');
      if (localAttendants) updateAttendantCache(JSON.parse(localAttendants));
      if (localSettings) cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(localSettings) };
      if (localAttendances) activeAttendances = JSON.parse(localAttendances) || {};
    } catch (e) {
      console.warn('[La Home Zap] Storage fallback failed to load:', e);
    }
  }
}

// ---------------------------------------------------------------------------
// Signature event handlers
// ---------------------------------------------------------------------------

function handleFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement;
  if (!target || !isChatInput(target)) return;

  const textContent = target.textContent || '';
  if (textContent.trim().length > 0) return;

  injectSignatureIntoInput(target, cachedAttendantName, cachedAttendants, cachedSettings);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

initExtensionConfig();
injectKanban();

// Signature injection on chat input focus
document.addEventListener('focusin', handleFocusIn, true);

// Detect Enter key press (without Shift) to flag signature re-injection after send
document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (!target || !isChatInput(target)) return;

  if (event.key === 'Enter' && !event.shiftKey) {
    shouldReinjectSignature = true;
  }
}, true);

// Detect Send button click to flag signature re-injection
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const sendBtn = target.closest(SELECTORS.sendButton);
  if (sendBtn) {
    shouldReinjectSignature = true;
  }
}, true);

// Polling loop: re-inject signature when input clears after message send
setInterval(() => {
  if (shouldReinjectSignature) {
    const input = getChatInput();
    if (input && input.textContent?.trim().length === 0) {
      injectSignatureIntoInput(input, cachedAttendantName, cachedAttendants, cachedSettings);
      shouldReinjectSignature = false;
    }
  }
}, 150);

// Periodic UI checks: attendance button, phrasebar, and chatlist badges
setInterval(() => {
  checkAndInjectAttendanceButton(
    cachedAttendantName,
    cachedAttendants,
    cachedSettings,
    activeAttendances,
    lastAlertedChatRef,
    updateActiveAttendancesState
  );
  checkAndInjectPhrasebar();
  checkAndInjectChatlistBadges(cachedAttendants);
}, 1000);

// Transfer event listener (bridges React sidebar ↔ content script)
window.addEventListener('la-home-zap-transfer-chat', (event: any) => {
  const { targetAttendant, reason, chatName } = event.detail;
  const from = resolveDisplayName(cachedAttendantName, cachedSettings);
  const to = resolveDisplayName(targetAttendant, cachedSettings);
  triggerTransferAutomation(from, to, chatName, reason, activeAttendances, updateActiveAttendancesState);
});

console.log('[La Home Zap] Content script initialized.');
