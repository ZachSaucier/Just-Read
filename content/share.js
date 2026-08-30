function cloneReaderContentForShare(keepJR) {
  const copy = JR.readerDocument
    .querySelector(".simple-container")
    .cloneNode(true);

  copy.querySelectorAll("a").forEach(function (a) {
    const newURL = new URL(a.href, window.location.href);
    if (
      newURL.pathname !== window.location.pathname ||
      newURL.protocol !== window.location.protocol ||
      newURL.host !== window.location.host
    ) {
      if (!newURL.href.startsWith("about:blank")) a.href = newURL.href;
      else a.href = newURL.href.substring(11);
    }
  });

  copy.querySelectorAll("img").forEach(function (img) {
    const newURL = new URL(img.src, window.location.href);
    if (
      newURL.pathname !== window.location.pathname ||
      newURL.protocol !== window.location.protocol ||
      newURL.host !== window.location.host
    ) {
      img.src = newURL.href;
    }
  });

  if (!JR.isHydratedSharedPage) {
    copy.className += " " + JR.readerDocument.body.className;
  }

  if (!copy.querySelector(".original-link")) {
    const originalLink = document.createElement("a");
    originalLink.href = JR.sharedOrigURL || window.location.href;
    originalLink.innerText = t("viewOriginalPage");
    originalLink.className = "original-link";

    const simpleMeta = copy.querySelector(".simple-meta");
    if (simpleMeta) {
      const firstChild = simpleMeta.querySelector("*");
      simpleMeta.insertBefore(originalLink, firstChild);
      const br = document.createElement("br");
      simpleMeta.insertBefore(br, firstChild);
      const br2 = document.createElement("br");
      simpleMeta.insertBefore(br2, firstChild);
    }
  }

  if (JR.usedGUI && JR.themeStylesheet) {
    const styleCopy =
      copy.querySelector("style") || JR.styleElem?.cloneNode(true);
    if (styleCopy) {
      styleCopy.innerText = stylesheetToString(JR.themeStylesheet);
      if (!copy.querySelector("style")) copy.appendChild(styleCopy);
    }
  } else if (JR.styleElem && !copy.querySelector("style")) {
    copy.appendChild(JR.styleElem.cloneNode(true));
  }

  let removeElems;
  if (keepJR) {
    removeElems = copy.querySelectorAll(
      ".simple-control:not(.simple-print), .simple-add-comment, .delete-button, .simple-add-comment-container, .jr-user-content-delete, .jr-hydrate-required-styles"
    );
  } else {
    removeElems = copy.querySelectorAll(
      ".simple-control, .simple-add-comment, .delete-button, .simple-add-comment-container, .jr-user-content-delete, .jr-hydrate-required-styles"
    );
  }
  removeElems.forEach(function (elem) {
    elem.parentElement.removeChild(elem);
  });

  const simpleUIContainer = copy.querySelector(".simple-ui-container");
  const title = copy.querySelector(".simple-title")
    ? copy.querySelector(".simple-title").innerText
    : "";
  if (simpleUIContainer) {
    const shareViaEmailButton = addShareViaEmailButton(title);
    simpleUIContainer.appendChild(shareViaEmailButton);
  }

  return copy;
}

function normalizeMathPlaceholdersForShare(copy) {
  copy.querySelectorAll(".jr-math").forEach((el) => {
    const tex = el.getAttribute("data-jr-tex");
    const display = el.getAttribute("data-jr-display") === "block";
    // Drop MathJax/mjx output so DOMPurify does not strip custom elements
    // and leave an empty node; keep data-* for server-side re-typeset.
    while (el.firstChild) el.removeChild(el.firstChild);
    el.textContent = tex || "[math]";
    if (!el.getAttribute("data-jr-display")) {
      el.setAttribute("data-jr-display", display ? "block" : "inline");
    }
  });
}

