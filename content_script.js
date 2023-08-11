// prettier-ignore
(function () {

const jrDomain = "https://justread.link/";
let isPremium = false;
let jrSecret;
let jrOpenCount;
let hasBeenAskedForReview100 = false;
let hasBeenAskedForReview1000 = false;
let hasBeenAskedForReview10000 = false;
let hasBeenNotifiedOfSummarizer = false;

let removeOrigContent;
let chromeStorage, pageSelectedContainer;
chrome.storage.sync.get(null, function (result) {
  chromeStorage = result || {};

  // Allow content to be removed if enabled
  if (chromeStorage["remove-orig-content"] !== false) {
    removeOrigContent = true;
  }
  useText = chromeStorage["useText"];

  launch();
});

/////////////////////////////////////
// Generic helper functions
/////////////////////////////////////

// Add :scope functionality to QS & QSA
(function (doc, proto) {
  try {
    // Check if browser supports :scope natively
    doc.querySelector(":scope body");
  } catch (err) {
    // Polyfill native methods if it doesn't
    ["querySelector", "querySelectorAll"].forEach(function (method) {
      const nativ = proto[method];
      proto[method] = function (selectors) {
        if (/(^|,)\s*:scope/.test(selectors)) {
          // Only if selectors contains :scope
          const id = this.id; // Remember current element id
          this.id = "ID_" + Date.now(); // Assign new unique id
          selectors = selectors.replace(/((^|,)\s*):scope/g, "$1#" + this.id); // Replace :scope with #ID
          const result = doc[method](selectors);
          this.id = id; // Restore previous id
          return result;
        } else {
          return nativ.call(this, selectors); // Use native code for other selectors
        }
      };
    });
  }
})(window.document, Element.prototype);

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

// Mute a singular HTML5 element
function muteMe(elem) {
  elem.muted = true;
  elem.pause();
}

// Try to mute all video and audio elements on the page
function mutePage() {
  document.querySelectorAll("video").forEach((video) => muteMe(video));
  document.querySelectorAll("audio").forEach((audio) => muteMe(audio));
}

// Generate a random UUID (string)
// Example: 9ae68c40-0431-4031-afa0-3016ae50ad5d
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

function stylesheetToString(s) {
  let text = "";
  Array.from(s.cssRules).forEach((rule) => (text += rule.cssText));
  return text;
}

/////////////////////////////////////
// State functions
/////////////////////////////////////

// User-selected text functionality
let last, userSelected;
function startSelectElement(doc) {

  const mouseFunc = function (e) {
      const elem = e.target;

      if (last != elem) {
        if (last != null) {
          last.classList.remove("jr-hovered");
        }

        last = elem;
        elem.classList.add("jr-hovered");
      }
    },
    clickFunc = function (e) {
      userSelected = e.target;

      exitFunc();
    },
    escFunc = function (e) {
      // Listen for the "Esc" key and exit if so
      if (e.key === "Escape") exitFunc(true);
    },
    exitFunc = function (avoidLaunch) {
      doc.removeEventListener("mouseover", mouseFunc);
      doc.removeEventListener("click", clickFunc);
      doc.removeEventListener("keydown", escFunc);

      if (doc.querySelector(".jr-hovered") != null)
        doc.querySelector(".jr-hovered").classList.remove("jr-hovered");

      if (doc.getElementById("tempStyle") != null)
        doc
          .getElementById("tempStyle")
          .parentElement.removeChild(doc.getElementById("tempStyle"));

      useText = false;

      if (avoidLaunch) return;
      launch();
    };

  doc.addEventListener("mouseover", mouseFunc);
  doc.addEventListener("click", clickFunc);
  doc.addEventListener("keydown", escFunc);

  doc.documentElement.focus();

  // Add our styles temporarily
  const tempStyle = doc.createElement("style");
  tempStyle.id = "temp-style";
  tempStyle.innerText =
    ".jr-hovered, .jr-hovered * { cursor: pointer !important; color: black !important; background-color: #2095f2 !important; }";

  doc.head.appendChild(tempStyle);
}

// Similar to ^^ but for deletion once the article is open
function startDeleteElement(doc) {
  const mouseFunc = function (e) {
      const elem = e.target;

      if (
        !elem.classList.contains("simple-container") &&
        !elem.classList.contains("simple-ui-container") &&
        !elem.classList.contains("simple-control") &&
        !elem.classList.contains("simple-add-comment") &&
        !elem.classList.contains("simple-comments") &&
        !elem.classList.contains("simple-edit") &&
        !elem.classList.contains("simple-find") &&
        elem.parentElement &&
        elem.parentElement.classList &&
        !(
          elem.parentElement.classList.contains("simple-add-comment") ||
          elem.parentElement.classList.contains("simple-control") ||
          elem.parentElement.classList.contains("simple-find")
        ) &&
        doc.body != elem &&
        doc.documentElement != elem &&
        elem.tagName !== "path" &&
        elem.tagName !== "rect" &&
        elem.tagName !== "polygon" &&
        elem.tagName !== "PROGRESS"
      ) {
        if (last != elem) {
          if (last != null) {
            last.classList.remove("jr-hovered");
          }

          last = elem;
          elem.classList.add("jr-hovered");
        }
      }
    },
    clickFunc = function (e) {
      selected = e.target;

      if (
        !selected.classList.contains("simple-container") &&
        !selected.classList.contains("simple-ui-container") &&
        !selected.classList.contains("simple-control") &&
        !selected.classList.contains("simple-add-comment") &&
        !selected.classList.contains("simple-comments") &&
        !selected.classList.contains("simple-edit") &&
        !selected.classList.contains("simple-find") &&
        selected.parentElement.classList &&
        !(
          selected.parentElement.classList.contains("simple-add-comment") ||
          selected.parentElement.classList.contains("simple-control") ||
          selected.parentElement.classList.contains("simple-find")
        ) &&
        doc.body != selected &&
        doc.documentElement != selected &&
        selected.tagName !== "path" &&
        selected.tagName !== "rect" &&
        selected.tagName !== "polygon" &&
        selected.tagName !== "PROGRESS"
      )
        actionWithStack("delete", selected);

      e.preventDefault();
    },
    escFunc = function (e) {
      // Listen for the "Esc" key and exit if so
      if (e.key === "Escape") exitFunc();
    },
    exitFunc = function () {
      anchors.forEach(function (a) {
        a.removeEventListener("click", anchorFunc);
      });

      doc.removeEventListener("mouseover", mouseFunc);
      doc.removeEventListener("click", clickFunc);
      doc.removeEventListener("keydown", escFunc);

      [...iframes].forEach((elem) => (elem.style.pointerEvents = "auto"));

      if (doc.querySelector(".jr-hovered") != null)
        doc.querySelector(".jr-hovered").classList.remove("jr-hovered");

      doc.body.classList.remove("simple-deleting");

      userSelected = null;

      sd.classList.remove("active");
      sd.onclick = function () {
        startDeleteElement(simpleArticleIframe);
      };
    },
    anchorFunc = function (e) {
      e.preventDefault();
    };

  const anchors = doc.querySelectorAll("a");
  anchors.forEach(function (a) {
    a.addEventListener("click", anchorFunc);
  });

  doc.body.classList.add("simple-deleting");

  doc.addEventListener("mouseover", mouseFunc);
  doc.addEventListener("click", clickFunc);
  doc.addEventListener("keydown", escFunc);

  const iframes = doc.querySelectorAll("iframe");
  [...iframes].forEach((elem) => (elem.style.pointerEvents = "none"));

  const sd = simpleArticleIframe.querySelector(".simple-delete");

  sd.classList.add("active");
  sd.onclick = function () {
    exitFunc();
  };
}

const stack = [];
function actionWithStack(actionName, elem, startText) {
  hasSavedLink = false;
  shareDropdown.classList.remove("active");

  let actionObj;
  if (actionName === "delete") {
    elem.classList.remove("jr-hovered");

    let parent = elem.parentElement;

    actionObj = {
      type: "delete",
      index: Array.from(parent.children).indexOf(elem),
      parent: parent,
      elem: parent.removeChild(elem),
    };
  } else if (actionName === "edit") {
    actionObj = {
      type: "edit",
      elem: elem,
      text: startText,
    };
  }

  if (actionName) {
    stack.push(actionObj);
    undoBtn.classList.add("shown");
  }

  updateSavedVersion();
  getMeasurements(); // Update the scrollbar sizing
}

function popStack() {
  let actionObj = stack.pop();

  if (actionObj && actionObj.type === "delete") {
    actionObj.parent.insertBefore(
      actionObj.elem,
      actionObj.parent.children[actionObj.index]
    );
  } else if (actionObj && actionObj.type === "edit") {
    actionObj.elem.innerText = actionObj.text;
  }

  updateSavedVersion();

  // If empty, hide undo button
  if (stack.length === 0) {
    undoBtn.classList.remove("shown");
  }

  getMeasurements(); // Update the scrollbar sizing
}

function updateSavedVersion() {
  if (chromeStorage["backup"]) {
    const data = {
      url: window.location.href,
      content: DOMPurify.sanitize(
        simpleArticleIframe.querySelector(".content-container").innerHTML
      ),
    };

    if (
      simpleArticleIframe.querySelector(".simple-comments").innerHTML !== ""
    ) {
      data.savedComments = DOMPurify.sanitize(
        simpleArticleIframe.querySelector(".simple-comments").innerHTML
      );
      data.savedCompactComments = DOMPurify.sanitize(
        simpleArticleIframe.querySelector(".simple-compact-comments").innerHTML
      );
    }

    chrome.storage.local.set({JRSavedPage: JSON.stringify(data)});
  }
}

/////////////////////////////////////
// Chrome storage functions
/////////////////////////////////////

// Given a chrome storage object add them to our local stylsheet obj
function getStylesFromStorage(storage) {
  for (let key in storage) {
    if (key.substring(0, 3) === "jr-") {
      // Get stylesheets in the new format
      stylesheetObj[key.substring(3)] = storage[key];
    }
  }
}

// Set the chrome storage based on our stylesheet object
function setStylesOfStorage() {
  for (let stylesheet in stylesheetObj) {
    const obj = {};
    obj["jr-" + stylesheet] = stylesheetObj[stylesheet];
    chrome.storage.sync.set(obj);
  }
}

/////////////////////////////////////
// Extension-related helper functions
/////////////////////////////////////

// From https://stackoverflow.com/a/14824756/2065702
function isRTL(s) {
  const ltrChars =
      "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF" +
      "\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF",
    rtlChars = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC",
    rtlDirCheck = new RegExp("^[^" + ltrChars + "]*[" + rtlChars + "]");

  return rtlDirCheck.test(s);
}

function checkElemForDate(elem, attrList, deleteMe) {
  let myDate = false;

  if (elem && checkAgainstBlacklist(elem, 3)) {
    attrList.some((attr) => {
      if (
        elem[attr] &&
        elem[attr] != "" && //  Make sure it's not empty
        elem[attr].split(" ").length < 10
      ) {
        // Make sure the date isn't absurdly long
        myDate = elem[attr];

        if (deleteMe) {
          elem.dataset.simpleDelete = true; // Flag it for removal later
        }

        return true;
      }
    });
  }

  return myDate;
}

function getJSONSchema(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Invalid JSON schema");
    return null;
  }
}

function getArticleDate() {
  // Make sure that the pageSelectedContainer isn't empty
  if (pageSelectedContainer == null) pageSelectedContainer = document.body;

  // Check to see if there's a date class
  let date = false;

  if (dateSelector && document.querySelector(dateSelector)) {
    const elem = document.querySelector(dateSelector);
    date = elem.innerText;
    elem.dataset.simpleDelete = true; // Flag it for removal later
  }

  // Check schema first
  let jsonld;
  if (
    !date &&
    pageSelectedContainer.querySelector('script[type="application/ld+json"]')
  ) {
    jsonld = getJSONSchema(
      pageSelectedContainer.querySelector('script[type="application/ld+json"]')
        .innerText
    );
  } else if (
    !date &&
    document.querySelector('script[type="application/ld+json"]')
  ) {
    jsonld = getJSONSchema(
      document.querySelector('script[type="application/ld+json"]').innerText
    );
  }

  if (!date && jsonld) {
    if (jsonld.dateModified) {
      date = jsonld.dateModified;
    } else if (jsonld.datePublished) {
      date = jsonld.datePublished;
    }
  }

  let toCheck = [];
  if (!date) {
    toCheck = [
      [
        pageSelectedContainer.querySelector('[itemprop="dateModified"]'),
        ["innerText"],
        true,
      ],
      [
        pageSelectedContainer.querySelector('[itemprop="datePublished"]'),
        ["innerText"],
        true,
      ],
      [
        pageSelectedContainer.querySelector('[class^="date"]'),
        ["innerText"],
        true,
      ],
      [
        pageSelectedContainer.querySelector('[class*="-date"]'),
        ["innerText"],
        true,
      ],
      [
        pageSelectedContainer.querySelector('[class*="_date"]'),
        ["innerText"],
        true,
      ],
      [
        document.body.querySelector('[itemprop="dateModified"]'),
        ["innerText"],
        false,
      ],
      [
        document.body.querySelector('[itemprop="datePublished"]'),
        ["innerText"],
        false,
      ],
      [document.body.querySelector('[class^="date"]'), ["innerText"], false],
      [document.body.querySelector('[class*="-date"]'), ["innerText"], false],
      [document.body.querySelector('[class*="_date"]'), ["innerText"], false],
      [document.head.querySelector('meta[name^="date"]'), ["content"], false],
      [document.head.querySelector('meta[name*="-date"]'), ["content"], false],
      [
        pageSelectedContainer.querySelector("time"),
        ["datetime", "innerText"],
        true,
      ],
      [document.body.querySelector("time"), ["datetime", "innerText"], false],
      [
        pageSelectedContainer.querySelector('[class *= "time"]'),
        ["datetime", "innerText"],
        true,
      ],
      [
        document.body.querySelector('[class *= "time"]'),
        ["datetime", "innerText"],
        false,
      ],
    ];
  }

  toCheck.some((checkObj) => {
    if (!date && checkObj[0]) {
      date = checkElemForDate(checkObj[0], checkObj[1], checkObj[2]);
      if (date) return true;
    }
  });

  if (date) {
    return date
      .replace(/on\s/gi, "")
      .replace(/(?:\r\n|\r|\n)/gi, "&nbsp;")
      .replace(/[<]br[^>]*[>]/gi, "&nbsp;"); // Replace <br>, \n, and "on"
  }

  return "Unknown date";
}

function getArticleTitle() {
  // Get the page's title
  let title;

  if (titleSelector && document.querySelector(titleSelector)) {
    const elem = document.querySelector(titleSelector);
    title = elem.innerText;
    elem.dataset.simpleDelete = true; // Flag it for removal later
  } else if (document.head.querySelector("title")) {
    title = document.head.querySelector("title").innerText;

    // Get the part before the first — if it exists
    if (title.indexOf(" — ") > 0) {
      return title.substr(0, title.indexOf(" — "));
    }

    // Get the part before the first – if it exists
    if (title.indexOf(" – ") > 0) {
      return title.substr(0, title.indexOf(" – "));
    }

    // Get the part before the first - if it exists DIFFERENT THAN ABOVE CHARACTER
    if (title.indexOf(" - ") > 0) {
      return title.substr(0, title.indexOf(" - "));
    }

    // Get the part before the first | if it exists
    if (title.indexOf(" | ") > 0) {
      return title.substr(0, title.indexOf(" | "));
    }

    // Get the part before the first : if it exists
    if (title.indexOf(" : ") > 0) {
      return title.substr(0, title.indexOf(" : "));
    }
  } else {
    title = "Unknown title";
  }

  return title;
}

function getArticleAuthor() {
  // Make sure that the pageSelectedContainer isn't empty
  if (pageSelectedContainer == null) pageSelectedContainer = document.body;

  let author = null;

  let elem;
  if (authorSelector && document.querySelector(authorSelector)) {
    elem = document.querySelector(authorSelector);
    author = elem.innerText;
    elem.dataset.simpleDelete = true; // Flag it for removal later
  }

  // Check schema first
  let jsonld;
  if (
    pageSelectedContainer.querySelector('script[type="application/ld+json"]')
  ) {
    jsonld = getJSONSchema(
      pageSelectedContainer.querySelector('script[type="application/ld+json"]')
        .innerText
    );
  } else if (document.querySelector('script[type="application/ld+json"]')) {
    jsonld = getJSONSchema(
      document.querySelector('script[type="application/ld+json"]').innerText
    );
  }

  if (author === null && jsonld) {
    if (jsonld.author) {
      if (typeof jsonld.author === "string") {
        author = jsonld.author;
      } else if (typeof jsonld.author.name === "string") {
        author = jsonld.author.name;
      }
    }
  }

  // Check to see if there's an author itemprop in the article
  elem = pageSelectedContainer.querySelector('[itemprop="author"]');
  if (author === null && elem) {
    if (
      elem.innerText.split(/\s+/).length < 5 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      elem.dataset.simpleDelete = true; // Flag it for removal later
      author = elem.innerText;
    }
  }

  // Check to see if there's an author itemprop in the page
  elem = document.body.querySelector('[itemprop="author"]');
  if (author === null && elem) {
    if (
      elem.innerText.split(/\s+/).length < 5 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      author = elem.innerText;
    }
  }

  // Check to see if there's an author rel in the article
  elem = pageSelectedContainer.querySelector('[rel*="author"]');
  if (author === null && elem) {
    if (
      elem.innerText.split(/\s+/).length < 5 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      elem.dataset.simpleDelete = true; // Flag it for removal later
      author = elem.innerText;
    }
  }

  // Check to see if there's an author class
  elem = pageSelectedContainer.querySelector('[class*="author"]');
  if (author === null && elem && checkAgainstBlacklist(elem, 3)) {
    if (
      elem.innerText.split(/\s+/).length < 5 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      elem.dataset.simpleDelete = true; // Flag it for removal later
      author = elem.innerText;
    }
  }

  elem = document.head.querySelector('meta[name*="author"]');
  // Check to see if there is an author available in the meta, if so get it
  if (author === null && elem) author = elem.getAttribute("content");

  // Check to see if there's an author rel in the body
  elem = document.body.querySelectorAll('[rel*="author"]');
  elem.forEach((e) => {
    if (author === null && e) {
      if (
        e.innerText.split(/\s+/).length < 5 &&
        e.innerText.replace(/\s/g, "") !== ""
      ) {
        author = e.innerText;
      }
    }
  });

  elem = document.body.querySelector('[class*="author"]');
  if (author === null && elem && checkAgainstBlacklist(elem, 3)) {
    if (
      elem.innerText.split(/\s+/).length < 6 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      author = elem.innerText;
    }
  }

  if (author !== null && author) {
    // If it's all caps, try to properly capitalize it
    if (author === author.toUpperCase()) {
      const words = author.split(" "),
        wordsLength = words.length;
      for (let i = 0; i < wordsLength; i++) {
        if (words[i].length < 3 && i != 0 && i != wordsLength)
          words[i] =
            words[
              i
            ].toLowerCase(); // Assume it's something like "de", "da", "van" etc.
        else
          words[i] =
            words[i].charAt(0).toUpperCase() + words[i].substr(1).toLowerCase();
      }
      author = words.join(" ");
    }
    return author.replace(/by\s/gi, ""); // Replace "by"
  }

  return "Unknown author";
}

// Remove what we added (besides styles)
function closeOverlay() {
  // Refresh the page if the content has been removed
  if (removeOrigContent) {
    const url = new URL(window.location);
    url.searchParams.delete("jr");
    window.location.replace(url);
  }

  // Remove the GUI if it is open
  if (datGUI) {
    datGUI.destroy();
    datGUI = undefined;
  }

  window.removeEventListener("resize", hideToolbar);

  // Fade out
  simpleArticle.classList.add("simple-fade-up");

  // Remove some general listeners
  simpleArticleIframe.removeEventListener("mouseup", handleEnd);
  simpleArticleIframe.removeEventListener("touchend", handleEnd);
  simpleArticleIframe.removeEventListener("mousemove", handleMouseMove);

  // Reset our variables
  pageSelectedContainer = null;
  userSelected = null;
  simpleArticleIframe = undefined;
  editBar = undefined;
  chromeStorage = undefined;

  setTimeout(function () {
    // Enable scroll
    document.documentElement.classList.remove("simple-no-scroll");

    // Update our background script
    chrome.runtime.sendMessage({ lastClosed: Date.now() });

    // Remove our overlay
    simpleArticle.parentElement.removeChild(simpleArticle);
    simpleArticle = undefined;
  }, 100); // Make sure we can animate it
}

function getContainer() {
  let selectedContainer;

  if (contentSelector && document.querySelector(contentSelector)) {
    selectedContainer = document.querySelector(contentSelector);
  } else if (document.head.querySelector("meta[name='articleBody'")) {
    selectedContainer = document.createElement("div");
    selectedContainer.innerHTML = DOMPurify.sanitize(
      document.head
        .querySelector("meta[name='articleBody'")
        .getAttribute("content")
    );
  } else {
    const numWordsOnPage = document.body.innerText.match(/\S+/g).length;
    let ps = document.body.querySelectorAll("p");

    // Find the paragraphs with the most words in it
    let pWithMostWords = document.body,
      highestWordCount = 0;

    if (ps.length === 0) {
      ps = document.body.querySelectorAll("div");
    }

    ps.forEach((p) => {
      if (
        checkAgainstBlacklist(p, 3) && // Make sure it's not in our blacklist
        p.offsetHeight !== 0
      ) {
        //  Make sure it's visible on the regular page
        const myInnerText = p.innerText.match(/\S+/g);
        if (myInnerText) {
          const wordCount = myInnerText.length;
          if (wordCount > highestWordCount) {
            highestWordCount = wordCount;
            pWithMostWords = p;
          }
        }
      }

      // Remove elements in JR that were hidden on the original page
      if (p.offsetHeight === 0) {
        p.dataset.simpleDelete = true;
      }
    });

    // Keep selecting more generally until over 2/5th of the words on the page have been selected
    selectedContainer = pWithMostWords;
    let wordCountSelected = highestWordCount;

    while (
      wordCountSelected / numWordsOnPage < 0.4 &&
      selectedContainer != document.body &&
      selectedContainer.parentElement.innerText
    ) {
      selectedContainer = selectedContainer.parentElement;
      wordCountSelected = selectedContainer.innerText.match(/\S+/g).length;
    }

    // Make sure a single p tag is not selected
    if (selectedContainer.tagName === "P") {
      selectedContainer = selectedContainer.parentElement;
    }
  }

  return selectedContainer;
}

// Handle link clicks
function linkListener(e) {
  if (!simpleArticleIframe.body.classList.contains("simple-deleting")) {
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
      (simpleArticleIframe.getElementById(hrefArr[1]) == null && // The element is not in the article section
        simpleArticleIframe.querySelector("a[name='" + hrefArr[1] + "']") ==
          null &&
        hrefArr[1] !== "_")
    ) {
      top.window.location.href = this.href; // Regular link
    } else {
      // Anchored to an element in the article
      e.preventDefault();
      e.stopPropagation();

      if (hrefArr[1].startsWith("jr-")) {
        simpleArticleIframe.getElementById(hrefArr[1]).scrollIntoView(true);
        let backArrow = simpleArticleIframe.querySelector(
          this.id + " .back-to-ref"
        );
        backArrow.dataset.scrollPos = simpleArticleIframe.scrollTop;
      } else {
        top.window.location.hash = hrefArr[1];
        simpleArticleIframe.defaultView.location.hash = hrefArr[1];
      }
    }
  }
}

