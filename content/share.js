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
      if (JR.settings.hideSegments) {
        let hideCSS = document.createElement("style");
        hideCSS.innerText =
          '.content-container script,.content-container [class="ad"],.content-container [class *="ads"],.content-container [class ^="ad-"],.content-container [class ^="ad_"],.content-container [class *="-ad-"],.content-container [class $="-ad"],.content-container [class $="_ad"],.content-container [class ~="ad"],.content-container [class *="navigation"],.content-container [class *="nav"],.content-container nav,.content-container [class *="search"],.content-container [class *="menu"],.content-container [class *="print"],.content-container [class *="nocontent"],.content-container .hidden,.content-container [class *="popup"],.content-container [class *="share"],.content-container [class *="sharing"],.content-container [class *="social"],.content-container [class *="follow"],.content-container [class *="newsletter"],.content-container [class *="meta"],.content-container [class *="author"],.content-container [id *="author"],.content-container form,.content-container [class ^="form"],.content-container [class *="-form-"],.content-container [class $="form"],.content-container [class ~="form"],.content-container [class *="related"],.content-container [class *="recommended"],.content-container [class *="see-also"],.content-container [class *="popular"],.content-container [class *="trail"],.content-container [class *="comment"],.content-container [class *="disqus"],.content-container [id *="disqus"],.content-container [class ^="tag"],.content-container [class *="-tag-"],.content-container [class $="-tag"],.content-container [class $="_tag"],.content-container [class ~="tag"],.content-container [class *="-tags-"],.content-container [class $="-tags"],.content-container [class $="_tags"],.content-container [class ~="tags"],.content-container [id *="-tags-"],.content-container [id $="-tags"],.content-container [id $="_tags"],.content-container [id ~="tags"],.content-container [class *="subscribe"],.content-container [id *="subscribe"],.content-container [class *="subscription"],.content-container [id *="subscription"],.content-container [class ^="fav"],.content-container [class *="-fav-"],.content-container [class $="-fav"],.content-container [class $="_fav"],.content-container [class ~="fav"],.content-container [id ^="fav"],.content-container [id *="-fav-"],.content-container [id $="-fav"],.content-container [id $="_fav"],.content-container [id ~="fav"],.content-container [class *="favorites"],.content-container [id *="favorites"],.content-container [class *="signup"],.content-container [id *="signup"],.content-container [class *="signin"],.content-container [id *="signin"],.content-container [class *="signIn"],.content-container [id *="signIn"],.content-container footer,.content-container [class *="footer"],.content-container [id *="footer"],.content-container svg[class *="pinterest"],.content-container [class *="pinterest"] svg,.content-container svg[id *="pinterest"],.content-container [id *="pinterest"] svg,.content-container svg[class *="pinit"],.content-container [class *="pinit"] svg,.content-container svg[id *="pinit"],.content-container [id *="pinit"] svg,.content-container svg[class *="facebook"],.content-container [class *="facebook"] svg,.content-container svg[id *="facebook"],.content-container [id *="facebook"] svg,.content-container svg[class *="github"],.content-container [class *="github"] svg,.content-container svg[id *="github"],.content-container [id *="github"] svg,.content-container svg[class *="twitter"],.content-container [class *="twitter"] svg,.content-container svg[id *="twitter"],.content-container [id *="twitter"] svg,.content-container svg[class *="instagram"],.content-container [class *="instagram"] svg,.content-container svg[id *="instagram"],.content-container [id *="instagram"] svg,.content-container svg[class *="tumblr"],.content-container [class *="tumblr"] svg,.content-container svg[id *="tumblr"],.content-container [id *="tumblr"] svg,.content-container svg[class *="youtube"],.content-container [class *="youtube"] svg,.content-container svg[id *="youtube"],.content-container [id *="youtube"] svg,.content-container svg[class *="codepen"],.content-container [class *="codepen"] svg,.content-container svg[id *="codepen"],.content-container [id *="codepen"] svg,.content-container svg[class *="dribble"],.content-container [class *="dribble"] svg,.content-container svg[id *="dribble"],.content-container [id *="dribble"] svg,.content-container svg[class *="soundcloud"],.content-container [class *="soundcloud"] svg,.content-container svg[id *="soundcloud"],.content-container [id *="soundcloud"] svg,.content-container svg[class *="rss"],.content-container [class *="rss"] svg,.content-container svg[id *="rss"],.content-container [id *="rss"] svg,.content-container svg[class *="linkedin"],.content-container [class *="linkedin"] svg,.content-container svg[id *="linkedin"],.content-container [id *="linkedin"] svg,.content-container svg[class *="vimeo"],.content-container [class *="vimeo"] svg,.content-container svg[id *="vimeo"],.content-container [id *="vimeo"] svg,.content-container svg[class *="email"],.content-container [class *="email"] svg,.content-container svg[id *="email"],.content-container [id *="email"] svg{display: none;}.entry-content.entry-content,pre *:not(li) {display: initial !important;}';
        copy.appendChild(hideCSS);
      }

      const date = new Date();
      fetch(JR.jrDomain + "newEntry", {
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
