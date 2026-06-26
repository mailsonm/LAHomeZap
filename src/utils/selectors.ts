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
  searchInput: 'div[contenteditable="true"][data-tab="3"]'
};
