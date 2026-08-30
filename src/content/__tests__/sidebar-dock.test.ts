import { describe, it, expect, beforeEach } from 'vitest';
import { isMediaViewerOpen } from '../dom-helpers';

describe('sidebar-dock and media viewer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('isMediaViewerOpen', () => {
    it('returns false when no lightbox is present', () => {
      expect(isMediaViewerOpen()).toBe(false);
    });

    it('returns true when media viewer lightbox element is present', () => {
      const viewer = document.createElement('div');
      viewer.setAttribute('data-animate-media-viewer', 'true');
      document.body.appendChild(viewer);

      expect(isMediaViewerOpen()).toBe(true);
    });

    it('returns true when dialog contains media viewer controls', () => {
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      const closeBtn = document.createElement('span');
      closeBtn.setAttribute('data-icon', 'x-viewer');
      dialog.appendChild(closeBtn);
      document.body.appendChild(dialog);

      expect(isMediaViewerOpen()).toBe(true);
    });
  });

  describe('sidebar root pointer events', () => {
    it('sets pointer-events: none on root to allow clicks to pass through to WhatsApp UI', async () => {
      const { injectKanban } = await import('../kanban/index');
      injectKanban();

      const root = document.getElementById('la-home-zap-root');
      expect(root).not.toBeNull();
      expect(root?.style.pointerEvents).toBe('none');
    });
  });
});
