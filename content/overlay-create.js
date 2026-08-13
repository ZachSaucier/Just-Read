let savedComments, savedCompactComments;

function applyDomainSelectors() {
  if (!JR.chromeStorage["domainSelectors"]) return;

  const domainSelectorArr = JR.chromeStorage["domainSelectors"];
  for (let i = 0; i < domainSelectorArr.length; i++) {
    const domainSelObj = domainSelectorArr[i];
    const regex = new RegExp(domainSelObj.domainPattern, "i");

    if (window.location.href.match(regex)) {
      if (domainSelObj.titleSelector)
        JR.titleSelector = domainSelObj.titleSelector;
      if (domainSelObj.authorSelector)
        JR.authorSelector = domainSelObj.authorSelector;
      if (domainSelObj.dateSelector) JR.dateSelector = domainSelObj.dateSelector;
      if (domainSelObj.contentSelector)
        JR.contentSelector = domainSelObj.contentSelector;
      if (domainSelObj.headerImageSelector)
        JR.headerImageSelector = domainSelObj.headerImageSelector;
      if (domainSelObj.selectorsToDelete)
        JR.selectorsToDelete = domainSelObj.selectorsToDelete;
    }
  }
}

function restoreBackupIfPresent(data) {
  if (typeof data.JRSavedPage === "undefined") return;

  const lastSavedPage = JSON.parse(data.JRSavedPage);
  if (!lastSavedPage || window.location.href !== lastSavedPage.url) return;

  const restored = document.createElement("div");
  restored.innerHTML = DOMPurify.sanitize(lastSavedPage.content);
  JR.pageSelectedContainer = restored;

  if (lastSavedPage.savedComments) {
    savedComments = lastSavedPage.savedComments;
    savedCompactComments = lastSavedPage.savedCompactComments;
  }
}

function applyDomainSettingsThenCreateOverlay() {
  applyDomainSelectors();

  if (JR.chromeStorage["backup"]) {
    chrome.storage.local.get("JRSavedPage", (data) => {
      restoreBackupIfPresent(data);
      createReaderOverlay();
    });
  } else {
    createReaderOverlay();
  }
}

