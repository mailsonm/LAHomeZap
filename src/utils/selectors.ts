/**
 * Centralized CSS selectors for the WhatsApp Web DOM structure.
 * These selectors are prone to break if Meta updates WhatsApp Web UI.
 * Keeping them here allows for easy maintenance.
 */
export const SELECTORS = {
  // Main chat message input element
  chatInput: 'div[contenteditable="true"][data-tab="10"]',
  
  // Alternative fallback chat input if data-tab changes
  chatInputFallback: 'div[contenteditable="true"]',
  
  // Search bar input to differentiate from chat input
  searchInput: 'div[contenteditable="true"][data-tab="3"]',

  // Active chat footer container that holds the input bar
  chatFooter: 'footer',

  // Active chat header container
  chatHeader: '#main header, [data-testid="conversation-header"]',

  // Active conversation panel area
  conversationPanel: '#main, [data-testid="conversation-panel"]',

  // WhatsApp Web main application root wrapper
  appRoot: '#app',

  // Direct parent of the chat view and list views to handle flex layouts
  mainLayoutContainer: '#app > div > div',

  // WhatsApp Business label tag button inside the chat header or contact action menu
  labelButton: '[data-testid="label-chat-header-button"], button[title="Etiquetas"], button[title="Labels"], [data-testid="menu-icon-labels"], span[data-icon="tag"], span[data-icon="label"]',

  // Nativo labels dialog window container
  labelsDialog: 'div[role="dialog"]',

  // Native button to save labels inside dialog
  labelsDialogSaveBtn: 'button[data-testid="popup-controls-ok"], div[data-testid="popup-controls-ok"], button.x889uue',

  // Native button to create a new label inside the dialog
  labelsDialogAddNewBtn: 'div[data-testid="add-label"], button[data-testid="add-label"]',

  // Chatlist selectors for sidebar visualization
  chatlistRow: '[data-testid="cell-frame-container"], [data-testid="list-item"]',
  chatlistLabelPill: 'span[data-label-id]',
  chatlistRowName: '[data-testid="chat-title"], span[dir="auto"]'
};
