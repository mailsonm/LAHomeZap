import React from 'react';
import ReactDOM from 'react-dom/client';
import KanbanPanel from './KanbanPanel';
import kanbanCss from './kanban.css?inline';
import { SELECTORS } from '../../utils/selectors';

/**
 * Initializes and injects the Kanban sidebar into the WhatsApp Web DOM.
 * Utilizes Shadow DOM to completely isolate CSS styles.
 */
export function injectKanban() {
  // Prevent duplicate injections
  if (document.getElementById('la-home-zap-kanban-root')) {
    return;
  }

  // Find the parent layout container of WhatsApp Web (which holds the side panel and active chat view)
  const appContainer = document.querySelector(SELECTORS.mainLayoutContainer) || document.querySelector('#side')?.parentElement;
  if (!appContainer) {
    // Retry initialization after a short delay if DOM is not fully loaded
    setTimeout(injectKanban, 1000);
    return;
  }

  // Create root element for our extension component
  const rootElement = document.createElement('div');
  rootElement.id = 'la-home-zap-kanban-root';
  rootElement.style.position = 'fixed';
  rootElement.style.right = '0';
  rootElement.style.top = '0';
  rootElement.style.height = '100vh';
  rootElement.style.zIndex = '9999';
  rootElement.style.display = 'flex';
  rootElement.style.flexShrink = '0';

  // Append directly to body to avoid flex container overflow clipping
  document.body.appendChild(rootElement);

  // Attach Shadow DOM for style isolation
  const shadowRoot = rootElement.attachShadow({ mode: 'open' });

  // Inject compiled CSS inline into the shadow root
  const styleElement = document.createElement('style');
  styleElement.textContent = kanbanCss;
  shadowRoot.appendChild(styleElement);

  // Create mount point for React
  const mountPoint = document.createElement('div');
  mountPoint.style.height = '100%';
  shadowRoot.appendChild(mountPoint);

  // Mount React App
  const reactRoot = ReactDOM.createRoot(mountPoint);
  reactRoot.render(
    <React.StrictMode>
      <KanbanPanel initialCollapsed={true} />
    </React.StrictMode>
  );

  console.log('[La Home Zap] Kanban sidebar successfully injected.');
}
