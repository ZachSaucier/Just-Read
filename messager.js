const JR_ORIGINS = ["https://justread.link", "https://www.justread.link"];

function announceHasJR() {
  window.postMessage({ hasJR: true }, window.location.origin);
}

// Tell the JR website that the extension is installed (retry for late page scripts)
announceHasJR();
setTimeout(announceHasJR, 100);
setTimeout(announceHasJR, 1000);

// Listen for events from the JR website
window.addEventListener(
  "message",
  (event) => {
    if (!JR_ORIGINS.includes(event.origin)) return;
    if (!event.data || typeof event.data !== "object") return;

    const jrSecret = event.data.jrSecret;
    const resetJRLastChecked = event.data.resetJRLastChecked;
    if (jrSecret) {
      chrome.runtime.sendMessage({ jrSecret: jrSecret }, () => {
        window.postMessage({ jrPremiumEnabled: true }, window.location.origin);
      });
    }
    if (resetJRLastChecked) {
      chrome.runtime.sendMessage({ resetJRLastChecked: true });
    }
  },
  false,
);