function sharedContentPayload(copy) {
  normalizeMathPlaceholdersForShare(copy);
  return DOMPurify.sanitize(copy.outerHTML, {
    ADD_TAGS: ["style", "progress"],
    ADD_ATTR: ["target", "popover", "popovertarget"],
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "link",
      "meta",
      "base",
      "form",
      "input",
      "textarea",
      "select",
    ],
    FORBID_ATTR: ["srcdoc"],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}

function rewriteCommentTimestamps(copy) {
  copy.querySelectorAll(".simple-comment-container").forEach((comment) => {
    const timestamp = comment.querySelector(".jr-timestamp");
    if (!timestamp || timestamp.querySelector("a")) return;

    const timestampLink = document.createElement("a");
    timestampLink.setAttribute("href", "#" + comment.id);
    timestampLink.innerText = timestamp.innerText.split(commentLeftOnPrefix()).pop();

    timestamp.innerText = commentLeftOnPrefix();
    timestamp.appendChild(timestampLink);
  });
}

let alertTimeout;
function shareReaderView(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!(JR.isPremium && JR.jrSecret)) {
    const notification = {
      textKey: "premiumUpsellShare",
      url: siteUrl("/#get-Just-Read"),
      primaryKey: "learnMore",
      secondaryKey: "maybeLater",
    };
    JR.readerDocument.body.appendChild(
      createNotification(notification, JR.readerDocument)
    );
    return;
  }

  if (JR.hasSavedLink) {
    updateShareButtonSaveState();
    return;
  }

  JR.hasSavedLink = true;

  const copy = cloneReaderContentForShare(true);
  const myTitle = copy.querySelector(".simple-title")
    ? copy.querySelector(".simple-title").innerText
    : t("unknownTitle");
  const myAuthor = copy.querySelector(".simple-author")
    ? copy.querySelector(".simple-author").innerText
    : t("unknownAuthor");

  rewriteCommentTimestamps(copy);

  const isUpdate = !!JR.sharedPageUrl;
  const hideSegmentsReady =
    JR.settings.hideSegments && !copy.querySelector(".hide-segments")
      ? fetchExtensionCss("hide-segments.css").then((css) => {
          const hideCSS = document.createElement("style");
          hideCSS.className = "hide-segments";
          hideCSS.textContent = css;
          copy.appendChild(hideCSS);
        })
      : Promise.resolve();

  hideSegmentsReady
    .then(() => {
      const date = new Date();
      const body = {
        jrSecret: JR.jrSecret,
        title: myTitle,
        author: myAuthor,
        content: sharedContentPayload(copy),
      };

      if (isUpdate) {
        body.JRUrl = JR.sharedPageUrl;
      } else {
        body.origURL = window.location.href;
        body.datetime =
          date.getFullYear() +
          "-" +
          (date.getMonth() + 1) +
          "-" +
          date.getDate() +
          ":" +
          date.getHours() +
          ":" +
          date.getMinutes() +
          ":" +
          date.getSeconds();
      }

      return jrFetch(JR.jrDomain + (isUpdate ? "updateEntry" : "newEntry"), {
        method: "POST",
        headers: { "Content-type": "application/json; charset=UTF-8" },
        body: JSON.stringify(body),
      });
    })
    .then(function (response) {
      if (!response.ok) throw response;
      else return response.text();
    })
    .then(function (url) {
      if (!url) return;

      JR.sharedPageUrl = url;
      JR.hasSavedLink = true;
      document.documentElement.dataset.jrDirty = "0";

      if (!isUpdate) {
        if (JR.settings.openSharedPage && JR.settings.closeOldPage) {
          chrome.runtime.sendMessage({ closeTab: "true" });
        }
        if (JR.settings.openSharedPage) {
          window.open(url, "_blank");
        }
      }

      updateShareButtonSaveState();
    })
    .catch(function (err) {
      markSharedPageDirty();
      if (err.status === 428) {
        JR.readerDocument
          .querySelector(".simple-share-alert")
          .classList.add("active");
        window.clearTimeout(alertTimeout);
        alertTimeout = setTimeout(function () {
          JR.readerDocument
            .querySelector(".simple-share-alert")
            .classList.remove("active");
        }, 10000);
      } else {
        console.error(`Fetch Error =\n`, err);
      }
    });
}
