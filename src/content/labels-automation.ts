/**
 * Shared label automation helpers for interacting with WhatsApp Business native label dialogs.
 * Used by both attendance control and transfer workflows.
 */

import { SELECTORS } from '../utils/selectors';
import { waitForElement } from './dom-helpers';
import { showMissingLabelDialog } from './modals';

/**
 * Finds a label item in the native WhatsApp labels dialog by matching its text.
 * Returns the closest <li> ancestor or the matching element itself.
 */
export function findLabelInDialog(dialog: HTMLElement, labelName: string): HTMLElement | null {
  const targetLabel = labelName.toLowerCase();
  const targetLabelWithColon = `${labelName}:`.toLowerCase();

  const items = Array.from(dialog.querySelectorAll('div'));
  for (const item of items) {
    const text = (item.textContent || '').trim().toLowerCase();
    if (text === targetLabel || text === targetLabelWithColon) {
      return item.closest(SELECTORS.labelDialogItem) || item;
    }
  }

  return null;
}

/**
 * Opens the native labels dialog and returns it, or null if it fails.
 */
export async function openLabelsDialog(): Promise<HTMLElement | null> {
  const labelBtn = document.querySelector(SELECTORS.labelButton) as HTMLElement;
  if (!labelBtn) {
    console.error('[La Home Zap] WhatsApp Business tags/labels button not found.');
    alert('Erro: Botão de etiquetas nativo do WhatsApp não encontrado.');
    return null;
  }

  labelBtn.click();
  return waitForElement(SELECTORS.labelsDialog);
}

/**
 * Toggles a label checkbox in the dialog. Clicks only if the current state
 * does not match the desired state.
 */
export function toggleLabelCheckbox(labelItem: HTMLElement, shouldBeChecked: boolean): boolean {
  const checkbox = labelItem.querySelector(SELECTORS.labelDialogCheckbox) as HTMLInputElement;
  const isChecked = checkbox ? checkbox.checked : false;

  if (shouldBeChecked !== isChecked) {
    labelItem.click();
    return true;
  }

  return false;
}

/**
 * Saves changes in the labels dialog by clicking the save button.
 */
export function saveLabelsDialog(dialog: HTMLElement, delayMs = 150): void {
  setTimeout(() => {
    const saveBtn = dialog.querySelector(SELECTORS.labelsDialogSaveBtn) as HTMLElement;
    if (saveBtn) {
      saveBtn.click();
    }
  }, delayMs);
}

/**
 * Handles the case when a target label does not exist.
 * Shows the missing label dialog, copies name to clipboard, and triggers native creation flow.
 */
export async function handleMissingLabel(attendantName: string, dialog: HTMLElement): Promise<void> {
  showMissingLabelDialog(attendantName, async () => {
    const formattedLabel = attendantName.endsWith(':') ? attendantName : `${attendantName}:`;
    try {
      await navigator.clipboard.writeText(formattedLabel);
    } catch (e) {
      console.warn('[La Home Zap] Clipboard copy failed:', e);
    }

    const addNewBtn = dialog.querySelector(SELECTORS.labelsDialogAddNewBtn) as HTMLElement;
    if (addNewBtn) {
      addNewBtn.click();
    } else {
      alert(`Cole "${formattedLabel}" na criação da nova etiqueta.`);
    }
  });
}
