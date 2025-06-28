

document.addEventListener('DOMContentLoaded', () => {
const scanBtn = document.getElementById('scanBtn');
const autoScanCheckbox = document.getElementById('autoScan');
const reportBtn = document.getElementById('reportBtn');
const settingsBtn = document.getElementById('settingsBtn');
const aiChatBtn = document.getElementById('aiChatBtn');
const noResults = document.getElementById('noResults');


chrome.storage.sync.get(['autoScan'], (result) => {
    autoScanCheckbox.checked = result.autoScan !== false;
});

autoScanCheckbox.addEventListener('change', (event) => {
    chrome.storage.sync.set({ autoScan: event.target.checked });
});

scanBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.runtime.sendMessage({ action: 'startScan', tabId: tabs[0].id }, displayResults);
        } else {
            noResults.textContent = "No active tab found to scan.";
            noResults.style.display = 'block';
        }
    });
});

reportBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'generateReport' });
});

settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

aiChatBtn.addEventListener('click', () => {
    chrome.windows.create({
        url: chrome.runtime.getURL('chat.html'),
        type: 'popup',
        width: 350,
        height: 500
    });
});

// ... keep the rest of your existing displayResults function ...


});