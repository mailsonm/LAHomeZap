import { SELECTORS } from '../utils/selectors';
import { injectKanban } from './kanban/index';

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
let activeAttendances: Record<string, string> = {};

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
    // Load initial settings, attendants list, and active attendances
    chrome.storage.sync.get(['attendants', 'settings', 'activeAttendances'], (result) => {
      if (result.attendants) {
        updateAttendantCache(result.attendants);
      }
      if (result.settings) {
        cachedSettings = { ...DEFAULT_SETTINGS, ...result.settings };
      }
      if (result.activeAttendances) {
        activeAttendances = result.activeAttendances;
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
        if (changes.activeAttendances) {
          activeAttendances = changes.activeAttendances.newValue || {};
        }
      }
    });
  } else {
    // Fallback to localStorage for development
    try {
      const localAttendants = localStorage.getItem('attendants');
      const localSettings = localStorage.getItem('settings');
      const localAttendances = localStorage.getItem('activeAttendances');
      if (localAttendants) {
        updateAttendantCache(JSON.parse(localAttendants));
      }
      if (localSettings) {
        cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(localSettings) };
      }
      if (localAttendances) {
        activeAttendances = JSON.parse(localAttendances) || {};
      }
    } catch (e) {
      console.warn('[La Home Zap] Storage fallback failed to load:', e);
    }
  }
}

/**
 * Persists active attendances to storage.
 */
function persistActiveAttendances(updatedAttendances: Record<string, string>) {
  activeAttendances = updatedAttendances;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ activeAttendances: updatedAttendances });
  } else {
    localStorage.setItem('activeAttendances', JSON.stringify(updatedAttendances));
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
  const sentMessages = document.querySelectorAll('.message-out');
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

  const textContent = target.textContent || '';
  if (textContent.trim().length > 0) {
    return;
  }

  let name = cachedAttendantName;
  if (cachedSettings.capitalizeInitial) {
    name = capitalize(name);
  }

  if (cachedSettings.dontRepeatInChat && hasRecentSignature(name)) {
    return;
  }

  const signature = `*Atendente: ${name}*\n\n`;

  target.focus();
  try {
    document.execCommand('insertText', false, signature);
  } catch (error) {
    console.error('[La Home Zap] Failed to inject signature:', error);
  }
}

/**
 * Gets the active chat/contact name from the conversation header.
 */
function getActiveChatName(): string | null {
  const headerElement = document.querySelector(SELECTORS.chatHeader);
  if (!headerElement) {
    console.log('[La Home Zap] Active chat name check failed: Header element not found.');
    return null;
  }
  
  // 1. Procurar span com dir="auto" que tenha title
  const titleElement = headerElement.querySelector('span[dir="auto"][title]') as HTMLElement;
  if (titleElement && titleElement.title) {
    return titleElement.title.trim();
  }
  
  // 2. Procurar dentro do container de informações da conversa (usando quebra de linha de innerText)
  const infoHeader = headerElement.querySelector('[data-testid="conversation-info-header"]') as HTMLElement;
  if (infoHeader) {
    const text = (infoHeader.innerText || '').trim();
    if (text) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        return lines[0];
      }
    }
  }

  // 3. Fallback para o primeiro span com dir="auto" que tem texto dentro do header
  const spans = Array.from(headerElement.querySelectorAll('span[dir="auto"]')) as HTMLElement[];
  for (const span of spans) {
    const text = (span.textContent || '').trim();
    // Evita pegar o status de "online" ou "visto por último"
    if (text && !text.includes('visto por último') && !text.toLowerCase().includes('online') && !text.toLowerCase().includes('digitando')) {
      return text;
    }
  }
  
  // 4. Fallback genérico para qualquer span com title
  const anyTitleEl = headerElement.querySelector('[title]') as HTMLElement;
  if (anyTitleEl && anyTitleEl.getAttribute('title')) {
    return anyTitleEl.getAttribute('title')!.trim();
  }

  console.log('[La Home Zap] Active chat name check failed: No contact name element identified.');
  return null;
}

/**
 * Helper to dynamically wait for a DOM element.
 */
