import { describe, it, expect, beforeEach, vi } from 'vitest';
import { findLabelInDialog, handleMissingLabel } from '../labels-automation';
import { showMissingLabelDialog } from '../modals';

vi.mock('../modals', () => ({
  showMissingLabelDialog: vi.fn((_name, callback) => callback()),
}));

describe('labels-automation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  describe('findLabelInDialog', () => {
    it('should find label by exact text matching', () => {
      const dialog = document.createElement('div');
      const item = document.createElement('div');
      item.textContent = 'Mailson';
      dialog.appendChild(item);

      const found = findLabelInDialog(dialog, 'Mailson');
      expect(found).toBe(item);
    });

    it('should find label matching name with colon', () => {
      const dialog = document.createElement('div');
      const item = document.createElement('div');
      item.textContent = 'Thalya:';
      dialog.appendChild(item);

      const found = findLabelInDialog(dialog, 'Thalya');
      expect(found).toBe(item);
    });
  });

  describe('handleMissingLabel', () => {
    it('should click the add button if found via selector', async () => {
      const dialog = document.createElement('div');
      const addBtn = document.createElement('button');
      addBtn.setAttribute('data-testid', 'add-label');
      const clickSpy = vi.spyOn(addBtn, 'click');
      dialog.appendChild(addBtn);

      await handleMissingLabel('Humberto', dialog);

      expect(showMissingLabelDialog).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should click the add button if found via fallback text search', async () => {
      const dialog = document.createElement('div');
      const addBtn = document.createElement('div');
      addBtn.textContent = '+ Nova lista';
      const clickSpy = vi.spyOn(addBtn, 'click');
      dialog.appendChild(addBtn);

      await handleMissingLabel('Humberto', dialog);

      expect(showMissingLabelDialog).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
