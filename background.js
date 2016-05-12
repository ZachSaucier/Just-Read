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

// Listen for the extension's click
chrome.browserAction.onClicked.addListener(startJustRead);

// Listen for the keyboard shortcut
chrome.commands.onCommand.addListener(function(command) {
    if(command == "open-just-read")
        startJustRead();
});

// Create a right click menu option
chrome.runtime.onInstalled.addListener(function() { // Only do it once
    chrome.contextMenus.create({
         title: "Open with Just Read",
         contexts:["page"], 
         onclick: startJustRead
    });
});

// Allow simplified viewing of selected text?