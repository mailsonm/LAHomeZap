import { SELECTORS } from '../utils/selectors';

interface Attendant {
  id: string;
  name: string;
  isFavorite: boolean;
}

interface Settings {
  quickAccess: boolean;
  transferAlert: boolean;
  attendanceControl: boolean;
  capitalizeInitial: boolean;
  dontRepeatInChat: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  quickAccess: true,
  transferAlert: false,
  attendanceControl: true,
  capitalizeInitial: true,
  dontRepeatInChat: false
};

// Local cached configurations
let cachedAttendantName = 'Coordenação';
let cachedSettings: Settings = DEFAULT_SETTINGS;

/**
 * Updates local cache from the raw attendants list.
 */
function updateAttendantCache(attendantsList: Attendant[]) {
  if (Array.isArray(attendantsList) && attendantsList.length > 0) {
    const favorite = attendantsList.find(a => a.isFavorite);
    if (favorite) {
      cachedAttendantName = favorite.name;
    } else {
      cachedAttendantName = attendantsList[0].name;
    }
  } else {
    cachedAttendantName = 'Coordenação';
  }
}

/**
 * Loads extension configuration and settings from storage.
 * Setups live listeners to react to changes on the options page instantly.
 */
function initExtensionConfig() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    // Load initial settings and attendants list
    chrome.storage.sync.get(['attendants', 'settings'], (result) => {
      if (result.attendants) {
        updateAttendantCache(result.attendants);
      }
      if (result.settings) {
        cachedSettings = { ...DEFAULT_SETTINGS, ...result.settings };
      }
    });

    // Listen to live changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        if (changes.attendants) {
          updateAttendantCache(changes.attendants.newValue);
        }
        if (changes.settings) {
          cachedSettings = { ...DEFAULT_SETTINGS, ...changes.settings.newValue };
        }
      }
    });
  } else {
    // Fallback to localStorage for development
    try {
      const localAttendants = localStorage.getItem('attendants');
      const localSettings = localStorage.getItem('settings');
      if (localAttendants) {
        updateAttendantCache(JSON.parse(localAttendants));
      }
      if (localSettings) {
        cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(localSettings) };
      }
    } catch (e) {
      console.warn('[La Home Zap] Storage fallback failed to load:', e);
    }
  }
}

/**
 * Helper to capitalize the first letter of a string.
 */
function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Scans the active chat DOM for recent sent messages containing the signature.
 * Prevents multiple signatures from polluting the conversation history.
 */
function hasRecentSignature(attendantName: string): boolean {
  // WhatsApp Business Web uses class .message-out for sent messages
  const sentMessages = document.querySelectorAll('.message-out');
  if (sentMessages.length === 0) {
    return false;
  }

  // Normalize target names to avoid case or trim mismatches
  const targetText = `Atendente: ${attendantName}`.toLowerCase();
  const targetBold = `*Atendente: ${attendantName}*`.toLowerCase();

  // Check the last 3 sent messages
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
 * Checks if the element is the WhatsApp Web main text input.
 */
function isChatInput(element: HTMLElement): boolean {
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
 * Handles message input focus to inject the signature.
 */
function handleFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement;
  if (!target || !isChatInput(target)) {
    return;
  }

  // Check if current input field is empty
  const textContent = target.textContent || '';
  if (textContent.trim().length > 0) {
    return;
  }

  // Format attendant's name according to settings
  let name = cachedAttendantName;
  if (cachedSettings.capitalizeInitial) {
    name = capitalize(name);
  }

  // Apply signature repetition check
  if (cachedSettings.dontRepeatInChat && hasRecentSignature(name)) {
    return;
  }

  // Build the signature string
  const signature = `*Atendente: ${name}*\n\n`;

  // Focus input and execute typing simulator command
  target.focus();
  try {
    document.execCommand('insertText', false, signature);
  } catch (error) {
    console.error('[La Home Zap] Failed to inject signature:', error);
  }
}

// Bootstrap
initExtensionConfig();
document.addEventListener('focusin', handleFocusIn, true);

console.log('[La Home Zap] Content script initialized.');
