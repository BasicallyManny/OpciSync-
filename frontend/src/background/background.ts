console.log("OpciSync background running");

chrome.runtime.onInstalled.addListener(() => {
  console.log("OpciSync installed");
});

chrome.runtime.onMessage.addListener((message) => {
  console.log("Background received message:", message);

  if (message.type === "START_SYNC" && message.tabId) {
    chrome.scripting.executeScript(
      {
        target: { tabId: message.tabId },
        files: ["content.js"]
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Script injection failed:", chrome.runtime.lastError);
          return;
        }
        
        console.log("Content script injected, sending SCRAPE_LEADS");
        chrome.tabs.sendMessage(message.tabId, {
          type: "SCRAPE_LEADS"
        });
      }
    );
  }

  if (message.type === "START_AUTO_UPDATE" && message.tabId) {
    chrome.scripting.executeScript(
      {
        target: { tabId: message.tabId },
        files: ["content.js"]
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Script injection failed:", chrome.runtime.lastError);
          chrome.runtime.sendMessage({
            type: "UPDATE_COMPLETE",
            payload: { 
              success: false, 
              message: "Failed to inject script: " + chrome.runtime.lastError.message 
            }
          });
          return;
        }
        
        console.log("Content script injected, sending TEST_AUTO_UPDATE");
        chrome.tabs.sendMessage(message.tabId, {
          type: "TEST_AUTO_UPDATE"
        });
      }
    );
  }

  if (message.type === "LEADS_SCRAPED") {
    console.log("Leads scraped, forwarding to popup:", message.payload);
    chrome.runtime.sendMessage({
      type: "LEADS_SYNCED",
      payload: message.payload
    });
  }

  if (message.type === "UPDATE_COMPLETE") {
    console.log("Update complete, forwarding to popup:", message.payload);
    chrome.runtime.sendMessage({
      type: "UPDATE_COMPLETE",
      payload: message.payload
    });
  }
});