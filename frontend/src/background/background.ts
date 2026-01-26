console.log("OpciSync background service worker running");

chrome.runtime.onInstalled.addListener(() => {
  console.log("OpciSync installed");
});

// Handle sync request from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_SYNC" && message.tabId) {
    // Inject content script into the active tab
    chrome.scripting.executeScript(
      {
        target: { tabId: message.tabId },
        files: ["content.js"]
      },
      () => {
        // After injection, tell content script to show spinner
        chrome.tabs.sendMessage(message.tabId, { type: "SHOW_SPINNER" });
      }
    );
  }
  
  // Forward completion message from content script to popup
  if (message.type === "SPINNER_COMPLETE") {
    chrome.runtime.sendMessage({
      type: "LEADS_SYNCED",
      payload: message.payload || []
    });
  }
});

export {};