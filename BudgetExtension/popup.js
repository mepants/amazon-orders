document.getElementById('amazon').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['amazon.js']
        });
    }
});