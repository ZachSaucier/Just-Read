function startJustRead(tab) {
    chrome.tabs.executeScript(null, { // Defaults to the current tab
        file: "content_script.js", // Script to inject into page and run in sandbox
        allFrames: false // This injects script into iframes in the page and doesn't work before 4.0.266.0.
    });

    // Add a badge to signify the extension is in use
    chrome.browserAction.setBadgeBackgroundColor({color:[242, 38, 19, 230]});
    chrome.browserAction.setBadgeText({text:"on"});

    setTimeout(function() {
        chrome.browserAction.setBadgeText({text:""});
    }, 2000);
}

function startSelectText() {
    chrome.tabs.executeScript(null, {
        code: 'var useText = true;' // Ghetto way of signaling to select text instead of 
    }, function() {                 // using Chrome messages
        startJustRead();
    });
}

// Listen for the extension's click
chrome.browserAction.onClicked.addListener(startJustRead);

// Listen for the keyboard shortcut
chrome.commands.onCommand.addListener(function(command) {
    if(command == "open-just-read")
        startJustRead();
});
chrome.commands.onCommand.addListener(function(command) {
    if(command == "select-text")
        startSelectText();
});

// Listen for requests to open the options page
chrome.extension.onRequest.addListener(function(data, sender) {
    if(data === "Open options") {
        chrome.runtime.openOptionsPage();
    }
});

//chrome.runtime.onInstalled.addListener(function() { // Only do it once
    // Create a right click menu option
    chrome.contextMenus.create({
         title: "View this page using Just Read",
         contexts: ["page"], 
         onclick: startJustRead
    });

    // Create an entry to allow user to select an element to read from
    chrome.contextMenus.create({
        title: "Select text to read",
        contexts: ["browser_action"],
        onclick: function() {
            startSelectText();
        }
    });

    // Create an entry to allow user to use currently selected text
    chrome.contextMenus.create({title: "View this text in Just Read", 
        contexts:["selection"], 
        onclick: function(info, tab) { 
            chrome.tabs.executeScript(null, {
                code: 'var textToRead = true'
                //code: 'var textToRead = \"' + info.selectionText.replace(/["]+/g, '\\\"').replace(/[']+/g, '\\\'') + '\";'
            }, function() { 
                startJustRead();
            });
        }
    });

//});


chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'loading') {
        // Auto enable on sites specified
        chrome.storage.sync.get('auto-enable-site-list', function (siteListObj) {
            var siteList = siteListObj['auto-enable-site-list'],
                url = tab.url;
            
            for(var i = 0; i < siteList.length; i++) {
                if(url.indexOf(siteList[i]) > -1) {
                    chrome.tabs.executeScript(null, {
                        code: 'var runOnLoad = true;' // Ghetto way of signaling to run on load 
                    }, function() {                   // instead of using Chrome messages
                        startJustRead();
                    });
                }
            }
        });
    }
});