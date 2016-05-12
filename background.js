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

chrome.browserAction.onClicked.addListener(startJustRead);
chrome.commands.onCommand.addListener(function(command) {
    startJustRead();
});

// Allow simplified viewing of selected text?