// Check given item against blacklist, return null if in blacklist
const blacklist = ["comment"];
function checkAgainstBlacklist(elem, level) {
  if (elem && elem != null) {
    const className = elem.className,
      id = elem.id;

    const isBlackListed = blacklist
      .map((item) => {
        if (
          (typeof className === "string" && className.indexOf(item) >= 0) ||
          (typeof id === "string" && id.indexOf(item) >= 0)
        ) {
          return true;
        }
      })
      .filter((item) => item)[0];

    if (isBlackListed) {
      return null;
    }

    const parent = elem.parentElement;
    if (level > 0 && parent && !parent.isSameNode(document.body)) {
      return checkAgainstBlacklist(parent, --level);
    }
  }

  return elem;
}

// See if an element is part of the selectable content
function isContentElem(elem) {
  if (
    simpleArticleIframe
      .querySelector(".simple-article-container")
      .contains(elem)
  )
    return true;
  else return false;
}

/////////////////////////////////////
// Extension-related adder functions
/////////////////////////////////////

function checkPremium() {
  // Check if premium
  if (
    chromeStorage.jrSecret &&
    // Limit API calls on open to just 1 per day
    (typeof chromeStorage.jrLastChecked === "undefined" ||
      chromeStorage.jrLastChecked === "" ||
      Date.now() - chromeStorage.jrLastChecked > 86400000)
  ) {
    chrome.storage.sync.set({ jrLastChecked: Date.now() });

    jrSecret = chromeStorage.jrSecret;
    fetch(jrDomain + "checkPremium", {
      mode: "cors",
      method: "POST",
      headers: { "Content-type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        jrSecret: jrSecret,
      }),
    })
      .then(function (response) {
        if (!response.ok) throw response;
        else return response.text();
      })
      .then((response) => {
        isPremium = response === "true";
        chrome.storage.sync.set({ isPremium: isPremium });
        afterPremium();
      })
      .catch((err) => console.error(`Fetch Error =\n`, err));
  } else {
    isPremium = chromeStorage.isPremium ? chromeStorage.isPremium : false;
    jrSecret = chromeStorage.jrSecret ? chromeStorage.jrSecret : false;
    afterPremium();
  }
}

function afterPremium() {
  // Collect all of our stylesheets in our object
  getStylesFromStorage(chromeStorage);

  // Check to see if the default stylesheet needs to be updated
  let needsUpdate = false;
  let versionResult = chromeStorage["stylesheet-version"];

  // If the user has a version of the stylesheets and it is less than the current one, update it
  if (
    typeof versionResult === "undefined" ||
    versionResult < stylesheetVersion
  ) {
    chrome.storage.sync.set({ "stylesheet-version": stylesheetVersion });

    needsUpdate = true;
  }

  if (
    isEmpty(stylesheetObj) || // Not found, so we add our default
    needsUpdate
  ) {
    // Update the default stylesheet if it's on a previous version

    // Open the default CSS file and save it to our object
    let xhr = new XMLHttpRequest();
    xhr.open("GET", chrome.runtime.getURL("default-styles.css"), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        // Save the file's contents to our object
        stylesheetObj["default-styles.css"] = xhr.responseText;

        // Save it to Chrome storage
        setStylesOfStorage();

        // Continue on loading the page
        continueLoading();
      }
    };
    xhr.send();

    let xhr2 = new XMLHttpRequest();
    xhr2.open("GET", chrome.runtime.getURL("dark-styles.css"), true);
    xhr2.onreadystatechange = function () {
      if (xhr2.readyState == XMLHttpRequest.DONE && xhr2.status == 200) {
        // Save the file's contents to our object
        stylesheetObj["dark-styles.css"] = xhr2.responseText;

        // Save it to Chrome storage
        setStylesOfStorage();
      }
    };
    xhr2.send();

    needsUpdate = false;

    return;
  }

  continueLoading();
}

// Add our styles to the page
function addStylesheet(doc, link, classN) {
  const path = chrome.runtime.getURL(link),
    styleLink = document.createElement("link");

  styleLink.setAttribute("rel", "stylesheet");
  styleLink.setAttribute("type", "text/css");
  styleLink.setAttribute("href", path);

  if (classN) styleLink.className = classN;

  doc.head.appendChild(styleLink);
}

// Add the article author and date
function addArticleMeta() {
  const editSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  editSVG.setAttribute("class", "simple-edit");
  editSVG.setAttribute("viewBox", "0 0 512 512");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M422.953,176.019c0.549-0.48,1.09-0.975,1.612-1.498l21.772-21.772c12.883-12.883,12.883-33.771,0-46.654 l-40.434-40.434c-12.883-12.883-33.771-12.883-46.653,0l-21.772,21.772c-0.523,0.523-1.018,1.064-1.498,1.613L422.953,176.019z"
  );
  const polygon1 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  polygon1.setAttribute("fill", "#020202");
  polygon1.setAttribute(
    "points",
    "114.317,397.684 157.317,440.684 106.658,448.342 56,456 63.658,405.341 71.316,354.683"
  );
  const polygon2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  polygon2.setAttribute("fill", "#020202");
  polygon2.setAttribute(
    "points",
    "349.143,125.535 118.982,355.694 106.541,343.253 336.701,113.094 324.26,100.653 81.659,343.253 168.747,430.341 411.348,187.74"
  );
  editSVG.appendChild(path);
  editSVG.appendChild(polygon1);
  editSVG.appendChild(polygon2);

  const metaContainer = document.createElement("div");
  metaContainer.className = "simple-meta";
  const author = document.createElement("div"),
    date = document.createElement("div"),
    title = document.createElement("h1");

  const authorContent = document.createElement("div"),
    dateContent = document.createElement("div"),
    titleContent = document.createElement("div");

  author.className = "simple-author";
  date.className = "simple-date";
  title.className = "simple-title";

  // Check a couple places for the date, othewise say it's unknown
  date.appendChild(editSVG);
  let dateText = getArticleDate();
  if (dateText === "Unknown date") {
    metaContainer.classList.add("unknown-date");
  }
  dateContent.innerHTML = DOMPurify.sanitize(dateText);
  date.appendChild(dateContent);
  // Check to see if there is an author available in the meta, if so get it, otherwise say it's unknown
  author.appendChild(editSVG.cloneNode(true));
  let authorText = getArticleAuthor();
  if (authorText === "Unknown author") {
    metaContainer.classList.add("unknown-author");
  }
  authorContent.innerHTML = DOMPurify.sanitize(authorText);
  author.appendChild(authorContent);
  // Check h1s for the title, otherwise say it's unknown
  title.appendChild(editSVG.cloneNode(true));
  titleContent.innerText = getArticleTitle();
  title.appendChild(titleContent);

  metaContainer.appendChild(date);
  metaContainer.appendChild(author);
  if (chromeStorage["addTimeEstimate"]) {
    let timeEstimate = document.createElement("div");
    timeEstimate.className = "simple-time-estimate";
    metaContainer.appendChild(timeEstimate);
  }
  if (chromeStorage["addOrigURL"]) {
    // Add the original URL if necessary
    let urlContainer = document.createElement("div");
    urlContainer.className = "simple-url";
    let origLink = document.createElement("a");
    origLink.className = "simple-orig-link";
    origLink.href = window.location.href;
    origLink.innerText = window.location.href;
    urlContainer.appendChild(origLink);
    metaContainer.appendChild(urlContainer);
  }
  metaContainer.appendChild(title);

  date.querySelector(".simple-edit").onclick = function () {
    editText(dateContent);
  };
  author.querySelector(".simple-edit").onclick = function () {
    editText(authorContent);
  };
  title.querySelector(".simple-edit").onclick = function () {
    editText(titleContent);
  };

  return metaContainer;
}

// Add the close button
function addCloseButton() {
  let closeButton = document.createElement("button");
  closeButton.className = "simple-control simple-close";
  closeButton.title = "Close Just Read";
  closeButton.textContent = "x";

  return closeButton;
}

// Add the print button
function addPrintButton() {
  let printButton = document.createElement("button");
  printButton.className = "simple-print simple-control";
  printButton.title = "Print article";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M49,0H15v19H0v34h15v11h34V53h15V19H49V0z M17,2h30v17H17V2z M47,62H17V40h30V62z M62,21v30H49V38H15v13H2V21h13h34H62z"
  );
  const rect1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect1.setAttribute("x", "6");
  rect1.setAttribute("y", "26");
  rect1.setAttribute("width", "4");
  rect1.setAttribute("height", "2");
  const rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect2.setAttribute("x", "12");
  rect2.setAttribute("y", "26");
  rect2.setAttribute("width", "4");
  rect2.setAttribute("height", "2");
  const rect3 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect3.setAttribute("x", "22");
  rect3.setAttribute("y", "46");
  rect3.setAttribute("width", "20");
  rect3.setAttribute("height", "2");
  const rect4 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect4.setAttribute("x", "22");
  rect4.setAttribute("y", "54");
  rect4.setAttribute("width", "20");
  rect4.setAttribute("height", "2");
  svg.appendChild(path);
  svg.appendChild(rect1);
  svg.appendChild(rect2);
  svg.appendChild(rect3);
  svg.appendChild(rect4);
  printButton.appendChild(svg);

  // printButton.innerText += "Print"; // TODO fix

  return printButton;
}

