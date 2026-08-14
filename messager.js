if (window.__jrMessagerBound) {
  window.postMessage({ hasJR: true }, window.location.origin);
} else {
  window.__jrMessagerBound = true;

  const JR_ORIGINS = ["https://justread.link", "https://www.justread.link"];

  function isAllowedOrigin(origin) {
    return origin === window.location.origin && JR_ORIGINS.includes(origin);
  }

  function sendSecret(jrSecret) {
    if (!jrSecret || jrSecret === "undefined") return;
    chrome.runtime.sendMessage({ jrSecret: jrSecret });
  }

  function readDomSecret() {
    return document.documentElement.getAttribute("data-jr-secret") || "";
  }

  sendSecret(readDomSecret());
  window.postMessage({ hasJR: true }, window.location.origin);

  new MutationObserver(() => {
    sendSecret(readDomSecret());
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-jr-secret"],
  });

  window.addEventListener(
    "message",
    (event) => {
      if (!event.data || typeof event.data !== "object") return;
      if (!isAllowedOrigin(event.origin)) return;
      if (event.data.jrSecret) sendSecret(event.data.jrSecret);
      if (event.data.resetJRLastChecked) {
        chrome.runtime.sendMessage({ resetJRLastChecked: true });
      }
    },
    false,
  );
}
