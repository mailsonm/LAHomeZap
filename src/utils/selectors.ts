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

  // Label button in header (for reading the active label text)
  labelHeaderButton: '[data-testid="label-chat-header-button"]',

  // Native labels dialog window container
  labelsDialog: 'div[role="dialog"], div[role="application"], div[data-testid="popover"], div.x1n2onr6, div[class*="popover"]',

  // Native button to save labels inside dialog
  labelsDialogSaveBtn: 'button[data-testid="popup-controls-ok"], div[data-testid="popup-controls-ok"], button.x889uue',

  // Native button to create a new label inside the dialog
  labelsDialogAddNewBtn: 'div[data-testid="add-label"], button[data-testid="add-label"]',

  // Checkbox element inside label dialog items
  labelDialogCheckbox: 'input[type="checkbox"]',

  // Label dialog list item wrapper
  labelDialogItem: 'li',

  // Send message button (multiple selectors for resilience)
  sendButton: 'button span[data-icon="send"], button[data-testid="compose-btn-send"], [data-testid="send"]',

  // Sent messages for duplicate signature detection
  messageOut: '.message-out, [data-testid="tail-out"]',

  // Conversation info header fallback
  conversationInfoHeader: '[data-testid="conversation-info-header"]',

  // Chatlist selectors for sidebar visualization
  chatlistRow: '#pane-side [data-testid="cell-frame-container"], #pane-side [data-testid="list-item"], [data-testid="chat-list"] [data-testid="cell-frame-container"], [data-testid="cell-frame-container"], [data-testid="list-item"]',
  chatlistLabelPill: 'span[data-label-id]',
  chatlistRowName: '[data-testid="chat-title"], span[dir="auto"]',

  // Message bubbles inside the active conversation
  messageRow: '[data-testid="msg-container"], .message-in, .message-out',
  messageTimestamp: '[data-pre-plain-text]',
  messageText: 'span.selectable-text',
};
