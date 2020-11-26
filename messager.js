const url = "https://justread.link/";

// Send the user's UID to the JR website
chrome.runtime.sendMessage({ getUID: "true" }, function(response) {
    if(response
    && response.uid) {
    	window.postMessage({ uid: response.uid }, url);
    }
});

// Listen for events from the JR website
window.addEventListener("message", (event) => {
  if (event.origin !== url) return;

  const jrSecret = event.data.jrSecret;
  const resetJRLastChecked = event.data.resetJRLastChecked;
  if(jrSecret) {
    chrome.runtime.sendMessage({jrSecret});
  }
  if(resetJRLastChecked) {
    chrome.runtime.sendMessage({resetJRLastChecked: true});
  }
}, false);