function createReaderOverlay() {
  // Disable scroll on main page until closed
  document.documentElement.classList.add("simple-no-scroll");

  // Create an iframe so we don't use old styles
  JR.simpleArticle = document.createElement("iframe");
  JR.simpleArticle.id = "simple-article";
  JR.simpleArticle.className = "simple-fade-up no-trans"; // Add fade

  const container = document.createElement("div");
  container.className = "simple-container";

  const articleContainer = document.createElement("div");
  articleContainer.className = "simple-article-container";

  // Try using the selected element's content
  if (JR.userSelected) {
    JR.pageSelectedContainer = JR.userSelected;
  }

  // If there is no text selected, auto-select the content
  if (!JR.pageSelectedContainer) {
    JR.pageSelectedContainer = getArticleContainer();

    const pattern = new RegExp("<br/?>[ \r\ns]*<br/?>", "g");
    JR.pageSelectedContainer.innerHTML = DOMPurify.sanitize(
      JR.pageSelectedContainer.innerHTML.replace(pattern, "</p><p>")
    );
  }

  JR.selected = JR.pageSelectedContainer;

  // Get the title, author, etc.
  articleContainer.appendChild(addArticleMeta());

  // Set the text as our text
  const contentContainer = document.createElement("div");
  contentContainer.className = "content-container";
  contentContainer.innerHTML = DOMPurify.sanitize(
    JR.pageSelectedContainer.innerHTML
  );

  const lightboxes = [];

  const title = articleContainer.querySelector(".simple-title")?.textContent;

  // Strip inline styles
  const allElems = contentContainer.querySelectorAll("*");
  allElems.forEach((elem) => {
    if (elem != undefined) {
      elem.removeAttribute("style");
      elem.removeAttribute("color");
      elem.removeAttribute("width");
      elem.removeAttribute("height");
      elem.removeAttribute("background");
      elem.removeAttribute("bgcolor");
      elem.removeAttribute("border");

      // Delete the title if we find it in the article
      if (elem.textContent.trim() === title) {
        elem.parentElement.removeChild(elem);
      }

      // See if the pres have code in them
      let isPreNoCode = true;
      if (elem.nodeName === "PRE" && !JR.chromeStorage["leavePres"]) {
        isPreNoCode = false;

        Array.from(elem.children).forEach((child) => {
          if (child.nodeName === "CODE") {
            isPreNoCode = true;
          }
        });

        // If there's no code, format it
        if (!isPreNoCode) {
          elem.innerHTML = DOMPurify.sanitize(
            elem.innerHTML.replace(/\n/g, "<br/>")
          );
        }
      }

      // Replace the depreciated font element and pres without code with ps
      if ((elem.nodeName === "FONT" || !isPreNoCode) && elem.parentElement) {
        const p = document.createElement("p");
        p.innerHTML = DOMPurify.sanitize(elem.innerHTML);

        elem.parentElement.insertBefore(p, elem);
        elem.parentElement.removeChild(elem);
      }

      // Remove any inline style, LaTeX text, or noindex elements and things with aria hidden
      if (
        elem.nodeName === "STYLE" ||
        elem.nodeName === "NOINDEX" ||
        elem.nodeName === "LINK" ||
        elem.getAttribute("encoding") == "application/x-tex" ||
        (elem.getAttribute("aria-hidden") == "true" &&
          !elem.classList.contains("mwe-math-fallback-image-inline"))
      )
        elem.setAttribute("data-simple-delete", true);

      // Show LaTeX plain text on hover
      if (elem.classList.contains("mwe-math-fallback-image-inline")) {
        const plainText = document.createElement("div");
        plainText.className = "simple-plain-text";
        plainText.innerText = elem.alt;
        elem.parentElement.insertBefore(plainText, elem.nextSibling);
      }

      if (elem.nodeName === "IMG") {
        // Lightbox our images
        let img = elem;
        lightboxes.push(img);

        // Load lazy loaded images
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
        } else if (img.dataset.src) {
          img.src = img.dataset.src;
        }
      }

      // REMOVE WHEN SWITCHING TO CSS SCROLL ANIMATION FOR SCROLLBAR
      // Update our scrollbar sizing
      if (
        elem.nodeName === "IFRAME" ||
        elem.nodeName === "VIDEO" ||
        elem.nodeName === "IMG"
      ) {
        elem.addEventListener("load", updateScrollbarMetrics, { once: true });
      }
    }
  });

  // Add the compact comment section
  JR.compactComments = document.createElement("div");
  JR.compactComments.className = "simple-compact-comments";

  // Add the comment section
  JR.comments = document.createElement("div");
  JR.comments.className = "simple-comments";

  // Add the "add comment" button
  let addCommentContainer = document.createElement("div");
  addCommentContainer.className = "simple-add-comment-container";

  JR.addCommentBtn = document.createElement("button");
  JR.addCommentBtn.className = "premium-feature simple-add-comment";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 1000");

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    "M676,368.3H520.1V212.4c0-11.1-9-20.1-20.1-20.1c-11.1,0-20.1,9-20.1,20.1v155.9H324c-11.1,0-20.1,9-20.1,20.1c0,11.1,9,20.1,20.1,20.1h155.9v155.9c0,11.1,9,20.1,20.1,20.1c11.1,0,20.1-9,20.1-20.1V408.5H676c11.1,0,20.1-9,20.1-20.1C696.1,377.3,687.1,368.3,676,368.3z"
  );

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute(
    "d",
    "M657.9,19.3H342.1C159,19.3,10,181.4,10,380.6C10,549.8,117.2,695,267.1,732.5v228.1c0,7.9,4.6,15.1,11.8,18.3c2.7,1.2,5.5,1.8,8.3,1.8c4.8,0,9.6-1.7,13.3-5L566,741.8h91.9C841,741.8,990,579.7,990,380.6S841,19.3,657.9,19.3z M657.9,701.6h-99.5c-4.9,0-9.6,1.8-13.3,5L307.4,916V716.3c0-9.6-6.8-17.9-16.3-19.8c-139.5-27.1-240.8-160-240.8-316c0-177,130.9-321,291.9-321h315.8c160.9,0,291.9,144,291.9,321C949.8,557.6,818.8,701.6,657.9,701.6z"
  );
  path2.setAttribute("transform", "scale(-1, 1) translate(-1000, 0)");

  svg.appendChild(path1);
  svg.appendChild(path2);
  JR.addCommentBtn.appendChild(svg);

  JR.addCommentBtn.title = "Add a comment";
  JR.addCommentBtn.onclick = function () {
    if (JR.isPremium) {
      addComment({ x: parseInt(this.style.left), y: parseInt(this.style.top) });
    } else {
      const notification = {
        textContent:
          "To add comments, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>! Comments are just <em>one</em> of the additional features included.",
        url: "https://justread.link/#get-Just-Read",
        primaryText: "Learn more",
        secondaryText: "Maybe later",
      };
      JR.simpleArticleIframe.body.appendChild(createNotification(notification));
    }
  };
  addCommentContainer.appendChild(JR.addCommentBtn);

  // Add the next chapter button if there is one
  const potentialOldMatches = [...contentContainer.querySelectorAll("a[href]")];
  if (
    !potentialOldMatches.some((match) => {
      const text = match.innerText.replace(/\s/g, "").toUpperCase();
      if (text === "NEXTCHAPTER" || text === "NEXT") {
        match.className = "jrNextChapter";
        return true;
      }
    })
  ) {
    const potentialNewMatches = [...document.querySelectorAll("a[href]")];

    potentialNewMatches.some((match) => {
      const text = match.innerText?.replace(/\s/g, "").toUpperCase();
      if (text === "NEXTCHAPTER" || text === "NEXT") {
        match.className = "jrNextChapter";
        contentContainer.appendChild(match);
        return true;
      }
    });
  }

  // Handle RTL sites
  const direction = window
    .getComputedStyle(document.body)
    .getPropertyValue("direction");
  if (
    direction === "rtl" ||
    (contentContainer.firstChild &&
      isRTL(contentContainer.firstChild.innerText))
  ) {
    container.classList.add("rtl");
  }

  articleContainer.appendChild(contentContainer);

  // Add small bit of info about our extension
  articleContainer.appendChild(addExtInfo());

  if (JR.headerImageSelector && document.querySelector(JR.headerImageSelector)) {
    const headerImg = document.querySelector(JR.headerImageSelector);
    contentContainer.appendChild(headerImg);
  }

  // Create a container for the UI buttons
  let uiContainer = document.createElement("div");
  uiContainer.className = "simple-ui-container";

  // Add the close button
  uiContainer.appendChild(addCloseButton());

  // Add the print button
  uiContainer.appendChild(addPrintButton());

  // Add the share button
  uiContainer.appendChild(addShareButton());

  // Add the summarize button
  uiContainer.appendChild(addSummarizeButton());

  // Add the deletion mode button
  let delModeBtn = addDelModeButton();
  uiContainer.appendChild(delModeBtn);

  // Add the undo button
  uiContainer.appendChild(addUndoButton());

  container.appendChild(uiContainer);

  // Add our iframe to the page
  document.body.appendChild(JR.simpleArticle);

  // Focus the article so our shortcuts work from the start
  document.getElementById("simple-article").focus();

  // Append our custom HTML to the iframe
  container.appendChild(articleContainer);
  container.appendChild(JR.compactComments);
  container.appendChild(addCommentContainer);
  container.appendChild(JR.comments);

  // Add saved comments if applicable
  if (savedComments) {
    JR.comments.innerHTML = DOMPurify.sanitize(savedComments);
    JR.comments.querySelectorAll(".delete-button").forEach((btn) => {
      btn.onclick = function () {
        JR.hasSavedLink = false;
        JR.shareDropdown.classList.remove("active");
        const compactRef = JR.simpleArticleIframe.querySelector(
          "[href *= " + this.parentElement.parentElement.id + "]"
        );
        compactRef.parentElement.removeChild(compactRef);
        cancelComment(null, this.parentElement);
      };
    });

    JR.compactComments.innerHTML = DOMPurify.sanitize(savedCompactComments);
  }

  runWhenIframeReady(() =>
    initializeReaderIframe(container, uiContainer, delModeBtn, lightboxes)
  );
}

