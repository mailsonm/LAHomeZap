/**
 * Attendance control — start/stop attendance via WhatsApp Business labels.
 */

import { SELECTORS } from '../utils/selectors';
import type { Attendant, Settings, ActiveAttendances } from '../types';
import { DEFAULT_WELCOME_MESSAGE } from '../constants';
import { resolveDisplayName } from './signature';
import { storageGet } from '../utils/storage';
import { getActiveChatName, insertTextWithNewlines, getChatInput, clickSendButton } from './dom-helpers';
import { getActiveAttendantFromDOM } from './collision';
import { showCollisionAlert } from './modals';
import { openLabelsDialog, findLabelInDialog, toggleLabelCheckbox, saveLabelsDialog, handleMissingLabel } from './labels-automation';

/**
 * Sends a chat message via the WhatsApp input area.
 */
function sendChatMessage(text: string) {
  const inputElement = getChatInput();
  if (!inputElement) return;

  try {
    insertTextWithNewlines(inputElement, text);
    clickSendButton(150);
  } catch (e) {
    console.error('[La Home Zap] Failed to send chat message:', e);
  }
}

/**
 * Sends a welcome message dynamically, checking storage for custom "/boasvindas" phrase first.
 */
export async function sendWelcomeMessage(attendantName: string) {
  let welcomeText = DEFAULT_WELCOME_MESSAGE(attendantName);

  try {
    const result = await storageGet<any[]>('quickReplies');
    if (result && Array.isArray(result)) {
      const customWelcome = result.find(r => r.shortcut === 'boasvindas');
      if (customWelcome && customWelcome.text) {
        welcomeText = customWelcome.text;
      }
    }
  } catch (e) {
    console.warn('[La Home Zap] Failed to load quick replies for welcome message:', e);
  }

  sendChatMessage(welcomeText);
}

/**
 * Automates the Business Labels workflow to apply or remove the attendant's label.
 */
export async function triggerLabelsAutomation(
  attendantName: string,
  shouldAdd: boolean,
  chatName: string,
  activeAttendances: ActiveAttendances,
  updateActiveAttendances: (updated: ActiveAttendances) => void
) {
  const dialog = await openLabelsDialog();
  if (!dialog) return;

  const foundLabelItem = findLabelInDialog(dialog, attendantName);

  if (foundLabelItem) {
    toggleLabelCheckbox(foundLabelItem, shouldAdd);

    saveLabelsDialog(dialog, 150);

    // Update active attendances
    const updated = { ...activeAttendances };
    if (shouldAdd) {
      updated[chatName] = attendantName;
    } else {
      delete updated[chatName];
    }
    updateActiveAttendances(updated);

    // Send welcome message if starting attendance
    if (shouldAdd) {
      setTimeout(() => {
        sendWelcomeMessage(attendantName);
      }, 600);
    }
  } else {
    // Label does NOT exist
    if (shouldAdd) {
      handleMissingLabel(attendantName, dialog);
    } else {
      // If ending attendance but label is missing, simply reset local state
      const updated = { ...activeAttendances };
      delete updated[chatName];
      updateActiveAttendances(updated);
    }
  }
}

/**
 * Cached state for the attendance button to avoid unnecessary DOM re-renders.
 */
let cachedButtonState: { chatName: string | null; isBeingAttended: boolean; attendantName: string } = {
  chatName: null,
  isBeingAttended: false,
  attendantName: '',
};

let lastButtonCheckLogTime = 0;

/**
 * Appends the Attendance Control button inside the conversation panel.
 * Only re-renders the button when the state actually changes.
 */
