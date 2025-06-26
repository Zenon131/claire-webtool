// This background script handles events from the Chrome extension API
// and manages communication between different parts of the extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Claire AI Assistant installed");

  // Set default settings
  chrome.storage.sync.set({
    lmStudioApiUrl: "http://localhost:6223",
    lmStudioModelName: "google/gemma-3-4b",
  });
});

// Handle clicking the extension icon
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.setOptions({ path: "popup.html" }, () => {
    if (tab.id !== undefined && tab.windowId !== undefined) {
      chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
    }
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    message.action === "extractPageContent" ||
    message.action === "extractVideoInfo"
  ) {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        sendResponse({ error: "No active tab found" });
        return;
      }

      const tabId = activeTab.id; // Capture in a const to ensure type stability

      // Forward the message to content script
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          // If content script is not ready/injected, inject it and try again
          chrome.scripting.executeScript(
            {
              target: { tabId },
              files: ["contentScript.js"],
            },
            () => {
              // After injection, try sending the message again
              chrome.tabs.sendMessage(tabId, message, (retryResponse) => {
                sendResponse(retryResponse);
              });
            }
          );
          return;
        }
        sendResponse(response);
      });
    });

    return true; // Required for async sendResponse
  }
});
