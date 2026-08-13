// Must load last (see CONTENT_SCRIPT_FILES in background.js).

function applySessionFromStorage(storage) {
  JR.jrSecret = storage.jrSecret || false;
  JR.isPremium = !!storage.isPremium;
  JR.jrLastChecked = storage.jrLastChecked;
  JR.useText = storage.useText;
  JR.runOnLoad = storage.runOnLoad;
  JR.scrollSpeed = JR.settings.scrollSpeed;
  JR.theme = JR.settings.currentTheme;

  JR.hasBeenNotifiedOfSummarizer =
    typeof storage.jrHasBeenNotifiedOfSummarizer !== "undefined";
  JR.hasBeenAskedForReview100 =
    typeof storage.jrHasBeenAskedForReview100 !== "undefined";
  JR.hasBeenAskedForReview1000 =
    typeof storage.jrHasBeenAskedForReview1000 !== "undefined";
  JR.hasBeenAskedForReview10000 =
    typeof storage.jrHasBeenAskedForReview10000 !== "undefined";

  if (typeof storage.jrOpenCount !== "undefined") {
    JR.jrOpenCount = storage.jrOpenCount;
  }

  if (!storage.currentTheme) {
    chrome.storage.sync.set({ currentTheme: JR.settings.currentTheme });
  }
}

function applyThemeAndCreateOverlay() {
  JR.styleElem = document.createElement("style");

  if (typeof JR.jrOpenCount === "undefined") {
    chrome.storage.sync.set({ jrOpenCount: 0 });
    JR.jrOpenCount = 0;
  } else {
    chrome.storage.sync.set({ jrOpenCount: JR.jrOpenCount + 1 });
  }

  JR.styleElem.appendChild(document.createTextNode(JR.stylesheetObj[JR.theme]));

  applySiteSettingsThenCreateOverlay();
}

function fadeIn() {
  if (JR.readerDocument.styleSheets.length > 2) {
    JR.readerIframe.classList.remove("no-trans");
    JR.readerIframe.classList.remove("simple-fade-up");

    if (JR.settings.removeOrigContent) {
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
    JR.settings.hideSegments &&
    !JR.readerDocument.head.querySelector(".hide-segments")
  ) {
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

  if (JR.settings.autoscroll) {
    JR.readerDocument.body.appendChild(createScrollSpeedInput());
    JR.readerDocument.body.appendChild(createPauseScrollButton());

    JR.lastTime = Date.now();
    scrollPage();
  }

  if (JR.settings.scrollbar) {
    initScrollbar();
  }

  mutePage();

  if (JR.settings.summaryAutoRun && JR.settings.summarizerOptions) {
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
  result = result || {};
  JR.settings = parseSettings(result);
  collectStylesheetsFromStorage(result, JR.stylesheetObj);
  applySessionFromStorage(result);
  launch();
});
