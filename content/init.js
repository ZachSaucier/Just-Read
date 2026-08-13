// Must load last (see CONTENT_SCRIPT_FILES in background.js).

// Loads the styles after the xhr request finishes
function beginOpeningReader() {
  // Create a style tag and place our styles in there from localStorage
  JR.styleElem = document.createElement("style");

  if (typeof JR.chromeStorage["jrHasBeenNotifiedOfSummarizer"] !== "undefined") {
    JR.hasBeenNotifiedOfSummarizer = true;
  }

  // Get how many times the user has opened Just Read
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

  // Get current theme
  if (JR.chromeStorage["currentTheme"]) {
    JR.theme = JR.chromeStorage["currentTheme"];
  } else {
    chrome.storage.sync.set({ currentTheme: "default-styles.css" });
    JR.theme = "default-styles.css";
  }
  JR.styleElem.appendChild(document.createTextNode(JR.stylesheetObj[JR.theme]));

  // Create our version of the article
  applyDomainSettingsThenCreateOverlay();
}

function fadeIn() {
  if (JR.simpleArticleIframe.styleSheets.length > 2) {
    JR.simpleArticle.classList.remove("no-trans");
    JR.simpleArticle.classList.remove("simple-fade-up");

    // Remove contents of original page to make page more performant
    if (JR.removeOrigContent) {
      JR.simpleArticle.addEventListener(
        "transitionend",
        (e) => {
          [...document.body.children].forEach((child) =>
            child !== JR.simpleArticle ? document.body.removeChild(child) : null
          );
        },
        { once: true }
      );
    }
  } else {
    setTimeout(fadeIn, 10);
  }
}

function onSimpleArticleIframeLoaded(cb) {
  if (JR.simpleArticleIframe.readyState === "complete") {
    cb();
    return;
  }

  JR.simpleArticleIframe.defaultView.addEventListener("load", cb);
}

function completeReaderSetup() {
  // Add functionality for back button to close JR
  if (document.referrer !== window.location.href) {
    const url = new URL(window.location);
    window.history.pushState({}, "", url);
  }

  // Add our required stylesheet for the article
  if (!JR.simpleArticleIframe.head.querySelector(".required-styles"))
    addStylesheet(
      JR.simpleArticleIframe,
      "required-styles.css",
      "required-styles",
    );

  // Add the segments hider if needed
  if (
    (JR.chromeStorage["hideSegments"] &&
      !JR.simpleArticleIframe.head.querySelector(".hide-segments")) ||
    typeof JR.chromeStorage["hideSegments"] === "undefined"
  ) {
    JR.hideSegments = true;
    addStylesheet(JR.simpleArticleIframe, "hide-segments.css", "hide-segments");
  }

  // Change the top most page when regular links are clicked
  for (let i = 0, l = JR.simpleArticleIframe.links.length; i < l; i++) {
    JR.simpleArticleIframe.links[i].onclick = linkListener;
  }

  // Navigate to the element specified by the URL # if it exists
  if (top.window.location.hash != null) {
    setTimeout(function () {
      JR.simpleArticleIframe.location.hash = top.window.location.hash;
    }, 10);
  }

  // Append our theme styles to the overlay
  JR.simpleArticleIframe.head.appendChild(JR.styleElem);

  onSimpleArticleIframeLoaded(() => {
    chrome.runtime.sendMessage({ tabOpenedJR: window.location });
    fadeIn();
  });

  // Apply the auto-scroll if necessary
  if (JR.chromeStorage["autoscroll"]) {
    if (JR.chromeStorage["scroll-speed"])
      JR.scrollSpeed = JR.chromeStorage["scroll-speed"];

    JR.simpleArticleIframe.body.appendChild(createScrollSpeedInput());
    JR.simpleArticleIframe.body.appendChild(createPauseScrollButton());

    JR.lastTime = Date.now();
    scrollPage();
  }

  // Add the article scrollbar if necessary
  if (JR.chromeStorage["scrollbar"]) {
    initScrollbar();
  }

  // Attempt to mute the elements on the original page
  mutePage();

  // Auto-run the summarizer if configured
  if (JR.chromeStorage["summaryAutoRun"] && JR.chromeStorage["summarizer-options"]) {
    handleSummarizeClick();
  }
}

function launch() {
  // Detect past overlay - don't show another
  if (document.getElementById("simple-article") == null) {
    // Check to see if the user wants to select the text
    if (JR.useText) {
      // Start the process of the user selecting text to read
      startSelectElement(document);
    } else {
      // Add the stylesheet for the container
      if (!document.head.querySelector(".page-styles"))
        addStylesheet(document, "page.css", "page-styles");

      if (JR.runOnLoad && document.readyState !== "complete") {
        window.addEventListener("load", checkPremium, { once: true });
      } else {
        checkPremium();
      }
    }
  } else {
    if (document.querySelector(".simple-fade-up") == null)
      // Make sure it's been able to load
      closeOverlay();
  }
}

chrome.storage.sync.get(null, function (result) {
  JR.chromeStorage = result || {};

  // Allow content to be removed if enabled
  if (JR.chromeStorage["remove-orig-content"] !== false) {
    JR.removeOrigContent = true;
  }
  JR.useText = JR.chromeStorage["useText"];
  JR.runOnLoad = JR.chromeStorage["runOnLoad"];

  launch();
});
