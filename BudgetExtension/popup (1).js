let parseAmazonBtn = document.getElementById('amazon');

parseAmazonBtn.onclick = function(element) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.executeScript(
            tabs[0].id,
            {file: 'amazon.js'});
    });
};

let parseSainsburysBtn = document.getElementById('sainsburys');

parseSainsburysBtn.onclick = function(element) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.executeScript(
            tabs[0].id,
            {file: 'sainsburys.js'});
    });
};

