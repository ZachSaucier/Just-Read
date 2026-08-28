function createReaderOverlay() {
  document.documentElement.classList.add("simple-no-scroll");

  JR.readerIframe = document.createElement("iframe");
  JR.readerIframe.id = "simple-article";
  JR.readerIframe.className = "simple-fade-up no-trans";

  const { container, articleContainer, lightboxes } = prepareArticleMarkup();
  const addCommentContainer = createCommentChrome();
  const { uiContainer, delModeBtn } = createReaderToolbar();

  container.appendChild(uiContainer);
  document.body.appendChild(JR.readerIframe);
  document.getElementById("simple-article").focus();

  container.appendChild(articleContainer);
  container.appendChild(JR.compactComments);
  container.appendChild(addCommentContainer);
  container.appendChild(JR.comments);

  restoreSavedComments();

  runWhenIframeReady(() =>
    initializeReaderIframe(container, uiContainer, delModeBtn, lightboxes),
  );
}

function createCommentChrome() {
  if (!JR.compactComments) {
    JR.compactComments = document.createElement("div");
    JR.compactComments.className = "simple-compact-comments";
  }

  if (!JR.comments) {
    JR.comments = document.createElement("div");
    JR.comments.className = "simple-comments";
  }

  if (
    JR.readerDocument &&
    JR.readerDocument.querySelector(".simple-add-comment-container")
  ) {
    JR.addCommentBtn = JR.readerDocument.querySelector(".simple-add-comment");
    return JR.readerDocument.querySelector(".simple-add-comment-container");
  }

  const addCommentContainer = document.createElement("div");
  addCommentContainer.className = "simple-add-comment-container";

  JR.addCommentBtn = document.createElement("button");
  JR.addCommentBtn.className = "premium-feature simple-add-comment";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 1000");

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    "M676,368.3H520.1V212.4c0-11.1-9-20.1-20.1-20.1c-11.1,0-20.1,9-20.1,20.1v155.9H324c-11.1,0-20.1,9-20.1,20.1c0,11.1,9,20.1,20.1,20.1h155.9v155.9c0,11.1,9,20.1,20.1,20.1c11.1,0,20.1-9,20.1-20.1V408.5H676c11.1,0,20.1-9,20.1-20.1C696.1,377.3,687.1,368.3,676,368.3z",
  );

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute(
    "d",
    "M657.9,19.3H342.1C159,19.3,10,181.4,10,380.6C10,549.8,117.2,695,267.1,732.5v228.1c0,7.9,4.6,15.1,11.8,18.3c2.7,1.2,5.5,1.8,8.3,1.8c4.8,0,9.6-1.7,13.3-5L566,741.8h91.9C841,741.8,990,579.7,990,380.6S841,19.3,657.9,19.3z M657.9,701.6h-99.5c-4.9,0-9.6,1.8-13.3,5L307.4,916V716.3c0-9.6-6.8-17.9-16.3-19.8c-139.5-27.1-240.8-160-240.8-316c0-177,130.9-321,291.9-321h315.8c160.9,0,291.9,144,291.9,321C949.8,557.6,818.8,701.6,657.9,701.6z",
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
      JR.readerDocument.body.appendChild(
        createNotification(notification, JR.readerDocument),
      );
    }
  };
  addCommentContainer.appendChild(JR.addCommentBtn);

  return addCommentContainer;
}

function createReaderToolbar() {
  const uiContainer = document.createElement("div");
  uiContainer.className = "simple-ui-container";

  uiContainer.appendChild(addCloseButton());
  uiContainer.appendChild(addPrintButton());
  uiContainer.appendChild(addShareButton());
  uiContainer.appendChild(addSummarizeButton());

  const delModeBtn = addDelModeButton();
  uiContainer.appendChild(delModeBtn);
  uiContainer.appendChild(addUndoButton());

  return { uiContainer, delModeBtn };
}

function restoreSavedComments() {
  if (!JR.savedComments) return;

  JR.comments.innerHTML = DOMPurify.sanitize(JR.savedComments);
  JR.compactComments.innerHTML = DOMPurify.sanitize(JR.savedCompactComments);
  rewireExistingComments();
}

function runWhenIframeReady(callback) {
  // Firefox needs a tick before the iframe document is writable
  if (navigator.userAgent.toLowerCase().indexOf("firefox") > -1) {
    setTimeout(callback, 100);
  } else {
    callback();
  }
}