// Add the deletion mode button
function addDelModeButton() {
  let delModeButton = document.createElement("button");
  delModeButton.className = "simple-delete simple-control";
  delModeButton.title = "Start/end deletion mode";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "-255.5 -411.5 1648 1676");
  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    "M1044.6,215.65v481.3c0,7.8-2.5,14.2-7.5,19.2s-11.399,7.5-19.199,7.5h-53.5c-7.801,0-14.2-2.5-19.2-7.5s-7.5-11.4-7.5-19.2v-481.3c0-7.8,2.5-14.2,7.5-19.2s11.399-7.5,19.2-7.5h53.5c7.8,0,14.199,2.5,19.199,7.5S1044.6,207.85,1044.6,215.65z M823.2,196.45c-5-5-11.4-7.5-19.2-7.5h-53.5c-7.8,0-14.2,2.5-19.2,7.5s-7.5,11.4-7.5,19.2v481.3c0,7.8,2.5,14.2,7.5,19.2s11.4,7.5,19.2,7.5H804c7.8,0,14.2-2.5,19.2-7.5s7.5-11.4,7.5-19.2v-481.3C830.7,207.85,828.2,201.45,823.2,196.45z M609.3,196.45c-5-5-11.399-7.5-19.2-7.5h-53.5c-7.8,0-14.199,2.5-19.199,7.5s-7.5,11.4-7.5,19.2v199.07c12.06,5.96,20.399,18.59,20.399,33.23v171.7c0,20.899,16.9,37.8,37.8,37.8c20.9,0,37.801-16.9,37.801-37.8v-109.9c0-10.31,4.18-19.66,10.899-26.37V215.65C616.8,207.85,614.3,201.45,609.3,196.45z M1365.4-51.65v53.5c0,7.8-2.5,14.2-7.5,19.2s-11.4,7.5-19.2,7.5h-80.2V820.65c0,46.199-13.1,86.199-39.3,119.899s-57.601,50.5-94.4,50.5H631.02c9.82-34.97,19.681-72.2,27.82-106.899h465.86c1.7,0,4.6-2.4,8.8-7.101s8.2-12.3,12.1-22.6c4-10.3,5.9-21.601,5.9-33.9v-792H402.9v575.37c-12.13-6.28-20.4-18.95-20.4-33.57v-171.6c0-20.3-16.2-36.9-36.1-36.9s-36.1,16.6-36.1,36.9v122.4c0,12.06-5.63,22.79-14.4,29.699V28.55h-80.2c-7.8,0-14.2-2.5-19.2-7.5S189,9.65,189,1.85v-53.5c0-7.8,2.5-14.2,7.5-19.2s11.4-7.5,19.2-7.5h258.2l58.5-139.5c8.399-20.6,23.399-38.2,45.1-52.6c21.7-14.5,43.7-21.7,66-21.7h267.4c22.3,0,44.3,7.2,66,21.7c21.699,14.5,36.8,32,45.1,52.6l58.5,139.5h258.2c7.8,0,14.2,2.5,19.2,7.5C1362.9-65.95,1365.4-59.45,1365.4-51.65z M964.4-78.45l-40.101-97.8c-3.899-5-8.6-8.1-14.2-9.2H645.2c-5.601,1.1-10.3,4.2-14.2,9.2l-40.9,97.8H964.4z"
  );
  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute(
    "d",
    "M723.8,433.45c-20.41-22.19-49.569-36.1-81.899-36.1c-8.62,0-17.021,0.98-25.101,2.85c-6.54,1.51-12.859,3.61-18.899,6.25c-14.54-36.8-47.87-64.08-88-69.79c-5.131-0.73-10.371-1.11-15.7-1.11c-17.4,0-34,4.1-48.7,11.3c-9.75-18.77-24.56-34.45-42.6-45.14c-16.55-9.83-35.82-15.46-56.4-15.46c-12.6,0-24.8,2.2-36.1,6.1v-123.7c0-20.13-5.27-39.03-14.5-55.39c-19.19-34.02-55.5-57.01-97.1-57.01c-61.5,0-111.6,50.4-111.6,112.4v445.3l-80.4-92c-0.5-0.601-1.1-1.2-1.7-1.8c-21.1-21.101-49.2-32.9-79.1-33h-0.6c-29.8,0-57.8,11.5-78.7,32.5c-36.9,36.899-39,91.699-5.6,150.399c43.2,75.9,90.2,147.5,131.6,210.601c30.3,46.199,58.9,89.8,79.8,125.8c18.1,31.3,66.2,132.7,66.7,133.7c6.2,13.199,19.5,21.6,34.1,21.6h477.4c16.399,0,30.899-10.6,35.899-26.2c4.17-12.979,23.54-73.78,42.94-144.5c9.53-34.74,19.08-71.87,26.83-106.899C746.52,838.32,753.6,796.1,753.6,767.55v-257.7C753.6,480.39,742.29,453.52,723.8,433.45z M678.1,767.45c0,25.58-7.979,68.72-19.26,116.7c-8.14,34.699-18,71.93-27.82,106.899c-10.029,35.771-20,69.181-28.02,95.101H177.1c-15.6-32.601-45-93-59.3-117.7c-22-37.8-51.1-82.3-82-129.3c-40.8-62.2-87.1-132.7-129.1-206.5c-10.9-19.301-21-45.301-6.6-59.7c6.7-6.7,15.7-10.2,25.5-10.3c9.5,0,18.4,3.6,25.3,10.1l145.4,166.5c10.4,11.8,27,16,41.7,10.5s24.5-19.6,24.5-35.3v-545.8c0-20.3,16.2-36.9,36.1-36.9s36.1,16.6,36.1,36.9v352.5c0,20.899,16.9,37.8,37.8,37.8c8.84,0,16.96-3.03,23.4-8.101c8.77-6.909,14.4-17.64,14.4-29.699v-122.4c0-20.3,16.2-36.9,36.1-36.9s36.1,16.6,36.1,36.9v171.6c0,14.62,8.27,27.29,20.4,33.57c5.21,2.7,11.12,4.23,17.4,4.23c20.9,0,37.8-16.9,37.8-37.801V447.95c0-20.3,16.2-36.9,36.1-36.9c5.62,0,10.95,1.32,15.7,3.67c12.06,5.96,20.399,18.59,20.399,33.23v171.7c0,20.899,16.9,37.8,37.8,37.8c20.9,0,37.801-16.9,37.801-37.8v-109.9c0-10.31,4.18-19.66,10.899-26.37c6.5-6.51,15.41-10.53,25.2-10.53c19.9,0,36.1,16.5,36.1,36.9V767.45z"
  );
  svg.appendChild(path1);
  svg.appendChild(path2);
  delModeButton.appendChild(svg);

  return delModeButton;
}

// Add the share button
function addShareButton() {
  let shareButton = document.createElement("a");
  shareButton.className = "premium-feature simple-share simple-control";
  shareButton.title = "Share article";

  const dropDown = document.createElement("div");
  dropDown.className = "simple-share-dropdown";
  dropDown.onclick = function () {
    window.getSelection().selectAllChildren(this);
  };

  const shareAlert = document.createElement("div");
  shareAlert.className = "simple-share-alert";
  shareAlert.innerText =
    "You have too many shared articles - the limit is 100. Please remove some from ";
  const shareLink = document.createElement("a");
  shareLink.setAttribute("href", "https://justread.link/dashboard");
  shareLink.innerText = "your user page";
  shareAlert.appendChild(shareLink);
  shareAlert.innerText += " before adding more.";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 95.421 90.213");
  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    "M6.301,90.211C2.818,90.209,0.002,87.394,0,83.913l0,0V18.394c0.002-3.481,2.818-6.297,6.301-6.299l0,0h33.782l-9.003,9H9 v60.117l57.469,0.002V69.125l9.002-9l-0.002,23.788c-0.003,3.479-2.818,6.296-6.3,6.3l0,0L6.301,90.211L6.301,90.211z"
  );

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute(
    "d",
    "M66.171,11.301V0l29.25,29.25L66.046,58.625v-11.75c0,0-14.586-2.894-29.583,6.458  c-8.209,5.084-13.752,11.773-17.167,17.042c0,0,1.11-18.25,11.61-34.875C44.033,14.716,66.171,11.301,66.171,11.301z"
  );

  const path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path3.setAttribute(
    "d",
    "M225.3,90.211c-3.482-0.002-6.299-2.817-6.301-6.298l0,0V18.394c0.002-3.481,2.818-6.297,6.301-6.299l0,0 h33.783l-9.004,9H228v60.117l57.47,0.002V69.125l9.002-9l-0.002,23.788c-0.003,3.479-2.818,6.296-6.3,6.3l0,0L225.3,90.211  L225.3,90.211z"
  );

  const path4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path4.setAttribute(
    "d",
    "M285.171,11.301V0l29.25,29.25l-29.375,29.375v-11.75c0,0-17.23-1.192-29.584,6.458  c-8.209,5.084-13.104,10.167-17.166,17.042c0,0,1.109-18.25,11.609-34.875C263.033,14.716,285.171,11.301,285.171,11.301z"
  );

  svg.appendChild(path1);
  svg.appendChild(path2);
  svg.appendChild(path3);
  svg.appendChild(path4);

  shareButton.appendChild(dropDown);
  shareButton.appendChild(shareAlert);
  shareButton.appendChild(svg);

  return shareButton;
}

function handleSummarizeClick(modelToTryWith) {
    if (summarizeBtn.disabled) return;
    summarizeBtn.disabled = true;

    const userOptions = chromeStorage["summarizer-options"];

    if (typeof userOptions === "undefined") {
      summarizeBtn.disabled = false;
      return window.alert("To use the summarizer, add your OpenAI API key to Just Read's options page. For more info, see https://justread.link/summarizer");
    }

    let options;
    try {
      options = JSON.parse(userOptions);

      if (typeof options !== "object") {
        throw new Error("Invalid options");
      }
    } catch (e) {
      return console.error("Summarizer options are invalid. See https://justread.link/summarizer for more info.");
    }

    const contentContainer =
      simpleArticleIframe.querySelector(".content-container");
    if (contentContainer.querySelector(".simple-summary")) {
      contentContainer.removeChild(
        contentContainer.querySelector(".simple-summary")
      );
    }

    let { key, model, prompt, temperature, ...rest } = options;
    const content = contentContainer.innerText;

    if (typeof modelToTryWith === "string") {
        model = modelToTryWith;
    }

    if (typeof key !== "string" || key === "") {
      return console.error("No OpenAI API key was provided");
    }
    if (key === "YOUR_OPENAI_API_KEY_GOES_HERE") {
      return console.error(
        "Default OpenAI API key was provided. Please replace it with your own OpenAI API key from https://platform.openai.com/account/api-keys"
      );
    }
    if (content === "") {
      return console.error("Missing content to summarize");
    }
    if (typeof model === "undefined" || model === "") {
      model = "gpt-3.5-turbo";
    }
    if (typeof prompt === "undefined" || prompt === "") {
      prompt =
        "Summarize the content you are provided as concisely as possible while retaining the key points.";
    }
    if (
      typeof temperature === "undefined" ||
      temperature === ""
    ) {
      temperature = 0;
    }

    // Upgrade models if the content is too large
    if (model === "gpt-3.5-turbo") {
        model = "gpt-3.5-turbo-16k";
    } else if (model === "gpt-4") {
        model = "gpt-4-32k";
    }
    window.gptModel = model;

    const summary = document.createElement("div");
    summary.className = "simple-summary";
    const summaryHeader = document.createElement("h3");
    summaryHeader.innerText = "Summary loading";
    summary.appendChild(summaryHeader);
    contentContainer.prepend(summary);

    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${key}`);
    myHeaders.append("Content-Type", "application/json");

    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: content,
          },
        ],
        temperature: temperature,
        ...rest,
      }),
    })
      .then((response) => response.json())
      .then(function (json) {
        if (json.error) throw json.error;

        const summary = json.choices[0].message.content;
        const tokensUsed = json.usage.total_tokens;

        if (chromeStorage["summaryReplace"]) {
          contentContainer.innerHTML = DOMPurify.sanitize(summary);
          console.log(`Tokens used to create summary: ${tokensUsed}`);
        } else {
          const simpleSummaryContainer =
            contentContainer.querySelector(".simple-summary");
          simpleSummaryContainer.innerHTML = DOMPurify.sanitize(`
              <h3>Summary<span>: ${tokensUsed} tokens used</span></h3>
              <p>${summary}</p>
          `);
        }
      })
      .catch(function (err) {
        let message = err.message;
        if (err.code === "context_length_exceeded") {
            const numbers = err.message.match(/\d+/g);
            const tooLargeMessage = `Sorry, this article is too large for OpenAI to summarize. The request required ${numbers[1]} tokens but the max number of tokens is ${numbers[0]}.`;
            if (gptModel === "gpt-3.5-turbo") {
                if (Number(numbers[0]) < 16384) {
                    return handleSummarizeClick("gpt-3.5-turbo-16k");
                } else if (Number(numbers[0]) < 32768) {
                    return handleSummarizeClick("gpt-4-32k");
                } else {
                    message = tooLargeMessage;
                }
            } else if (gptModel === "gpt-4" || gptModel === "gpt-3.5-turbo-16k") {
              if (Number(numbers[0]) < 32768) {
                return handleSummarizeClick("gpt-4-32k");
              } else {
                  message = tooLargeMessage;
              }
            }
        }
        console.error(`Fetching summary error`, err);
        const simpleSummaryContainer =
          contentContainer.querySelector(".simple-summary");
        simpleSummaryContainer.innerHTML = DOMPurify.sanitize(`
            <h3>Error getting summary</h3>
            <p>${message}</p>
        `);
        summarizeBtn.disabled = false;
      });
}

// Add the summarize button
function addSummarizeButton() {
  summarizeBtn = document.createElement("button");
  summarizeBtn.className = "simple-summarize simple-control";
  summarizeBtn.title = "Summarize article";

  // Add the icon
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 46 36");
  const lines = document.createElementNS("http://www.w3.org/2000/svg", "path");
  lines.setAttribute("stroke", "currentColor");
  lines.setAttribute("stroke-linecap", "round");
  lines.setAttribute("stroke-width", "4");
  lines.setAttribute("d", "M11 23h33M11 13h33M11 3h33M11 33h33");
  svg.appendChild(lines);
  const rectBase = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect"
  );
  rectBase.setAttribute("width", "6");
  rectBase.setAttribute("height", "6");
  rectBase.setAttribute("y", "0");
  rectBase.setAttribute("rx", "1");
  for (let i = 0; i < 4; i++) {
    const rect = rectBase.cloneNode();
    rect.setAttribute("y", i * 10);
    svg.appendChild(rect);
  }
  summarizeBtn.appendChild(svg);

  summarizeBtn.addEventListener("click", handleSummarizeClick);

  return summarizeBtn;
}

// Add the undo button
function addUndoButton() {
  undoBtn = document.createElement("button");
  undoBtn.className = "simple-undo simple-control";
  undoBtn.title = "Undo last action";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 438.536 438.536");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "m421.12 134.19c-11.608-27.03-27.217-50.347-46.819-69.949-19.606-19.603-42.922-35.209-69.953-46.822-27.028-11.613-55.384-17.415-85.078-17.415-27.978 0-55.052 5.277-81.227 15.843-26.169 10.564-49.438 25.457-69.805 44.683l-37.12-36.835c-5.711-5.901-12.275-7.232-19.701-3.999-7.615 3.24-11.422 8.857-11.422 16.85v127.91c0 4.948 1.809 9.231 5.426 12.847 3.619 3.617 7.902 5.426 12.85 5.426h127.91c7.996 0 13.61-3.807 16.846-11.421 3.234-7.423 1.903-13.988-3.999-19.701l-39.115-39.398c13.328-12.563 28.553-22.222 45.683-28.98 17.131-6.757 35.021-10.138 53.675-10.138 19.793 0 38.687 3.858 56.674 11.563 17.99 7.71 33.544 18.131 46.679 31.265 13.134 13.131 23.555 28.69 31.265 46.679 7.703 17.987 11.56 36.875 11.56 56.674 0 19.798-3.856 38.686-11.56 56.672-7.71 17.987-18.131 33.544-31.265 46.679-13.135 13.134-28.695 23.558-46.679 31.265-17.987 7.707-36.881 11.561-56.674 11.561-22.651 0-44.064-4.949-64.241-14.843-20.174-9.894-37.209-23.883-51.104-41.973-1.331-1.902-3.521-3.046-6.567-3.429-2.856 0-5.236 0.855-7.139 2.566l-39.114 39.402c-1.521 1.53-2.33 3.478-2.426 5.853-0.094 2.385 0.527 4.524 1.858 6.427 20.749 25.125 45.871 44.587 75.373 58.382 29.502 13.798 60.625 20.701 93.362 20.701 29.694 0 58.05-5.808 85.078-17.416 27.031-11.607 50.34-27.22 69.949-46.821 19.605-19.609 35.211-42.921 46.822-69.949s17.411-55.392 17.411-85.08c1e-3 -29.698-5.803-58.047-17.41-85.076z"
  );

  svg.appendChild(path);
  undoBtn.appendChild(svg);

  return undoBtn;
}

// Add some information about our extension
function addExtInfo() {
  const extContainer = document.createElement("div"),
    viewedUsing = document.createElement("p");
  extContainer.className = "simple-ext-info";
  viewedUsing.innerText = "Viewed using ";
  viewedUsing.className = "simple-viewed-using";

  const extAnchor = document.createElement("a");
  extAnchor.href = "https://justread.link/";
  extAnchor.innerText = "Just Read";
  extAnchor.target = "_blank";
  viewedUsing.appendChild(extAnchor);

  const bugReporter = document.createElement("p");
  bugReporter.className = "simple-bug-reporter";
  const bugAnchor = document.createElement("a");
  bugAnchor.href =
    "https://github.com/ZachSaucier/Just-Read/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3Abug%20";
  bugAnchor.innerText = "Report an error";
  bugAnchor.target = "_blank";
  bugReporter.appendChild(bugAnchor);

  extContainer.appendChild(viewedUsing);
  extContainer.appendChild(bugReporter);

  return extContainer;
}

// Add edit meta functionality
function editText(elem) {
  if (!simpleArticleIframe.body.classList.contains("simple-deleting")) {
    let startText = elem.innerText;

    // Hide the item
    elem.style.display = "none";

    // Insert an input temporarily
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.value = elem.innerText;

    // Update the element on blur
    textInput.onblur = function () {
      if (textInput.parentElement.contains(textInput)) {
        // Change the value
        elem.innerText = textInput.value;

        if (elem.innerText !== startText)
          actionWithStack("edit", elem, startText);

        // Un-hide the elem
        elem.style.display = "block";

        // Remove the input
        textInput.parentElement.removeChild(textInput);
      }
    };

    // Allow enter to be used to save the edit
    textInput.onkeydown = function (e) {
      if (e.key === "Enter") textInput.blur();
    };

    elem.parentElement.appendChild(textInput);

    textInput.focus();
  }
}

function addSummaryNotifier() {
  const notification = {
    textContent: "Did you know that Just Read can summarize articles for you?",
    url: "https://justread.link/summarizer",
    primaryText: "Learn more",
    secondaryText: "Not interested",
  };
  simpleArticleIframe.body.appendChild(createNotification(notification));
}

function addPremiumNotifier() {
  const notification = {
    textContent:
      "Have you considered <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>? With Premium you can annotate your articles, share them with others, and more!",
    url: "https://justread.link/#get-Just-Read",
    primaryText: "Learn more",
    secondaryText: "Maybe later",
  };
  simpleArticleIframe.body.appendChild(createNotification(notification));
}

function addReviewNotifier(roundedNumViews, advertisePremium, tenK) {
  const reviewURL =
    navigator.userAgent.toLowerCase().indexOf("firefox") > -1
      ? "https://addons.mozilla.org/en-US/firefox/addon/just-read-ext/reviews/"
      : "https://chrome.google.com/webstore/detail/just-read/dgmanlpmmkibanfdgjocnabmcaclkmod/reviews";

  const notification = {
    url: reviewURL,
    primaryText: "Leave a review",
    secondaryText: "Maybe later",
  };

  if (!tenK) {
    if (advertisePremium) {
      notification.textContent = `Wow, you've used Just Read over ${roundedNumViews} times! Would you consider <a href='https://justread.link/#get-Just-Read' target='_blank'>upgrading to Premium</a>, <a href='${reviewURL}' target='_blank'>leaving a review</a>, or sharing Just Read with your friends or on social media? I'd really appreciate it!`;
      notification.url = "https://justread.link/#get-Just-Read";
      notification.primaryText = "Learn more";
    } else {
      notification.textContent = `Wow, you've used Just Read over ${roundedNumViews} times! Would you consider <a href='${reviewURL}' target='_blank'>leaving a review</a> or sharing Just Read with your friends or on social media? I'd really appreciate it!`;
    }
  } else {
    const mailtoUrl =
      "mailto:hello@zachsaucier.com?subject=10k%20Just%20Read%20opens";
    notification.textContent = `You've just started Just read for the 10,000th time! I'd love to hear from you about how you use Just Read via email if you're open to it. Please reach out to <a href='${mailtoUrl}'>hello@zachsaucier.com</a>`;
    notification.primaryText = "Open email";
    notification.url = mailtoUrl;
  }

  simpleArticleIframe.body.appendChild(createNotification(notification));
}

