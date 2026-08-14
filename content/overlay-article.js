function applyDomainSelectors() {
  if (!JR.settings.domainSelectors) return;

  const domainSelectorArr = JR.settings.domainSelectors;
  for (let i = 0; i < domainSelectorArr.length; i++) {
    const domainSelObj = domainSelectorArr[i];
    let regex;
    try {
      regex = new RegExp(domainSelObj.domainPattern, "i");
    } catch (e) {
      continue;
    }

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
    JR.savedComments = lastSavedPage.savedComments;
    JR.savedCompactComments = lastSavedPage.savedCompactComments;
  }
}

function applySiteSettingsThenCreateOverlay() {
  applyDomainSelectors();

  if (JR.settings.backup) {
    chrome.storage.local.get("JRSavedPage", (data) => {
      restoreBackupIfPresent(data);
      createReaderOverlay();
    });
  } else {
    createReaderOverlay();
  }
}

function selectArticleSource() {
  // Snapshot JSON-LD / Open Graph before the article innerHTML is rewritten.
  JR.structuredMeta = collectStructuredMeta();

  if (JR.userSelected) {
    JR.pageSelectedContainer = JR.userSelected;
  }

  if (!JR.pageSelectedContainer) {
    JR.pageSelectedContainer = getArticleContainer();

    const pattern = new RegExp("<br/?>[ \r\ns]*<br/?>", "g");
    JR.pageSelectedContainer.innerHTML = DOMPurify.sanitize(
      JR.pageSelectedContainer.innerHTML.replace(pattern, "</p><p>")
    );
  }

  JR.selected = JR.pageSelectedContainer;
}

function normalizeArticleElements(contentContainer, title, lightboxes) {
  contentContainer.querySelectorAll("*").forEach((elem) => {
    if (elem == undefined) return;

    elem.removeAttribute("style");
    elem.removeAttribute("color");
    elem.removeAttribute("width");
    elem.removeAttribute("height");
    elem.removeAttribute("background");
    elem.removeAttribute("bgcolor");
    elem.removeAttribute("border");

    if (elem.textContent.trim() === title) {
      elem.parentElement.removeChild(elem);
    }

    let isPreNoCode = true;
    if (elem.nodeName === "PRE" && !JR.settings.leavePres) {
      isPreNoCode = false;

      Array.from(elem.children).forEach((child) => {
        if (child.nodeName === "CODE") {
          isPreNoCode = true;
        }
      });

      if (!isPreNoCode) {
        elem.innerHTML = DOMPurify.sanitize(
          elem.innerHTML.replace(/\n/g, "<br/>")
        );
      }
    }

    if ((elem.nodeName === "FONT" || !isPreNoCode) && elem.parentElement) {
      const p = document.createElement("p");
      p.innerHTML = DOMPurify.sanitize(elem.innerHTML);

      elem.parentElement.insertBefore(p, elem);
      elem.parentElement.removeChild(elem);
    }

    if (
      elem.nodeName === "STYLE" ||
      elem.nodeName === "NOINDEX" ||
      elem.nodeName === "LINK" ||
      elem.getAttribute("encoding") == "application/x-tex" ||
      (elem.getAttribute("aria-hidden") == "true" &&
        !elem.classList.contains("mwe-math-fallback-image-inline"))
    )
      elem.setAttribute("data-simple-delete", true);

    if (elem.classList.contains("mwe-math-fallback-image-inline")) {
      const plainText = document.createElement("div");
      plainText.className = "simple-plain-text";
      plainText.innerText = elem.alt;
      elem.parentElement.insertBefore(plainText, elem.nextSibling);
    }

    if (elem.nodeName === "IMG") {
      lightboxes.push(elem);

      if (elem.dataset.srcset) {
        elem.srcset = elem.dataset.srcset;
      } else if (elem.dataset.src) {
        elem.src = elem.dataset.src;
      }
    }

    if (
      elem.nodeName === "IFRAME" ||
      elem.nodeName === "VIDEO" ||
      elem.nodeName === "IMG"
    ) {
      elem.addEventListener("load", updateScrollbarMetrics, { once: true });
    }
  });
}

function markNextChapterLink(contentContainer) {
  const potentialOldMatches = [...contentContainer.querySelectorAll("a[href]")];
  if (
    potentialOldMatches.some((match) => {
      const text = match.innerText.replace(/\s/g, "").toUpperCase();
      if (text === "NEXTCHAPTER" || text === "NEXT") {
        match.className = "jrNextChapter";
        return true;
      }
    })
  )
    return;

  [...document.querySelectorAll("a[href]")].some((match) => {
    const text = match.innerText?.replace(/\s/g, "").toUpperCase();
    if (text === "NEXTCHAPTER" || text === "NEXT") {
      match.className = "jrNextChapter";
      contentContainer.appendChild(match);
      return true;
    }
  });
}

function applyRtlIfNeeded(container, contentContainer) {
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
}

function prepareArticleMarkup() {
  selectArticleSource();

  const container = document.createElement("div");
  container.className = "simple-container";

  const articleContainer = document.createElement("div");
  articleContainer.className = "simple-article-container";
  articleContainer.appendChild(addArticleMeta());

  const contentContainer = document.createElement("div");
  contentContainer.className = "content-container";
  contentContainer.innerHTML = DOMPurify.sanitize(
    JR.pageSelectedContainer.innerHTML
  );

  const lightboxes = [];
  const title = articleContainer.querySelector(".simple-title")?.textContent;
  normalizeArticleElements(contentContainer, title, lightboxes);
  markNextChapterLink(contentContainer);
  applyRtlIfNeeded(container, contentContainer);

  articleContainer.appendChild(contentContainer);
  articleContainer.appendChild(addExtInfo());

  const headerImg = safeQuery(document, JR.headerImageSelector);
  if (headerImg) {
    contentContainer.appendChild(headerImg);
  }

  return { container, articleContainer, lightboxes };
}