function runWhenIframeReady(callback) {
  // Firefox needs a tick before the iframe document is writable
  if (navigator.userAgent.toLowerCase().indexOf("firefox") > -1) {
    setTimeout(callback, 100);
  } else {
    callback();
  }
}

function initializeReaderIframe(container, uiContainer, delModeBtn, lightboxes) {
  JR.simpleArticleIframe =
    document.getElementById("simple-article").contentWindow.document;
  JR.simpleArticleIframe.body.appendChild(container);
  JR.simpleArticleIframe.documentElement.setAttribute(
    "lang",
    document.documentElement.getAttribute("lang")
  );
  JR.simpleArticleIframe.body.className = window.location.hostname.replace(
    /\./g,
    "-"
  );

  applyTimeEstimate();
  showUsageNotifiers();
  removeFlaggedElements();
  uiContainer.insertBefore(addThemeEditorButton(), delModeBtn);
  bindReaderControls();
  createImageLightboxes(lightboxes);
  bindReaderKeyboardShortcuts();

  JR.simpleArticleIframe.querySelectorAll(
    "iframe[src *= 'youtube.com/embed/']"
  ).forEach((frame) => frame.parentElement.classList.add("youtubeContainer"));

  addInlineCommentFunctionality();

  JR.simpleArticleIframe.addEventListener("pointerup", handleSelectionPointerUp);
  JR.simpleArticleIframe.addEventListener("touchend", handleSelectionPointerUp);
  JR.simpleArticleIframe.addEventListener("pointermove", handlePointerMove);

  setTimeout(checkBreakpoints, 10);
  completeReaderSetup();
}

