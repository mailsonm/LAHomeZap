/**
 * Collision detection — alerts when opening a chat already attended by someone else.
 */

import type { Attendant } from '../types';
import { SELECTORS } from '../utils/selectors';
import { showCollisionAlert } from './modals';

/**
 * Reads the active chat header to see if a native business label matching any registered attendant is applied.
 */
export function getActiveAttendantFromDOM(cachedAttendants: Attendant[]): string | null {
  const labelBtn = document.querySelector(SELECTORS.labelHeaderButton) as HTMLElement;
  if (!labelBtn) return null;

  const btnText = (labelBtn.innerText || '').trim();
  if (!btnText) return null;

  const lowerBtnText = btnText.toLowerCase();

  // If it's just the default text or an icon placeholder, no label is applied
  if (lowerBtnText.includes('etiqueta') || lowerBtnText.includes('label')) {
    return null;
  }

  // Check if it matches any registered attendant (case-insensitive)
  const normalizedText = btnText.replace(':', '').trim().toLowerCase();
  for (const att of cachedAttendants) {
    if (att.name.toLowerCase() === normalizedText) {
      return att.name;
    }
  }

  // Fallback check if it looks like an attendant label even if not cached
  if (btnText.endsWith(':')) {
    return btnText.slice(0, -1).trim();
  }

  return btnText;
}

/**
 * Checks for a collision (another attendant's label on the current chat)
 * and shows an alert if detected. Only fires once per chat switch.
 */
export function checkCollision(
  chatName: string | null,
  lastAlertedChat: string | null,
  cachedAttendantName: string,
  _cachedAttendants: Attendant[],
  attendantFromDOM: string | null
): { collided: boolean; newLastAlertedChat: string } {
  if (!chatName || chatName === lastAlertedChat) {
    return { collided: false, newLastAlertedChat: lastAlertedChat || chatName || '' };
  }

  const currentAttendantNormalized = cachedAttendantName.trim().toLowerCase();
  const activeNormalized = attendantFromDOM ? attendantFromDOM.trim().toLowerCase() : '';

  if (activeNormalized && activeNormalized !== currentAttendantNormalized) {
    showCollisionAlert(attendantFromDOM as string);
  }

  return { collided: false, newLastAlertedChat: chatName };
}
