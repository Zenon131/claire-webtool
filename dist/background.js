(() => {
  "use strict";
  chrome.runtime.onInstalled.addListener(() => {
    console.log("Claire AI Assistant installed"),
      chrome.storage.sync.set({
        lmStudioApiUrl: "http://localhost:6223",
        lmStudioModelName: "google/gemma-3-4b",
      });
  }),
    chrome.action.onClicked.addListener((e) => {
      chrome.sidePanel.setOptions({ path: "popup.html" }, () => {
        void 0 !== e.id &&
          void 0 !== e.windowId &&
          chrome.sidePanel.open({ tabId: e.id, windowId: e.windowId });
      });
    }),
    chrome.runtime.onMessage.addListener((e, t, o) => {
      if ("extractPageContent" === e.action || "extractVideoInfo" === e.action)
        return (
          chrome.tabs.query({ active: !0, currentWindow: !0 }, (t) => {
            const i = t[0];
            if (!(null == i ? void 0 : i.id))
              return void o({ error: "No active tab found" });
            const n = i.id;
            chrome.tabs.sendMessage(n, e, (t) => {
              chrome.runtime.lastError
                ? chrome.scripting.executeScript(
                    { target: { tabId: n }, files: ["contentScript.js"] },
                    () => {
                      chrome.tabs.sendMessage(n, e, (e) => {
                        o(e);
                      });
                    }
                  )
                : o(t);
            });
          }),
          !0
        );
    });
})();
