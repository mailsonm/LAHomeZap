/**
 * Chatlist badge injection — scans sidebar rows and shows attendant name badges.
 */

import type { Attendant } from '../types';
import { SELECTORS } from '../utils/selectors';

/**
 * Scans the sidebar chatlist rows and injects attendant name badges matching applied tags.
 */
export function checkAndInjectChatlistBadges(cachedAttendants: Attendant[]) {
  const rows = document.querySelectorAll(SELECTORS.chatlistRow);
  if (rows.length === 0) return;

  rows.forEach(row => {
    const labelPills = Array.from(row.querySelectorAll(SELECTORS.chatlistLabelPill));
    let activeAttendant: string | null = null;

    for (const pill of labelPills) {
      const title = (pill.getAttribute('title') || (pill as HTMLElement).innerText || pill.textContent || pill.getAttribute('aria-label') || '').trim();
      if (!title) continue;

      const normalizedTitle = title.replace(':', '').trim().toLowerCase();
      for (const att of cachedAttendants) {
        if (att.name.toLowerCase() === normalizedTitle) {
          activeAttendant = att.name;
          break;
        }
      }

      if (activeAttendant) break;

      if (title.endsWith(':')) {
        activeAttendant = title.slice(0, -1).trim();
        break;
      }
    }

    let existingBadge = row.querySelector('.la-home-zap-chatlist-badge') as HTMLElement;

    if (activeAttendant) {
      if (!existingBadge) {
        existingBadge = document.createElement('span');
        existingBadge.className = 'la-home-zap-chatlist-badge';
        existingBadge.style.cssText = `
          font-size: 10.5px; font-weight: 700; color: #ffffff;
          background: linear-gradient(135deg, #0891b2, #06b6d4);
          padding: 2px 8px; border-radius: 100px; margin-left: 8px;
          box-shadow: 0 2px 6px rgba(6, 182, 212, 0.2);
          font-family: 'Outfit', sans-serif; text-transform: uppercase;
          display: inline-flex; align-items: center; gap: 3px; vertical-align: middle;
        `;

        const nameContainer = row.querySelector(SELECTORS.chatlistRowName);
        if (nameContainer) {
          nameContainer.parentElement?.appendChild(existingBadge);
        }
      }
      existingBadge.innerHTML = `👤 ${activeAttendant}`;
    } else {
      if (existingBadge) {
        existingBadge.parentElement?.removeChild(existingBadge);
      }
    }
  });
}
