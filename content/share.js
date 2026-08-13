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

  copy.className += " " + JR.readerDocument.body.className;

  const originalLink = document.createElement("a");
  originalLink.href = window.location.href;
  originalLink.innerText = "View original page";
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

  if (JR.usedGUI) JR.styleElem.innerText = stylesheetToString(JR.themeStylesheet);
  copy.appendChild(JR.styleElem.cloneNode(true));

  let removeElems;
  if (keepJR) {
    removeElems = copy.querySelectorAll(
      ".simple-control:not(.simple-print), .simple-add-comment, .delete-button, .simple-add-comment-container, .jr-user-content-delete"
    );
  } else {
    removeElems = copy.querySelectorAll(
      ".simple-control, .simple-add-comment, .delete-button, .simple-add-comment-container, .jr-user-content-delete"
    );
  }
  removeElems.forEach(function (elem) {
    elem.parentElement.removeChild(elem);
  });

  const simpleUIContainer = copy.querySelector(".simple-ui-container");
  const title = copy.querySelector(".simple-title").innerText;
  const shareViaEmailButton = addShareViaEmailButton(title);
  simpleUIContainer.appendChild(shareViaEmailButton);

  return copy;
}

let alertTimeout;
function shareReaderView() {
  if (JR.isPremium && JR.jrSecret) {
    if (!JR.hasSavedLink) {
      JR.hasSavedLink = true;

      let copy = cloneReaderContentForShare(true);

      const myTitle = copy.querySelector(".simple-title")
          ? copy.querySelector(".simple-title").innerText
          : "Unknown title",
        myAuthor = copy.querySelector(".simple-author")
          ? copy.querySelector(".simple-author").innerText
          : "Unknown author";

      const commentNodes = copy.querySelectorAll(".simple-comment-container");
      commentNodes.forEach((comment) => {
        const timestamp = comment.querySelector(".jr-timestamp");

        const timestampLink = document.createElement("a");
        timestampLink.setAttribute("href", "#" + comment.id);
        timestampLink.innerText = timestamp.innerText.split("Left on ").pop();

        timestamp.innerText = "Left on ";
        timestamp.appendChild(timestampLink);
      });
      const hideSegmentsReady = JR.settings.hideSegments
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
          return fetch(JR.jrDomain + "newEntry", {
            mode: "cors",
            method: "POST",
            headers: { "Content-type": "application/json; charset=UTF-8" },
            body: JSON.stringify({
              jrSecret: JR.jrSecret,
              origURL: window.location.href,
              datetime:
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
                date.getSeconds(),
              title: myTitle,
              author: myAuthor,
              content: copy.outerHTML,
            }),
          });
        })
        .then(function (response) {
          if (!response.ok) throw response;
          else return response.text();
        })
        .then(function (url) {
          if (url) {
            if (JR.settings.openSharedPage && JR.settings.closeOldPage) {
              chrome.runtime.sendMessage({ closeTab: "true" });
            }

            if (JR.settings.openSharedPage) {
              window.open(url, "_blank");
            }

            JR.shareDropdown.classList.add("active");
            JR.shareDropdown.innerText = url;
          }
        })
        .catch(function (err) {
          JR.hasSavedLink = false;
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
  } else {
    const notification = {
      textContent:
        "To share this reader view with others, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>! Shared pages are just <em>one</em> of the additional features included.",
      url: "https://justread.link/#get-Just-Read",
      primaryText: "Learn more",
      secondaryText: "Maybe later",
    };
    JR.readerDocument.body.appendChild(
      createNotification(notification, JR.readerDocument)
    );
  }
}