function createNotification(options) {
  const oldNotification = simpleArticleIframe.querySelector(".jr-notifier");
  if (oldNotification)
    oldNotification.parentElement.removeChild(oldNotification);

  const notifier = document.createElement("div");
  notifier.className = "jr-tooltip jr-notifier";

  const notificationText = document.createElement("p");
  notificationText.innerHTML = DOMPurify.sanitize(options.textContent);

  const btnContainer = document.createElement("div");
  btnContainer.className = "right-align-buttons";

  const secondaryBtn = document.createElement("button");
  secondaryBtn.className = "jr-secondary";
  secondaryBtn.addEventListener(
    "click",
    function () {
      this.parentElement.parentElement.parentElement.removeChild(
        this.parentElement.parentElement
      );
    },
    { once: true }
  );
  secondaryBtn.innerText = options.secondaryText;

  const primaryLink = document.createElement("a");
  primaryLink.href = options.url;
  primaryLink.target = "_blank";

  const primaryBtn = document.createElement("button");
  primaryBtn.className = "jr-primary";
  primaryBtn.innerText = options.primaryText;

  primaryLink.appendChild(primaryBtn);
  btnContainer.appendChild(secondaryBtn);
  btnContainer.appendChild(primaryLink);

  notifier.appendChild(notificationText);
  notifier.appendChild(btnContainer);

  return notifier;
}

////////////////////////////
// Feature-related functions
////////////////////////////

// Add the theme editor button
let datGUI,
  s,
  usedGUI = false;
function addGUI() {
  const button = simpleArticleIframe.createElement("button");

  button.className = "simple-control simple-edit-theme";
  button.title = "Edit your theme";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 626 626");

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", "translate(0,626) scale(0.1,-0.1)");

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    "M6155 5867 c-116 -63 -356 -224 -645 -433 -85 -62 -168 -122 -185 -134 -53 -38 -255 -190 -458 -344 -109 -83 -208 -158 -220 -166 -12 -8 -90 -69 -173 -135 -83 -66 -222 -176 -309 -245 -87 -69 -191 -151 -229 -183 -39 -32 -89 -73 -110 -90 -22 -18 -53 -44 -70 -58 -17 -15 -99 -82 -182 -150 -480 -394 -983 -857 -1140 -1049 -29 -36 -100 -145 -158 -243 -88 -149 -103 -179 -91 -189 8 -7 50 -44 93 -83 98 -88 192 -200 259 -310 28 -47 53 -91 55 -97 5 -15 411 189 488 245 183 134 659 610 1080 1082 78 88 159 178 179 200 112 122 633 729 757 881 27 33 148 182 269 330 122 148 250 306 285 352 36 46 110 140 165 210 224 283 445 602 445 642 0 18 -24 10 -105 -33z"
  );

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute(
    "d",
    "M1600 2230 c-216 -57 -398 -199 -572 -447 -40 -57 -135 -228 -158 -283 -36 -90 -113 -248 -165 -335 -103 -175 -295 -391 -446 -502 -73 -54 -187 -113 -217 -113 -49 0 -6 -21 131 -64 484 -151 904 -174 1250 -66 435 135 734 469 901 1005 46 149 58 214 45 254 -54 167 -231 392 -408 519 l-64 46 -111 3 c-86 2 -128 -2 -186 -17z"
  );

  g.appendChild(path1);
  g.appendChild(path2);
  svg.appendChild(g);
  button.appendChild(svg);

  // button.innerText = "Edit styles"; // TODO fix
  button.onclick = openStyleEditor;

  return button;
}

// Helper functions for the GUI editor
let prevStyles = {},
  saved = false,
  bodySelector = ".jr-body";

const StyleEditor = function () {
  bodySelector = getStylesheetValue(s, ".jr-body", "font-size")
    ? ".jr-body"
    : "body";

  this.theme = prevStyles.theme = theme;
  this.fontSize = prevStyles.fontSize = getStylesheetValue(
    s,
    bodySelector,
    "font-size"
  );
  this.textColor = prevStyles.textColor = getStylesheetValue(
    s,
    bodySelector,
    "color"
  );
  this.backgroundColor = prevStyles.backgroundColor = getStylesheetValue(
    s,
    bodySelector,
    "background-color"
  );
  this.linkColor = prevStyles.linkColor = getStylesheetValue(
    s,
    "a[href]",
    "color"
  );
  this.linkHoverColor = prevStyles.linkHoverColor = getStylesheetValue(
    s,
    "a[href]:hover",
    "color"
  );
  this.maxWidth = prevStyles.maxWidth = getStylesheetValue(
    s,
    ".simple-article-container",
    "max-width"
  );
  this.openFullStyles = openFullStyles;
};

function updateEditorStyles(editor) {
  editor.fontSize = prevStyles.fontSize = getStylesheetValue(
    s,
    bodySelector,
    "font-size"
  );
  editor.textColor = prevStyles.textColor = getStylesheetValue(
    s,
    bodySelector,
    "color"
  );
  editor.backgroundColor = prevStyles.backgroundColor = getStylesheetValue(
    s,
    bodySelector,
    "background-color"
  );
  editor.linkColor = getStylesheetValue(s, "a[href]", "color");
  editor.linkHoverColor = getStylesheetValue(s, "a[href]:hover", "color");
  editor.maxWidth = getStylesheetValue(
    s,
    ".simple-article-container",
    "max-width"
  );

  datGUI.__controllers.forEach((controller) => controller.updateDisplay());
}

function openFullStyles() {
  chrome.runtime.sendMessage("Open options");
}

// Check to make sure there isn't a file with this name already. If so, add a number to the end
function checkFileName(fileName) {
  let tempName = fileName,
    count = 1;

  while (stylesheetObj[tempName])
    tempName = fileName.replace(/(\.[\w\d_-]+)$/i, "(" + count++ + ").css");
  return tempName;
}

function updatePrevStyles(theme) {
  prevStyles.theme = theme;
  prevStyles.fontSize = getStylesheetValue(s, bodySelector, "font-size");
  prevStyles.textColor = getStylesheetValue(s, bodySelector, "color");
  prevStyles.backgroundColor = getStylesheetValue(
    s,
    bodySelector,
    "background-color"
  );
  prevStyles.linkColor = getStylesheetValue(s, "a[href]", "color");
  prevStyles.linkHoverColor = getStylesheetValue(s, "a[href]:hover", "color");
  prevStyles.maxWidth = getStylesheetValue(
    s,
    ".simple-article-container",
    "max-width"
  );
  prevStyles.originalThemeCSS = stylesheetObj[theme];
}

function saveStyles() {
  usedGUI = true;

  // Save styles to the stylesheet
  let newTheme = false;
  if (theme === "default-styles.css" || theme === "dark-styles.css") {
    theme = checkFileName(theme);
    chrome.storage.sync.set({ currentTheme: theme });
    newTheme = true;
  }

  let CSSString = "";
  Array.from(s.cssRules).forEach((rule) => (CSSString += rule.cssText + "\n"));

  stylesheetObj[theme] = CSSString;
  setStylesOfStorage();
  if (newTheme) {
    let selectElem = document.querySelector(".dg select");
    selectElem.innerHTML = DOMPurify.sanitize(
      selectElem.innerHTML +
        "<option value='" +
        theme +
        "'>" +
        theme +
        "</option>"
    );
    selectElem.selectedIndex = selectElem.length - 1;
  }

  updatePrevStyles(theme);

  saved = true;

  closeStyleEditor();
}

function closeStyleEditor() {
  if (!saved) {
    changeStylesheetRule(s, bodySelector, "font-size", prevStyles.fontSize);
    changeStylesheetRule(
      s,
      ".simple-article-container",
      "max-width",
      prevStyles.maxWidth
    );
    changeStylesheetRule(s, bodySelector, "color", prevStyles.textColor);
    changeStylesheetRule(
      s,
      bodySelector,
      "background-color",
      prevStyles.backgroundColor
    );
    changeStylesheetRule(s, ".simple-author", "color", prevStyles.linkColor);
    changeStylesheetRule(s, "a[href]", "color", prevStyles.linkColor);
    changeStylesheetRule(
      s,
      "a[href]:hover",
      "color",
      prevStyles.linkHoverColor
    );
    styleElem.innerHTML = DOMPurify.sanitize(prevStyles.originalThemeCSS);
  }

  datGUI.domElement.style.display = "none";

  saved = false;
}

function openStyleEditor() {
  s = simpleArticleIframe.styleSheets[2];

  if (datGUI) {
    datGUI.domElement.style.display = "block";
    datGUI.closed = false;
    const closeBtn = document.querySelector(".dg .close-button");
    closeBtn.innerText = "Save and close";
  } else {
    const editor = new StyleEditor();

    datGUI = new dat.GUI();

    const themeList = datGUI.add(editor, "theme", Object.keys(stylesheetObj));
    editor.theme = theme;

    prevStyles.originalThemeCSS = stylesheetObj[theme];
    themeList.onChange((value) => {
      saved = true;
      styleElem.innerHTML = DOMPurify.sanitize(stylesheetObj[value]);
      s = simpleArticleIframe.styleSheets[2];
      updateEditorStyles(editor);

      theme = value;
      chrome.storage.sync.set({ currentTheme: theme });
      updatePrevStyles(theme);
    });
    const fontSize = datGUI.add(editor, "fontSize", 8, 25);
    fontSize.onChange((value) => {
      saved = false;
      changeStylesheetRule(s, bodySelector, "font-size", value);
    });
    const maxWidth = datGUI.add(editor, "maxWidth");
    maxWidth.onChange((value) => {
      saved = false;
      changeStylesheetRule(s, ".simple-article-container", "max-width", value);
    });
    const textColor = datGUI.addColor(editor, "textColor");
    textColor.onChange((value) => {
      saved = false;
      changeStylesheetRule(s, bodySelector, "color", value);
    });
    const backgroundColor = datGUI.addColor(editor, "backgroundColor");
    backgroundColor.onChange((value) => {
      saved = false;
      changeStylesheetRule(s, bodySelector, "background-color", value);
    });
    const linkColor = datGUI.addColor(editor, "linkColor");
    linkColor.onChange((value) => {
      saved = false;
      changeStylesheetRule(s, ".simple-author", "color", value);
      changeStylesheetRule(s, "a[href]", "color", value);
    });
    const linkHoverColor = datGUI.addColor(editor, "linkHoverColor");
    linkHoverColor.onChange((value) => {
      saved = false;
      changeStylesheetRule(s, "a[href]:hover", "color", value);
    });
    datGUI.add(editor, "openFullStyles");

    // Add the save and close buttons
    let closeBtn = document.querySelector(".dg .close-button");

    // Switch the variables to match DOM order
    const clone = closeBtn.cloneNode(true);
    closeBtn.parentElement.appendChild(clone);
    const saveAndClose = closeBtn;
    closeBtn = clone;

    saveAndClose.className += " saveAndClose";

    saveAndClose.innerText = "Save and close";
    closeBtn.innerText = "Close without saving";

    saveAndClose.onclick = saveStyles;
    closeBtn.onclick = closeStyleEditor;
  }
}

