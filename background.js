// FormSaver Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
    console.log('FormSaver extension installed');

    // Initialize storage if needed
    chrome.storage.local.get(['savedForms'], (result) => {
        if (!result.savedForms) {
            chrome.storage.local.set({ savedForms: [] });
        }
    });
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getStorage') {
        chrome.storage.local.get(['savedForms'], (result) => {
            sendResponse({ savedForms: result.savedForms || [] });
        });
        return true;
    }
});