function applyTimeEstimate() {
  if (!JR.chromeStorage["addTimeEstimate"]) return;

  const wordCount = JR.simpleArticleIframe
    .querySelector(".content-container")
    .innerHTML.split(/\s+/).length;
  JR.simpleArticleIframe.querySelector(".simple-time-estimate").innerText =
    Math.floor(wordCount / 200) + " minute read";
}

function showUsageNotifiers() {
  if (JR.jrOpenCount > 15 && !JR.hasBeenNotifiedOfSummarizer) {
    addSummaryNotifier();
    chrome.storage.sync.set({ jrHasBeenNotifiedOfSummarizer: true });
  }

  if (
    !JR.isPremium &&
    (JR.jrOpenCount === 5 || JR.jrOpenCount % 33 === 1) &&
    JR.jrOpenCount < 68
  ) {
    addPremiumNotifier();
  }

  if (!JR.hasBeenAskedForReview100 && JR.jrOpenCount > 100) {
    const roundedNumViews = 100 * Math.floor(JR.jrOpenCount / 100);
    chrome.storage.sync.set({ jrHasBeenAskedForReview100: true });
    addReviewNotifier(roundedNumViews, !JR.isPremium);
  }

  if (
    !JR.hasBeenAskedForReview1000 &&
    JR.hasBeenAskedForReview100 &&
    JR.jrOpenCount > 1000
  ) {
    const roundedNumViews = 100 * Math.floor(JR.jrOpenCount / 100);
    chrome.storage.sync.set({ jrHasBeenAskedForReview1000: true });
    addReviewNotifier(roundedNumViews, !JR.isPremium);
  }

  if (
    !JR.hasBeenAskedForReview10000 &&
    JR.hasBeenAskedForReview1000 &&
    JR.jrOpenCount > 10000
  ) {
    const roundedNumViews = 100 * Math.floor(JR.jrOpenCount / 100);
    chrome.storage.sync.set({ jrHasBeenAskedForReview10000: true });
    addReviewNotifier(roundedNumViews, null, true);
  }
}