function getStylesheetValue(stylesheet, selector, property) {
  // Make the strings lowercase
  selector = selector.toLowerCase();
  property = property.toLowerCase();

  // Return it if it exists
  for (let rule of Array.from(stylesheet.cssRules)) {
    if (rule.selectorText === selector && rule.style[property]) {
      return rule.style[property];
    }
  }

  return null;
}

function changeStylesheetRule(stylesheet, selector, property, value) {
  // Make the strings lowercase
  selector = selector.toLowerCase();
  property = property.toLowerCase();
  value = value.toLowerCase();

  // Change it if it exists
  for (let rule of Array.from(stylesheet.cssRules)) {
    if (rule.selectorText === selector && rule.style[property]) {
      rule.style[property] = value;
      return;
    }
  }

  // Add it if it does not
  stylesheet.insertRule(selector + "{" + property + ":" + value + "}", 0);
}

// Highlighter-related functionality
let highlighter;
const rangyOptions = { exclusive: false };
function initHighlighter() {
  highlighter = rangy.createHighlighter(simpleArticleIframe);

  const rangeOptions = {
    onElementCreate: (elem) => {
      elem.id = "jr-" + Date.now();
      hasSavedLink = false;
      shareDropdown.classList.remove("active");
      setTimeout(() => updateSavedVersion(), 10);
    },
  };

  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-yellow", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-blue", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-green", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-pink", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-purple", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-orange", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-red", rangeOptions)
  );

  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-white", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-black", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-yellow", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-blue", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-green", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-pink", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-purple", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-orange", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-red", rangeOptions)
  );

  highlighter.addClassApplier(
    rangy.createClassApplier("jr-strike-through", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-underline", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-italicize", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-bolden", rangeOptions)
  );
}

let lastMessage;
let editorShortcutsEnabled = false;
function handleEnd(e) {
  let isTouch = e.type === "touchend";

  if (typeof editBar === "undefined") {
    editBar = createEditBar();
    editBar.style.display = "none";
    simpleArticleIframe.body.appendChild(editBar);

    if (isTouch) {
      editBar.style.transform = "translateY(-100%)";
      editBar.querySelectorAll(".jr-color-picker").foreach((picker) => {
        picker.style.top = "auto";
        picker.style.bottom = "100%";
      });
    }

    editBar.addEventListener("click", hidePickers);

    editBar.querySelector(".jr-bold").addEventListener("click", bolden);
    editBar.querySelector(".jr-italics").addEventListener("click", italicize);
    editBar.querySelector(".jr-underl").addEventListener("click", underline);
    editBar
      .querySelector(".jr-strike")
      .addEventListener("click", strikeThrough);
    editBar
      .querySelector(".jr-deleteSel")
      .addEventListener("click", deleteSelection);

    textPicker = editBar.querySelector(".jr-text-picker");
    editBar
      .querySelector(".jr-text-color")
      .addEventListener("click", function (e) {
        hidePickers();
        textPicker.style.display = "block";
        e.stopPropagation();
      });
    textPicker.querySelectorAll(".jr-color-swatch").forEach(function (swatch) {
      swatch.addEventListener("click", function (e) {
        colorSelectedText(swatch.dataset.color);
        e.stopPropagation();
      });
    });

    highlightPicker = editBar.querySelector(".jr-highlight-picker");
    editBar
      .querySelector(".jr-highlight-color")
      .addEventListener("click", function (e) {
        hidePickers();
        highlightSelectedText(lastHighlightColor);
        highlightPicker.style.display = "block";
        e.stopPropagation();
      });
    highlightPicker
      .querySelectorAll(".jr-color-swatch")
      .forEach(function (swatch) {
        swatch.addEventListener("click", function (e) {
          highlightSelectedText(swatch.dataset.color);
          e.stopPropagation();
        });
      });

    editBar
      .querySelector(".jr-remove-styles")
      .addEventListener("click", removeHighlightFromSelectedText);
  }

  const sel = rangy.getSelection(simpleArticleIframe).toString();
  if (sel !== "" && sel !== lastMessage && isContentElem(e.target)) {
    editorShortcutsEnabled = true;
    lastMessage = sel;

    editBar.style.display = "block";
    const r = rangy
      .getSelection(simpleArticleIframe)
      .nativeSelection.getRangeAt(0)
      .getBoundingClientRect();
    editBar.style.top =
      r.top + simpleArticleIframe.defaultView.pageYOffset - 60 + "px";
    editBar.style.left =
      r.left +
      r.width / 2 +
      simpleArticleIframe.defaultView.pageXOffset -
      105 +
      "px";
  } else if (!editBar.contains(e.target)) {
    hideToolbar();

    if (
      simpleArticleIframe.querySelector(".jr-adding") &&
      simpleArticleIframe.querySelector(".jr-adding textarea").value === "" &&
      !simpleArticleIframe.querySelector(".jr-adding").contains(e.target)
    ) {
      cancelComment(null, simpleArticleIframe.querySelector(".jr-adding"));
    }
  }
}

let highlightPicker, textPicker;
function hidePickers() {
  textPicker.style.display = "none";
  highlightPicker.style.display = "none";
}

function hideToolbar() {
  editorShortcutsEnabled = false;
  lastMessage = "";

  if (editBar) {
    editBar.style.display = "none";
    hidePickers();
  }

  checkBreakpoints();
}

function checkBreakpoints() {
  if (simpleArticleIframe) {
    let container = simpleArticleIframe.querySelector(
      ".simple-article-container"
    );
    if (window.innerWidth - container.offsetWidth < 320) {
      // Too small to show regular comments
      simpleArticleIframe.body.classList.add("simple-compact-view");
    } else {
      simpleArticleIframe.body.classList.remove("simple-compact-view");
    }
  }
}

function addHighlighterNotification() {
  const notification = {
    textContent:
      "To annotate this article, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>! Annotations are just <em>one</em> of the additional features included.",
    url: "https://justread.link/#get-Just-Read",
    primaryText: "Learn more",
    secondaryText: "Maybe later",
  };
  simpleArticleIframe.body.appendChild(createNotification(notification));
}

let lastHighlightColor = "yellow";
function highlightSelectedText(colorName) {
  lastHighlightColor = colorName;
  if (isPremium) {
    highlighter.highlightSelection("jr-highlight-" + colorName, {
      exclusive: true,
    });
  } else {
    addHighlighterNotification();
  }
}

