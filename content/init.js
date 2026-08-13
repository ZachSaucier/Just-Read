// Must load last (see CONTENT_SCRIPT_FILES in background.js).

function applyThemeAndCreateOverlay() {
  JR.styleElem = document.createElement("style");

  if (typeof JR.chromeStorage["jrHasBeenNotifiedOfSummarizer"] !== "undefined") {
    JR.hasBeenNotifiedOfSummarizer = true;
  }

  if (typeof JR.chromeStorage["jrOpenCount"] === "undefined") {
    chrome.storage.sync.set({ jrOpenCount: 0 });
    JR.jrOpenCount = 0;
  } else {
    JR.jrOpenCount = JR.chromeStorage["jrOpenCount"];
    chrome.storage.sync.set({ jrOpenCount: JR.jrOpenCount + 1 });
  }

  if (typeof JR.chromeStorage["jrHasBeenAskedForReview100"] !== "undefined") {
    JR.hasBeenAskedForReview100 = true;
  }
  if (typeof JR.chromeStorage["jrHasBeenAskedForReview1000"] !== "undefined") {
    JR.hasBeenAskedForReview1000 = true;
  }
  if (typeof JR.chromeStorage["jrHasBeenAskedForReview10000"] !== "undefined") {
    JR.hasBeenAskedForReview10000 = true;
  }

  if (JR.chromeStorage["currentTheme"]) {
    JR.theme = JR.chromeStorage["currentTheme"];
  } else {
    chrome.storage.sync.set({ currentTheme: "default-styles.css" });
    JR.theme = "default-styles.css";
  }
  JR.styleElem.appendChild(document.createTextNode(JR.stylesheetObj[JR.theme]));

  applySiteSettingsThenCreateOverlay();
}

function fadeIn() {
  if (JR.readerDocument.styleSheets.length > 2) {
    JR.readerIframe.classList.remove("no-trans");
    JR.readerIframe.classList.remove("simple-fade-up");

    if (JR.removeOrigContent) {
      JR.readerIframe.addEventListener(
        "transitionend",
        (e) => {
          [...document.body.children].forEach((child) =>
            child !== JR.readerIframe ? document.body.removeChild(child) : null
          );
        },
        { once: true }
      );
    }
  } else {
    setTimeout(fadeIn, 10);
  }
}

function whenReaderDocumentReady(cb) {
  if (JR.readerDocument.readyState === "complete") {
    cb();
    return;
  }

  JR.readerDocument.defaultView.addEventListener("load", cb);
}

function finishOpeningReader() {
  if (document.referrer !== window.location.href) {
    const url = new URL(window.location);
    window.history.pushState({}, "", url);
  }

  if (!JR.readerDocument.head.querySelector(".required-styles"))
    addStylesheet(
      JR.readerDocument,
      "required-styles.css",
      "required-styles",
    );

  if (
    (JR.chromeStorage["hideSegments"] &&
      !JR.readerDocument.head.querySelector(".hide-segments")) ||
    typeof JR.chromeStorage["hideSegments"] === "undefined"
  ) {
    JR.hideSegments = true;
    addStylesheet(JR.readerDocument, "hide-segments.css", "hide-segments");
  }

  for (let i = 0, l = JR.readerDocument.links.length; i < l; i++) {
    JR.readerDocument.links[i].onclick = linkListener;
  }

  if (top.window.location.hash != null) {
    setTimeout(function () {
      JR.readerDocument.location.hash = top.window.location.hash;
    }, 10);
  }

  JR.readerDocument.head.appendChild(JR.styleElem);

  whenReaderDocumentReady(() => {
    chrome.runtime.sendMessage({ tabOpenedJR: window.location });
    fadeIn();
  });

  if (JR.chromeStorage["autoscroll"]) {
    if (JR.chromeStorage["scroll-speed"])
      JR.scrollSpeed = JR.chromeStorage["scroll-speed"];

    JR.readerDocument.body.appendChild(createScrollSpeedInput());
    JR.readerDocument.body.appendChild(createPauseScrollButton());

    JR.lastTime = Date.now();
    scrollPage();
  }

  if (JR.chromeStorage["scrollbar"]) {
    initScrollbar();
  }

  mutePage();

  if (JR.chromeStorage["summaryAutoRun"] && JR.chromeStorage["summarizer-options"]) {
    handleSummarizeClick();
  }
}

function launch() {
  if (document.getElementById("simple-article") == null) {
    if (JR.useText) {
      startSelectElement(document);
    } else {
      if (!document.head.querySelector(".page-styles"))
        addStylesheet(document, "page.css", "page-styles");

      if (JR.runOnLoad && document.readyState !== "complete") {
        window.addEventListener("load", verifyPremiumThenOpenReader, { once: true });
      } else {
        verifyPremiumThenOpenReader();
      }
    }
  } else {
    if (document.querySelector(".simple-fade-up") == null)
      closeOverlay();
  }
}

chrome.storage.sync.get(null, function (result) {
  JR.chromeStorage = result || {};

  if (JR.chromeStorage["remove-orig-content"] !== false) {
    JR.removeOrigContent = true;
  }
  JR.useText = JR.chromeStorage["useText"];
  JR.runOnLoad = JR.chromeStorage["runOnLoad"];

  launch();
});
