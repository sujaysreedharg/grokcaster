// Grokcaster Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'grokcaster-generate',
    title: 'Generate Grokcaster',
    contexts: ['page', 'selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'grokcaster-generate' && tab?.id) {
    // Inject content script if not already there
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
    } catch (e) {
      // Script might already be injected
    }
    
    // Small delay to ensure script is ready
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { type: 'GROKCASTER_SHOW' });
    }, 100);
  }
});

// Handle action button click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
    } catch (e) {
      // Script might already be injected
    }
    
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { type: 'GROKCASTER_SHOW' });
    }, 100);
  }
});