function initializeReaderIframe(
  container,
  uiContainer,
  delModeBtn,
  lightboxes,
) {
  JR.readerDocument =
    document.getElementById("simple-article").contentWindow.document;
  JR.readerDocument.body.appendChild(container);
  JR.readerDocument.documentElement.setAttribute(
    "lang",
    document.documentElement.getAttribute("lang"),
  );
  JR.readerDocument.body.className = window.location.hostname.replace(
    /\./g,
    "-",
  );

  applyTimeEstimate();
  showUsageNotifiers();
  removeFlaggedElements();
  uiContainer.insertBefore(addThemeEditorButton(), delModeBtn);
  bindReaderControls();
  createImageLightboxes(lightboxes);
  bindReaderKeyboardShortcuts();

  JR.readerDocument
    .querySelectorAll("iframe[src *= 'youtube.com/embed/']")
    .forEach((frame) => frame.parentElement.classList.add("youtubeContainer"));

  addInlineCommentFunctionality();

  JR.readerDocument.addEventListener("pointerup", handleSelectionPointerUp);
  JR.readerDocument.addEventListener("touchend", handleSelectionPointerUp);
  JR.readerDocument.addEventListener("pointermove", handlePointerMove);

  setTimeout(checkBreakpoints, 10);
  finishOpeningReader();
  if (typeof typesetReaderMath === "function") {
    typesetReaderMath();
  }
}

function applyTimeEstimate() {
  if (!JR.settings.addTimeEstimate) return;

  const wordCount = JR.readerDocument
    .querySelector(".content-container")
    .innerHTML.split(/\s+/).length;
  JR.readerDocument.querySelector(".simple-time-estimate").innerText =
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
      JR.readerDocument.querySelectorAll(selector).forEach((elem) => {
        elem.dataset.simpleDelete = true;
      });
    });
  }

  JR.readerDocument.querySelectorAll("[data-simple-delete]").forEach((elem) => {
    elem.parentElement.removeChild(elem);
  });
}

function bindReaderControls() {
  const closeBtn = JR.readerDocument.querySelector(".simple-close");
  if (closeBtn) closeBtn.addEventListener("click", closeOverlay);

  const printBtn = JR.readerDocument.querySelector(".simple-print");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      JR.readerDocument.defaultView.print();
    });
  }

  const shareBtn = JR.readerDocument.querySelector(".simple-share");
  if (shareBtn) shareBtn.addEventListener("click", shareReaderView);
  JR.shareDropdown = JR.readerDocument.querySelector(".simple-share-dropdown");

  const deleteModeButton = JR.readerDocument.querySelector(".simple-delete");
  if (deleteModeButton) {
    deleteModeButton.onclick = function () {
      startDeleteElement(JR.readerDocument);
    };
  }

  if (JR.undoBtn) JR.undoBtn.addEventListener("click", undoLastAction);
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

    JR.readerDocument.querySelector(".simple-container").appendChild(lightbox);
  });
}

function dismissReaderEscape(e) {
  e.preventDefault();
  e.stopPropagation();
}

function clearReaderSelection() {
  if (!JR.readerDocument) return;

  const sel = JR.readerDocument.getSelection();
  if (sel) sel.removeAllRanges();

  if (typeof rangy !== "undefined") {
    rangy.getSelection(JR.readerDocument).removeAllRanges();
  }
}

function isEditBarVisible() {
  return JR.editBar && JR.editBar.style.display !== "none";
}

function getActiveInputElement() {
  for (const root of [document, JR.readerDocument]) {
    if (!root) continue;

    const active = root.activeElement;
    if (!active || active === root.body || active === root.documentElement) continue;
    if (active === JR.readerIframe) continue;

    const tag = active.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return active;
    if (active.isContentEditable) return active;
  }

  return null;
}

function handleReaderEscape(e) {
  if (e.key !== "Escape") return;

  if (!JR.readerIframe) {
    JR.readerIframe = document.getElementById("simple-article");
  }
  if (!JR.readerIframe) return;
  if (JR.readerDocument?.body?.classList.contains("simple-deleting")) return;

  const openLightbox = JR.readerDocument?.querySelector(".jr-lightbox:popover-open");
  if (openLightbox) {
    openLightbox.hidePopover();
    dismissReaderEscape(e);
    return;
  }

  const addingComment = JR.readerDocument?.querySelector(
    ".simple-comment-container.jr-adding",
  );
  if (addingComment) {
    cancelComment(null, addingComment);
    dismissReaderEscape(e);
    return;
  }

  const focusedInput = getActiveInputElement();
  if (focusedInput) {
    focusedInput.blur();
    dismissReaderEscape(e);
    return;
  }

  if (isEditBarVisible()) {
    hideToolbar();
    clearReaderSelection();
    dismissReaderEscape(e);
    return;
  }

  closeOverlay();
  dismissReaderEscape(e);
}

function bindReaderKeyboardShortcuts() {
  document.addEventListener("keydown", handleReaderEscape, true);

  JR.readerDocument.onkeydown = function (e) {
    if (e.key === "Escape") {
      handleReaderEscape(e);
      return;
    }

    if (e.key === ";" && (e.ctrlKey || e.metaKey) && e.shiftKey)
      startDeleteElement(JR.readerDocument);

    if ((e.ctrlKey || e.metaKey) && e.key === "p") {
      JR.readerDocument.defaultView.print();
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
