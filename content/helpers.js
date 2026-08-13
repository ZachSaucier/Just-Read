// Add :scope functionality to QS & QSA
(function (doc, proto) {
  try {
    // Check if browser supports :scope natively
    doc.querySelector(":scope body");
  } catch (err) {
    // Polyfill native methods if it doesn't
    ["querySelector", "querySelectorAll"].forEach(function (method) {
      const nativeMethod = proto[method];
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
          return nativeMethod.call(this, selectors); // Use native code for other selectors
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

function convertCssVariableToReadableValue(color) {
  if (color.toLowerCase().indexOf('var(') !== -1) {
    const regExp = /\(([^)]+)\)/;
    const cssVar = regExp.exec(color)[1];
    const computedStyles = getComputedStyle(document.getElementById("simple-article").contentWindow.document.body);
    return computedStyles.getPropertyValue(cssVar);
  }
  return color;
}

// Given a chrome storage object add them to our local stylsheet obj
function getStylesFromStorage(storage) {
  for (let key in storage) {
    if (key.substring(0, 3) === "jr-") {
      // Get stylesheets in the new format
      JR.stylesheetObj[key.substring(3)] = storage[key];
    }
  }
}

// Set the chrome storage based on our stylesheet object
function setStylesOfStorage() {
  for (let stylesheet in JR.stylesheetObj) {
    const obj = {};
    obj["jr-" + stylesheet] = JR.stylesheetObj[stylesheet];
    chrome.storage.sync.set(obj);
  }
}

// From https://stackoverflow.com/a/14824756/2065702
function isRTL(s) {
  const ltrChars =
      "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF" +
      "\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF",
    rtlChars = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC",
    rtlDirCheck = new RegExp("^[^" + ltrChars + "]*[" + rtlChars + "]");

  return rtlDirCheck.test(s);
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
    JR.simpleArticleIframe
      .querySelector(".simple-article-container")
      .contains(elem)
  )
    return true;
  else return false;
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
