function closeOverlay() {
  // Refresh the page if the content has been removed
  if (JR.removeOrigContent) {
    // Record the URL and timestamp so autorun can skip re-triggering on the
    // page reload that follows content removal
    chrome.storage.sync.set({
      jrClosedUrl: window.location.origin + window.location.pathname,
      jrClosedAt: Date.now(),
    });
    
    // The page refresh
    const url = new URL(window.location);
    url.searchParams.delete("jr");
    window.location.replace(url);
  }

  // Remove the GUI if it is open
  if (JR.datGUI) {
    JR.datGUI.destroy();
    JR.datGUI = undefined;
  }

  window.removeEventListener("resize", hideToolbar);

  // Fade out
  JR.simpleArticle.classList.add("simple-fade-up");

  // Remove some general listeners
  JR.simpleArticleIframe.removeEventListener("pointerup", handleSelectionPointerUp);
  JR.simpleArticleIframe.removeEventListener("touchend", handleSelectionPointerUp);
  JR.simpleArticleIframe.removeEventListener("pointermove", handlePointerMove);

  // Reset our variables
  JR.pageSelectedContainer = null;
  JR.userSelected = null;
  JR.simpleArticleIframe = undefined;
  JR.editBar = undefined;
  JR.chromeStorage = undefined;

  setTimeout(function () {
    // Enable scroll
    document.documentElement.classList.remove("simple-no-scroll");

    // Update our background script
    chrome.runtime.sendMessage({ lastClosed: Date.now() });

    // Remove our overlay
    JR.simpleArticle.parentElement.removeChild(JR.simpleArticle);
    JR.simpleArticle = undefined;
  }, 100); // Make sure we can animate it
}

// Handle link clicks
function linkListener(e) {
  if (!JR.simpleArticleIframe.body.classList.contains("simple-deleting")) {
    // Don't change the top most if it's not in the current window
    if (
      e.ctrlKey ||
      e.shiftKey ||
      e.metaKey ||
      (e.button && e.button == 1) ||
      this.target === "about:blank" ||
      this.target === "_blank"
    ) {
      return; // Do nothing
    }

    // Don't change the top most if it's referencing an anchor in the article
    const hrefArr = this.href.split("#");

    if (
      hrefArr.length < 2 || // No anchor
      (hrefArr[0] !== top.window.location.href.split("#")[0] && // Anchored to an ID on another page
        hrefArr[0] !== "about:blank" &&
        hrefArr[0] !== "_blank") ||
      (JR.simpleArticleIframe.getElementById(hrefArr[1]) == null && // The element is not in the article section
        JR.simpleArticleIframe.querySelector("a[name='" + hrefArr[1] + "']") ==
          null &&
        hrefArr[1] !== "_")
    ) {
      top.window.location.href = this.href; // Regular link
    } else {
      // Anchored to an element in the article
      e.preventDefault();
      e.stopPropagation();

      if (hrefArr[1].startsWith("jr-")) {
        JR.simpleArticleIframe.getElementById(hrefArr[1]).scrollIntoView(true);
        let backArrow = JR.simpleArticleIframe.querySelector(
          this.id + " .back-to-ref"
        );
        backArrow.dataset.scrollPos = JR.simpleArticleIframe.scrollTop;
      } else {
        top.window.location.hash = hrefArr[1];
        JR.simpleArticleIframe.defaultView.location.hash = hrefArr[1];
      }
    }
  }
}