function removeFlaggedElements() {
  if (JR.selectorsToDelete) {
    JR.selectorsToDelete.forEach((selector) => {
      JR.simpleArticleIframe.querySelectorAll(selector).forEach((elem) => {
        elem.dataset.simpleDelete = true;
      });
    });
  }

  JR.simpleArticleIframe
    .querySelectorAll("[data-simple-delete]")
    .forEach((elem) => {
      elem.parentElement.removeChild(elem);
    });
}

function bindReaderControls() {
  JR.simpleArticleIframe
    .querySelector(".simple-close")
    .addEventListener("click", closeOverlay);

  JR.simpleArticleIframe
    .querySelector(".simple-print")
    .addEventListener("click", function () {
      JR.simpleArticleIframe.defaultView.print();
    });

  JR.simpleArticleIframe
    .querySelector(".simple-share")
    .addEventListener("click", shareReaderView);
  JR.shareDropdown = JR.simpleArticleIframe.querySelector(
    ".simple-share-dropdown"
  );

  const deleteModeButton = JR.simpleArticleIframe.querySelector(".simple-delete");
  if (deleteModeButton) {
    deleteModeButton.onclick = function () {
      startDeleteElement(JR.simpleArticleIframe);
    };
  }

  JR.undoBtn.addEventListener("click", undoLastAction);
}

function createImageLightboxes(lightboxes) {
  lightboxes.forEach((elem) => {
    if (!elem.parentElement) return;

    const imgId = uuidv4();
    const wrapper = document.createElement("button");
    wrapper.className = "jr-lightbox-trigger";
    wrapper.setAttribute("popovertarget", imgId);
    elem.parentElement.insertBefore(wrapper, elem);
    wrapper.appendChild(elem);

    const lightbox = document.createElement("dialog");
    lightbox.className = "jr-lightbox";
    lightbox.setAttribute("popover", "auto");
    lightbox.id = imgId;
    lightbox.addEventListener("click", () => lightbox.hidePopover());
    lightbox.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        lightbox.hidePopover();
        e.stopPropagation();
      }
    });

    const lightboxImg = document.createElement("img");
    lightboxImg.src = elem.src;
    lightbox.appendChild(lightboxImg);

    JR.simpleArticleIframe
      .querySelector(".simple-container")
      .appendChild(lightbox);
  });
}

function bindReaderKeyboardShortcuts() {
  JR.simpleArticleIframe.onkeydown = function (e) {
    if (
      e.key === "Escape" &&
      !JR.simpleArticleIframe.body.classList.contains("simple-deleting") &&
      document.hasFocus()
    )
      closeOverlay();

    if (e.key === ";" && (e.ctrlKey || e.metaKey) && e.shiftKey)
      startDeleteElement(JR.simpleArticleIframe);

    if ((e.ctrlKey || e.metaKey) && e.key === "p") {
      JR.simpleArticleIframe.defaultView.print();
      e.preventDefault();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      undoLastAction();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "e") {
      toggleContentEditing();
    }

    if (!JR.editorShortcutsEnabled) return;

    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      bolden();
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      italicize();
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "u") {
      underline();
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "s") {
      strikeThrough();
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "d") {
      deleteSelection();
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "c") {
      colorSelectedText(JR.lastFontColor);
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "h") {
      highlightSelectedText(JR.lastHighlightColor);
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
      removeHighlightFromSelectedText();
      e.preventDefault();
    }
  };
}
