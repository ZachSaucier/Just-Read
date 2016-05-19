function startJustRead(tab) {
    chrome.tabs.executeScript(null, { // Defaults to the current tab
        file: "content_script.js", // Script to inject into page and run in sandbox
        allFrames: false // This injects script into iframes in the page and doesn't work before 4.0.266.0.
    });

    // Add a badge to signify the extension is in use
    chrome.browserAction.setBadgeBackgroundColor({color:[242, 38, 19, 230], tabId: tab.tabId});
    chrome.browserAction.setBadgeText({text:"on"});

    setTimeout(function() {
        chrome.browserAction.setBadgeText({text:""});
    }, 3000);
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

//chrome.runtime.onInstalled.addListener(function() { // Only do it once
    // Create a right click menu option
    chrome.contextMenus.create({
         title: "Open this page using Just Read",
         contexts: ["page"], 
         onclick: startJustRead
    });

    // Create an entry to allow selection of text
    chrome.contextMenus.create({
        title: "Select text to read",
        contexts: ["browser_action"],
        onclick: function() {
            startSelectText();
        }
    });


//});