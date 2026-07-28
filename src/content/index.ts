/**
 * La Home Zap — Content Script Bootstrap
 *
 * This is the entry point for the WhatsApp Web content script.
 * It initializes configuration, sets up event listeners, and coordinates
 * the modular subsystems for signature, attendance, transfer, collision, and badges.
 */

import { hasChromeStorage, onStorageChanged, storageSet } from '../utils/storage';
import type { Attendant, Settings, ActiveAttendances } from '../types';
import { DEFAULT_SETTINGS, FALLBACK_ATTENDANT_NAME } from '../constants';
import { injectKanban, checkAndInjectPhrasebar } from './kanban/index';
import { resolveDisplayName, handleKeyDown, handlePaste } from './signature';
import { checkAndInjectAttendanceButton } from './attendance';
import { triggerTransferAutomation } from './transfer';
import { checkAndInjectChatlistBadges } from './badges';
import { isMediaViewerOpen } from './dom-helpers';

// ---------------------------------------------------------------------------
// Module-level cached state
// ---------------------------------------------------------------------------

let cachedAttendantName = FALLBACK_ATTENDANT_NAME;
let cachedAttendants: Attendant[] = [];
let cachedSettings: Settings = DEFAULT_SETTINGS;
let activeAttendances: ActiveAttendances = {};

// Mutable ref object for passing to functions that need to update lastAlertedChat
const lastAlertedChatRef = { value: null as string | null };

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

function updateAttendantCache(attendantsList: Attendant[], activeName?: string) {
  cachedAttendants = attendantsList || [];
  if (activeName !== undefined) {
    cachedAttendantName = activeName;
  } else if (Array.isArray(attendantsList)) {
    const favorite = attendantsList.find(a => a.isFavorite);
    cachedAttendantName = favorite ? favorite.name : 'Desativado';
  } else {
    cachedAttendantName = 'Desativado';
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
    chrome.storage.sync.get(['attendants', 'settings', 'activeAttendances', 'activeAttendant'], (result) => {
      if (result.attendants || result.activeAttendant !== undefined) {
        updateAttendantCache(result.attendants, result.activeAttendant);
      }
      if (result.settings) cachedSettings = { ...DEFAULT_SETTINGS, ...result.settings };
      if (result.activeAttendances) activeAttendances = result.activeAttendances;
    });

    onStorageChanged((changes) => {
      if (changes.activeAttendant) {
        cachedAttendantName = (changes.activeAttendant.newValue as string) || 'Desativado';
      }
      if (changes.attendants) {
        updateAttendantCache(
          changes.attendants.newValue as Attendant[],
          changes.activeAttendant ? (changes.activeAttendant.newValue as string) : undefined
        );
      }
      if (changes.settings) cachedSettings = { ...DEFAULT_SETTINGS, ...changes.settings.newValue as Partial<Settings> };
      if (changes.activeAttendances) activeAttendances = (changes.activeAttendances.newValue || {}) as ActiveAttendances;
    });
  } else {
    // Fallback to localStorage for development
    try {
      const localAttendants = localStorage.getItem('attendants');
      const localActive = localStorage.getItem('activeAttendant');
      const localSettings = localStorage.getItem('settings');
      const localAttendances = localStorage.getItem('activeAttendances');
      if (localAttendants || localActive !== null) {
        updateAttendantCache(localAttendants ? JSON.parse(localAttendants) : [], localActive ?? undefined);
      }
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

function handleKeyDownEvent(event: KeyboardEvent) {
  handleKeyDown(event, cachedAttendantName, cachedAttendants, cachedSettings);
}

function handlePasteEvent(event: ClipboardEvent) {
  handlePaste(event, cachedAttendantName, cachedAttendants, cachedSettings);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

initExtensionConfig();
injectKanban();

// Signature injection when starting to type/paste
document.addEventListener('keydown', handleKeyDownEvent, true);
document.addEventListener('paste', handlePasteEvent, true);

// Periodic UI checks: attendance button, phrasebar, chatlist badges, and lightbox state
setInterval(() => {
  const rootElement = document.getElementById('la-home-zap-root');
  if (rootElement) {
    if (isMediaViewerOpen()) {
      rootElement.style.opacity = '0';
      rootElement.style.pointerEvents = 'none';
      rootElement.style.zIndex = '-1';
    } else {
      rootElement.style.opacity = '1';
      rootElement.style.pointerEvents = 'auto';
      rootElement.style.zIndex = '9999';
    }
  }

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
}, 300);

// Transfer event listener (bridges React sidebar ↔ content script)
window.addEventListener('la-home-zap-transfer-chat', (event: any) => {
  const { targetAttendant, reason, chatName } = event.detail;
  const from = resolveDisplayName(cachedAttendantName, cachedSettings);
  const to = resolveDisplayName(targetAttendant, cachedSettings);
  triggerTransferAutomation(from, to, chatName, reason, activeAttendances, updateActiveAttendancesState);
});

console.log('[La Home Zap] Content script initialized.');