let lastFontColor = "black";
function colorSelectedText(colorName) {
  lastFontColor = colorName;
  if (isPremium) {
    highlighter.highlightSelection("jr-color-" + colorName, rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function bolden() {
  if (isPremium) {
    highlighter.highlightSelection("jr-bolden", rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function italicize() {
  if (isPremium) {
    highlighter.highlightSelection("jr-italicize", rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function underline() {
  if (isPremium) {
    highlighter.highlightSelection("jr-underline", rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function strikeThrough() {
  if (isPremium) {
    highlighter.highlightSelection("jr-strike-through", rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function deleteSelection() {
  if (isPremium) {
    const sel = rangy.getSelection(simpleArticleIframe);
    if (sel.rangeCount > 0) {
      for (let i = 0; i < sel.rangeCount; i++) {
        sel.getRangeAt(i).deleteContents();
      }
      hideToolbar();
    }
  } else {
    addHighlighterNotification();
  }
}

function removeHighlightFromSelectedText() {
  highlighter.unhighlightSelection();
  lastMessage = "";
  editBar.style.display = "none";
}

let editBar;
function createEditBar() {
  initHighlighter();

  editBar = document.createElement("div");
  editBar.className = "premium-feature jr-edit-bar jr-dark";

  const bold = document.createElement("button");
  bold.className = "jr-bold";
  bold.setAttribute("title", "Bold (Ctrl+b)");
  const boldSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  boldSVG.setAttribute("viewBox", "0 0 15 15");
  const boldPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  boldPath.setAttribute(
    "d",
    "M9,3.5 C9,1.57 7.43,0 5.5,0 L1.77635684e-15,0 L1.77635684e-15,12 L6.25,12 C8.04,12 9.5,10.54 9.5,8.75 C9.5,7.45 8.73,6.34 7.63,5.82 C8.46,5.24 9,4.38 9,3.5 Z M5,2 C5.82999992,2 6.5,2.67 6.5,3.5 C6.5,4.33 5.82999992,5 5,5 L3,5 L3,2 L5,2 Z M3,10 L3,7 L5.5,7 C6.32999992,7 7,7.67 7,8.5 C7,9.33 6.32999992,10 5.5,10 L3,10 Z"
  );
  boldPath.setAttribute("transform", "translate(4 3)");
  boldSVG.appendChild(boldPath);
  bold.appendChild(boldSVG);
  editBar.appendChild(bold);

  const italics = document.createElement("button");
  italics.className = "jr-italics";
  italics.setAttribute("title", "Italicize (Ctrl+i)");
  const italicsSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  italicsSVG.setAttribute("viewBox", "0 0 15 15");
  const italicsPoly = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  italicsPoly.setAttribute(
    "points",
    "4 0 4 2 6.58 2 2.92 10 0 10 0 12 8 12 8 10 5.42 10 9.08 2 12 2 12 0"
  );
  italicsPoly.setAttribute("transform", "translate(3 3)");
  italicsSVG.appendChild(italicsPoly);
  italics.appendChild(italicsSVG);
  editBar.appendChild(italics);

  const underline = document.createElement("button");
  underline.className = "jr-underl";
  underline.setAttribute("title", "Underline (Ctrl+u)");
  const underlineSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  underlineSVG.setAttribute("viewBox", "0 0 18 18");
  const underlinePath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  underlinePath.setAttribute(
    "d",
    "M6,12 C8.76,12 11,9.76 11,7 L11,0 L9,0 L9,7 C9,8.75029916 7.49912807,10 6,10 C4.50087193,10 3,8.75837486 3,7 L3,0 L1,0 L1,7 C1,9.76 3.24,12 6,12 Z M0,13 L0,15 L12,15 L12,13 L0,13 Z"
  );
  underlinePath.setAttribute("transform", "translate(3 3)");
  underlineSVG.appendChild(underlinePath);
  underline.appendChild(underlineSVG);
  editBar.appendChild(underline);

  const strike = document.createElement("button");
  strike.className = "jr-strike";
  strike.setAttribute("title", "Strike-through (Ctrl+Shift+s)");
  const strikeSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  strikeSVG.setAttribute("viewBox", "0 0 533.333 533.333");
  const strikePath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  strikePath.setAttribute(
    "d",
    "M533.333,266.667V300H411.195c14.325,20.058,22.139,43.068,22.139,66.667c0,36.916-19.094,72.409-52.386,97.377 C350.033,487.23,309.446,500,266.667,500c-42.78,0-83.366-12.77-114.281-35.956C119.094,439.076,100,403.583,100,366.667h66.667 c0,36.137,45.795,66.666,100,66.666s100-30.529,100-66.666c0-36.138-45.795-66.667-100-66.667H0v-33.333h155.999 c-1.218-0.862-2.425-1.731-3.613-2.623C119.094,239.075,100,203.582,100,166.667s19.094-72.408,52.385-97.377 c30.916-23.187,71.501-35.956,114.281-35.956c42.779,0,83.366,12.77,114.281,35.956c33.292,24.969,52.386,60.461,52.386,97.377 h-66.667c0-36.136-45.795-66.667-100-66.667s-100,30.53-100,66.667c0,36.137,45.795,66.667,100,66.667 c41.135,0,80.236,11.811,110.668,33.333H533.333z"
  );
  strikePath.setAttribute("transform", "translate(3 3)");
  strikeSVG.appendChild(strikePath);
  strike.appendChild(strikeSVG);
  editBar.appendChild(strike);

  const textColor = document.createElement("button");
  textColor.className = "jr-text-color";
  textColor.setAttribute("title", "Text color (Ctrl+Shift+c)");
  const textColorSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  textColorSVG.setAttribute("viewBox", "0 0 15 15");
  const textColorPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  textColorPath.setAttribute(
    "d",
    "M7,0 L5,0 L0.5,12 L2.5,12 L3.62,9 L8.37,9 L9.49,12 L11.49,12 L7,0 L7,0 Z M4.38,7 L6,2.67 L7.62,7 L4.38,7 L4.38,7 Z"
  );
  textColorPath.setAttribute("transform", "translate(3 1)");
  textColorSVG.appendChild(textColorPath);
  textColor.appendChild(textColorSVG);
  editBar.appendChild(textColor);

  const highlightColor = document.createElement("button");
  highlightColor.className = "jr-highlight-color";
  highlightColor.setAttribute("title", "Highlight color (Ctrl+Shift+h)");
  const highlightColorSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  highlightColorSVG.setAttribute("viewBox", "0 0 15 15");
  const highlightColorPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  highlightColorPath.setAttribute(
    "d",
    "M6,5 L2,9 L3,10 L0,13 L4,13 L5,12 L5,12 L6,13 L10,9 L6,5 L6,5 Z M10.2937851,0.706214905 C10.6838168,0.316183183 11.3138733,0.313873291 11.7059121,0.705912054 L14.2940879,3.29408795 C14.6839524,3.68395241 14.6796852,4.32031476 14.2937851,4.7062149 L11,8 L7,4 L10.2937851,0.706214905 Z"
  );
  highlightColorPath.setAttribute("transform", "translate(3 1)");
  highlightColorSVG.appendChild(highlightColorPath);
  highlightColor.appendChild(highlightColorSVG);
  editBar.appendChild(highlightColor);

  const removeStyles = document.createElement("button");
  removeStyles.className = "jr-remove-styles";
  removeStyles.setAttribute("title", "Clear formatting (Ctrl+\\)");
  const removeStylesSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  removeStylesSVG.setAttribute("viewBox", "0 0 15 15");
  const removeStylesPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  removeStylesPath.setAttribute(
    "d",
    "M0.27,1.55 L5.43,6.7 L3,12 L5.5,12 L7.14,8.42 L11.73,13 L13,11.73 L1.55,0.27 L0.27,1.55 L0.27,1.55 Z M3.82,0 L5.82,2 L7.58,2 L7.03,3.21 L8.74,4.92 L10.08,2 L14,2 L14,0 L3.82,0 L3.82,0 Z"
  );
  removeStylesPath.setAttribute("transform", "translate(2 3)");
  removeStylesSVG.appendChild(removeStylesPath);
  removeStyles.appendChild(removeStylesSVG);
  editBar.appendChild(removeStyles);

  const deleteSel = document.createElement("button");
  deleteSel.className = "jr-deleteSel";
  deleteSel.setAttribute("title", "Delete highlighted text (Ctrl+Shift+d)");
  const deleteSelSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  deleteSelSVG.setAttribute("viewBox", "0 0 1792 1792");
  const deleteSelPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  deleteSelPath.setAttribute(
    "d",
    "m702.89 734.91v579.46c0 9.3908-3.0099 17.096-9.0296 23.116-6.0197 6.0198-13.725 9.0296-23.116 9.0296h-64.411c-9.3908 0-17.096-3.0098-23.116-9.0296-6.0197-6.0197-9.0296-13.725-9.0296-23.116v-579.46c0-9.3908 3.0099-17.096 9.0296-23.116s13.725-9.0296 23.116-9.0296h64.411c9.3908 0 17.096 3.0099 23.116 9.0296s9.0296 13.725 9.0296 23.116zm257.52 0v579.46c0 9.3908-3.0099 17.096-9.0296 23.116-6.0197 6.0198-13.725 9.0296-23.116 9.0296h-64.411c-9.3908 0-17.096-3.0098-23.116-9.0296-6.0197-6.0197-9.0296-13.725-9.0296-23.116v-579.46c0-9.3908 3.0099-17.096 9.0296-23.116s13.725-9.0296 23.116-9.0296h64.411c9.3908 0 17.096 3.0099 23.116 9.0296s9.0296 13.725 9.0296 23.116zm257.52 0v579.46c0 9.3908-3.0098 17.096-9.0296 23.116-6.0197 6.0198-13.725 9.0296-23.116 9.0296h-64.411c-9.3908 0-17.096-3.0098-23.116-9.0296-6.0197-6.0197-9.0295-13.725-9.0295-23.116v-579.46c0-9.3908 3.0098-17.096 9.0295-23.116 6.0198-6.0197 13.725-9.0296 23.116-9.0296h64.411c9.3908 0 17.096 3.0099 23.116 9.0296 6.0198 6.0197 9.0296 13.725 9.0296 23.116zm128.7 728.27v-953.52h-901.27v953.65c0 14.809 2.2875 28.293 6.9829 40.693 4.6954 12.401 9.5112 21.43 14.568 27.209 5.0566 5.6585 8.548 8.548 10.595 8.548h836.86c2.0467 0 5.5381-2.8895 10.595-8.548 5.0566-5.6586 9.8724-14.809 14.568-27.209 4.8158-12.401 7.1033-26.005 7.1033-40.814zm-675.9-1082.3h450.64l-48.278-117.75c-4.6954-6.0197-10.354-9.752-17.096-11.076h-318.93c-6.7421 1.3243-12.401 5.0566-17.096 11.076zm933.42 32.266v64.411c0 9.3908-3.0099 17.096-9.0296 23.116-6.0197 6.0197-13.725 9.0296-23.116 9.0296h-96.556v953.65c0 55.622-15.772 103.78-47.315 144.35-31.543 40.573-69.347 60.799-113.65 60.799h-836.98c-44.305 0-82.109-19.624-113.65-58.873-31.543-39.249-47.315-86.684-47.315-142.31v-957.62h-96.556c-9.3908 0-17.096-3.0099-23.116-9.0296-6.0197-6.0197-9.0296-13.725-9.0296-23.116v-64.411c0-9.3908 3.0099-17.096 9.0296-23.116s13.725-9.0296 23.116-9.0296h310.86l70.431-167.95c10.113-24.801 28.172-45.991 54.298-63.328 26.126-17.457 52.612-26.126 79.46-26.126h321.94c26.848 0 53.335 8.6684 79.46 26.126s44.305 38.526 54.298 63.328l70.431 167.95h310.86c9.3908 0 17.096 3.0099 23.116 9.0296 6.0197 5.8993 9.0296 13.725 9.0296 23.116z"
  );
  deleteSelPath.setAttribute("stroke-width", "1.2039");
  deleteSelSVG.appendChild(deleteSelPath);
  deleteSel.appendChild(deleteSelSVG);
  editBar.appendChild(deleteSel);

  const colorPicker = document.createElement("div");
  colorPicker.className = "jr-color-picker jr-text-picker";
  const colors = [
    "white",
    "black",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "red",
    "orange",
  ];
  colors.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = "jr-color-swatch jr-highlight-" + color;
    swatch.dataset.color = color;
    colorPicker.appendChild(swatch);
  });
  editBar.appendChild(colorPicker);

  const highlightPicker = document.createElement("div");
  highlightPicker.className = "jr-color-picker jr-highlight-picker";
  const highlightColors = [
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "red",
    "orange",
  ];
  highlightColors.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = "jr-color-swatch jr-highlight-" + color;
    swatch.dataset.color = color;
    highlightPicker.appendChild(swatch);
  });
  // Fix some gimp alignment issue
  const swatch = document.createElement("div");
  swatch.className = "jr-color-swatch";
  swatch.style.visibility = "hidden";
  highlightPicker.appendChild(swatch);
  editBar.appendChild(highlightPicker);

  window.addEventListener("resize", hideToolbar);

  return editBar;
}

function addComment(loc) {
  if (!simpleArticleIframe.body.classList.contains("simple-deleting")) {
    simpleArticleIframe.body.classList.add("simple-with-comments");
    simpleArticleIframe.body.classList.add("simple-commenting");

    // Add the compact comment
    let compactComment = document.createElement("a");
    compactComment.className = "simple-comment-link";
    let commentId = "jr-" + Date.now();
    compactComment.href = "#" + commentId;
    compactComment.innerText = "[*]";
    compactComment.style.top = loc.y + "px";
    compactComment.onclick = linkListener;
    compactComments.appendChild(compactComment);

    // Add the comment
    const commentContainer = document.createElement("div");
    commentContainer.id = commentId;
    commentContainer.className = "simple-comment-container jr-adding";

    const styling = document.createElement("div");
    styling.className = "simple-comment-styling";

    const textarea = document.createElement("textarea");
    textarea.onkeydown = textChange;
    textarea.onkeyup = textChange;
    styling.appendChild(textarea);

    const postBtn = document.createElement("button");
    postBtn.className = "jr-post";
    postBtn.innerText = "Comment";
    postBtn.disabled = true;
    postBtn.onclick = placeComment;
    styling.appendChild(postBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel";
    cancelBtn.innerText = "Cancel";
    cancelBtn.onclick = cancelComment;
    styling.appendChild(cancelBtn);

    commentContainer.appendChild(styling);

    commentContainer.style.top = loc.y + "px";

    comments.appendChild(commentContainer);

    textarea.focus();
    setTimeout(function () {
      if (simpleArticleIframe.body.classList.contains("simple-compact-view"))
        commentContainer.scrollIntoView();
    }, 50);
  }
}

function textChange() {
  if (this.value !== "") {
    this.nextSibling.disabled = false;
  } else {
    this.nextSibling.disabled = true;
  }
  this.style.height = "auto";
  this.style.height = this.scrollHeight + 10 + "px";
}

function placeComment() {
  hasSavedLink = false;
  shareDropdown.classList.remove("active");

  simpleArticleIframe.body.classList.remove("simple-commenting");

  const parent = this.parentElement;

  parent.parentElement.classList.remove("jr-adding");
  parent.parentElement.classList.add("jr-posted");

  const date = new Date();
  const dateString =
    date.getMonth() +
    1 +
    "/" +
    date.getDate() +
    "/" +
    date.getFullYear() +
    " at " +
    date.getHours() +
    ":" +
    date.getMinutes();
  const timestamp = document.createElement("div");
  timestamp.className = "jr-timestamp";
  timestamp.innerText = "Left on " + dateString;

  const textarea = parent.querySelector("textarea");

  const comment = document.createElement("p");
  comment.className = "simple-comment";
  comment.innerText = textarea.value;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-button";
  deleteBtn.innerText = "X";
  deleteBtn.onclick = function () {
    hasSavedLink = false;
    shareDropdown.classList.remove("active");
    const compactRef = simpleArticleIframe.querySelector(
      "[href *= " + this.parentElement.parentElement.id + "]"
    );
    compactRef.parentElement.removeChild(compactRef);
    cancelComment(null, parent);
  };

  const backBtn = document.createElement("button");
  backBtn.className = "back-to-ref";
  backBtn.innerText = "↑";
  backBtn.onclick = function () {
    simpleArticleIframe.defaultView.scrollTo(0, this.dataset.scrollPos);
  };

  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }

  parent.appendChild(timestamp);
  parent.appendChild(comment);
  parent.appendChild(deleteBtn);
  parent.appendChild(backBtn);

  updateSavedVersion();
}

function cancelComment(e, el) {
  let parent;
  if (el) {
    parent = el.parentElement;
  } else {
    parent = this.parentElement.parentElement;
  }

  parent.parentElement.removeChild(parent);

  if (
    simpleArticleIframe.querySelectorAll(".simple-comment-container").length ===
    0
  ) {
    simpleArticleIframe.body.classList.remove("simple-with-comments");
  }
  simpleArticleIframe.body.classList.remove("simple-commenting");
}

function handleMouseMove(e) {
  let leftEdge, rightEdge;
  if (
    !simpleArticleIframe
      .querySelector(".simple-container")
      .classList.contains("rtl")
  ) {
    const edge = simpleArticleIframe
      .querySelector(".simple-article-container")
      .getBoundingClientRect().right;
    leftEdge = edge - 70;
    rightEdge = edge + 170;
  } else {
    const edge = simpleArticleIframe
      .querySelector(".simple-article-container")
      .getBoundingClientRect().left;
    leftEdge = edge - 170;
    rightEdge = edge + 70;
  }
  const paddingTop = parseInt(
    window
      .getComputedStyle(simpleArticleIframe.querySelector(".simple-container"))
      .getPropertyValue("padding-top")
  );
  if (e.clientX > leftEdge && e.clientX < rightEdge) {
    simpleArticleIframe.body.classList.add("simple-show-adder");
    addCommentBtn.style.top =
      e.clientY - paddingTop + simpleArticleIframe.defaultView.scrollY - 27;
  } else {
    simpleArticleIframe.body.classList.remove("simple-show-adder");
  }
}

// Gradient text functionality from https://codepen.io/Zeaklous/pen/GGXVwd?editors=0010
// Line counter is a cleaned up, ES6 version of https://github.com/xdamman/js-line-wrap-detector
// A cleaned up, ES6 version of https://stackoverflow.com/a/37623987/2065702
function getLineInfo(target, computedStyle) {
  let height = parseInt(computedStyle.getPropertyValue("height"));
  const fontSize = parseInt(computedStyle.getPropertyValue("font-size"));
  const lineHeight = parseInt(computedStyle.getPropertyValue("line-height"));
  const boxSizing = computedStyle.getPropertyValue("box-sizing");

  if (isNaN(lineHeight)) lineHeight = fontSize * 1.2;

  if (boxSizing === "border-box") {
    const paddingTop = parseInt(computedStyle.getPropertyValue("padding-top"));
    const paddingBottom = parseInt(
      computedStyle.getPropertyValue("padding-bottom")
    );
    const borderTop = parseInt(
      computedStyle.getPropertyValue("border-top-width")
    );
    const borderBottom = parseInt(
      computedStyle.getPropertyValue("border-bottom-width")
    );
    height = height - paddingTop - paddingBottom - borderTop - borderBottom;
  }
  const lines = Math.ceil(height / lineHeight);
  return { lines, lineHeight };
}

// JS functionality to allow more precision/dynamic results for above SCSS
function gradientText(colors) {
  const ps = simpleArticleIframe.querySelectorAll(".content-container p");

  ps.forEach((p) => {
    if (
      !(
        p.childElementCount === 1 &&
        (p.firstElementChild.tagName === "IMG" ||
          p.firstElementChild.tagName === "A") &&
        p.querySelector("img")
      )
    ) {
      p.classList.add("gradient-text");

      let colorIndex = 0;
      const computedStyle = getComputedStyle(p);

      const lineInfo = getLineInfo(p, computedStyle);
      const numLines = lineInfo.lines;
      const lineHeight = lineInfo.lineHeight;

      p.classList.add("jsGrad");
      let colorOverlay;
      if (p.querySelector(".colorOverlay") == null) {
        colorOverlay = document.createElement("span");
        colorOverlay.className = "colorOverlay";
        p.appendChild(colorOverlay);
      } else {
        colorOverlay = p.querySelector(".colorOverlay");
      }

      let grads = ``;
      let sizes = ``;
      let poses = ``;

      for (let i = 0; i < numLines; i++) {
        let nextIndex = colors[colorIndex + 1] ? colorIndex + 1 : 0;

        if (i !== 0) {
          grads += `, `;
          sizes += `, `;
          poses += `, `;
        }

        grads += `linear-gradient(to right, ${colors[colorIndex]} 0%, ${colors[colorIndex]} 10%, ${colors[nextIndex]} 90%, ${colors[nextIndex]} 100%)`;
        sizes += `100% ${lineHeight}px`;
        poses += `0 ${lineHeight * i + parseInt(computedStyle.paddingTop)}px`;

        colorIndex = nextIndex;
      }

      // Make any lines over the max black-ish
      grads += `, linear-gradient(to right, black 0%, black 100%)`;
      sizes += `, 100% 100%`;
      poses += `, 0% 0%`;

      colorOverlay.style.backgroundImage = grads;
      colorOverlay.style.backgroundSize = sizes;
      colorOverlay.style.backgroundPosition = poses;
    }
  });
}

// Custom search/find functionality
function createFindBar() {
  const simpleFind = document.createElement("div");
  simpleFind.className = "simple-find";

  const findInput = document.createElement("input");
  findInput.className = "simple-find-input";
  findInput.setAttribute("type", "text");

  const findCount = document.createElement("span");
  findCount.className = "simple-find-count";
  findCount.innerText = 0;

  const findClose = document.createElement("button");
  findClose.className = "simple-close-find";
  findClose.setAttribute("title", "Close find bar");
  findClose.setAttribute("tabindex", "0");
  findClose.innerText = "X";

  simpleFind.appendChild(findInput);
  simpleFind.appendChild(findCount);
  simpleFind.appendChild(findClose);

  return simpleFind;
}

let find, findInput, findCount, closeFind;

let searchResultApplier;
function initFindBar() {
  find = simpleArticleIframe.querySelector(".simple-find");
  findInput = find.querySelector(".simple-find-input");
  findCount = find.querySelector(".simple-find-count");
  closeFind = find.querySelector(".simple-close-find");

  searchResultApplier = rangy.createClassApplier("simple-found");

  findInput.addEventListener("keydown", function (e) {
    // Esc
    if (e.key === "Escape") {
      closeFindBar();
      e.stopPropagation();
    } else if (!e.ctrlKey) {
      scheduleSearch();
    }
  });

  findInput.addEventListener("keyup", (e) => {
    if (!e.ctrlKey) scheduleSearch;
  });
  closeFind.onclick = closeFindBar;
}

function closeFindBar() {
  find.classList.remove("active");

  cancelSearch();
}

let timer = null;
function scheduleSearch() {
  if (timer) {
    window.clearTimeout(timer);
  }
  timer = window.setTimeout(doSearch, 100);
}

function cancelSearch() {
  // Remove existing highlights
  const range = rangy.createRange();
  const searchScopeRange = rangy.createRange();
  searchScopeRange.selectNodeContents(
    simpleArticleIframe.querySelector(".content-container")
  );

  range.selectNodeContents(
    simpleArticleIframe.querySelector(".content-container")
  );
  searchResultApplier.undoToRange(range);
}

function doSearch() {
  if (find.classList.contains("active")) {
    // Remove existing highlights
    const range = rangy.createRange();
    const searchScopeRange = rangy.createRange();
    searchScopeRange.selectNodeContents(
      simpleArticleIframe.querySelector(".content-container")
    );

    const options = {
      caseSensitive: false,
      wholeWordsOnly: false,
      withinRange: searchScopeRange,
      direction: "forward", // This is redundant because "forward" is the default
    };

    range.selectNodeContents(
      simpleArticleIframe.querySelector(".content-container")
    );
    searchResultApplier.undoToRange(range);

    // Create search term
    const searchTerm = findInput.value;

    if (searchTerm !== "") {
      // Iterate over matches
      while (range.findText(searchTerm, options)) {
        // range now encompasses the first text match
        searchResultApplier.applyToRange(range);

        // Collapse the range to the position immediately after the match
        range.collapse(false);
      }

      findCount.innerText =
        simpleArticleIframe.querySelectorAll(".simple-found").length;
      findCount.classList.add("active");

      // Jump to the first found instance
      if (simpleArticleIframe.querySelector(".simple-found"))
        simpleArticleIframe.querySelector(".simple-found").scrollIntoView();
    } else {
      findCount.classList.remove("active");
    }

    timer = null;
  }
}

// Auto-scroll functionality
let scrollSpeed = 0.5,
  nextMove = 0,
  pauseScrollBtn,
  scrollSpeedInput,
  lastTime;
function scrollPage() {
  if (
    simpleArticleIframe &&
    !simpleArticleIframe.body.classList.contains("paused")
  ) {
    let curTime = Date.now(),
      timePassed = curTime - lastTime;

    if (timePassed > 16.6666667) {
      // Run at a max of 60 fps
      nextMove += scrollSpeed;
      simpleArticleIframe.defaultView.scrollBy(0, nextMove);

      lastTime = curTime;

      if (nextMove > 1) nextMove = 0;
    }
  }

  requestAnimationFrame(scrollPage);
}

function toggleScroll() {
  simpleArticleIframe.body.classList.toggle("paused");
  if (simpleArticleIframe.body.classList.contains("paused")) {
    pauseScrollBtn.innerText = "Start scroll";
  } else {
    pauseScrollBtn.innerText = "Pause scroll";
  }
}

function getPauseScrollBtn() {
  pauseScrollBtn = document.createElement("button");
  pauseScrollBtn.className = "pause-scroll";
  pauseScrollBtn.innerText = "Pause scroll";
  pauseScrollBtn.onclick = toggleScroll;

  return pauseScrollBtn;
}

function handleScrollSpeedInput(e) {
  const speed = parseFloat(scrollSpeedInput.value);
  if (speed) {
    scrollSpeed = speed;
    chrome.storage.sync.set({ "scroll-speed": speed });
  }
}

function getScrollSpeedInput() {
  scrollSpeedInput = document.createElement("input");
  scrollSpeedInput.type = "number";
  scrollSpeedInput.className = "scroll-input";
  scrollSpeedInput.value = scrollSpeed;
  scrollSpeedInput.step = "0.1";
  scrollSpeedInput.pattern = "^d*(.d{0,2})?$";
  scrollSpeedInput.min = "0";
  scrollSpeedInput.onchange = handleScrollSpeedInput;
  scrollSpeedInput.onkeyup = handleScrollSpeedInput;

  return scrollSpeedInput;
}

// Progress bar functionality
let progressBar,
  ticking = false;
let hideSegments = false;

let winheight, docheight, trackLength, throttlescroll;

function getDocHeight() {
  let D = simpleArticleIframe;
  return Math.max(
    D.body.scrollHeight,
    D.documentElement.scrollHeight,
    D.body.offsetHeight,
    D.documentElement.offsetHeight,
    D.body.clientHeight,
    D.documentElement.clientHeight
  );
}

function getMeasurements() {
  if (chromeStorage["scrollbar"]) {
    let D = simpleArticleIframe;
    winheight =
      D.defaultView.innerHeight || (D.documentElement || D.body).clientHeight;
    docheight = getDocHeight();
    trackLength = docheight - winheight;
    requestTick();
  }
}

function requestTick() {
  if (!ticking) {
    requestAnimationFrame(updateProgressBar);
    ticking = true;
  }
}

function updateProgressBar() {
  if (progressBar && simpleArticleIframe) {
    const D = simpleArticleIframe;
    const scrollTop =
      D.defaultView.pageYOffset ||
      (D.documentElement || D.body.parentElement || D.body).scrollTop;
    const pctScrolled = (scrollTop / trackLength) * 100 || 0;

    progressBar.value = pctScrolled;
  }

  ticking = false;
}

function initScrollbar() {
  // Hide the original scrollbar
  simpleArticleIframe.body.classList.add("hideScrollbar");

  progressBar = document.createElement("progress");
  progressBar.classList.add("simple-progress");
  progressBar.max = 100;
  simpleArticleIframe
    .querySelector(".content-container")
    .appendChild(progressBar);

  getMeasurements();
  simpleArticleIframe.defaultView.addEventListener(
    "scroll",
    requestTick,
    false
  );
  simpleArticleIframe.defaultView.addEventListener(
    "resize",
    getMeasurements,
    false
  );

  return progressBar;
}

function getContent(keepJR) {
  // Create a copy of the Just Read content
  const copy = simpleArticleIframe
    .querySelector(".simple-container")
    .cloneNode(true);

  // Change all relative URL links to absolute ones
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

  // Change all relative URL images to absolute ones
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

  // Add the body's classes to our container (used to keep styling correct)
  copy.className += " " + simpleArticleIframe.body.className;

  // Add link to original article
  const originalLink = document.createElement("a");
  originalLink.href = window.location.href;
  originalLink.innerText = "View original page";
  originalLink.className = "original-link";

  if (copy.querySelector(".simple-meta"))
    copy
      .querySelector(".simple-meta")
      .insertBefore(originalLink, copy.querySelector(".simple-title"));

  // If there were changes from the GUI, update the <style> element based on the changed stylesheet
  if (usedGUI) styleElem.innerText = stylesheetToString(s);
  // Add the user's styles to the copy
  copy.appendChild(styleElem.cloneNode(true));

  // Remove JR elements that are not used on the shared version
  let removeElems;
  if (keepJR) {
    removeElems = copy.querySelectorAll(
      ".simple-control:not(.simple-print), .simple-find, .simple-edit, .simple-add-comment, .delete-button, .simple-add-comment-container"
    );
  } else {
    removeElems = copy.querySelectorAll(
      ".simple-control, .simple-find, .simple-edit, .simple-add-comment, .delete-button, .simple-add-comment-container"
    );
  }
  removeElems.forEach(function (elem) {
    elem.parentElement.removeChild(elem);
  });

  return copy;
}

// Duplicating content to make a savable copy
let hasSavedLink = false,
  alertTimeout;
function getSavableLink() {
  if (isPremium && jrSecret) {
    if (!hasSavedLink) {
      hasSavedLink = true;

      let copy = getContent(true);

      const myTitle = copy.querySelector(".simple-title")
          ? copy.querySelector(".simple-title").innerText
          : "Unknown title",
        myAuthor = copy.querySelector(".simple-author")
          ? copy.querySelector(".simple-author").innerText
          : "Unknown author";

      const comments = copy.querySelectorAll(".simple-comment-container");
      comments.forEach((comment) => {
        const timestamp = comment.querySelector(".jr-timestamp");

        const timestampLink = document.createElement("a");
        timestampLink.setAttribute("href", "#" + comment.id);
        timestampLink.innerText = timestamp.innerText.split("Left on ").pop();

        timestamp.innerText = "Left on ";
        timestamp.appendChild(timestampLink);
      });
      // Hack to add hide segments to the actual content
      if (hideSegments) {
        let hideCSS = document.createElement("style");
        hideCSS.innerText =
          '.content-container script,.content-container [class="ad"],.content-container [class *="ads"],.content-container [class ^="ad-"],.content-container [class ^="ad_"],.content-container [class *="-ad-"],.content-container [class $="-ad"],.content-container [class $="_ad"],.content-container [class ~="ad"],.content-container [class *="navigation"],.content-container [class *="nav"],.content-container nav,.content-container [class *="search"],.content-container [class *="menu"],.content-container [class *="print"],.content-container [class *="nocontent"],.content-container .hidden,.content-container [class *="popup"],.content-container [class *="share"],.content-container [class *="sharing"],.content-container [class *="social"],.content-container [class *="follow"],.content-container [class *="newsletter"],.content-container [class *="meta"],.content-container [class *="author"],.content-container [id *="author"],.content-container form,.content-container [class ^="form"],.content-container [class *="-form-"],.content-container [class $="form"],.content-container [class ~="form"],.content-container [class *="related"],.content-container [class *="recommended"],.content-container [class *="see-also"],.content-container [class *="popular"],.content-container [class *="trail"],.content-container [class *="comment"],.content-container [class *="disqus"],.content-container [id *="disqus"],.content-container [class ^="tag"],.content-container [class *="-tag-"],.content-container [class $="-tag"],.content-container [class $="_tag"],.content-container [class ~="tag"],.content-container [class *="-tags-"],.content-container [class $="-tags"],.content-container [class $="_tags"],.content-container [class ~="tags"],.content-container [id *="-tags-"],.content-container [id $="-tags"],.content-container [id $="_tags"],.content-container [id ~="tags"],.content-container [class *="subscribe"],.content-container [id *="subscribe"],.content-container [class *="subscription"],.content-container [id *="subscription"],.content-container [class ^="fav"],.content-container [class *="-fav-"],.content-container [class $="-fav"],.content-container [class $="_fav"],.content-container [class ~="fav"],.content-container [id ^="fav"],.content-container [id *="-fav-"],.content-container [id $="-fav"],.content-container [id $="_fav"],.content-container [id ~="fav"],.content-container [class *="favorites"],.content-container [id *="favorites"],.content-container [class *="signup"],.content-container [id *="signup"],.content-container [class *="signin"],.content-container [id *="signin"],.content-container [class *="signIn"],.content-container [id *="signIn"],.content-container footer,.content-container [class *="footer"],.content-container [id *="footer"],.content-container svg[class *="pinterest"],.content-container [class *="pinterest"] svg,.content-container svg[id *="pinterest"],.content-container [id *="pinterest"] svg,.content-container svg[class *="pinit"],.content-container [class *="pinit"] svg,.content-container svg[id *="pinit"],.content-container [id *="pinit"] svg,.content-container svg[class *="facebook"],.content-container [class *="facebook"] svg,.content-container svg[id *="facebook"],.content-container [id *="facebook"] svg,.content-container svg[class *="github"],.content-container [class *="github"] svg,.content-container svg[id *="github"],.content-container [id *="github"] svg,.content-container svg[class *="twitter"],.content-container [class *="twitter"] svg,.content-container svg[id *="twitter"],.content-container [id *="twitter"] svg,.content-container svg[class *="instagram"],.content-container [class *="instagram"] svg,.content-container svg[id *="instagram"],.content-container [id *="instagram"] svg,.content-container svg[class *="tumblr"],.content-container [class *="tumblr"] svg,.content-container svg[id *="tumblr"],.content-container [id *="tumblr"] svg,.content-container svg[class *="youtube"],.content-container [class *="youtube"] svg,.content-container svg[id *="youtube"],.content-container [id *="youtube"] svg,.content-container svg[class *="codepen"],.content-container [class *="codepen"] svg,.content-container svg[id *="codepen"],.content-container [id *="codepen"] svg,.content-container svg[class *="dribble"],.content-container [class *="dribble"] svg,.content-container svg[id *="dribble"],.content-container [id *="dribble"] svg,.content-container svg[class *="soundcloud"],.content-container [class *="soundcloud"] svg,.content-container svg[id *="soundcloud"],.content-container [id *="soundcloud"] svg,.content-container svg[class *="rss"],.content-container [class *="rss"] svg,.content-container svg[id *="rss"],.content-container [id *="rss"] svg,.content-container svg[class *="linkedin"],.content-container [class *="linkedin"] svg,.content-container svg[id *="linkedin"],.content-container [id *="linkedin"] svg,.content-container svg[class *="vimeo"],.content-container [class *="vimeo"] svg,.content-container svg[id *="vimeo"],.content-container [id *="vimeo"] svg,.content-container svg[class *="email"],.content-container [class *="email"] svg,.content-container svg[id *="email"],.content-container [id *="email"] svg{display: none;}.entry-content.entry-content,pre *{display: initial !important;}';
        copy.appendChild(hideCSS);
      }

      const date = new Date();
      fetch(jrDomain + "newEntry", {
        mode: "cors",
        method: "POST",
        headers: { "Content-type": "application/json; charset=UTF-8" },
        body: JSON.stringify({
          jrSecret: jrSecret,
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
            // Close the original page if the option is enabled
            if (
              (chromeStorage["openSharedPage"] ||
                typeof chromeStorage["openSharedPage"] === "undefined") &&
              chromeStorage["closeOldPage"]
            ) {
              chrome.runtime.sendMessage({ closeTab: "true" });
            }

            // Open up the sharable copy if the options is enabled
            if (
              chromeStorage["openSharedPage"] ||
              typeof chromeStorage["openSharedPage"] === "undefined"
            ) {
              window.open(url, "_blank");
            }

            // Show the link in the dropdown
            shareDropdown.classList.add("active");
            shareDropdown.innerText = url;
          }
        })
        .catch(function (err) {
          hasSavedLink = false;
          if (err.status === 428) {
            simpleArticleIframe
              .querySelector(".simple-share-alert")
              .classList.add("active");
            window.clearTimeout(alertTimeout);
            alertTimeout = setTimeout(function () {
              simpleArticleIframe
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
    simpleArticleIframe.body.appendChild(createNotification(notification));
  }
}

/////////////////////////////////////
// Actually create the iframe
/////////////////////////////////////

let compactComments,
  comments,
  addCommentBtn,
  shareDropdown,
  undoBtn,
  summarizeBtn;

let titleSelector,
  authorSelector,
  dateSelector,
  contentSelector,
  headerImageSelector,
  selectorsToDelete;

let savedComments, savedCompactComments;

function getDomainSelectors() {
  // Get custom domain selectors if applicable
  if (chromeStorage["domainSelectors"]) {
    let domainSelectorArr = chromeStorage["domainSelectors"];
    for (let i = 0; i < domainSelectorArr.length; i++) {
      let domainSelObj = domainSelectorArr[i];
      let domainPattern = domainSelObj.domainPattern;

      let regex = new RegExp(domainPattern, "i");
      let url = window.location.href;

      if (url.match(regex)) {
        if (domainSelObj.titleSelector)
          titleSelector = domainSelObj.titleSelector;
        if (domainSelObj.authorSelector)
          authorSelector = domainSelObj.authorSelector;
        if (domainSelObj.dateSelector) dateSelector = domainSelObj.dateSelector;
        if (domainSelObj.contentSelector)
          contentSelector = domainSelObj.contentSelector;
        if (domainSelObj.headerImageSelector)
          headerImageSelector = domainSelObj.headerImageSelector;
        if (domainSelObj.selectorsToDelete)
          selectorsToDelete = domainSelObj.selectorsToDelete;
      }
    }
  }

  if (chromeStorage["backup"]) {
    chrome.storage.local.get("JRSavedPage", (data) => {
      if (typeof data.JRSavedPage === "undefined") {
        createSimplifiedOverlay();
        return;
      };

      const lastSavedPage = JSON.parse(data.JRSavedPage);
      let response;

      if (lastSavedPage && window.location.href === lastSavedPage.url) {
        if (lastSavedPage.savedComments) {
          response = {
            content: lastSavedPage.content,
            savedComments: lastSavedPage.savedComments,
            savedCompactComments: lastSavedPage.savedCompactComments,
          };
        } else {
          response = { content: lastSavedPage.content };
        }
      }

      if (response && response.content) {
        let tempElem = document.createElement("div");
        tempElem.innerHTML = DOMPurify.sanitize(response.content);
        pageSelectedContainer = tempElem;

        if (response.savedComments) {
          savedComments = response.savedComments;
          savedCompactComments = response.savedCompactComments;
        }
      }

      createSimplifiedOverlay();
    });
  } else {
    createSimplifiedOverlay();
  }
}

function createSimplifiedOverlay() {
  // Disable scroll on main page until closed
  document.documentElement.classList.add("simple-no-scroll");

  // Create an iframe so we don't use old styles
  simpleArticle = document.createElement("iframe");
  simpleArticle.id = "simple-article";
  simpleArticle.className = "simple-fade-up no-trans"; // Add fade

  const container = document.createElement("div");
  container.className = "simple-container";

  const articleContainer = document.createElement("div");
  articleContainer.className = "simple-article-container";

  // Try using the selected element's content
  if (userSelected) {
    pageSelectedContainer = userSelected;
  }

  // If there is no text selected, auto-select the content
  if (!pageSelectedContainer) {
    pageSelectedContainer = getContainer();

    const pattern = new RegExp("<br/?>[ \r\ns]*<br/?>", "g");
    pageSelectedContainer.innerHTML = DOMPurify.sanitize(
      pageSelectedContainer.innerHTML.replace(pattern, "</p><p>")
    );
  }

  selected = pageSelectedContainer;

  // Get the title, author, etc.
  articleContainer.appendChild(addArticleMeta());

  // Set the text as our text
  const contentContainer = document.createElement("div");
  contentContainer.className = "content-container";
  contentContainer.innerHTML = DOMPurify.sanitize(
    pageSelectedContainer.innerHTML
  );

  const lightboxes = [];

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

      // See if the pres have code in them
      let isPreNoCode = true;
      if (elem.nodeName === "PRE" && !chromeStorage["leavePres"]) {
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

      // Update our scrollbar sizing
      if (
        elem.nodeName === "IFRAME" ||
        elem.nodeName === "VIDEO" ||
        elem.nodeName === "IMG"
      ) {
        elem.addEventListener("load", getMeasurements, { once: true });
      }
    }
  });

  // Add the compact comment section
  compactComments = document.createElement("div");
  compactComments.className = "simple-compact-comments";

  // Add the comment section
  comments = document.createElement("div");
  comments.className = "simple-comments";

  // Add the "add comment" button
  let addCommentContainer = document.createElement("div");
  addCommentContainer.className = "simple-add-comment-container";

  addCommentBtn = document.createElement("button");
  addCommentBtn.className = "premium-feature simple-add-comment";

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
  addCommentBtn.appendChild(svg);

  addCommentBtn.title = "Add a comment";
  addCommentBtn.onclick = function () {
    if (isPremium) {
      addComment({ x: parseInt(this.style.left), y: parseInt(this.style.top) });
    } else {
      const notification = {
        textContent:
          "To add comments, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>! Comments are just <em>one</em> of the additional features included.",
        url: "https://justread.link/#get-Just-Read",
        primaryText: "Learn more",
        secondaryText: "Maybe later",
      };
      simpleArticleIframe.body.appendChild(createNotification(notification));
    }
  };
  addCommentContainer.appendChild(addCommentBtn);

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

  if (headerImageSelector && document.querySelector(headerImageSelector)) {
    const headerImg = document.querySelector(headerImageSelector);
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

  // Add the find bar
  container.appendChild(createFindBar());

  // Add our iframe to the page
  document.body.appendChild(simpleArticle);

  // Focus the article so our shortcuts work from the start
  document.getElementById("simple-article").focus();

  // Append our custom HTML to the iframe
  container.appendChild(articleContainer);
  container.appendChild(compactComments);
  container.appendChild(addCommentContainer);
  container.appendChild(comments);

  // Add saved comments if applicable
  if (savedComments) {
    comments.innerHTML = DOMPurify.sanitize(savedComments);
    comments.querySelectorAll(".delete-button").forEach((btn) => {
      btn.onclick = function () {
        hasSavedLink = false;
        shareDropdown.classList.remove("active");
        const compactRef = simpleArticleIframe.querySelector(
          "[href *= " + this.parentElement.parentElement.id + "]"
        );
        compactRef.parentElement.removeChild(compactRef);
        cancelComment(null, this.parentElement);
      };
    });

    compactComments.innerHTML = DOMPurify.sanitize(savedCompactComments);
  }

  function doStuff() {
    simpleArticleIframe =
      document.getElementById("simple-article").contentWindow.document;
    simpleArticleIframe.body.appendChild(container);
    simpleArticleIframe.documentElement.setAttribute(
      "lang",
      document.documentElement.getAttribute("lang")
    );

    simpleArticleIframe.body.className = window.location.hostname.replace(
      /\./g,
      "-"
    );

    // Update the word count if it exists
    if (chromeStorage["addTimeEstimate"]) {
      let wordCount = simpleArticleIframe
        .querySelector(".content-container")
        .innerHTML.split(/\s+/).length;
      simpleArticleIframe.querySelector(".simple-time-estimate").innerText =
        Math.floor(wordCount / 200) + " minute read";
    }

    // Add a notification of the summarizer if necessary
    if (
      jrOpenCount > 15 &&
      !hasBeenNotifiedOfSummarizer
    ) {
      addSummaryNotifier();
      chrome.storage.sync.set({ jrHasBeenNotifiedOfSummarizer: true });
    }

    // Add a notification of premium if necessary
    if (
      !isPremium &&
      (jrOpenCount === 5 || jrOpenCount % 33 === 0) &&
      jrOpenCount < 67
    ) {
      addPremiumNotifier();
    }

    // Ask for a review and such]
    if (!hasBeenAskedForReview100 && jrOpenCount > 100) {
      const roundedNumViews = 100 * Math.floor(jrOpenCount / 100);
      chrome.storage.sync.set({ jrHasBeenAskedForReview100: true });
      if (!isPremium) {
        addReviewNotifier(roundedNumViews, true);
      } else {
        addReviewNotifier(roundedNumViews);
      }
    }

    if (
      !hasBeenAskedForReview1000 &&
      hasBeenAskedForReview100 &&
      jrOpenCount > 1000
    ) {
      const roundedNumViews = 100 * Math.floor(jrOpenCount / 100);
      chrome.storage.sync.set({ jrHasBeenAskedForReview1000: true });
      if (!isPremium) {
        addReviewNotifier(roundedNumViews, true);
      } else {
        addReviewNotifier(roundedNumViews);
      }
    }

    if (
      !hasBeenAskedForReview10000 &&
      hasBeenAskedForReview1000 &&
      jrOpenCount > 10000
    ) {
      const roundedNumViews = 100 * Math.floor(jrOpenCount / 100);
      chrome.storage.sync.set({ jrHasBeenAskedForReview10000: true });
      addReviewNotifier(roundedNumViews, null, true);
    }

    // Add MathJax support
    // TODO add for Chrome??
    // Commented out because Firefox says "Add-ons must be self-contained and not load remote code for execution"
    // const mj = document.querySelector("script[src *= 'mathjax']");
    // if(mj) {
    //     const mathjax = document.createElement("script");
    //     mathjax.src = mj.src;
    //     simpleArticleIframe.head.appendChild(mathjax);

    //     const scripts = document.querySelectorAll("script");
    //     scripts.forEach(script => {
    //         if(script.innerText.indexOf("MathJax.Hub.Config") >= 0) {
    //             const clone = scripts[i].cloneNode(true);
    //             articleContainer.appendChild(clone);
    //         }
    //     });
    // }

    // Flag any elements in the selectorsToDelete list for removal
    if (selectorsToDelete) {
      selectorsToDelete.forEach((selector) => {
        simpleArticleIframe.querySelectorAll(selector).forEach((elem) => {
          elem.dataset.simpleDelete = true; // Flag it for removal later
        });
      });
    }

    // Remove the elements we flagged earlier
    simpleArticleIframe
      .querySelectorAll("[data-simple-delete]")
      .forEach((elem) => {
        elem.parentElement.removeChild(elem);
      });

    uiContainer.insertBefore(addGUI(), delModeBtn);

    // Add our listeners we need
    // The "X" button listener; exit if clicked
    simpleArticleIframe
      .querySelector(".simple-close")
      .addEventListener("click", closeOverlay);

    // The print button
    simpleArticleIframe
      .querySelector(".simple-print")
      .addEventListener("click", function () {
        simpleArticleIframe.defaultView.print();
      });

    // The share button
    simpleArticleIframe
      .querySelector(".simple-share")
      .addEventListener("click", getSavableLink);
    // The share dropdown
    shareDropdown = simpleArticleIframe.querySelector(".simple-share-dropdown");

    // The deletion mode button
    const sd = simpleArticleIframe.querySelector(".simple-delete");
    if (sd) {
      sd.onclick = function () {
        startDeleteElement(simpleArticleIframe);
      };
    }

    // The undo button
    undoBtn.addEventListener("click", popStack);

    // Add lightboxes
    lightboxes.forEach((elem) => {
      // Wrap our image in a link
      const imgId = uuidv4();
      const wrapper = document.createElement("a");
      wrapper.href = "#" + imgId;
      if (elem.parentElement) {
        elem.parentElement.insertBefore(wrapper, elem);
        wrapper.appendChild(elem);

        // Create the lightbox version of our image
        const lightbox = document.createElement("a");
        lightbox.href = "#_";
        lightbox.className = "jr-lightbox";
        lightbox.id = imgId;

        const lightboxImg = document.createElement("img");
        lightboxImg.src = elem.src;
        lightbox.appendChild(lightboxImg);
        simpleArticleIframe
          .querySelector(".simple-container")
          .appendChild(lightbox);
      }
    });

    simpleArticleIframe.onkeydown = function (e) {
      // Listen for the "Esc" key and exit if so
      if (
        e.key === "Escape" &&
        !simpleArticleIframe.body.classList.contains("simple-deleting") &&
        document.hasFocus()
      )
        closeOverlay();

      // Listen for CTRL/CMD + SHIFT + ; and allow node deletion if so
      if (e.key === ";" && (e.ctrlKey || e.metaKey) && e.shiftKey)
        startDeleteElement(simpleArticleIframe);

      // Listen for CTRL/CMD + P and do our print function if so
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        simpleArticleIframe.defaultView.print();
        e.preventDefault();
      }

      // Listen for CTRL/CMD + Z for our undo function
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        popStack();
      }

      // Listen for CTRL/CMD + F or F3
      if (e.key === "F3" || ((e.ctrlKey || e.metaKey) && e.key === "f")) {
        find.classList.add("active");
        findInput.focus();
        e.preventDefault();
      }

      // Listen for editor shortcuts
      if (editorShortcutsEnabled) {
        // CTRL/CMD + B
        if ((e.ctrlKey || e.metaKey) && e.key === "b") {
          bolden();
        }

        // CTRL/CMD + I
        if ((e.ctrlKey || e.metaKey) && e.key === "i") {
          italicize();
        }

        // CTRL + U
        if ((e.ctrlKey || e.metaKey) && e.key === "u") {
          underline();
          e.preventDefault();
        }

        // CTRL/CMD + SHIFT + S
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "s") {
          strikeThrough();
          e.preventDefault();
        }

        // CTRL/CMD + SHIFT + D
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "d") {
          deleteSelection();
          e.preventDefault();
        }

        // CTRL/CMD + SHIFT + C
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "c") {
          colorSelectedText(lastFontColor);
          e.preventDefault();
        }

        // CTRL/CMD + SHIFT + H
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "h") {
          highlightSelectedText(lastHighlightColor);
          e.preventDefault();
        }

        // CTRL/CMD + \
        if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
          removeHighlightFromSelectedText();
          e.preventDefault();
        }
      }
    };

    // Size our YouTube containers appropriately
    const youtubeFrames = simpleArticleIframe.querySelectorAll(
      "iframe[src *= 'youtube.com/embed/']"
    );
    youtubeFrames.forEach((frame) =>
      frame.parentElement.classList.add("youtubeContainer")
    );

    simpleArticleIframe.addEventListener("mouseup", handleEnd);
    simpleArticleIframe.addEventListener("touchend", handleEnd);
    simpleArticleIframe.addEventListener("mousemove", handleMouseMove);

    setTimeout(() => checkBreakpoints(), 10);

    finishLoading();
  }

  // Fix a bug in FF
  if (navigator.userAgent.toLowerCase().indexOf("firefox") > -1) {
    setTimeout(doStuff, 100);
  } else {
    doStuff();
  }
}

// Loads the styles after the xhr request finishes
let theme, styleElem;
function continueLoading() {
  // Create a style tag and place our styles in there from localStorage
  styleElem = document.createElement("style");

  if (typeof chromeStorage["jrHasBeenNotifiedOfSummarizer"] !== "undefined") {
    hasBeenNotifiedOfSummarizer = true;
  }

  // Get how many times the user has opened Just Read
  if (typeof chromeStorage["jrOpenCount"] === "undefined") {
    chrome.storage.sync.set({ jrOpenCount: 0 });
    jrOpenCount = 0;
  } else {
    jrOpenCount = chromeStorage["jrOpenCount"];
    chrome.storage.sync.set({ jrOpenCount: jrOpenCount + 1 });
  }

  if (typeof chromeStorage["jrHasBeenAskedForReview100"] !== "undefined") {
    hasBeenAskedForReview100 = true;
  }
  if (typeof chromeStorage["jrHasBeenAskedForReview1000"] !== "undefined") {
    hasBeenAskedForReview1000 = true;
  }
  if (typeof chromeStorage["jrHasBeenAskedForReview10000"] !== "undefined") {
    hasBeenAskedForReview10000 = true;
  }

  // Get current theme
  if (chromeStorage["currentTheme"]) {
    theme = chromeStorage["currentTheme"];
  } else {
    chrome.storage.sync.set({ currentTheme: "default-styles.css" });
    theme = "default-styles.css";
  }
  styleElem.appendChild(document.createTextNode(stylesheetObj[theme]));

  // Create our version of the article
  getDomainSelectors();
}

function fadeIn() {
  if (simpleArticleIframe.styleSheets.length > 2) {
    simpleArticle.classList.remove("no-trans");
    simpleArticle.classList.remove("simple-fade-up");

    // Remove contents of original page to make page more performant
    if (removeOrigContent) {
      simpleArticle.addEventListener(
        "transitionend",
        (e) => {
          [...document.body.children].forEach((child) =>
            child !== simpleArticle ? document.body.removeChild(child) : null
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
  if (simpleArticleIframe.readyState === "complete") {
    cb();
    return;
  }

  simpleArticleIframe.defaultView.addEventListener("load", cb);
}

function finishLoading() {
  // Add functionality for back button to close JR
  if (document.referrer !== window.location.href) {
    const url = new URL(window.location);
    window.history.pushState({}, "", url);
  }
  window.addEventListener("popstate", closeOverlay);

  // Add our required stylesheet for the articlž
  if (!simpleArticleIframe.head.querySelector(".required-styles"))
    addStylesheet(
      simpleArticleIframe,
      "required-styles.css",
      "required-styles"
    );

  // Add the segments hider if needed
  if (
    (chromeStorage["hideSegments"] &&
      !simpleArticleIframe.head.querySelector(".hide-segments")) ||
    typeof chromeStorage["hideSegments"] === "undefined"
  ) {
    hideSegments = true;
    addStylesheet(simpleArticleIframe, "hide-segments.css", "hide-segments");
  }

  // Change the top most page when regular links are clicked
  for (let i = 0, l = simpleArticleIframe.links.length; i < l; i++) {
    simpleArticleIframe.links[i].onclick = linkListener;
  }

  // Navigate to the element specified by the URL # if it exists
  if (top.window.location.hash != null) {
    setTimeout(function () {
      simpleArticleIframe.location.hash = top.window.location.hash;
    }, 10);
  }

  // Append our theme styles to the overlay
  simpleArticleIframe.head.appendChild(styleElem);

  onSimpleArticleIframeLoaded(() => {
    chrome.runtime.sendMessage({ tabOpenedJR: window.location });
    fadeIn();
  });

  // Apply the gradient text if the user has the option enabled
  if (chromeStorage["gradient-text"]) {
    if (chromeStorage["gradient-colors"])
      gradientText(chromeStorage["gradient-colors"]);
    else gradientText(["black", "blue", "black", "red"]);
  }

  // Apply the auto-scroll if necessary
  if (chromeStorage["autoscroll"]) {
    if (chromeStorage["scroll-speed"])
      scrollSpeed = chromeStorage["scroll-speed"];

    simpleArticleIframe.body.appendChild(getScrollSpeedInput());
    simpleArticleIframe.body.appendChild(getPauseScrollBtn());

    lastTime = Date.now();
    scrollPage();
  }

  // Add the article scrollbar if necessary
  if (chromeStorage["scrollbar"]) {
    initScrollbar();
  }

  // Attempt to mute the elements on the original page
  mutePage();

  // Initiate JRP's find functionality
  if (
    typeof chromeStorage["findbar"] === "undefined" ||
    chromeStorage["findbar"]
  ) {
    initFindBar();
  }
}

/////////////////////////////////////
// Handle the stylesheet syncing
/////////////////////////////////////
const stylesheetObj = {},
  stylesheetVersion = 4.6; // THIS NUMBER MUST BE UPDATED FOR THE STYLESHEETS TO KNOW TO UPDATE

function launch() {
  // Detect past overlay - don't show another
  if (document.getElementById("simple-article") == null) {
    // Check to see if the user wants to select the text
    if (typeof useText !== "undefined" && useText) {
      // Start the process of the user selecting text to read
      startSelectElement(document);
    } else {
      // Add the stylesheet for the container
      if (!document.head.querySelector(".page-styles"))
        addStylesheet(document, "page.css", "page-styles");

      // Check to see if the user wants to hide the content while loading
      if (typeof runOnLoad !== "undefined" && runOnLoad) {
        window.onload = checkPremium();
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

})();
