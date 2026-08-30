import React from 'react';
import ReactDOM from 'react-dom/client';
import SidebarTabs from './SidebarTabs';
import Phrasebar from './Phrasebar';
import kanbanCss from './kanban.css?inline';
import sidebarCss from './sidebar.css?inline';
import { SELECTORS } from '../../utils/selectors';

/**
 * Initializes and injects the La Home Zap sidebar container into the WhatsApp Web DOM.
 * Utilizes Shadow DOM to completely isolate CSS styles.
 */
export function injectKanban() {
  // Prevent duplicate injections
  if (document.getElementById('la-home-zap-root')) {
    return;
  }

  // Create root element for our extension component
  const rootElement = document.createElement('div');
  rootElement.id = 'la-home-zap-root';
  rootElement.style.position = 'fixed';
  rootElement.style.right = '0';
  rootElement.style.top = '0';
  rootElement.style.height = '100vh';
  rootElement.style.zIndex = '9999';
  rootElement.style.display = 'flex';
  rootElement.style.flexShrink = '0';
  rootElement.style.overflow = 'hidden';
  rootElement.style.pointerEvents = 'none';

  // Append directly to body to avoid flex container overflow clipping
  document.body.appendChild(rootElement);

  // Attach Shadow DOM for style isolation
  const shadowRoot = rootElement.attachShadow({ mode: 'open' });

  // Inject compiled CSS inline into the shadow root
  const styleElement = document.createElement('style');
  styleElement.textContent = kanbanCss + '\n' + sidebarCss;
  shadowRoot.appendChild(styleElement);

  // Create mount point for React
  const mountPoint = document.createElement('div');
  mountPoint.style.height = '100%';
  mountPoint.style.pointerEvents = 'none';
  shadowRoot.appendChild(mountPoint);

  // Mount React App
  const reactRoot = ReactDOM.createRoot(mountPoint);
  reactRoot.render(
    <React.StrictMode>
      <SidebarTabs />
    </React.StrictMode>
  );

  console.log('[La Home Zap] Floating sidebar successfully injected.');
}

let phrasebarReactRoot: any = null;

/**
 * Periodically scans for the active chat footer to inject the Phrasebar quick replies panel.
 */
export function checkAndInjectPhrasebar() {
  const footerElement = document.querySelector(SELECTORS.chatFooter) as HTMLElement;
  if (!footerElement) {
    if (!document.getElementById('la-home-zap-phrasebar-root')) {
      phrasebarReactRoot = null;
    }
    return;
  }

  let phrasebarRoot = document.getElementById('la-home-zap-phrasebar-root');
  if (!phrasebarRoot) {
    phrasebarRoot = document.createElement('div');
    phrasebarRoot.id = 'la-home-zap-phrasebar-root';
    phrasebarRoot.style.width = '100%';

    // Inserts at the top of the footer container
    footerElement.insertBefore(phrasebarRoot, footerElement.firstChild);

    try {
      phrasebarReactRoot = ReactDOM.createRoot(phrasebarRoot);
      phrasebarReactRoot.render(
        <React.StrictMode>
          <Phrasebar />
        </React.StrictMode>
      );
    } catch (e) {
      console.error('[La Home Zap] Failed to inject Phrasebar:', e);
    }
  }
}