function waitForElement(selector: string, timeout = 3000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el as HTMLElement);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el as HTMLElement);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Custom modern dialog popup to notify about missing label.
 */
function showMissingLabelDialog(name: string, onConfirm: () => void) {
  const modalWrapper = document.createElement('div');
  modalWrapper.id = 'la-home-zap-custom-modal';
  modalWrapper.style.position = 'fixed';
  modalWrapper.style.top = '0';
  modalWrapper.style.left = '0';
  modalWrapper.style.width = '100vw';
  modalWrapper.style.height = '100vh';
  modalWrapper.style.background = 'rgba(11, 15, 25, 0.6)';
  modalWrapper.style.backdropFilter = 'blur(10px)';
  modalWrapper.style.setProperty('-webkit-backdrop-filter', 'blur(10px)');
  modalWrapper.style.display = 'flex';
  modalWrapper.style.alignItems = 'center';
  modalWrapper.style.justifyContent = 'center';
  modalWrapper.style.zIndex = '99999';
  modalWrapper.style.fontFamily = "'Outfit', sans-serif";

  const cleanLabelName = name.endsWith(':') ? name : `${name}:`;

  modalWrapper.innerHTML = `
    <div style="background: #131a2e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; width: 440px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); text-align: left; color: #f8fafc; animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; color: #eab308;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span style="font-weight: 700; font-size: 16px; text-transform: uppercase;">Etiqueta não encontrada</span>
      </div>
      
      <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1; margin-bottom: 14px;">
        A etiqueta <strong style="color: #06b6d4;">"${cleanLabelName}"</strong> não foi encontrada no seu WhatsApp Business!
      </p>
      
      <p style="font-size: 13.5px; line-height: 1.5; color: #94a3b8; margin-bottom: 24px;">
        Crie essa etiqueta para utilizar o recurso de Controle de Atendimento. Após a criação, ela será aplicada automaticamente às conversas desse atendente, permitindo:<br>
        • Iniciar e finalizar atendimentos com 1 clique<br>
        • Identificar o responsável por cada atendimento<br>
        • Evitar que vários atendentes respondam o mesmo contato ao mesmo tempo.
      </p>
      
      <div style="display: flex; justify-content: flex-end;">
        <button id="la-home-zap-modal-ok-btn" style="background: #10b981; border: none; border-radius: 8px; color: #fff; padding: 10px 24px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease;">OK</button>
      </div>
    </div>
    
    <style>
      @keyframes scaleUp {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      #la-home-zap-modal-ok-btn:hover {
        background: #059669;
        transform: translateY(-1px);
      }
    </style>
  `;

  document.body.appendChild(modalWrapper);

  const okBtn = document.getElementById('la-home-zap-modal-ok-btn');
  if (okBtn) {
    okBtn.addEventListener('click', () => {
      document.body.removeChild(modalWrapper);
      onConfirm();
    });
  }
}

/**
 * Automates the Business Labels workflow to apply or remove the attendant's label.
 */
