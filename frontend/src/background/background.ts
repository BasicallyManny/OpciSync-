console.log("OpciSync background service worker running");

// Keep this file alive for messaging later
chrome.runtime.onInstalled.addListener(() => {
  console.log("OpciSync installed");
});

export {};