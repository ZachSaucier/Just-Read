const url = "https://justread.link";

// Tell the JR website that the extension is installed
window.postMessage({ hasJR: true }, url);

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