async function triggerLabelsAutomation(attendantName: string, shouldAdd: boolean, chatName: string) {
  // 1. Locate the native tags/labels button and click it
  const labelBtn = document.querySelector(SELECTORS.labelButton) as HTMLElement;
  if (!labelBtn) {
    console.error('[La Home Zap] WhatsApp Business tags/labels button not found.');
    alert('Erro: Botão de etiquetas nativo do WhatsApp não encontrado.');
    return;
  }
  
  labelBtn.click();

  // 2. Wait for the native labels dialog to render
  const dialog = await waitForElement(SELECTORS.labelsDialog);
  if (!dialog) {
    console.error('[La Home Zap] Native labels dialog failed to render.');
    return;
  }

  // Normalize target names
  const targetLabel = attendantName.toLowerCase();
  const targetLabelWithColon = `${attendantName}:`.toLowerCase();

  // 3. Scan list items to locate our attendant label
  const items = Array.from(dialog.querySelectorAll('div'));
  let foundLabelItem: HTMLElement | null = null;

  for (const item of items) {
    const text = (item.textContent || '').trim().toLowerCase();
    if (text === targetLabel || text === targetLabelWithColon) {
      // Find the direct clickable container row or checkbox
      foundLabelItem = item.closest('li') || item;
      break;
    }
  }

  if (foundLabelItem) {
    // Label exists! Handle click toggling
    const checkbox = foundLabelItem.querySelector('input[type="checkbox"]') as HTMLInputElement;
    
    const isCurrentlyChecked = checkbox ? checkbox.checked : false;
    
    // Toggle only if it mismatches what we want
    if ((shouldAdd && !isCurrentlyChecked) || (!shouldAdd && isCurrentlyChecked)) {
      foundLabelItem.click();
    }

    // Save changes
    setTimeout(() => {
      const saveBtn = dialog.querySelector(SELECTORS.labelsDialogSaveBtn) as HTMLElement;
      if (saveBtn) {
        saveBtn.click();
        
        // Update active attendances
        const updated = { ...activeAttendances };
        if (shouldAdd) {
          updated[chatName] = attendantName;
        } else {
          delete updated[chatName];
        }
        persistActiveAttendances(updated);
      }
    }, 150);

  } else {
    // Label does NOT exist! Trigger alert flow and guide user to create it
    if (shouldAdd) {
      showMissingLabelDialog(attendantName, async () => {
        // Copy label target name to clipboard
        const formattedLabel = attendantName.endsWith(':') ? attendantName : `${attendantName}:`;
        try {
          await navigator.clipboard.writeText(formattedLabel);
        } catch (e) {
          console.warn('[La Home Zap] Clipboard copy failed:', e);
        }

        // Trigger native create flow
        const addNewBtn = dialog.querySelector(SELECTORS.labelsDialogAddNewBtn) as HTMLElement;
        if (addNewBtn) {
          addNewBtn.click();
        } else {
          alert(`Cole "${formattedLabel}" na criação da nova etiqueta.`);
        }
      });
    } else {
      // If we are ending attendance but label is missing, simply reset local state
      const updated = { ...activeAttendances };
      delete updated[chatName];
      persistActiveAttendances(updated);
    }
  }
}

let lastButtonCheckLogTime = 0;

/**
 * Appends the Attendance Control button inside the conversation panel.
 */
function checkAndInjectAttendanceButton() {
  const now = Date.now();
  const shouldLogDebug = now - lastButtonCheckLogTime > 5000; // Log status every 5 seconds to avoid flooding

  const conversationPanel = document.querySelector(SELECTORS.conversationPanel) as HTMLElement;
  const chatName = getActiveChatName();

  if (shouldLogDebug) {
    console.log('[La Home Zap] Attendance button diagnostic:', {
      attendanceControlEnabled: cachedSettings.attendanceControl,
      conversationPanelFound: !!conversationPanel,
      chatName: chatName,
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
    return;
  }

  if (!conversationPanel) return;
  if (!chatName) return;

  // Render button if not already present
  let btnContainer = document.getElementById('la-home-zap-attendance-btn');
  if (!btnContainer) {
    btnContainer = document.createElement('div');
    btnContainer.id = 'la-home-zap-attendance-btn';
    btnContainer.style.position = 'absolute';
    btnContainer.style.top = '72px'; // Placed below the chat header
    btnContainer.style.left = '16px';
    btnContainer.style.zIndex = '999';
    btnContainer.style.display = 'flex';
    btnContainer.style.alignItems = 'center';
    btnContainer.style.background = 'transparent';
    btnContainer.style.fontFamily = "'Outfit', sans-serif";
    conversationPanel.appendChild(btnContainer);
  }

  // Check if this chat name is currently being attended by the active attendant
  const activeAttendantForChat = activeAttendances[chatName];
  const isBeingAttended = activeAttendantForChat !== undefined;

  let name = cachedAttendantName;
  if (cachedSettings.capitalizeInitial) {
    name = capitalize(name);
  }

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
      triggerLabelsAutomation(name, !isBeingAttended, chatName);
    });
  }
}

// Bootstrap initialization
initExtensionConfig();
injectKanban();

document.addEventListener('focusin', handleFocusIn, true);
setInterval(checkAndInjectAttendanceButton, 1000);

console.log('[La Home Zap] Content script initialized.');