export function checkAndInjectAttendanceButton(
  cachedAttendantName: string,
  cachedAttendants: Attendant[],
  cachedSettings: Settings,
  activeAttendances: ActiveAttendances,
  lastAlertedChatRef: { value: string | null },
  updateActiveAttendances: (updated: ActiveAttendances) => void
) {
  const now = Date.now();
  const shouldLogDebug = now - lastButtonCheckLogTime > 5000;

  const conversationPanel = document.querySelector(SELECTORS.conversationPanel) as HTMLElement;
  const chatName = getActiveChatName();

  const attendantFromDOM = getActiveAttendantFromDOM(cachedAttendants);
  const activeAttendantForChat = attendantFromDOM || (chatName ? activeAttendances[chatName] : undefined);
  const isBeingAttended = activeAttendantForChat !== undefined && activeAttendantForChat !== null;

  // Collision Detection Logic
  if (chatName && chatName !== lastAlertedChatRef.value) {
    lastAlertedChatRef.value = chatName;
    const currentAttendantNormalized = cachedAttendantName.trim().toLowerCase();
    const activeNormalized = attendantFromDOM ? attendantFromDOM.trim().toLowerCase() : '';
    if (activeNormalized && activeNormalized !== currentAttendantNormalized) {
      showCollisionAlert(attendantFromDOM as string);
    }
  }

  if (shouldLogDebug) {
    console.log('[La Home Zap] Attendance button diagnostic:', {
      attendanceControlEnabled: cachedSettings.attendanceControl,
      conversationPanelFound: !!conversationPanel,
      chatName: chatName,
      activeAttendantFromDOM: attendantFromDOM,
      activeAttendances: activeAttendances
    });
    lastButtonCheckLogTime = now;
  }

  // If control feature is globally disabled, remove any leftover buttons and exit
  if (!cachedSettings.attendanceControl) {
    const existing = document.getElementById('la-home-zap-attendance-btn');
    if (existing) {
      existing.parentElement?.removeChild(existing);
    }
    cachedButtonState = { chatName: null, isBeingAttended: false, attendantName: '' };
    return;
  }

  if (!conversationPanel) return;
  if (!chatName) return;

  // Check if state changed — skip re-render if same
  if (
    cachedButtonState.chatName === chatName &&
    cachedButtonState.isBeingAttended === isBeingAttended &&
    cachedButtonState.attendantName === (activeAttendantForChat || cachedAttendantName)
  ) {
    return;
  }

  cachedButtonState = {
    chatName,
    isBeingAttended,
    attendantName: activeAttendantForChat || cachedAttendantName,
  };

  // Render button if not already present
  let btnContainer = document.getElementById('la-home-zap-attendance-btn');
  if (!btnContainer) {
    btnContainer = document.createElement('div');
    btnContainer.id = 'la-home-zap-attendance-btn';
    btnContainer.style.cssText = `
      position: absolute; top: 72px; left: 16px; z-index: 999;
      display: flex; align-items: center; background: transparent;
      font-family: 'Outfit', sans-serif;
    `;
    conversationPanel.appendChild(btnContainer);
  }

  const name = resolveDisplayName(cachedAttendantName, cachedSettings);

  // Update visual state and actions
  if (isBeingAttended) {
    btnContainer.innerHTML = `
      <div style="display: flex; align-items: center; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2); animation: fadeIn 0.2s ease;">
        <button id="la-home-zap-action-btn" style="background: #ef4444; color: #fff; border: none; padding: 8px 16px; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s ease; display: flex; align-items: center; gap: 6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>
          Finalizar Atendimento (${activeAttendantForChat})
        </button>
      </div>
    `;
  } else {
    btnContainer.innerHTML = `
      <div style="display: flex; align-items: center; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); animation: fadeIn 0.2s ease;">
        <button id="la-home-zap-action-btn" style="background: #10b981; color: #fff; border: none; padding: 8px 16px; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s ease; display: flex; align-items: center; gap: 6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          Iniciar Atendimento
        </button>
      </div>
    `;
  }

  // Hook button action
  const actionBtn = btnContainer.querySelector('#la-home-zap-action-btn') as HTMLElement;
  if (actionBtn) {
    actionBtn.addEventListener('click', () => {
      const targetName = isBeingAttended ? (activeAttendantForChat || name) : name;
      triggerLabelsAutomation(targetName, !isBeingAttended, chatName, activeAttendances, updateActiveAttendances);
    });
  }
}
