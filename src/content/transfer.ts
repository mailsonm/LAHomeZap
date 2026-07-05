/**
 * Transfer automation — coordinates label switching and transfer message injection.
 */

import type { ActiveAttendances } from '../types';
import { insertTextWithNewlines, getChatInput, clickSendButton } from './dom-helpers';
import { findLabelInDialog, toggleLabelCheckbox, saveLabelsDialog, handleMissingLabel, openLabelsDialog } from './labels-automation';

/**
 * Sends a pre-formatted transfer alert message inside the chat window.
 */
function sendTransferMessage(from: string, to: string, reasonText: string) {
  const inputElement = getChatInput();
  if (!inputElement) return;

  const headerText = `*--- TRANSFERÊNCIA DE ATENDIMENTO ---*\n`;
  const bodyText = `*De:* ${from}\n*Para:* ${to}\n${reasonText ? `*Motivo:* ${reasonText}` : '*Motivo:* Sem observações fornecidas.'}`;
  const fullText = `${headerText}${bodyText}`;

  try {
    insertTextWithNewlines(inputElement, fullText);
    clickSendButton(150);
  } catch (e) {
    console.error('[La Home Zap] Failed to send transfer message:', e);
  }
}

/**
 * Coordinates label switching and optional transfer message injection inside a single workflow.
 */
export async function triggerTransferAutomation(
  currentAttendant: string,
  targetAttendant: string,
  chatName: string,
  reasonText: string,
  activeAttendances: ActiveAttendances,
  updateActiveAttendances: (updated: ActiveAttendances) => void
) {
  const dialog = await openLabelsDialog();
  if (!dialog) return;

  const currentLabelItem = findLabelInDialog(dialog, currentAttendant);
  const targetLabelItem = findLabelInDialog(dialog, targetAttendant);

  // 1. Remove current tag
  if (currentLabelItem) {
    toggleLabelCheckbox(currentLabelItem, false);
  }

  // 2. Apply target tag if exists
  if (targetLabelItem) {
    toggleLabelCheckbox(targetLabelItem, true);

    // 3. Save
    saveLabelsDialog(dialog, 200);

    // Persist change
    const updated = { ...activeAttendances };
    updated[chatName] = targetAttendant;
    updateActiveAttendances(updated);

    // 4. Send Transfer alert details in chat
    setTimeout(() => {
      sendTransferMessage(currentAttendant, targetAttendant, reasonText);
    }, 600);
  } else {
    // Label does not exist
    handleMissingLabel(targetAttendant, dialog);
  }
}
