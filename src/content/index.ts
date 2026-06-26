import { SELECTORS } from '../utils/selectors';

// Local cache for the attendant's name to avoid asynchronous delays during event handlers
let cachedAttendantName = 'Coordenação';

/**
 * Initializes and loads the attendant name from storage.
 * Setups storage listeners to sync updates from the options page in real-time.
 */
function initAttendantName() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    // Get initial value
    chrome.storage.sync.get(['attendantName'], (result) => {
      if (result.attendantName) {
        cachedAttendantName = result.attendantName;
      }
    });

    // Listen for changes from the options page
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.attendantName) {
        cachedAttendantName = changes.attendantName.newValue || 'Coordenação';
      }
    });
  } else {
    // Fallback for development outside extension environment
    const localName = localStorage.getItem('attendantName');
    if (localName) {
      cachedAttendantName = localName;
    }
  }
}

/**
 * Checks if the focused element is the WhatsApp Web main chat input.
 */
function isChatInput(element: HTMLElement): boolean {
  if (element.matches(SELECTORS.chatInput)) {
    return true;
  }
  
  // Fallback check if the main input selector matches but lacks data-tab
  if (element.matches(SELECTORS.chatInputFallback)) {
    // Ensure it's not the search input
    if (element.matches(SELECTORS.searchInput)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Handles the focusin event to inject the signature.
 */
function handleFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement;
  if (!target || !isChatInput(target)) {
    return;
  }

  // Check if input is empty. WhatsApp inputs might have HTML tags like <br> or <p> inside,
  // so we check if the text content is empty or contains only whitespace.
  const textContent = target.textContent || '';
  const trimmedText = textContent.trim();

  // If there's already something in the field, we don't overwrite it.
  if (trimmedText.length > 0) {
    return;
  }

  // Format signature: *Attendant: Name*\n\n
  const signature = `*Atendente: ${cachedAttendantName}*\n\n`;

  // Focus and insert text using document.execCommand to safely sync with React/Lexical state
  target.focus();
  
  // Executing insertText simulates user typing, which updates React state bindings correctly
  try {
    document.execCommand('insertText', false, signature);
  } catch (error) {
    console.error('[La Home Zap] Failed to inject signature using execCommand:', error);
  }
}

// Initialize name and register global capture listener
initAttendantName();
document.addEventListener('focusin', handleFocusIn, true);

console.log('[La Home Zap] Content script initialized and listening.');
