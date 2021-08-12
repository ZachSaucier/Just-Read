(function () {

const jrDomain = "https://justread.link/";
let isPremium = false;
let jrSecret;
let jrOpenCount;


/////////////////////////////////////
// Generic helper functions
/////////////////////////////////////


// Add :scope functionality to QS & QSA
(function(doc, proto) {
  try { // Check if browser supports :scope natively
    doc.querySelector(':scope body');
  } catch (err) { // Polyfill native methods if it doesn't
    ['querySelector', 'querySelectorAll'].forEach(function(method) {
      const nativ = proto[method];
      proto[method] = function(selectors) {
        if (/(^|,)\s*:scope/.test(selectors)) { // Only if selectors contains :scope
          const id = this.id; // Remember current element id
          this.id = 'ID_' + Date.now(); // Assign new unique id
          selectors = selectors.replace(/((^|,)\s*):scope/g, '$1#' + this.id); // Replace :scope with #ID
          const result = doc[method](selectors);
          this.id = id; // Restore previous id
          return result;
        } else {
          return nativ.call(this, selectors); // Use native code for other selectors
        }
      }
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
    document.querySelectorAll("video").forEach(video => muteMe(video));
    document.querySelectorAll("audio").forEach(audio => muteMe(audio));
}

// Generate a random UUID (string)
// Example: 9ae68c40-0431-4031-afa0-3016ae50ad5d
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

function stylesheetToString(s) {
    let text = "";
    Array.from(s.cssRules).forEach(rule => text += rule.cssText);
    return text;
}

// Select text from highlight functionality
function getSelectionHtml() {
    let html = "";
    const sel = window.getSelection();
    if (sel.rangeCount) {
        const container = document.createElement("div");
        for (let i = 0, len = sel.rangeCount; i < len; ++i) {
            container.appendChild(sel.getRangeAt(i).cloneContents());
        }
        html = container.innerHTML;
    }
    return html;
}

// Use the highlighted text if started from that
let pageSelectedContainer;
if(typeof textToRead !== "undefined" && textToRead) {
    pageSelectedContainer = document.createElement("div");
    pageSelectedContainer.className = "highlighted-html";
    pageSelectedContainer.innerHTML = getSelectionHtml();
}


/////////////////////////////////////
// State functions
/////////////////////////////////////

// User-selected text functionality
let last,
    userSelected;
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
    clickFunc = function(e) {
        userSelected = e.target;

        exitFunc();
    },
    escFunc = function(e) {
        // Listen for the "Esc" key and exit if so
        if(e.keyCode === 27)
            exitFunc();
    },
    exitFunc = function() {
        doc.removeEventListener('mouseover', mouseFunc);
        doc.removeEventListener('click', clickFunc);
        doc.removeEventListener('keydown', escFunc);

        if(doc.querySelector(".jr-hovered") != null)
            doc.querySelector(".jr-hovered").classList.remove("jr-hovered");

        if(doc.getElementById("tempStyle") != null)
            doc.getElementById("tempStyle").parentElement.removeChild(doc.getElementById("tempStyle"));

        launch();
    };

    doc.addEventListener('mouseover', mouseFunc);
    doc.addEventListener('click', clickFunc);
    doc.addEventListener('keydown', escFunc);

    doc.documentElement.focus();

    // Add our styles temporarily
    const tempStyle = doc.createElement("style");
    tempStyle.id = "temp-style";
    tempStyle.innerText = ".jr-hovered, .jr-hovered * { cursor: pointer !important; color: black !important; background-color: #2095f2 !important; }";

    doc.head.appendChild(tempStyle);

    // Make the next part wait until a user has selected an element to use
    useText = false;
}

// Similar to ^^ but for deletion once the article is open
function startDeleteElement(doc) {
    const mouseFunc = function (e) {
        const elem = e.target;

        if(!elem.classList.contains("simple-container")
        && !elem.classList.contains("simple-ui-container")
        && !elem.classList.contains("simple-control")
        && !elem.classList.contains("simple-add-comment")
        && !elem.classList.contains("simple-comments")
        && !elem.classList.contains("simple-edit")
        && !elem.classList.contains("simple-find")
        && (elem.parentElement && elem.parentElement.classList && !(
            elem.parentElement.classList.contains("simple-add-comment")
            || elem.parentElement.classList.contains("simple-control")
            || elem.parentElement.classList.contains("simple-find")
        ))
        && doc.body != elem
        && doc.documentElement != elem
        && elem.tagName !== "path"
        && elem.tagName !== "rect"
        && elem.tagName !== "polygon"
        && elem.tagName !== "PROGRESS") {
            if (last != elem) {
                if (last != null) {
                    last.classList.remove("jr-hovered");
                }

                last = elem;
                elem.classList.add("jr-hovered");
            }
        }
    },
    clickFunc = function(e) {
        selected = e.target;

        if(!selected.classList.contains("simple-container")
        && !selected.classList.contains("simple-ui-container")
        && !selected.classList.contains("simple-control")
        && !selected.classList.contains("simple-add-comment")
        && !selected.classList.contains("simple-comments")
        && !selected.classList.contains("simple-edit")
        && !selected.classList.contains("simple-find")
        && (selected.parentElement.classList && !(
            selected.parentElement.classList.contains("simple-add-comment")
            || selected.parentElement.classList.contains("simple-control")
            || selected.parentElement.classList.contains("simple-find")
        ))
        && doc.body != selected
        && doc.documentElement != selected
        && selected.tagName !== "path"
        && selected.tagName !== "rect"
        && selected.tagName !== "polygon"
        && selected.tagName !== "PROGRESS")
            actionWithStack("delete", selected);

        e.preventDefault();
    },
    escFunc = function(e) {
        // Listen for the "Esc" key and exit if so
        if(e.keyCode === 27)
            exitFunc();
    },
    exitFunc = function() {
        anchors.forEach(function(a) {
            a.removeEventListener("click", anchorFunc);
        });

        doc.removeEventListener('mouseover', mouseFunc);
        doc.removeEventListener('click', clickFunc);
        doc.removeEventListener('keydown', escFunc);

        [...iframes].forEach(elem => elem.style.pointerEvents = "auto");

        if(doc.querySelector(".jr-hovered") != null)
            doc.querySelector(".jr-hovered").classList.remove("jr-hovered");

        doc.body.classList.remove("simple-deleting");

        userSelected = null;

        sd.classList.remove("active");
        sd.onclick = function() {
            startDeleteElement(simpleArticleIframe);
        };
    },
    anchorFunc = function(e) {
        e.preventDefault();
    };

    const anchors = doc.querySelectorAll("a");
    anchors.forEach(function(a) {
        a.addEventListener("click", anchorFunc);
    });

    doc.body.classList.add("simple-deleting");

    doc.addEventListener('mouseover', mouseFunc);
    doc.addEventListener('click', clickFunc);
    doc.addEventListener('keydown', escFunc);

    const iframes = doc.querySelectorAll("iframe");
    [...iframes].forEach(elem => elem.style.pointerEvents = "none");

    const sd = simpleArticleIframe.querySelector(".simple-delete");

    sd.classList.add("active");
    sd.onclick = function() {
        exitFunc();
    };
}

const stack = [];
function actionWithStack(actionName, elem, startText) {
    hasSavedLink = false;
    shareDropdown.classList.remove("active");

    let actionObj;
    if(actionName === "delete") {
        elem.classList.remove("jr-hovered");

        let parent = elem.parentElement;

        actionObj = {
            "type": "delete",
            "index": Array.from(parent.children).indexOf(elem),
            "parent": parent,
            "elem": parent.removeChild(elem)
        };

    } else if(actionName === "edit") {
        actionObj = {
            "type": "edit",
            "elem": elem,
            "text": startText
        };
    };

    if(actionName) {
        stack.push(actionObj);
        undoBtn.classList.add("shown");
    }

    updateSavedVersion();
    getMeasurements(); // Update the scrollbar sizing
}

function popStack() {
    let actionObj = stack.pop();

    if(actionObj && actionObj.type === "delete") {
        actionObj.parent.insertBefore(actionObj.elem, actionObj.parent.children[actionObj.index]);
    } else if(actionObj && actionObj.type === "edit") {
        actionObj.elem.innerText = actionObj.text;
    }

    updateSavedVersion();

    // If empty, hide undo button
    if(stack.length === 0) {
        undoBtn.classList.remove("shown");
    }

    getMeasurements(); // Update the scrollbar sizing
}

function updateSavedVersion() {
    if(chromeStorage["backup"]) {
        const data = {
            savedVersion: simpleArticleIframe.querySelector('.content-container').innerHTML
        };

        if(simpleArticleIframe.querySelector(".simple-comments").innerHTML !== "") {
            data.savedComments = simpleArticleIframe.querySelector(".simple-comments").innerHTML;
            data.savedCompactComments = simpleArticleIframe.querySelector(".simple-compact-comments").innerHTML;
        }
        chrome.runtime.sendMessage(data);
    }
}





/////////////////////////////////////
// Chrome storage functions
/////////////////////////////////////

// Given a chrome storage object add them to our local stylsheet obj
function getStylesFromStorage(storage) {
    for(let key in storage) {
        if(key.substring(0, 3) === "jr-") { // Get stylesheets in the new format
            stylesheetObj[key.substring(3)] = storage[key];
        }
    }
}

// Set the chrome storage based on our stylesheet object
function setStylesOfStorage() {
    for(let stylesheet in stylesheetObj) {
        const obj = {};
        obj['jr-' + stylesheet] = stylesheetObj[stylesheet];
        chrome.storage.sync.set(obj);
    }
}

// Remove a given element from chrome storage
function removeStyleFromStorage(stylesheet) {
    chrome.storage.sync.remove(stylesheet);
}




/////////////////////////////////////
// Extension-related helper functions
/////////////////////////////////////

// From https://stackoverflow.com/a/14824756/2065702
function isRTL(s) {
    const ltrChars  = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF'+'\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF',
        rtlChars    = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC',
        rtlDirCheck = new RegExp('^[^'+ltrChars+']*['+rtlChars+']');

    return rtlDirCheck.test(s);
};

function checkElemForDate(elem, attrList, deleteMe) {
    let myDate = false;
    
    if(elem && checkAgainstBlacklist(elem, 3)) {
        attrList.some(attr => {
            if(elem[attr]
            && elem[attr] != "" //  Make sure it's not empty
            && elem[attr].split(' ').length < 10) { // Make sure the date isn't absurdly long
                myDate = elem[attr];

                if(deleteMe) {
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
  } catch(e) {
    console.error("Invalid JSON schema");
    return null;
  }
}

function getArticleDate() {
    // Make sure that the pageSelectedContainer isn't empty
    if(pageSelectedContainer == null)
        pageSelectedContainer = document.body;

    // Check to see if there's a date class
    let date = false;

    if(dateSelector && document.querySelector(dateSelector)) {
        const elem = document.querySelector(dateSelector);
        date = elem.innerText;
        elem.dataset.simpleDelete = true; // Flag it for removal later
    }

    // Check schema first
    let jsonld;
    if(!date && pageSelectedContainer.querySelector('script[type="application/ld+json"]')) {
      jsonld = getJSONSchema(pageSelectedContainer.querySelector('script[type="application/ld+json"]').innerText);
    } else if(!date && document.querySelector('script[type="application/ld+json"]')) {
      jsonld = getJSONSchema(document.querySelector('script[type="application/ld+json"]').innerText);
    }

    if(!date && jsonld) {
      if(jsonld.dateModified) {
        date = jsonld.dateModified;
      } else if(jsonld.datePublished) {
        date = jsonld.datePublished;
      }
    }

    let toCheck = [];
    if(!date) {
        toCheck = [
            [pageSelectedContainer.querySelector('[itemprop="dateModified"]'), ['innerText'], true],
            [pageSelectedContainer.querySelector('[itemprop="datePublished"]'), ['innerText'], true],
            [pageSelectedContainer.querySelector('[class^="date"]'), ["innerText"], true],
            [pageSelectedContainer.querySelector('[class*="-date"]'), ["innerText"], true],
            [pageSelectedContainer.querySelector('[class*="_date"]'), ["innerText"], true],
            [document.body.querySelector('[itemprop="dateModified"]'), ['innerText'], false],
            [document.body.querySelector('[itemprop="datePublished"]'), ['innerText'], false],
            [document.body.querySelector('[class^="date"]'), ["innerText"], false],
            [document.body.querySelector('[class*="-date"]'), ["innerText"], false],
            [document.body.querySelector('[class*="_date"]'), ["innerText"], false],
            [document.head.querySelector('meta[name^="date"]'), ["content"], false],
            [document.head.querySelector('meta[name*="-date"]'), ["content"], false],
            [pageSelectedContainer.querySelector('time'), ["datetime", "innerText"], true],
            [document.body.querySelector('time'), ["datetime", "innerText"], false],
            [pageSelectedContainer.querySelector('[class *= "time"]'), ["datetime", "innerText"], true],
            [document.body.querySelector('[class *= "time"]'), ["datetime", "innerText"], false]
        ];
    }


    toCheck.some(checkObj => {
        if(!date && checkObj[0]) {
            date = checkElemForDate(checkObj[0], checkObj[1], checkObj[2]);
            if(date) return true;
        }
    });

    if(date) {
        return date.replace(/on\s/gi, '').replace(/(?:\r\n|\r|\n)/gi, '&nbsp;').replace(/[<]br[^>]*[>]/gi,'&nbsp;'); // Replace <br>, \n, and "on"
    }

    return "Unknown date";
}

function getArticleTitle() {
    // Get the page's title
    let title;

    if(titleSelector && document.querySelector(titleSelector)) {
        const elem = document.querySelector(titleSelector);
        title = elem.innerText;
        elem.dataset.simpleDelete = true; // Flag it for removal later
    } else if(document.head.querySelector("title")) {
        title = document.head.querySelector("title").innerText;

        // Get the part before the first — if it exists
        if(title.indexOf(' — ') > 0) {
            return title.substr(0, title.indexOf(' — '));
        }

        // Get the part before the first – if it exists
        if(title.indexOf(' – ') > 0) {
            return title.substr(0, title.indexOf(' – '));
        }

        // Get the part before the first - if it exists DIFFERENT THAN ABOVE CHARACTER
        if(title.indexOf(' - ') > 0) {
            return title.substr(0, title.indexOf(' - '));
        }

        // Get the part before the first | if it exists
        if(title.indexOf(' | ') > 0) {
            return title.substr(0, title.indexOf(' | '));
        }

        // Get the part before the first : if it exists
        if(title.indexOf(' : ') > 0) {
            return title.substr(0, title.indexOf(' : '));
        }
    } else {
        title = "Unknown title";
    }

    return title;
}

function getArticleAuthor() {
    // Make sure that the pageSelectedContainer isn't empty
    if(pageSelectedContainer == null)
        pageSelectedContainer = document.body;

    let author = null;

    let elem;
    if(authorSelector && document.querySelector(authorSelector)) {
        elem = document.querySelector(authorSelector);
        author = elem.innerText;
        elem.dataset.simpleDelete = true; // Flag it for removal later
    }

    // Check schema first
    let jsonld;
    if(pageSelectedContainer.querySelector('script[type="application/ld+json"]')) {
      jsonld = getJSONSchema(pageSelectedContainer.querySelector('script[type="application/ld+json"]').innerText);
    } else if(document.querySelector('script[type="application/ld+json"]')) {
      jsonld = getJSONSchema(document.querySelector('script[type="application/ld+json"]').innerText);
    }

    if(author === null && jsonld) {
      if(jsonld.author) {
        if(typeof jsonld.author === "string") {
          author = jsonld.author;
        } else if(typeof jsonld.author.name === "string") {
          author = jsonld.author.name;
        }
      }
    }

    // Check to see if there's an author itemprop in the article
    elem = pageSelectedContainer.querySelector('[itemprop="author"]');
    if(author === null && elem) {
        if(elem.innerText.split(/\s+/).length < 5 && elem.innerText.replace(/\s/g,'') !== "") {
            elem.dataset.simpleDelete = true; // Flag it for removal later
            author = elem.innerText;
        }
    }

    // Check to see if there's an author itemprop in the page
    elem = document.body.querySelector('[itemprop="author"]');
    if(author === null && elem) {
        if(elem.innerText.split(/\s+/).length < 5 && elem.innerText.replace(/\s/g,'') !== "") {
            author = elem.innerText;
        }
    }

    // Check to see if there's an author rel in the article
    elem = pageSelectedContainer.querySelector('[rel*="author"]');
    if(author === null && elem) {
        if(elem.innerText.split(/\s+/).length < 5 && elem.innerText.replace(/\s/g,'') !== "") {
            elem.dataset.simpleDelete = true; // Flag it for removal later
            author = elem.innerText;
        }
    }

    // Check to see if there's an author class
    elem = pageSelectedContainer.querySelector('[class*="author"]');
    if(author === null && elem && checkAgainstBlacklist(elem, 3)) {
        if(elem.innerText.split(/\s+/).length < 5 && elem.innerText.replace(/\s/g,'') !== "") {
            elem.dataset.simpleDelete = true; // Flag it for removal later
            author = elem.innerText;
        }
    }

    elem = document.head.querySelector('meta[name*="author"]');
    // Check to see if there is an author available in the meta, if so get it
    if(author === null && elem)
        author = elem.getAttribute("content");

    // Check to see if there's an author rel in the body
    elem = document.body.querySelectorAll('[rel*="author"]');
    elem.forEach(e => {
        if(author === null && e) {
            if(e.innerText.split(/\s+/).length < 5 && e.innerText.replace(/\s/g,'') !== "") {
                author = e.innerText;
            }
        }
    });

    elem = document.body.querySelector('[class*="author"]');
    if(author === null && elem && checkAgainstBlacklist(elem, 3)) {
        if(elem.innerText.split(/\s+/).length < 6 && elem.innerText.replace(/\s/g,'') !== "") {
            author = elem.innerText;
        }
    }

    if(author !== null && author) {
        // If it's all caps, try to properly capitalize it
        if(author === author.toUpperCase()) {
            const words = author.split(" "),
                  wordsLength = words.length;
            for(let i = 0; i < wordsLength; i++) {
                if(words[i].length < 3 && i != 0 && i != wordsLength)
                    words[i] = words[i].toLowerCase(); // Assume it's something like "de", "da", "van" etc.
                else
                    words[i] = words[i].charAt(0).toUpperCase() + words[i].substr(1).toLowerCase();
            }
            author = words.join(' ');
        }
        return author.replace(/by\s/ig, ''); // Replace "by"
    }

    return "Unknown author";
}

// Remove what we added (besides styles)
function closeOverlay() {
    // Refresh the page if the content has been removed
    if(removeOrigContent) {
        location.reload();
    }

    // Remove the GUI if it is open
    if(datGUI) {
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
    textToRead = null;
    simpleArticleIframe = undefined;
    editBar = undefined;

    setTimeout(function() {
        // Enable scroll
        document.documentElement.classList.remove("simple-no-scroll");

        // Update our background script
        chrome.runtime.sendMessage({lastClosed: Date.now()});

        // Remove our overlay
        simpleArticle.parentElement.removeChild(simpleArticle);
        simpleArticle = undefined;
    }, 100); // Make sure we can animate it
}

function getContainer() {
    let selectedContainer;

    if(contentSelector && document.querySelector(contentSelector)) {
        selectedContainer = document.querySelector(contentSelector);
    } else {
        const numWordsOnPage = document.body.innerText.match(/\S+/g).length;
        let ps = document.body.querySelectorAll("p");

        // Find the paragraphs with the most words in it
        let pWithMostWords = document.body,
            highestWordCount = 0;

        if(ps.length === 0) {
            ps = document.body.querySelectorAll("div");
        }

        ps.forEach(p => {
            if(checkAgainstBlacklist(p, 3) // Make sure it's not in our blacklist
            && p.offsetHeight !== 0) { //  Make sure it's visible on the regular page
                const myInnerText = p.innerText.match(/\S+/g);
                if(myInnerText) {
                    const wordCount = myInnerText.length;
                    if(wordCount > highestWordCount) {
                        highestWordCount = wordCount;
                        pWithMostWords = p;
                    }
                }
            }

            // Remove elements in JR that were hidden on the original page
            if(p.offsetHeight === 0) {
                p.dataset.simpleDelete = true;
            }
        });

        // Keep selecting more generally until over 2/5th of the words on the page have been selected
        selectedContainer = pWithMostWords;
        let wordCountSelected = highestWordCount;

        while(wordCountSelected / numWordsOnPage < 0.4
        && selectedContainer != document.body
        && selectedContainer.parentElement.innerText) {
            selectedContainer = selectedContainer.parentElement;
            wordCountSelected = selectedContainer.innerText.match(/\S+/g).length;
        }

        // Make sure a single p tag is not selected
        if(selectedContainer.tagName === "P") {
            selectedContainer = selectedContainer.parentElement;
        }
    }

    return selectedContainer;
}


// Handle link clicks
function linkListener(e) {
    if(!simpleArticleIframe.body.classList.contains("simple-deleting")) {
        // Don't change the top most if it's not in the current window
        if(e.ctrlKey
        || e.shiftKey
        || e.metaKey
        || (e.button && e.button == 1)
        || this.target === "about:blank"
        || this.target === "_blank") {
            return; // Do nothing
        }

        // Don't change the top most if it's referencing an anchor in the article
        const hrefArr = this.href.split("#");

        if(hrefArr.length < 2 // No anchor
        || (hrefArr[0] !== top.window.location.href.split("#")[0] // Anchored to an ID on another page
            && hrefArr[0] !== "about:blank"
            && hrefArr[0] !== "_blank")
        || (simpleArticleIframe.getElementById(hrefArr[1]) == null // The element is not in the article section
            && simpleArticleIframe.querySelector("a[name='" + hrefArr[1] + "']") == null)
        && hrefArr[1] !== "_"
        )  {
            top.window.location.href = this.href; // Regular link
        } else { // Anchored to an element in the article
            e.preventDefault();
            e.stopPropagation();

            if(hrefArr[1].startsWith("jr-") ) {
                simpleArticleIframe.getElementById(hrefArr[1]).scrollIntoView(true);
                let backArrow = simpleArticleIframe.querySelector(this.id + " .back-to-ref");
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
    if(elem && elem != null) {
        const className = elem.className,
              id = elem.id;

        const isBlackListed = blacklist.map(item => {
            if((typeof className === "string" && className.indexOf(item) >= 0)
            || (typeof id === "string" && id.indexOf(item) >= 0)
            ) {
                return true;
            }
        }).filter(item => item)[0];

        if(isBlackListed) {
            return null;
        }

        const parent = elem.parentElement;
        if(level > 0 && parent && !parent.isSameNode(document.body)) {
            return checkAgainstBlacklist(parent, --level);
        }
    }

    return elem;
}

// See if an element is part of the selectable content
function isContentElem(elem) {
    if(simpleArticleIframe.querySelector(".simple-article-container").contains(elem))
        return true;
    else
        return false;
}



/////////////////////////////////////
// Extension-related adder functions
/////////////////////////////////////

// Get theme's CSS sheets from storage
let chromeStorage;
function getStyles() {
    // Check to see if the stylesheets are already in Chrome storage
    chrome.storage.sync.get(null, function (result) {
        chromeStorage = result;

        // Check if premium
        if(chromeStorage.jrSecret
        // Limit API calls on open to just 1 per day
        && (typeof chromeStorage.jrLastChecked === "undefined" || chromeStorage.jrLastChecked === "" || Date.now() - chromeStorage.jrLastChecked > 86400000)
        ) {
            chrome.storage.sync.set({'jrLastChecked': Date.now()});

            jrSecret = chromeStorage.jrSecret;
            fetch(jrDomain + "checkPremium", {
                mode: 'cors',
                method: 'POST',
                headers: { "Content-type": "application/json; charset=UTF-8" },
                body: JSON.stringify({
                    'jrSecret': jrSecret
                })
            })
            .then(function(response) {
                if (!response.ok) throw response;
                else return response.text();
            })
            .then(response => {
                isPremium = response === "true";
                chrome.storage.sync.set({'isPremium': isPremium});
                afterPremium();
            })
            .catch((err) => console.error(`Fetch Error =\n`, err));
        } else {
            isPremium = chromeStorage.isPremium ? chromeStorage.isPremium : false;
            jrSecret = chromeStorage.jrSecret ? chromeStorage.jrSecret : false;
            afterPremium();
        }
    });
}

function afterPremium() {
    // Collect all of our stylesheets in our object
    getStylesFromStorage(chromeStorage);

    // Check to see if the default stylesheet needs to be updated
    let needsUpdate = false;
    let versionResult = chromeStorage['stylesheet-version'];

    // If the user has a version of the stylesheets and it is less than the current one, update it
    if(typeof versionResult === "undefined"
    || versionResult < stylesheetVersion) {
        chrome.storage.sync.set({'stylesheet-version': stylesheetVersion});

        needsUpdate = true;
    }

    if(isEmpty(stylesheetObj) // Not found, so we add our default
    || needsUpdate) { // Update the default stylesheet if it's on a previous version

        // Open the default CSS file and save it to our object
        let xhr = new XMLHttpRequest();
        xhr.open('GET', chrome.extension.getURL('default-styles.css'), true);
        xhr.onreadystatechange = function() {
            if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
                // Save the file's contents to our object
                stylesheetObj["default-styles.css"] = xhr.responseText;

                // Save it to Chrome storage
                setStylesOfStorage();

                // Continue on loading the page
                continueLoading();
            }
        }
        xhr.send();

        let xhr2 = new XMLHttpRequest();
        xhr2.open('GET', chrome.extension.getURL('dark-styles.css'), true);
        xhr2.onreadystatechange = function() {
            if(xhr2.readyState == XMLHttpRequest.DONE && xhr2.status == 200) {
                // Save the file's contents to our object
                stylesheetObj["dark-styles.css"] =  xhr2.responseText;

                // Save it to Chrome storage
                setStylesOfStorage();
            }
        }
        xhr2.send();

        needsUpdate = false;

        return;
    }

    continueLoading();
}

// Add our styles to the page
function addStylesheet(doc, link, classN) {
    const path = chrome.extension.getURL(link),
          styleLink = document.createElement("link");

    styleLink.setAttribute("rel", "stylesheet");
    styleLink.setAttribute("type", "text/css");
    styleLink.setAttribute("href", path);

    if(classN)
        styleLink.className = classN;

    doc.head.appendChild(styleLink);
}

// Add the article author and date
function addArticleMeta() {
    const editSVG = '<svg class="simple-edit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="M422.953,176.019c0.549-0.48,1.09-0.975,1.612-1.498l21.772-21.772c12.883-12.883,12.883-33.771,0-46.654   l-40.434-40.434c-12.883-12.883-33.771-12.883-46.653,0l-21.772,21.772c-0.523,0.523-1.018,1.064-1.498,1.613L422.953,176.019z"></path><polygon fill="#020202" points="114.317,397.684 157.317,440.684 106.658,448.342 56,456 63.658,405.341 71.316,354.683  "></polygon><polygon fill="#020202" points="349.143,125.535 118.982,355.694 106.541,343.253 336.701,113.094 324.26,100.653 81.659,343.253    168.747,430.341 411.348,187.74  "></polygon></g></svg>';

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
    date.innerHTML = editSVG;
    let dateText = getArticleDate();
    if(dateText === "Unknown date") {
      metaContainer.classList.add("unknown-date");
    }
    dateContent.innerHTML = dateText;
    date.appendChild(dateContent);
    // Check to see if there is an author available in the meta, if so get it, otherwise say it's unknown
    author.innerHTML = editSVG;
    let authorText = getArticleAuthor();
    if(authorText === "Unknown author") {
      metaContainer.classList.add("unknown-author");
    }
    authorContent.innerHTML = authorText;
    author.appendChild(authorContent);
    // Check h1s for the title, otherwise say it's unknown
    title.innerHTML = editSVG;
    titleContent.innerText = getArticleTitle();
    title.appendChild(titleContent);

    metaContainer.appendChild(date);
    metaContainer.appendChild(author);
    if(chromeStorage['addTimeEstimate']) {
        let timeEstimate = document.createElement("div");
        timeEstimate.className = "simple-time-estimate";
        metaContainer.appendChild(timeEstimate);
    }
    if(chromeStorage['addOrigURL']) { // Add the original URL if necessary
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

    date.querySelector(".simple-edit").onclick = function() { editText(dateContent); };
    author.querySelector(".simple-edit").onclick = function() { editText(authorContent) };
    title.querySelector(".simple-edit").onclick = function() { editText(titleContent) };

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
    printButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M49,0H15v19H0v34h15v11h34V53h15V19H49V0z M17,2h30v17H17V2z M47,62H17V40h30V62z M62,21v30H49V38H15v13H2V21h13h34H62z"/><rect x="6" y="26" width="4" height="2"/><rect x="12" y="26" width="4" height="2"/><rect x="22" y="46" width="20" height="2"/><rect x="22" y="54" width="20" height="2"/></svg>Print';

    return printButton;
}

// Add the deletion mode button
function addDelModeButton() {
    let delModeButton = document.createElement("button");
    delModeButton.className = "simple-delete simple-control";
    delModeButton.title = "Start/end deletion mode";
    delModeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-255.5 -411.5 1648 1676"><path d="M1044.6,215.65v481.3c0,7.8-2.5,14.2-7.5,19.2s-11.399,7.5-19.199,7.5h-53.5c-7.801,0-14.2-2.5-19.2-7.5s-7.5-11.4-7.5-19.2v-481.3c0-7.8,2.5-14.2,7.5-19.2s11.399-7.5,19.2-7.5h53.5c7.8,0,14.199,2.5,19.199,7.5S1044.6,207.85,1044.6,215.65z M823.2,196.45c-5-5-11.4-7.5-19.2-7.5h-53.5c-7.8,0-14.2,2.5-19.2,7.5s-7.5,11.4-7.5,19.2v481.3c0,7.8,2.5,14.2,7.5,19.2s11.4,7.5,19.2,7.5H804c7.8,0,14.2-2.5,19.2-7.5s7.5-11.4,7.5-19.2v-481.3C830.7,207.85,828.2,201.45,823.2,196.45z M609.3,196.45c-5-5-11.399-7.5-19.2-7.5h-53.5c-7.8,0-14.199,2.5-19.199,7.5s-7.5,11.4-7.5,19.2v199.07c12.06,5.96,20.399,18.59,20.399,33.23v171.7c0,20.899,16.9,37.8,37.8,37.8c20.9,0,37.801-16.9,37.801-37.8v-109.9c0-10.31,4.18-19.66,10.899-26.37V215.65C616.8,207.85,614.3,201.45,609.3,196.45z M1365.4-51.65v53.5c0,7.8-2.5,14.2-7.5,19.2s-11.4,7.5-19.2,7.5h-80.2V820.65c0,46.199-13.1,86.199-39.3,119.899s-57.601,50.5-94.4,50.5H631.02c9.82-34.97,19.681-72.2,27.82-106.899h465.86c1.7,0,4.6-2.4,8.8-7.101s8.2-12.3,12.1-22.6c4-10.3,5.9-21.601,5.9-33.9v-792H402.9v575.37c-12.13-6.28-20.4-18.95-20.4-33.57v-171.6c0-20.3-16.2-36.9-36.1-36.9s-36.1,16.6-36.1,36.9v122.4c0,12.06-5.63,22.79-14.4,29.699V28.55h-80.2c-7.8,0-14.2-2.5-19.2-7.5S189,9.65,189,1.85v-53.5c0-7.8,2.5-14.2,7.5-19.2s11.4-7.5,19.2-7.5h258.2l58.5-139.5c8.399-20.6,23.399-38.2,45.1-52.6c21.7-14.5,43.7-21.7,66-21.7h267.4c22.3,0,44.3,7.2,66,21.7c21.699,14.5,36.8,32,45.1,52.6l58.5,139.5h258.2c7.8,0,14.2,2.5,19.2,7.5C1362.9-65.95,1365.4-59.45,1365.4-51.65z M964.4-78.45l-40.101-97.8c-3.899-5-8.6-8.1-14.2-9.2H645.2c-5.601,1.1-10.3,4.2-14.2,9.2l-40.9,97.8H964.4z"/><path d="M723.8,433.45c-20.41-22.19-49.569-36.1-81.899-36.1c-8.62,0-17.021,0.98-25.101,2.85c-6.54,1.51-12.859,3.61-18.899,6.25c-14.54-36.8-47.87-64.08-88-69.79c-5.131-0.73-10.371-1.11-15.7-1.11c-17.4,0-34,4.1-48.7,11.3c-9.75-18.77-24.56-34.45-42.6-45.14c-16.55-9.83-35.82-15.46-56.4-15.46c-12.6,0-24.8,2.2-36.1,6.1v-123.7c0-20.13-5.27-39.03-14.5-55.39c-19.19-34.02-55.5-57.01-97.1-57.01c-61.5,0-111.6,50.4-111.6,112.4v445.3l-80.4-92c-0.5-0.601-1.1-1.2-1.7-1.8c-21.1-21.101-49.2-32.9-79.1-33h-0.6c-29.8,0-57.8,11.5-78.7,32.5c-36.9,36.899-39,91.699-5.6,150.399c43.2,75.9,90.2,147.5,131.6,210.601c30.3,46.199,58.9,89.8,79.8,125.8c18.1,31.3,66.2,132.7,66.7,133.7c6.2,13.199,19.5,21.6,34.1,21.6h477.4c16.399,0,30.899-10.6,35.899-26.2c4.17-12.979,23.54-73.78,42.94-144.5c9.53-34.74,19.08-71.87,26.83-106.899C746.52,838.32,753.6,796.1,753.6,767.55v-257.7C753.6,480.39,742.29,453.52,723.8,433.45z M678.1,767.45c0,25.58-7.979,68.72-19.26,116.7c-8.14,34.699-18,71.93-27.82,106.899c-10.029,35.771-20,69.181-28.02,95.101H177.1c-15.6-32.601-45-93-59.3-117.7c-22-37.8-51.1-82.3-82-129.3c-40.8-62.2-87.1-132.7-129.1-206.5c-10.9-19.301-21-45.301-6.6-59.7c6.7-6.7,15.7-10.2,25.5-10.3c9.5,0,18.4,3.6,25.3,10.1l145.4,166.5c10.4,11.8,27,16,41.7,10.5s24.5-19.6,24.5-35.3v-545.8c0-20.3,16.2-36.9,36.1-36.9s36.1,16.6,36.1,36.9v352.5c0,20.899,16.9,37.8,37.8,37.8c8.84,0,16.96-3.03,23.4-8.101c8.77-6.909,14.4-17.64,14.4-29.699v-122.4c0-20.3,16.2-36.9,36.1-36.9s36.1,16.6,36.1,36.9v171.6c0,14.62,8.27,27.29,20.4,33.57c5.21,2.7,11.12,4.23,17.4,4.23c20.9,0,37.8-16.9,37.8-37.801V447.95c0-20.3,16.2-36.9,36.1-36.9c5.62,0,10.95,1.32,15.7,3.67c12.06,5.96,20.399,18.59,20.399,33.23v171.7c0,20.899,16.9,37.8,37.8,37.8c20.9,0,37.801-16.9,37.801-37.8v-109.9c0-10.31,4.18-19.66,10.899-26.37c6.5-6.51,15.41-10.53,25.2-10.53c19.9,0,36.1,16.5,36.1,36.9V767.45z"/></svg>';

    return delModeButton;
}

// Add the share button
function addShareButton() {
    let shareButton = document.createElement("a");
    shareButton.className = "premium-feature simple-share simple-control";
    shareButton.title = "Share article";
    shareButton.innerHTML = '<div class="simple-share-dropdown" onclick="window.getSelection().selectAllChildren(this);"></div><div class="simple-share-alert">You have too many shared articles - the limit is 100. Please remove some from <a href=\'https://justread.link/dashboard\'>your user page</a> before adding more.</div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 95.421 90.213"><path d="M6.301,90.211C2.818,90.209,0.002,87.394,0,83.913l0,0V18.394c0.002-3.481,2.818-6.297,6.301-6.299l0,0h33.782l-9.003,9H9  v60.117l57.469,0.002V69.125l9.002-9l-0.002,23.788c-0.003,3.479-2.818,6.296-6.3,6.3l0,0L6.301,90.211L6.301,90.211z"></path><path d="M66.171,11.301V0l29.25,29.25L66.046,58.625v-11.75c0,0-14.586-2.894-29.583,6.458  c-8.209,5.084-13.752,11.773-17.167,17.042c0,0,1.11-18.25,11.61-34.875C44.033,14.716,66.171,11.301,66.171,11.301z"></path><path fill="#000000" d="M225.3,90.211c-3.482-0.002-6.299-2.817-6.301-6.298l0,0V18.394c0.002-3.481,2.818-6.297,6.301-6.299l0,0  h33.783l-9.004,9H228v60.117l57.47,0.002V69.125l9.002-9l-0.002,23.788c-0.003,3.479-2.818,6.296-6.3,6.3l0,0L225.3,90.211  L225.3,90.211z"></path><path fill="#000000" d="M285.171,11.301V0l29.25,29.25l-29.375,29.375v-11.75c0,0-17.23-1.192-29.584,6.458  c-8.209,5.084-13.104,10.167-17.166,17.042c0,0,1.109-18.25,11.609-34.875C263.033,14.716,285.171,11.301,285.171,11.301z"></path></svg>';

    return shareButton;
}

// Add the undo button
function addUndoButton() {
    undoBtn = document.createElement("button");
    undoBtn.className = "simple-undo simple-control";
    undoBtn.title = "Undo last action";
    undoBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 438.536 438.536"><path d="m421.12 134.19c-11.608-27.03-27.217-50.347-46.819-69.949-19.606-19.603-42.922-35.209-69.953-46.822-27.028-11.613-55.384-17.415-85.078-17.415-27.978 0-55.052 5.277-81.227 15.843-26.169 10.564-49.438 25.457-69.805 44.683l-37.12-36.835c-5.711-5.901-12.275-7.232-19.701-3.999-7.615 3.24-11.422 8.857-11.422 16.85v127.91c0 4.948 1.809 9.231 5.426 12.847 3.619 3.617 7.902 5.426 12.85 5.426h127.91c7.996 0 13.61-3.807 16.846-11.421 3.234-7.423 1.903-13.988-3.999-19.701l-39.115-39.398c13.328-12.563 28.553-22.222 45.683-28.98 17.131-6.757 35.021-10.138 53.675-10.138 19.793 0 38.687 3.858 56.674 11.563 17.99 7.71 33.544 18.131 46.679 31.265 13.134 13.131 23.555 28.69 31.265 46.679 7.703 17.987 11.56 36.875 11.56 56.674 0 19.798-3.856 38.686-11.56 56.672-7.71 17.987-18.131 33.544-31.265 46.679-13.135 13.134-28.695 23.558-46.679 31.265-17.987 7.707-36.881 11.561-56.674 11.561-22.651 0-44.064-4.949-64.241-14.843-20.174-9.894-37.209-23.883-51.104-41.973-1.331-1.902-3.521-3.046-6.567-3.429-2.856 0-5.236 0.855-7.139 2.566l-39.114 39.402c-1.521 1.53-2.33 3.478-2.426 5.853-0.094 2.385 0.527 4.524 1.858 6.427 20.749 25.125 45.871 44.587 75.373 58.382 29.502 13.798 60.625 20.701 93.362 20.701 29.694 0 58.05-5.808 85.078-17.416 27.031-11.607 50.34-27.22 69.949-46.821 19.605-19.609 35.211-42.921 46.822-69.949s17.411-55.392 17.411-85.08c1e-3 -29.698-5.803-58.047-17.41-85.076z"/></svg>';

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
    bugAnchor.href = "https://github.com/ZachSaucier/Just-Read/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3Abug%20";
    bugAnchor.innerText = "Report an error";
    bugAnchor.target = "_blank";
    bugReporter.appendChild(bugAnchor);

    extContainer.appendChild(viewedUsing);
    extContainer.appendChild(bugReporter);

    return extContainer;
}

// Add edit meta functionality
function editText(elem) {
    if(!simpleArticleIframe.body.classList.contains("simple-deleting")) {
        let startText = elem.innerText;

        // Hide the item
        elem.style.display = "none";

        // Insert an input temporarily
        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.value = elem.innerText;

        // Update the element on blur
        textInput.onblur = function() {
            if(textInput.parentElement.contains(textInput)) {
                // Change the value
                elem.innerText = textInput.value;

                if(elem.innerText !== startText)
                    actionWithStack("edit", elem, startText);

                // Un-hide the elem
                elem.style.display = "block";

                // Remove the input
                textInput.parentElement.removeChild(textInput);
            }
        }

        // Allow enter to be used to save the edit
        textInput.onkeydown = function(e) {
            if(e.keyCode === 13)
                textInput.blur();
        }

        elem.parentElement.appendChild(textInput);

        textInput.focus();
    }
}

function addPremiumNofifier() {
    const notification = {
        textContent: "Have you considered <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>? With Premium you can annotate your articles, share them with others, and more!",
        url: "https://justread.link/#get-Just-Read",
        primaryText: "Learn more",
        secondaryText: "Maybe later",
    };
    simpleArticleIframe.body.appendChild(createNotification(notification));
}

function createNotification(options) {
    const oldNotification = simpleArticleIframe.querySelector(".jr-notifier");
    if(oldNotification) oldNotification.parentElement.removeChild(oldNotification);

    const notifier = document.createElement("div");
    notifier.className = "jr-tooltip jr-notifier";

    const notificationText = document.createElement("p");
    notificationText.innerHTML = options.textContent;

    const btnContainer = document.createElement("div");
    btnContainer.className = "right-align-buttons";

    const secondaryBtn = document.createElement("button");
    secondaryBtn.className = "jr-secondary";
    secondaryBtn.addEventListener("click", function() { this.parentElement.parentElement.parentElement.removeChild(this.parentElement.parentElement) }, { once: true });
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
let datGUI, s, usedGUI = false;
var dat=dat||{};dat.gui=dat.gui||{},dat.utils=dat.utils||{},dat.controllers=dat.controllers||{},dat.dom=dat.dom||{},dat.color=dat.color||{},dat.utils.css=function(){return{load:function(a,b){b=b||document;var c=b.createElement("link");c.type="text/css",c.rel="stylesheet",c.href=a,b.getElementsByTagName("head")[0].appendChild(c)},inject:function(a,b){b=b||document;var c=document.createElement("style");c.type="text/css",c.innerHTML=a,b.getElementsByTagName("head")[0].appendChild(c)}}}(),dat.utils.common=function(){var a=Array.prototype.forEach,b=Array.prototype.slice;return{BREAK:{},extend:function(a){return this.each(b.call(arguments,1),function(b){for(var c in b)this.isUndefined(b[c])||(a[c]=b[c])},this),a},defaults:function(a){return this.each(b.call(arguments,1),function(b){for(var c in b)this.isUndefined(a[c])&&(a[c]=b[c])},this),a},compose:function(){var a=b.call(arguments);return function(){for(var c=b.call(arguments),d=a.length-1;0<=d;d--)c=[a[d].apply(this,c)];return c[0]}},each:function(b,c,d){if(b)if(a&&b.forEach&&b.forEach===a)b.forEach(c,d);else if(b.length===b.length+0)for(var e=0,f=b.length;e<f&&!(e in b&&c.call(d,b[e],e)===this.BREAK);e++);else for(e in b)if(c.call(d,b[e],e)===this.BREAK)break},defer:function(a){setTimeout(a,0)},toArray:function(a){return a.toArray?a.toArray():b.call(a)},isUndefined:function(a){return void 0===a},isNull:function(a){return null===a},isNaN:function(a){return a!==a},isArray:Array.isArray||function(a){return a.constructor===Array},isObject:function(a){return a===Object(a)},isNumber:function(a){return a===a+0},isString:function(a){return a===a+""},isBoolean:function(a){return!1===a||!0===a},isFunction:function(a){return"[object Function]"===Object.prototype.toString.call(a)}}}(),dat.controllers.Controller=function(a){var b=function(a,b){this.initialValue=a[b],this.domElement=document.createElement("div"),this.object=a,this.property=b,this.__onFinishChange=this.__onChange=void 0};return a.extend(b.prototype,{onChange:function(a){return this.__onChange=a,this},onFinishChange:function(a){return this.__onFinishChange=a,this},setValue:function(a){return this.object[this.property]=a,this.__onChange&&this.__onChange.call(this,a),this.updateDisplay(),this},getValue:function(){return this.object[this.property]},updateDisplay:function(){return this},isModified:function(){return this.initialValue!==this.getValue()}}),b}(dat.utils.common),dat.dom.dom=function(a){function b(b){return"0"===b||a.isUndefined(b)?0:(b=b.match(d),a.isNull(b)?0:parseFloat(b[1]))}var c={};a.each({HTMLEvents:["change"],MouseEvents:["click","mousemove","mousedown","mouseup","mouseover"],KeyboardEvents:["keydown"]},function(b,d){a.each(b,function(a){c[a]=d})});var d=/(\d+(\.\d+)?)px/,e={makeSelectable:function(a,b){void 0!==a&&void 0!==a.style&&(a.onselectstart=b?function(){return!1}:function(){},a.style.MozUserSelect=b?"auto":"none",a.style.KhtmlUserSelect=b?"auto":"none",a.unselectable=b?"on":"off")},makeFullscreen:function(b,c,d){a.isUndefined(c)&&(c=!0),a.isUndefined(d)&&(d=!0),b.style.position="absolute",c&&(b.style.left=0,b.style.right=0),d&&(b.style.top=0,b.style.bottom=0)},fakeEvent:function(b,d,e,f){e=e||{};var g=c[d];if(!g)throw Error("Event type "+d+" not supported.");var h=document.createEvent(g);switch(g){case"MouseEvents":h.initMouseEvent(d,e.bubbles||!1,e.cancelable||!0,window,e.clickCount||1,0,0,e.x||e.clientX||0,e.y||e.clientY||0,!1,!1,!1,!1,0,null);break;case"KeyboardEvents":g=h.initKeyboardEvent||h.initKeyEvent,a.defaults(e,{cancelable:!0,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1,keyCode:void 0,charCode:void 0}),g(d,e.bubbles||!1,e.cancelable,window,e.ctrlKey,e.altKey,e.shiftKey,e.metaKey,e.keyCode,e.charCode);break;default:h.initEvent(d,e.bubbles||!1,e.cancelable||!0)}a.defaults(h,f),b.dispatchEvent(h)},bind:function(a,b,c,d){return a.addEventListener?a.addEventListener(b,c,d||!1):a.attachEvent&&a.attachEvent("on"+b,c),e},unbind:function(a,b,c,d){return a.removeEventListener?a.removeEventListener(b,c,d||!1):a.detachEvent&&a.detachEvent("on"+b,c),e},addClass:function(a,b){if(void 0===a.className)a.className=b;else if(a.className!==b){var c=a.className.split(/ +/);-1==c.indexOf(b)&&(c.push(b),a.className=c.join(" ").replace(/^\s+/,"").replace(/\s+$/,""))}return e},removeClass:function(a,b){if(b){if(void 0!==a.className)if(a.className===b)a.removeAttribute("class");else{var c=a.className.split(/ +/),d=c.indexOf(b);-1!=d&&(c.splice(d,1),a.className=c.join(" "))}}else a.className=void 0;return e},hasClass:function(a,b){return new RegExp("(?:^|\\s+)"+b+"(?:\\s+|$)").test(a.className)||!1},getWidth:function(a){return a=getComputedStyle(a),b(a["border-left-width"])+b(a["border-right-width"])+b(a["padding-left"])+b(a["padding-right"])+b(a.width)},getHeight:function(a){return a=getComputedStyle(a),b(a["border-top-width"])+b(a["border-bottom-width"])+b(a["padding-top"])+b(a["padding-bottom"])+b(a.height)},getOffset:function(a){var b={left:0,top:0};if(a.offsetParent)do b.left+=a.offsetLeft,b.top+=a.offsetTop;while(a=a.offsetParent);return b},isActive:function(a){return a===document.activeElement&&(a.type||a.href)}};return e}(dat.utils.common),dat.controllers.OptionController=function(a,b,c){var d=function(a,e,f){d.superclass.call(this,a,e);var g=this;if(this.__select=document.createElement("select"),c.isArray(f)){var h={};c.each(f,function(a){h[a]=a}),f=h}c.each(f,function(a,b){var c=document.createElement("option");c.innerHTML=b,c.setAttribute("value",a),g.__select.appendChild(c)}),this.updateDisplay(),b.bind(this.__select,"change",function(){g.setValue(this.options[this.selectedIndex].value)}),this.domElement.appendChild(this.__select)};return d.superclass=a,c.extend(d.prototype,a.prototype,{setValue:function(a){return a=d.superclass.prototype.setValue.call(this,a),this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue()),a},updateDisplay:function(){return this.__select.value=this.getValue(),d.superclass.prototype.updateDisplay.call(this)}}),d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.controllers.NumberController=function(a,b){function c(a){return a=a.toString(),-1<a.indexOf(".")?a.length-a.indexOf(".")-1:0}var d=function(a,e,f){d.superclass.call(this,a,e),f=f||{},this.__min=f.min,this.__max=f.max,this.__step=f.step,b.isUndefined(this.__step)?this.__impliedStep=0==this.initialValue?1:Math.pow(10,Math.floor(Math.log(Math.abs(this.initialValue))/Math.LN10))/10:this.__impliedStep=this.__step,this.__precision=c(this.__impliedStep)};return d.superclass=a,b.extend(d.prototype,a.prototype,{setValue:function(a){return void 0!==this.__min&&a<this.__min?a=this.__min:void 0!==this.__max&&a>this.__max&&(a=this.__max),void 0!==this.__step&&0!=a%this.__step&&(a=Math.round(a/this.__step)*this.__step),d.superclass.prototype.setValue.call(this,a)},min:function(a){return this.__min=a,this},max:function(a){return this.__max=a,this},step:function(a){return this.__impliedStep=this.__step=a,this.__precision=c(a),this}}),d}(dat.controllers.Controller,dat.utils.common),dat.controllers.NumberControllerBox=function(a,b,c){var d=function(a,e,f){function g(){var a=parseFloat(j.__input.value);c.isNaN(a)||j.setValue(a)}function h(a){var b=k-a.clientY;j.setValue(j.getValue()+b*j.__impliedStep),k=a.clientY}function i(){b.unbind(window,"mousemove",h),b.unbind(window,"mouseup",i)}this.__truncationSuspended=!1,d.superclass.call(this,a,e,f);var k,j=this;this.__input=document.createElement("input"),this.__input.setAttribute("type","text"),b.bind(this.__input,"change",g),b.bind(this.__input,"blur",function(){g(),j.__onFinishChange&&j.__onFinishChange.call(j,j.getValue())}),b.bind(this.__input,"mousedown",function(a){b.bind(window,"mousemove",h),b.bind(window,"mouseup",i),k=a.clientY}),b.bind(this.__input,"keydown",function(a){13===a.keyCode&&(j.__truncationSuspended=!0,this.blur(),j.__truncationSuspended=!1)}),this.updateDisplay(),this.domElement.appendChild(this.__input)};return d.superclass=a,c.extend(d.prototype,a.prototype,{updateDisplay:function(){var b,a=this.__input;if(this.__truncationSuspended)b=this.getValue();else{b=this.getValue();var c=Math.pow(10,this.__precision);b=Math.round(b*c)/c}return a.value=b,d.superclass.prototype.updateDisplay.call(this)}}),d}(dat.controllers.NumberController,dat.dom.dom,dat.utils.common),dat.controllers.NumberControllerSlider=function(a,b,c,d,e){function f(a,b,c,d,e){return d+(a-b)/(c-b)*(e-d)}var g=function(a,c,d,e,h){function i(a){a.preventDefault();var c=b.getOffset(k.__background),d=b.getWidth(k.__background);return k.setValue(f(a.clientX,c.left,c.left+d,k.__min,k.__max)),!1}function j(){b.unbind(window,"mousemove",i),b.unbind(window,"mouseup",j),k.__onFinishChange&&k.__onFinishChange.call(k,k.getValue())}g.superclass.call(this,a,c,{min:d,max:e,step:h});var k=this;this.__background=document.createElement("div"),this.__foreground=document.createElement("div"),b.bind(this.__background,"mousedown",function(a){b.bind(window,"mousemove",i),b.bind(window,"mouseup",j),i(a)}),b.addClass(this.__background,"slider"),b.addClass(this.__foreground,"slider-fg"),this.updateDisplay(),this.__background.appendChild(this.__foreground),this.domElement.appendChild(this.__background)};return g.superclass=a,g.useDefaultStyles=function(){c.inject(e)},d.extend(g.prototype,a.prototype,{updateDisplay:function(){var a=(this.getValue()-this.__min)/(this.__max-this.__min);return this.__foreground.style.width=100*a+"%",g.superclass.prototype.updateDisplay.call(this)}}),g}(dat.controllers.NumberController,dat.dom.dom,dat.utils.css,dat.utils.common,"/**\n * dat-gui JavaScript Controller Library\n * http://code.google.com/p/dat-gui\n *\n * Copyright 2011 Data Arts Team, Google Creative Lab\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n * http://www.apache.org/licenses/LICENSE-2.0\n */\n\n.slider {\n  box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);\n  height: 1em;\n  border-radius: 1em;\n  background-color: #eee;\n  padding: 0 0.5em;\n  overflow: hidden;\n}\n\n.slider-fg {\n  padding: 1px 0 2px 0;\n  background-color: #aaa;\n  height: 1em;\n  margin-left: -0.5em;\n  padding-right: 0.5em;\n  border-radius: 1em 0 0 1em;\n}\n\n.slider-fg:after {\n  display: inline-block;\n  border-radius: 1em;\n  background-color: #fff;\n  border:  1px solid #aaa;\n  content: '';\n  float: right;\n  margin-right: -1em;\n  margin-top: -1px;\n  height: 0.9em;\n  width: 0.9em;\n}"),dat.controllers.FunctionController=function(a,b,c){var d=function(a,c,e){d.superclass.call(this,a,c);var f=this;this.__button=document.createElement("div"),this.__button.innerHTML=void 0===e?"Fire":e,b.bind(this.__button,"click",function(a){return a.preventDefault(),f.fire(),!1}),b.addClass(this.__button,"button"),this.domElement.appendChild(this.__button)};return d.superclass=a,c.extend(d.prototype,a.prototype,{fire:function(){this.__onChange&&this.__onChange.call(this),this.getValue().call(this.object),this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue())}}),d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.controllers.BooleanController=function(a,b,c){var d=function(a,c){d.superclass.call(this,a,c);var e=this;this.__prev=this.getValue(),this.__checkbox=document.createElement("input"),this.__checkbox.setAttribute("type","checkbox"),b.bind(this.__checkbox,"change",function(){e.setValue(!e.__prev)},!1),this.domElement.appendChild(this.__checkbox),this.updateDisplay()};return d.superclass=a,c.extend(d.prototype,a.prototype,{setValue:function(a){return a=d.superclass.prototype.setValue.call(this,a),this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue()),this.__prev=this.getValue(),a},updateDisplay:function(){return!0===this.getValue()?(this.__checkbox.setAttribute("checked","checked"),this.__checkbox.checked=!0):this.__checkbox.checked=!1,d.superclass.prototype.updateDisplay.call(this)}}),d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.color.toString=function(a){return function(b){if(1==b.a||a.isUndefined(b.a)){for(b=b.hex.toString(16);6>b.length;)b="0"+b;return"#"+b}return"rgba("+Math.round(b.r)+","+Math.round(b.g)+","+Math.round(b.b)+","+b.a+")"}}(dat.utils.common),dat.color.interpret=function(a,b){var c,d,e=[{litmus:b.isString,conversions:{THREE_CHAR_HEX:{read:function(a){return a=a.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i),null!==a&&{space:"HEX",hex:parseInt("0x"+a[1].toString()+a[1].toString()+a[2].toString()+a[2].toString()+a[3].toString()+a[3].toString())}},write:a},SIX_CHAR_HEX:{read:function(a){return a=a.match(/^#([A-F0-9]{6})$/i),null!==a&&{space:"HEX",hex:parseInt("0x"+a[1].toString())}},write:a},CSS_RGB:{read:function(a){return a=a.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/),null!==a&&{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3])}},write:a},CSS_RGBA:{read:function(a){return a=a.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\,\s*(.+)\s*\)/),null!==a&&{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3]),a:parseFloat(a[4])}},write:a}}},{litmus:b.isNumber,conversions:{HEX:{read:function(a){return{space:"HEX",hex:a,conversionName:"HEX"}},write:function(a){return a.hex}}}},{litmus:b.isArray,conversions:{RGB_ARRAY:{read:function(a){return 3==a.length&&{space:"RGB",r:a[0],g:a[1],b:a[2]}},write:function(a){return[a.r,a.g,a.b]}},RGBA_ARRAY:{read:function(a){return 4==a.length&&{space:"RGB",r:a[0],g:a[1],b:a[2],a:a[3]}},write:function(a){return[a.r,a.g,a.b,a.a]}}}},{litmus:b.isObject,conversions:{RGBA_OBJ:{read:function(a){return!!(b.isNumber(a.r)&&b.isNumber(a.g)&&b.isNumber(a.b)&&b.isNumber(a.a))&&{space:"RGB",r:a.r,g:a.g,b:a.b,a:a.a}},write:function(a){return{r:a.r,g:a.g,b:a.b,a:a.a}}},RGB_OBJ:{read:function(a){return!!(b.isNumber(a.r)&&b.isNumber(a.g)&&b.isNumber(a.b))&&{space:"RGB",r:a.r,g:a.g,b:a.b}},write:function(a){return{r:a.r,g:a.g,b:a.b}}},HSVA_OBJ:{read:function(a){return!!(b.isNumber(a.h)&&b.isNumber(a.s)&&b.isNumber(a.v)&&b.isNumber(a.a))&&{space:"HSV",h:a.h,s:a.s,v:a.v,a:a.a}},write:function(a){return{h:a.h,s:a.s,v:a.v,a:a.a}}},HSV_OBJ:{read:function(a){return!!(b.isNumber(a.h)&&b.isNumber(a.s)&&b.isNumber(a.v))&&{space:"HSV",h:a.h,s:a.s,v:a.v}},write:function(a){return{h:a.h,s:a.s,v:a.v}}}}}];return function(){d=!1;var a=1<arguments.length?b.toArray(arguments):arguments[0];return b.each(e,function(e){if(e.litmus(a))return b.each(e.conversions,function(e,f){if(c=e.read(a),!1===d&&!1!==c)return d=c,c.conversionName=f,c.conversion=e,b.BREAK}),b.BREAK}),d}}(dat.color.toString,dat.utils.common),dat.GUI=dat.gui.GUI=function(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o){function p(a,b,c,f){if(void 0===b[c])throw Error("Object "+b+' has no property "'+c+'"');f.color?b=new k(b,c):(b=[b,c].concat(f.factoryArgs),b=d.apply(a,b)),f.before instanceof e&&(f.before=f.before.__li),s(a,b),n.addClass(b.domElement,"c"),c=document.createElement("span"),n.addClass(c,"property-name"),c.innerHTML=b.property;var g=document.createElement("div");return g.appendChild(c),g.appendChild(b.domElement),f=q(a,g,f.before),n.addClass(f,G.CLASS_CONTROLLER_ROW),n.addClass(f,typeof b.getValue()),r(a,f,b),a.__controllers.push(b),b}function q(a,b,c){var d=document.createElement("li");return b&&d.appendChild(b),c?a.__ul.insertBefore(d,params.before):a.__ul.appendChild(d),a.onResize(),d}function r(a,b,c){if(c.__li=b,c.__gui=a,o.extend(c,{options:function(b){return 1<arguments.length?(c.remove(),p(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[o.toArray(arguments)]})):o.isArray(b)||o.isObject(b)?(c.remove(),p(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[b]})):void 0},name:function(a){return c.__li.firstElementChild.firstElementChild.innerHTML=a,c},listen:function(){return c.__gui.listen(c),c},remove:function(){return c.__gui.remove(c),c}}),c instanceof i){var d=new h(c.object,c.property,{min:c.__min,max:c.__max,step:c.__step});o.each(["updateDisplay","onChange","onFinishChange"],function(a){var b=c[a],e=d[a];c[a]=d[a]=function(){var a=Array.prototype.slice.call(arguments);return b.apply(c,a),e.apply(d,a)}}),n.addClass(b,"has-slider"),c.domElement.insertBefore(d.domElement,c.domElement.firstElementChild)}else if(c instanceof h){var e=function(b){return o.isNumber(c.__min)&&o.isNumber(c.__max)?(c.remove(),p(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[c.__min,c.__max,c.__step]})):b};c.min=o.compose(e,c.min),c.max=o.compose(e,c.max)}else c instanceof f?(n.bind(b,"click",function(){n.fakeEvent(c.__checkbox,"click")}),n.bind(c.__checkbox,"click",function(a){a.stopPropagation()})):c instanceof g?(n.bind(b,"click",function(){n.fakeEvent(c.__button,"click")}),n.bind(b,"mouseover",function(){n.addClass(c.__button,"hover")}),n.bind(b,"mouseout",function(){n.removeClass(c.__button,"hover")})):c instanceof k&&(n.addClass(b,"color"),c.updateDisplay=o.compose(function(a){return b.style.borderLeftColor=c.__color.toString(),a},c.updateDisplay),c.updateDisplay());c.setValue=o.compose(function(b){return a.getRoot().__preset_select&&c.isModified()&&y(a.getRoot(),!0),b},c.setValue)}function s(a,b){var c=a.getRoot(),d=c.__rememberedObjects.indexOf(b.object);if(-1!=d){var e=c.__rememberedObjectIndecesToControllers[d];if(void 0===e&&(e={},c.__rememberedObjectIndecesToControllers[d]=e),e[b.property]=b,c.load&&c.load.remembered){if(c=c.load.remembered,c[a.preset])c=c[a.preset];else{if(!c.Default)return;c=c.Default}c[d]&&void 0!==c[d][b.property]&&(d=c[d][b.property],b.initialValue=d,b.setValue(d))}}}function t(a){var b=a.__save_row=document.createElement("li");n.addClass(a.domElement,"has-save"),a.__ul.insertBefore(b,a.__ul.firstChild),n.addClass(b,"save-row");var c=document.createElement("span");c.innerHTML="&nbsp;",n.addClass(c,"button gears");var d=document.createElement("span");d.innerHTML="Save",n.addClass(d,"button"),n.addClass(d,"save");var e=document.createElement("span");e.innerHTML="New",n.addClass(e,"button"),n.addClass(e,"save-as");var f=document.createElement("span");f.innerHTML="Revert",n.addClass(f,"button"),n.addClass(f,"revert");var g=a.__preset_select=document.createElement("select");if(a.load&&a.load.remembered?o.each(a.load.remembered,function(b,c){x(a,c,c==a.preset)}):x(a,"Default",!1),n.bind(g,"change",function(){for(var b=0;b<a.__preset_select.length;b++)a.__preset_select[b].innerHTML=a.__preset_select[b].value;a.preset=this.value}),b.appendChild(g),b.appendChild(c),b.appendChild(d),b.appendChild(e),b.appendChild(f),A){var h=function(){i.style.display=a.useLocalStorage?"block":"none"},b=document.getElementById("dg-save-locally"),i=document.getElementById("dg-local-explain");b.style.display="block",b=document.getElementById("dg-local-storage"),"true"===localStorage.getItem(document.location.href+".isLocal")&&b.setAttribute("checked","checked"),h(),n.bind(b,"change",function(){a.useLocalStorage=!a.useLocalStorage,h()})}var j=document.getElementById("dg-new-constructor");n.bind(j,"keydown",function(a){!a.metaKey||67!==a.which&&67!=a.keyCode||B.hide()}),n.bind(c,"click",function(){j.innerHTML=JSON.stringify(a.getSaveObject(),void 0,2),B.show(),j.focus(),j.select()}),n.bind(d,"click",function(){a.save()}),n.bind(e,"click",function(){var b=prompt("Enter a new preset name.");b&&a.saveAs(b)}),n.bind(f,"click",function(){a.revert()})}function u(a){function b(b){return b.preventDefault(),e=b.clientX,n.addClass(a.__closeButton,G.CLASS_DRAG),n.bind(window,"mousemove",c),n.bind(window,"mouseup",d),!1}function c(b){return b.preventDefault(),a.width+=e-b.clientX,a.onResize(),e=b.clientX,!1}function d(){n.removeClass(a.__closeButton,G.CLASS_DRAG),n.unbind(window,"mousemove",c),n.unbind(window,"mouseup",d)}a.__resize_handle=document.createElement("div"),o.extend(a.__resize_handle.style,{width:"6px",marginLeft:"-3px",height:"200px",cursor:"ew-resize",position:"absolute"});var e;n.bind(a.__resize_handle,"mousedown",b),n.bind(a.__closeButton,"mousedown",b),a.domElement.insertBefore(a.__resize_handle,a.domElement.firstElementChild)}function v(a,b){a.domElement.style.width=b+"px",a.__save_row&&a.autoPlace&&(a.__save_row.style.width=b+"px"),a.__closeButton&&(a.__closeButton.style.width=b+"px")}function w(a,b){var c={};return o.each(a.__rememberedObjects,function(d,e){var f={};o.each(a.__rememberedObjectIndecesToControllers[e],function(a,c){f[c]=b?a.initialValue:a.getValue()}),c[e]=f}),c}function x(a,b,c){var d=document.createElement("option");d.innerHTML=b,d.value=b,a.__preset_select.appendChild(d),c&&(a.__preset_select.selectedIndex=a.__preset_select.length-1)}function y(a,b){var c=a.__preset_select[a.__preset_select.selectedIndex];c.innerHTML=b?c.value+"*":c.value}function z(a){0!=a.length&&l(function(){z(a)}),o.each(a,function(a){a.updateDisplay()})}a.inject(c);var A;try{A="localStorage"in window&&null!==window.localStorage}catch(a){A=!1}var B,D,C=!0,E=!1,F=[],G=function(a){function b(){var a=c.getRoot();a.width+=1,o.defer(function(){--a.width})}var c=this;this.domElement=document.createElement("div"),this.__ul=document.createElement("ul"),this.domElement.appendChild(this.__ul),n.addClass(this.domElement,"dg"),this.__folders={},this.__controllers=[],this.__rememberedObjects=[],this.__rememberedObjectIndecesToControllers=[],this.__listening=[],a=a||{},a=o.defaults(a,{autoPlace:!0,width:G.DEFAULT_WIDTH}),a=o.defaults(a,{resizable:a.autoPlace,hideable:a.autoPlace}),o.isUndefined(a.load)?a.load={preset:"Default"}:a.preset&&(a.load.preset=a.preset),o.isUndefined(a.parent)&&a.hideable&&F.push(this),a.resizable=o.isUndefined(a.parent)&&a.resizable,a.autoPlace&&o.isUndefined(a.scrollable)&&(a.scrollable=!0);var e,d=A&&"true"===localStorage.getItem(document.location.href+".isLocal");if(Object.defineProperties(this,{parent:{get:function(){return a.parent}},scrollable:{get:function(){return a.scrollable}},autoPlace:{get:function(){return a.autoPlace}},preset:{get:function(){return c.parent?c.getRoot().preset:a.load.preset},set:function(b){for(c.parent?c.getRoot().preset=b:a.load.preset=b,b=0;b<this.__preset_select.length;b++)this.__preset_select[b].value==this.preset&&(this.__preset_select.selectedIndex=b);c.revert()}},width:{get:function(){return a.width},set:function(b){a.width=b,v(c,b)}},name:{get:function(){return a.name},set:function(b){a.name=b,g&&(g.innerHTML=a.name)}},closed:{get:function(){return a.closed},set:function(b){a.closed=b,a.closed?n.addClass(c.__ul,G.CLASS_CLOSED):n.removeClass(c.__ul,G.CLASS_CLOSED),this.onResize(),c.__closeButton&&(c.__closeButton.innerHTML=b?G.TEXT_OPEN:G.TEXT_CLOSED)}},load:{get:function(){return a.load}},useLocalStorage:{get:function(){return d},set:function(a){A&&((d=a)?n.bind(window,"unload",e):n.unbind(window,"unload",e),localStorage.setItem(document.location.href+".isLocal",a))}}}),o.isUndefined(a.parent)){if(a.closed=!1,n.addClass(this.domElement,G.CLASS_MAIN),n.makeSelectable(this.domElement,!1),A&&d){c.useLocalStorage=!0;var f=localStorage.getItem(document.location.href+".gui");f&&(a.load=JSON.parse(f))}this.__closeButton=document.createElement("div"),this.__closeButton.innerHTML=G.TEXT_CLOSED,n.addClass(this.__closeButton,G.CLASS_CLOSE_BUTTON),this.domElement.appendChild(this.__closeButton),n.bind(this.__closeButton,"click",function(){c.closed=!c.closed})}else{void 0===a.closed&&(a.closed=!0);var g=document.createTextNode(a.name);n.addClass(g,"controller-name"),f=q(c,g),n.addClass(this.__ul,G.CLASS_CLOSED),n.addClass(f,"title"),n.bind(f,"click",function(a){return a.preventDefault(),c.closed=!c.closed,!1}),a.closed||(this.closed=!1)}a.autoPlace&&(o.isUndefined(a.parent)&&(C&&(D=document.createElement("div"),n.addClass(D,"dg"),n.addClass(D,G.CLASS_AUTO_PLACE_CONTAINER),document.body.appendChild(D),C=!1),D.appendChild(this.domElement),n.addClass(this.domElement,G.CLASS_AUTO_PLACE)),this.parent||v(c,a.width)),n.bind(window,"resize",function(){c.onResize()}),n.bind(this.__ul,"webkitTransitionEnd",function(){c.onResize()}),n.bind(this.__ul,"transitionend",function(){c.onResize()}),n.bind(this.__ul,"oTransitionEnd",function(){c.onResize()}),this.onResize(),a.resizable&&u(this),this.saveToLocalStorageIfPossible=e=function(){A&&"true"===localStorage.getItem(document.location.href+".isLocal")&&localStorage.setItem(document.location.href+".gui",JSON.stringify(c.getSaveObject()))},c.getRoot(),a.parent||b()};return G.toggleHide=function(){E=!E,o.each(F,function(a){a.domElement.style.zIndex=E?-999:999,a.domElement.style.opacity=E?0:1})},G.CLASS_AUTO_PLACE="a",G.CLASS_AUTO_PLACE_CONTAINER="ac",G.CLASS_MAIN="main",G.CLASS_CONTROLLER_ROW="cr",G.CLASS_TOO_TALL="taller-than-window",G.CLASS_CLOSED="closed",G.CLASS_CLOSE_BUTTON="close-button",G.CLASS_DRAG="drag",G.DEFAULT_WIDTH=245,G.TEXT_CLOSED="Close Controls",G.TEXT_OPEN="Open Controls",n.bind(window,"keydown",function(a){"text"===document.activeElement.type||72!==a.which&&72!=a.keyCode||G.toggleHide()},!1),o.extend(G.prototype,{add:function(a,b){return p(this,a,b,{factoryArgs:Array.prototype.slice.call(arguments,2)})},addColor:function(a,b){return p(this,a,b,{color:!0})},remove:function(a){this.__ul.removeChild(a.__li),this.__controllers.splice(this.__controllers.indexOf(a),1);var b=this;o.defer(function(){b.onResize()})},destroy:function(){this.autoPlace&&D.removeChild(this.domElement)},addFolder:function(a){if(void 0!==this.__folders[a])throw Error('You already have a folder in this GUI by the name "'+a+'"');var b={name:a,parent:this};return b.autoPlace=this.autoPlace,this.load&&this.load.folders&&this.load.folders[a]&&(b.closed=this.load.folders[a].closed,b.load=this.load.folders[a]),b=new G(b),this.__folders[a]=b,a=q(this,b.domElement),n.addClass(a,"folder"),b},open:function(){this.closed=!1},close:function(){this.closed=!0},onResize:function(){var a=this.getRoot();if(a.scrollable){var b=n.getOffset(a.__ul).top,c=0;o.each(a.__ul.childNodes,function(b){a.autoPlace&&b===a.__save_row||(c+=n.getHeight(b))}),window.innerHeight-b-20<c?(n.addClass(a.domElement,G.CLASS_TOO_TALL),a.__ul.style.height=window.innerHeight-b-20+"px"):(n.removeClass(a.domElement,G.CLASS_TOO_TALL),a.__ul.style.height="auto")}a.__resize_handle&&o.defer(function(){a.__resize_handle.style.height=a.__ul.offsetHeight+"px"}),a.__closeButton&&(a.__closeButton.style.width=a.width+"px")},remember:function(){if(o.isUndefined(B)&&(B=new m,B.domElement.innerHTML=b),this.parent)throw Error("You can only call remember on a top level GUI.");var a=this;o.each(Array.prototype.slice.call(arguments),function(b){0==a.__rememberedObjects.length&&t(a),-1==a.__rememberedObjects.indexOf(b)&&a.__rememberedObjects.push(b)}),this.autoPlace&&v(this,this.width)},getRoot:function(){for(var a=this;a.parent;)a=a.parent;return a},getSaveObject:function(){var a=this.load;return a.closed=this.closed,0<this.__rememberedObjects.length&&(a.preset=this.preset,a.remembered||(a.remembered={}),a.remembered[this.preset]=w(this)),a.folders={},o.each(this.__folders,function(b,c){a.folders[c]=b.getSaveObject()}),a},save:function(){this.load.remembered||(this.load.remembered={}),this.load.remembered[this.preset]=w(this),y(this,!1),this.saveToLocalStorageIfPossible()},saveAs:function(a){this.load.remembered||(this.load.remembered={},this.load.remembered.Default=w(this,!0)),this.load.remembered[a]=w(this),this.preset=a,x(this,a,!0),this.saveToLocalStorageIfPossible()},revert:function(a){o.each(this.__controllers,function(b){this.getRoot().load.remembered?s(a||this.getRoot(),b):b.setValue(b.initialValue)},this),o.each(this.__folders,function(a){a.revert(a)}),a||y(this.getRoot(),!1)},listen:function(a){var b=0==this.__listening.length;this.__listening.push(a),b&&z(this.__listening)}}),G}(dat.utils.css,'<div id="dg-save" class="dg dialogue">\n\n  Here\'s the new load parameter for your <code>GUI</code>\'s constructor:\n\n  <textarea id="dg-new-constructor"></textarea>\n\n  <div id="dg-save-locally">\n\n    <input id="dg-local-storage" type="checkbox"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id="dg-local-explain">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>\'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n      \n    </div>\n    \n  </div>\n\n</div>',".dg {\n  /** Clear list styles */\n  /* Auto-place container */\n  /* Auto-placed GUI's */\n  /* Line items that don't contain folders. */\n  /** Folder names */\n  /** Hides closed items */\n  /** Controller row */\n  /** Name-half (left) */\n  /** Controller-half (right) */\n  /** Controller placement */\n  /** Shorter number boxes when slider is present. */\n  /** Ensure the entire boolean and function row shows a hand */ }\n  .dg ul {\n    list-style: none;\n    margin: 0;\n    padding: 0;\n    width: 100%;\n    clear: both; }\n  .dg.ac {\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    height: 0;\n    z-index: 0; }\n  .dg:not(.ac) .main {\n    /** Exclude mains in ac so that we don't hide close button */\n    overflow: hidden; }\n  .dg.main {\n    -webkit-transition: opacity 0.1s linear;\n    -o-transition: opacity 0.1s linear;\n    -moz-transition: opacity 0.1s linear;\n    transition: opacity 0.1s linear; }\n    .dg.main.taller-than-window {\n      overflow-y: auto; }\n      .dg.main.taller-than-window .close-button {\n        opacity: 1;\n        \n        margin-top: -1px;\n        border-top: 1px solid #2c2c2c; }\n    .dg.main ul.closed .close-button {\n      opacity: 1 !important; }\n    .dg.main:hover .close-button,\n    .dg.main .close-button.drag {\n      opacity: 1; }\n    .dg.main .close-button {\n      /*opacity: 0;*/\n      -webkit-transition: opacity 0.1s linear;\n      -o-transition: opacity 0.1s linear;\n      -moz-transition: opacity 0.1s linear;\n      transition: opacity 0.1s linear;\n      border: 0;\n      position: absolute;\n      line-height: 19px;\n      height: 20px;\n      \n      cursor: pointer;\n      text-align: center;\n      background-color: #000; }\n      .dg.main .close-button:hover {\n        background-color: #111; }\n  .dg.a {\n    float: right;\n    margin-right: 15px;\n    overflow-x: hidden; }\n    .dg.a.has-save > ul {\n      margin-top: 27px; }\n      .dg.a.has-save > ul.closed {\n        margin-top: 0; }\n    .dg.a .save-row {\n      position: fixed;\n      top: 0;\n      z-index: 1002; }\n  .dg li {\n    -webkit-transition: height 0.1s ease-out;\n    -o-transition: height 0.1s ease-out;\n    -moz-transition: height 0.1s ease-out;\n    transition: height 0.1s ease-out; }\n  .dg li:not(.folder) {\n    cursor: auto;\n    height: 27px;\n    line-height: 27px;\n    overflow: hidden;\n    padding: 0 4px 0 5px; }\n  .dg li.folder {\n    padding: 0;\n    border-left: 4px solid rgba(0, 0, 0, 0); }\n  .dg li.title {\n    cursor: pointer;\n    margin-left: -4px; }\n  .dg .closed li:not(.title),\n  .dg .closed ul li,\n  .dg .closed ul li > * {\n    height: 0;\n    overflow: hidden;\n    border: 0; }\n  .dg .cr {\n    clear: both;\n    padding-left: 3px;\n    height: 27px; }\n  .dg .property-name {\n    cursor: default;\n    float: left;\n    clear: left;\n    width: 40%;\n    overflow: hidden;\n    text-overflow: ellipsis; }\n  .dg .c {\n    float: left;\n    width: 60%; }\n  .dg .c input[type=text] {\n    border: 0;\n    margin-top: 4px;\n    padding: 3px;\n    width: 100%;\n    float: right; }\n  .dg .has-slider input[type=text] {\n    width: 30%;\n    /*display: none;*/\n    margin-left: 0; }\n  .dg .slider {\n    float: left;\n    width: 66%;\n    margin-left: -5px;\n    margin-right: 0;\n    height: 19px;\n    margin-top: 4px; }\n  .dg .slider-fg {\n    height: 100%; }\n  .dg .c input[type=checkbox] {\n    margin-top: 9px; }\n  .dg .c select {\n    margin-top: 5px; }\n  .dg .cr.function,\n  .dg .cr.function .property-name,\n  .dg .cr.function *,\n  .dg .cr.boolean,\n  .dg .cr.boolean * {\n    cursor: pointer; }\n  .dg .selector {\n    display: none;\n    position: absolute;\n    margin-left: -9px;\n    margin-top: 23px;\n    z-index: 10; }\n  .dg .c:hover .selector,\n  .dg .selector.drag {\n    display: block; }\n  .dg li.save-row {\n    padding: 0; }\n    .dg li.save-row .button {\n      display: inline-block;\n      padding: 0px 6px; }\n  .dg.dialogue {\n    background-color: #222;\n    width: 460px;\n    padding: 15px;\n    font-size: 13px;\n    line-height: 15px; }\n\n\n#dg-new-constructor {\n  padding: 10px;\n  color: #222;\n  font-family: Monaco, monospace;\n  font-size: 10px;\n  border: 0;\n  resize: none;\n  box-shadow: inset 1px 1px 1px #888;\n  word-wrap: break-word;\n  margin: 12px 0;\n  display: block;\n  width: 440px;\n  overflow-y: scroll;\n  height: 100px;\n  position: relative; }\n\n#dg-local-explain {\n  display: none;\n  font-size: 11px;\n  line-height: 17px;\n  border-radius: 3px;\n  background-color: #333;\n  padding: 8px;\n  margin-top: 10px; }\n  #dg-local-explain code {\n    font-size: 10px; }\n\n#dat-gui-save-locally {\n  display: none; }\n\n/** Main type */\n.dg {\n  color: #eee;\n  font: 11px 'Lucida Grande', sans-serif;\n  text-shadow: 0 -1px 0 #111;\n  /** Auto place */\n  /* Controller row, <li> */\n  /** Controllers */ }\n  .dg.main {\n    /** Scrollbar */ }\n    .dg.main::-webkit-scrollbar {\n      width: 5px;\n      background: #1a1a1a; }\n    .dg.main::-webkit-scrollbar-corner {\n      height: 0;\n      display: none; }\n    .dg.main::-webkit-scrollbar-thumb {\n      border-radius: 5px;\n      background: #676767; }\n  .dg li:not(.folder) {\n    background: #1a1a1a;\n    border-bottom: 1px solid #2c2c2c; }\n  .dg li.save-row {\n    line-height: 25px;\n    background: #dad5cb;\n    border: 0; }\n    .dg li.save-row select {\n      margin-left: 5px;\n      width: 108px; }\n    .dg li.save-row .button {\n      margin-left: 5px;\n      margin-top: 1px;\n      border-radius: 2px;\n      font-size: 9px;\n      line-height: 7px;\n      padding: 4px 4px 5px 4px;\n      background: #c5bdad;\n      color: #fff;\n      text-shadow: 0 1px 0 #b0a58f;\n      box-shadow: 0 -1px 0 #b0a58f;\n      cursor: pointer; }\n      .dg li.save-row .button.gears {\n        background: #c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;\n        height: 7px;\n        width: 8px; }\n      .dg li.save-row .button:hover {\n        background-color: #bab19e;\n        box-shadow: 0 -1px 0 #b0a58f; }\n  .dg li.folder {\n    border-bottom: 0; }\n  .dg li.title {\n    padding-left: 16px;\n    background: black url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;\n    cursor: pointer;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.2); }\n  .dg .closed li.title {\n    background-image: url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==); }\n  .dg .cr.boolean {\n    border-left: 3px solid #806787; }\n  .dg .cr.function {\n    border-left: 3px solid #e61d5f; }\n  .dg .cr.number {\n    border-left: 3px solid #2fa1d6; }\n    .dg .cr.number input[type=text] {\n      color: #2fa1d6; }\n  .dg .cr.string {\n    border-left: 3px solid #1ed36f; }\n    .dg .cr.string input[type=text] {\n      color: #1ed36f; }\n  .dg .cr.function:hover, .dg .cr.boolean:hover {\n    background: #111; }\n  .dg .c input[type=text] {\n    background: #303030;\n    outline: none; }\n    .dg .c input[type=text]:hover {\n      background: #3c3c3c; }\n    .dg .c input[type=text]:focus {\n      background: #494949;\n      color: #fff; }\n  .dg .c .slider {\n    background: #303030;\n    cursor: ew-resize; }\n  .dg .c .slider-fg {\n    background: #2fa1d6; }\n  .dg .c .slider:hover {\n    background: #3c3c3c; }\n    .dg .c .slider:hover .slider-fg {\n      background: #44abda; }\n",dat.controllers.factory=function(a,b,c,d,e,f,g){return function(h,i,j,k){var l=h[i];return g.isArray(j)||g.isObject(j)?new a(h,i,j):g.isNumber(l)?g.isNumber(j)&&g.isNumber(k)?new c(h,i,j,k):new b(h,i,{min:j,max:k}):g.isString(l)?new d(h,i):g.isFunction(l)?new e(h,i,""):g.isBoolean(l)?new f(h,i):void 0}}(dat.controllers.OptionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.StringController=function(a,b,c){var d=function(a,c){function e(){f.setValue(f.__input.value)}d.superclass.call(this,a,c);var f=this;this.__input=document.createElement("input"),this.__input.setAttribute("type","text"),b.bind(this.__input,"keyup",e),b.bind(this.__input,"change",e),b.bind(this.__input,"blur",function(){f.__onFinishChange&&f.__onFinishChange.call(f,f.getValue())}),b.bind(this.__input,"keydown",function(a){13===a.keyCode&&this.blur()}),this.updateDisplay(),this.domElement.appendChild(this.__input)};return d.superclass=a,c.extend(d.prototype,a.prototype,{updateDisplay:function(){return b.isActive(this.__input)||(this.__input.value=this.getValue()),d.superclass.prototype.updateDisplay.call(this)}}),d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.controllers.FunctionController,dat.controllers.BooleanController,dat.utils.common),dat.controllers.Controller,dat.controllers.BooleanController,dat.controllers.FunctionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.OptionController,dat.controllers.ColorController=function(a,b,c,d,e){function f(a,b,c,d){a.style.background="",e.each(i,function(e){a.style.cssText+="background: "+e+"linear-gradient("+b+", "+c+" 0%, "+d+" 100%); "})}function g(a){a.style.background="",a.style.cssText+="background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);",a.style.cssText+="background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",a.style.cssText+="background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",a.style.cssText+="background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",a.style.cssText+="background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);"}var h=function(a,i){function j(a){n(a),b.bind(window,"mousemove",n),b.bind(window,"mouseup",k)}function k(){b.unbind(window,"mousemove",n),b.unbind(window,"mouseup",k)}function l(){var a=d(this.value);!1!==a?(p.__color.__state=a,p.setValue(p.__color.toOriginal())):this.value=p.__color.toString()}function m(){b.unbind(window,"mousemove",o),b.unbind(window,"mouseup",m)}function n(a){a.preventDefault();var c=b.getWidth(p.__saturation_field),d=b.getOffset(p.__saturation_field),e=(a.clientX-d.left+document.body.scrollLeft)/c;return a=1-(a.clientY-d.top+document.body.scrollTop)/c,1<a?a=1:0>a&&(a=0),1<e?e=1:0>e&&(e=0),p.__color.v=a,p.__color.s=e,p.setValue(p.__color.toOriginal()),!1}function o(a){a.preventDefault();var c=b.getHeight(p.__hue_field),d=b.getOffset(p.__hue_field);return a=1-(a.clientY-d.top+document.body.scrollTop)/c,1<a?a=1:0>a&&(a=0),p.__color.h=360*a,p.setValue(p.__color.toOriginal()),!1}h.superclass.call(this,a,i),this.__color=new c(this.getValue()),this.__temp=new c(0);var p=this;this.domElement=document.createElement("div"),b.makeSelectable(this.domElement,!1),this.__selector=document.createElement("div"),this.__selector.className="selector",this.__saturation_field=document.createElement("div"),this.__saturation_field.className="saturation-field",this.__field_knob=document.createElement("div"),this.__field_knob.className="field-knob",this.__field_knob_border="2px solid ",this.__hue_knob=document.createElement("div"),this.__hue_knob.className="hue-knob",this.__hue_field=document.createElement("div"),this.__hue_field.className="hue-field",this.__input=document.createElement("input"),this.__input.type="text",this.__input_textShadow="0 1px 1px ",b.bind(this.__input,"keydown",function(a){13===a.keyCode&&l.call(this)}),b.bind(this.__input,"blur",l),b.bind(this.__selector,"mousedown",function(a){b.addClass(this,"drag").bind(window,"mouseup",function(a){b.removeClass(p.__selector,"drag")})});var q=document.createElement("div");e.extend(this.__selector.style,{width:"122px",height:"102px",padding:"3px",backgroundColor:"#222",boxShadow:"0px 1px 3px rgba(0,0,0,0.3)"}),e.extend(this.__field_knob.style,{position:"absolute",width:"12px",height:"12px",border:this.__field_knob_border+(.5>this.__color.v?"#fff":"#000"),boxShadow:"0px 1px 3px rgba(0,0,0,0.5)",borderRadius:"12px",zIndex:1}),e.extend(this.__hue_knob.style,{position:"absolute",width:"15px",height:"2px",borderRight:"4px solid #fff",zIndex:1}),e.extend(this.__saturation_field.style,{width:"100px",height:"100px",border:"1px solid #555",marginRight:"3px",display:"inline-block",cursor:"pointer"}),e.extend(q.style,{width:"100%",height:"100%",background:"none"}),f(q,"top","rgba(0,0,0,0)","#000"),e.extend(this.__hue_field.style,{width:"15px",height:"100px",display:"inline-block",border:"1px solid #555",cursor:"ns-resize"}),g(this.__hue_field),e.extend(this.__input.style,{outline:"none",textAlign:"center",color:"#fff",border:0,fontWeight:"bold",textShadow:this.__input_textShadow+"rgba(0,0,0,0.7)"}),b.bind(this.__saturation_field,"mousedown",j),b.bind(this.__field_knob,"mousedown",j),b.bind(this.__hue_field,"mousedown",function(a){o(a),b.bind(window,"mousemove",o),b.bind(window,"mouseup",m)}),this.__saturation_field.appendChild(q),this.__selector.appendChild(this.__field_knob),this.__selector.appendChild(this.__saturation_field),this.__selector.appendChild(this.__hue_field),this.__hue_field.appendChild(this.__hue_knob),this.domElement.appendChild(this.__input),this.domElement.appendChild(this.__selector),this.updateDisplay()};h.superclass=a,e.extend(h.prototype,a.prototype,{updateDisplay:function(){var a=d(this.getValue());if(!1!==a){var b=!1;e.each(c.COMPONENTS,function(c){if(!e.isUndefined(a[c])&&!e.isUndefined(this.__color.__state[c])&&a[c]!==this.__color.__state[c])return b=!0,{}},this),b&&e.extend(this.__color.__state,a)}e.extend(this.__temp.__state,this.__color.__state),this.__temp.a=1;var g=.5>this.__color.v||.5<this.__color.s?255:0,h=255-g;e.extend(this.__field_knob.style,{marginLeft:100*this.__color.s-7+"px",marginTop:100*(1-this.__color.v)-7+"px",backgroundColor:this.__temp.toString(),border:this.__field_knob_border+"rgb("+g+","+g+","+g+")"}),this.__hue_knob.style.marginTop=100*(1-this.__color.h/360)+"px",this.__temp.s=1,this.__temp.v=1,f(this.__saturation_field,"left","#fff",this.__temp.toString()),e.extend(this.__input.style,{backgroundColor:this.__input.value=this.__color.toString(),color:"rgb("+g+","+g+","+g+")",textShadow:this.__input_textShadow+"rgba("+h+","+h+","+h+",.7)"})}});var i=["-moz-","-o-","-webkit-","-ms-",""];return h}(dat.controllers.Controller,dat.dom.dom,dat.color.Color=function(a,b,c,d){function e(a,b,c){Object.defineProperty(a,b,{get:function(){return"RGB"===this.__state.space?this.__state[b]:(g(this,b,c),this.__state[b])},set:function(a){"RGB"!==this.__state.space&&(g(this,b,c),this.__state.space="RGB"),this.__state[b]=a}})}function f(a,b){Object.defineProperty(a,b,{get:function(){return"HSV"===this.__state.space?this.__state[b]:(h(this),this.__state[b])},set:function(a){"HSV"!==this.__state.space&&(h(this),this.__state.space="HSV"),this.__state[b]=a}})}function g(a,c,e){if("HEX"===a.__state.space)a.__state[c]=b.component_from_hex(a.__state.hex,e);else{if("HSV"!==a.__state.space)throw"Corrupted color state";d.extend(a.__state,b.hsv_to_rgb(a.__state.h,a.__state.s,a.__state.v))}}function h(a){var c=b.rgb_to_hsv(a.r,a.g,a.b);d.extend(a.__state,{s:c.s,v:c.v}),d.isNaN(c.h)?d.isUndefined(a.__state.h)&&(a.__state.h=0):a.__state.h=c.h}var i=function(){if(this.__state=a.apply(this,arguments),!1===this.__state)throw"Failed to interpret color arguments";this.__state.a=this.__state.a||1};return i.COMPONENTS="r g b h s v hex a".split(" "),d.extend(i.prototype,{toString:function(){return c(this)},toOriginal:function(){return this.__state.conversion.write(this)}}),e(i.prototype,"r",2),e(i.prototype,"g",1),e(i.prototype,"b",0),f(i.prototype,"h"),f(i.prototype,"s"),f(i.prototype,"v"),Object.defineProperty(i.prototype,"a",{get:function(){return this.__state.a},set:function(a){this.__state.a=a}}),Object.defineProperty(i.prototype,"hex",{get:function(){return"HEX"!==!this.__state.space&&(this.__state.hex=b.rgb_to_hex(this.r,this.g,this.b)),this.__state.hex},set:function(a){this.__state.space="HEX",this.__state.hex=a}}),i}(dat.color.interpret,dat.color.math=function(){var a;return{hsv_to_rgb:function(a,b,c){var d=a/60-Math.floor(a/60),e=c*(1-b),f=c*(1-d*b);return b=c*(1-(1-d)*b),a=[[c,b,e],[f,c,e],[e,c,b],[e,f,c],[b,e,c],[c,e,f]][Math.floor(a/60)%6],{r:255*a[0],g:255*a[1],b:255*a[2]}},rgb_to_hsv:function(a,b,c){var d=Math.min(a,b,c),e=Math.max(a,b,c),d=e-d;return 0==e?{h:NaN,s:0,v:0}:(a=(a==e?(b-c)/d:b==e?2+(c-a)/d:4+(a-b)/d)/6,0>a&&(a+=1),{h:360*a,s:d/e,v:e/255})},rgb_to_hex:function(a,b,c){return a=this.hex_with_component(0,2,a),a=this.hex_with_component(a,1,b),a=this.hex_with_component(a,0,c)},component_from_hex:function(a,b){return a>>8*b&255},hex_with_component:function(b,c,d){return d<<(a=8*c)|b&~(255<<a)}}}(),dat.color.toString,dat.utils.common),dat.color.interpret,dat.utils.common),dat.utils.requestAnimationFrame=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(a,b){window.setTimeout(a,1e3/60)}}(),dat.dom.CenteredDiv=function(a,b){var c=function(){this.backgroundElement=document.createElement("div"),b.extend(this.backgroundElement.style,{backgroundColor:"rgba(0,0,0,0.8)",top:0,left:0,display:"none",zIndex:"1000",opacity:0,WebkitTransition:"opacity 0.2s linear",transition:"opacity 0.2s linear"}),a.makeFullscreen(this.backgroundElement),this.backgroundElement.style.position="fixed",this.domElement=document.createElement("div"),b.extend(this.domElement.style,{position:"fixed",display:"none",zIndex:"1001",opacity:0,WebkitTransition:"-webkit-transform 0.2s ease-out, opacity 0.2s linear",transition:"transform 0.2s ease-out, opacity 0.2s linear"}),document.body.appendChild(this.backgroundElement),document.body.appendChild(this.domElement);var c=this;a.bind(this.backgroundElement,"click",function(){c.hide()})};return c.prototype.show=function(){var a=this;this.backgroundElement.style.display="block",this.domElement.style.display="block",this.domElement.style.opacity=0,this.domElement.style.webkitTransform="scale(1.1)",this.layout(),b.defer(function(){a.backgroundElement.style.opacity=1,a.domElement.style.opacity=1,a.domElement.style.webkitTransform="scale(1)"})},c.prototype.hide=function(){var b=this,c=function(){b.domElement.style.display="none",b.backgroundElement.style.display="none",a.unbind(b.domElement,"webkitTransitionEnd",c),a.unbind(b.domElement,"transitionend",c),a.unbind(b.domElement,"oTransitionEnd",c)};a.bind(this.domElement,"webkitTransitionEnd",c),a.bind(this.domElement,"transitionend",c),a.bind(this.domElement,"oTransitionEnd",c),this.backgroundElement.style.opacity=0,this.domElement.style.opacity=0,this.domElement.style.webkitTransform="scale(1.1)"},c.prototype.layout=function(){this.domElement.style.left=window.innerWidth/2-a.getWidth(this.domElement)/2+"px",this.domElement.style.top=window.innerHeight/2-a.getHeight(this.domElement)/2+"px"},c}(dat.dom.dom,dat.utils.common),dat.dom.dom,dat.utils.common);
function addGUI() {
    const button = simpleArticleIframe.createElement("button");

    button.className = "simple-control simple-edit-theme";
    button.title = "Edit your theme";
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 626 626"><g transform="translate(0,626) scale(0.1,-0.1)" stroke="none"><path d="M6155 5867 c-116 -63 -356 -224 -645 -433 -85 -62 -168 -122 -185 -134 -53 -38 -255 -190 -458 -344 -109 -83 -208 -158 -220 -166 -12 -8 -90 -69 -173 -135 -83 -66 -222 -176 -309 -245 -87 -69 -191 -151 -229 -183 -39 -32 -89 -73 -110 -90 -22 -18 -53 -44 -70 -58 -17 -15 -99 -82 -182 -150 -480 -394 -983 -857 -1140 -1049 -29 -36 -100 -145 -158 -243 -88 -149 -103 -179 -91 -189 8 -7 50 -44 93 -83 98 -88 192 -200 259 -310 28 -47 53 -91 55 -97 5 -15 411 189 488 245 183 134 659 610 1080 1082 78 88 159 178 179 200 112 122 633 729 757 881 27 33 148 182 269 330 122 148 250 306 285 352 36 46 110 140 165 210 224 283 445 602 445 642 0 18 -24 10 -105 -33z"/><path d="M1600 2230 c-216 -57 -398 -199 -572 -447 -40 -57 -135 -228 -158 -283 -36 -90 -113 -248 -165 -335 -103 -175 -295 -391 -446 -502 -73 -54 -187 -113 -217 -113 -49 0 -6 -21 131 -64 484 -151 904 -174 1250 -66 435 135 734 469 901 1005 46 149 58 214 45 254 -54 167 -231 392 -408 519 l-64 46 -111 3 c-86 2 -128 -2 -186 -17z"/></g></svg>Edit styles';
    button.onclick = openStyleEditor;

    return button;
}

// Helper functions for the GUI editor
let prevStyles = {},
    saved = false,
    bodySelector = ".jr-body";

const StyleEditor = function() {
    bodySelector = getStylesheetValue(s, ".jr-body", "font-size") ? ".jr-body" : "body";

    this.theme = prevStyles.theme = theme;
    this.fontSize = prevStyles.fontSize = getStylesheetValue(s, bodySelector, "font-size");
    this.textColor = prevStyles.textColor = getStylesheetValue(s, bodySelector, "color");
    this.backgroundColor = prevStyles.backgroundColor = getStylesheetValue(s, bodySelector, "background-color");
    this.linkColor = prevStyles.linkColor = getStylesheetValue(s, "a[href]", "color");
    this.linkHoverColor = prevStyles.linkHoverColor = getStylesheetValue(s, "a[href]:hover", "color");
    this.maxWidth = prevStyles.maxWidth = getStylesheetValue(s, ".simple-article-container", "max-width");
    this.openFullStyles = openFullStyles;
};

function updateEditorStyles(editor) {
    editor.fontSize = prevStyles.fontSize = getStylesheetValue(s, bodySelector, "font-size");
    editor.textColor = prevStyles.textColor = getStylesheetValue(s, bodySelector, "color");
    editor.backgroundColor = prevStyles.backgroundColor = getStylesheetValue(s, bodySelector, "background-color");
    editor.linkColor = getStylesheetValue(s, "a[href]", "color");
    editor.linkHoverColor = getStylesheetValue(s, "a[href]:hover", "color");
    editor.maxWidth = getStylesheetValue(s, ".simple-article-container", "max-width");

    datGUI.__controllers.forEach(controller => controller.updateDisplay());
}

function openFullStyles() {
    chrome.runtime.sendMessage("Open options");
}

// Check to make sure there isn't a file with this name already. If so, add a number to the end
function checkFileName(fileName) {
    let tempName = fileName,
        count = 1;

    while(stylesheetObj[tempName])
        tempName = fileName.replace(/(\.[\w\d_-]+)$/i, "(" + count++ + ").css");
    return tempName;
}

function updatePrevStyles(theme) {
    prevStyles.theme = theme;
    prevStyles.fontSize = getStylesheetValue(s, bodySelector, "font-size");
    prevStyles.textColor = getStylesheetValue(s, bodySelector, "color");
    prevStyles.backgroundColor = getStylesheetValue(s, bodySelector, "background-color");
    prevStyles.linkColor = getStylesheetValue(s, "a[href]", "color");
    prevStyles.linkHoverColor = getStylesheetValue(s, "a[href]:hover", "color");
    prevStyles.maxWidth = getStylesheetValue(s, ".simple-article-container", "max-width");
    prevStyles.originalThemeCSS = stylesheetObj[theme];
}

function saveStyles() {
    usedGUI = true;

    // Save styles to the stylesheet
    let newTheme = false;
    if(theme === "default-styles.css"
    || theme === "dark-styles.css") {
        theme = checkFileName(theme);
        chrome.storage.sync.set({'currentTheme': theme});
        newTheme = true;
    }

    let CSSString = "";
    Array.from(s.cssRules).forEach(rule => CSSString += rule.cssText + "\n");

    stylesheetObj[theme] = CSSString;
    setStylesOfStorage();
    if(newTheme) {
        let selectElem = document.querySelector(".dg select");
        selectElem.innerHTML += "<option value='" + theme + "'>" + theme + "</option>";
        selectElem.selectedIndex = selectElem.length - 1;
    }

    updatePrevStyles(theme);

    saved = true;

    closeStyleEditor();
}

function closeStyleEditor() {
    if(!saved) {
        changeStylesheetRule(s, bodySelector, "font-size", prevStyles.fontSize);
        changeStylesheetRule(s, ".simple-article-container", "max-width", prevStyles.maxWidth);
        changeStylesheetRule(s, bodySelector, "color", prevStyles.textColor);
        changeStylesheetRule(s, bodySelector, "background-color", prevStyles.backgroundColor);
        changeStylesheetRule(s, ".simple-author", "color", prevStyles.linkColor);
        changeStylesheetRule(s, "a[href]", "color", prevStyles.linkColor);
        changeStylesheetRule(s, "a[href]:hover", "color", prevStyles.linkHoverColor);
        styleElem.innerHTML = prevStyles.originalThemeCSS;
    }

    datGUI.domElement.style.display = "none";

    saved = false;
}

function openStyleEditor() {
    s = simpleArticleIframe.styleSheets[2];

    if(datGUI) {
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
            styleElem.innerHTML = stylesheetObj[value];
            s = simpleArticleIframe.styleSheets[2];
            updateEditorStyles(editor);

            theme = value;
            chrome.storage.sync.set({'currentTheme': theme});
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
        const textColor = datGUI.addColor(editor, 'textColor');
        textColor.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, bodySelector, "color", value);
        });
        const backgroundColor = datGUI.addColor(editor, 'backgroundColor');
        backgroundColor.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, bodySelector, "background-color", value);
        });
        const linkColor = datGUI.addColor(editor, 'linkColor');
        linkColor.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, ".simple-author", "color", value);
            changeStylesheetRule(s, "a[href]", "color", value);
        });
        const linkHoverColor = datGUI.addColor(editor, 'linkHoverColor');
        linkHoverColor.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, "a[href]:hover", "color", value);
        });
        datGUI.add(editor, 'openFullStyles');


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
        if(rule.selectorText === selector && rule.style[property]) {
            return rule.style[property];
        }
    };

    return null;
}

function changeStylesheetRule(stylesheet, selector, property, value) {
    // Make the strings lowercase
    selector = selector.toLowerCase();
    property = property.toLowerCase();
    value = value.toLowerCase();

    // Change it if it exists
    for (let rule of Array.from(stylesheet.cssRules)) {
        if(rule.selectorText === selector && rule.style[property]) {
            rule.style[property] = value;
            return;
        }
    };

    // Add it if it does not
    stylesheet.insertRule(selector + "{" + property + ":" + value + "}", 0);
}

// Highlighter-related functionality
// Rangy core - https://github.com/timdown/rangy/
!function(e,t){"function"==typeof define&&define.amd?define(e):"undefined"!=typeof module&&"object"==typeof exports?module.exports=e():t.rangy=e()}(function(){var r="object",o="function",n="undefined",c=["startContainer","startOffset","endContainer","endOffset","collapsed","commonAncestorContainer"],d=["setStart","setStartBefore","setStartAfter","setEnd","setEndBefore","setEndAfter","collapse","selectNode","selectNodeContents","compareBoundaryPoints","deleteContents","extractContents","cloneContents","insertNode","surroundContents","cloneRange","toString","detach"],t=["boundingHeight","boundingLeft","boundingTop","boundingWidth","htmlText","text"],i=["collapse","compareEndPoints","duplicate","moveToElementText","parentElement","select","setEndPoint","getBoundingClientRect"];function f(e,t){var n=typeof e[t];return n==o||!(n!=r||!e[t])||"unknown"==n}function a(e,t){return!(typeof e[t]!=r||!e[t])}function e(e,t){return typeof e[t]!=n}function s(r){return function(e,t){for(var n=t.length;n--;)if(!r(e,t[n]))return!1;return!0}}var u=s(f),l=s(a),h=s(e);function g(e){return e&&u(e,i)&&h(e,t)}function p(e){return a(e,"body")?e.body:e.getElementsByTagName("body")[0]}var m,R,v={},C=typeof window!=n&&typeof document!=n,N={isHostMethod:f,isHostObject:a,isHostProperty:e,areHostMethods:u,areHostObjects:l,areHostProperties:h,isTextRange:g,getBody:p,forEach:[].forEach?function(e,t){e.forEach(t)}:function(e,t){for(var n=0,r=e.length;n<r;++n)t(e[n],n)}},E={version:"1.3.1-dev",initialized:!1,isBrowser:C,supported:!0,util:N,features:{},modules:v,config:{alertOnFail:!1,alertOnWarn:!1,preferTextRange:!1,autoInitialize:typeof rangyAutoInitialize==n||rangyAutoInitialize}};function S(e){typeof console!=n&&f(console,"log")&&console.log(e)}function y(e,t){C&&t?alert(e):S(e)}function w(e){E.initialized=!0,E.supported=!1,y("Rangy is not supported in this environment. Reason: "+e,E.config.alertOnFail)}E.fail=w,E.warn=function(e){y("Rangy warning: "+e,E.config.alertOnWarn)},!{}.hasOwnProperty?w("hasOwnProperty not supported"):(N.extend=m=function(e,t,n){var r,o;for(var i in t)t.hasOwnProperty(i)&&(r=e[i],o=t[i],n&&null!==r&&"object"==typeof r&&null!==o&&"object"==typeof o&&m(r,o,!0),e[i]=o);return t.hasOwnProperty("toString")&&(e.toString=t.toString),e},N.createOptions=function(e,t){var n={};return m(n,t),e&&m(n,e),n}),C||w("Rangy can only run in a browser"),function(){var e;if(C){var t=document.createElement("div");t.appendChild(document.createElement("span"));var n=[].slice;try{1==n.call(t.childNodes,0)[0].nodeType&&(e=function(e){return n.call(e,0)})}catch(e){}}e||(e=function(e){for(var t=[],n=0,r=e.length;n<r;++n)t[n]=e[n];return t}),N.toArray=e}(),C&&(f(document,"addEventListener")?R=function(e,t,n){e.addEventListener(t,n,!1)}:f(document,"attachEvent")?R=function(e,t,n){e.attachEvent("on"+t,n)}:w("Document does not have required addEventListener or attachEvent method"),N.addListener=R);var T=[];function O(e){return e.message||e.description||String(e)}function _(){if(C&&!E.initialized){var e,t=!1,n=!1;f(document,"createRange")&&(e=document.createRange(),u(e,d)&&h(e,c)&&(t=!0));var r=p(document);if(r&&"body"==r.nodeName.toLowerCase())if(r&&f(r,"createTextRange")&&g(e=r.createTextRange())&&(n=!0),t||n){var o;for(var i in E.initialized=!0,E.features={implementsDomRange:t,implementsTextRange:n},v)(o=v[i])instanceof P&&o.init(o,E);for(var a=0,s=T.length;a<s;++a)try{T[a](E)}catch(e){S("Rangy init listener threw an exception. Continuing. Detail: "+O(e))}}else w("Neither Range nor TextRange are available");else w("No body element found")}}function D(e,t,n){n&&(e+=" in module "+n.name),E.warn("DEPRECATED: "+e+" is deprecated. Please use "+t+" instead.")}function A(e,t,n,r){e[t]=function(){return D(t,n,r),e[n].apply(e,N.toArray(arguments))}}N.deprecationNotice=D,N.createAliasForDeprecatedMethod=A,E.init=_,E.addInitListener=function(e){E.initialized?e(E):T.push(e)};var x=[];function P(e,t,n){this.name=e,this.dependencies=t,this.initialized=!1,this.supported=!1,this.initializer=n}function b(t,e,n){var r=new P(t,e,function(e){if(!e.initialized){e.initialized=!0;try{n(E,e),e.supported=!0}catch(e){S("Module '"+t+"' failed to load: "+O(e)),e.stack&&S(e.stack)}}});return v[t]=r}function I(){}E.addShimListener=function(e){x.push(e)},C&&(E.shim=E.createMissingNativeApi=function(e){e=e||window,_();for(var t=0,n=x.length;t<n;++t)x[t](e)},A(E,"createMissingNativeApi","shim")),P.prototype={init:function(){for(var e,t,n=this.dependencies||[],r=0,o=n.length;r<o;++r){if(t=n[r],!((e=v[t])&&e instanceof P))throw new Error("required module '"+t+"' not found");if(e.init(),!e.supported)throw new Error("required module '"+t+"' not supported")}this.initializer(this)},fail:function(e){throw this.initialized=!0,this.supported=!1,new Error(e)},warn:function(e){E.warn("Module "+this.name+": "+e)},deprecationNotice:function(e,t){E.warn("DEPRECATED: "+e+" in module "+this.name+" is deprecated. Please use "+t+" instead")},createError:function(e){return new Error("Error in Rangy "+this.name+" module: "+e)}},E.createModule=function(e){var t,n;2==arguments.length?(t=arguments[1],n=[]):(t=arguments[2],n=arguments[1]);var r=b(e,n,t);E.initialized&&E.supported&&r.init()},E.createCoreModule=function(e,t,n){b(e,t,n)},E.RangePrototype=I,E.rangePrototype=new I,E.selectionPrototype=new function(){},E.createCoreModule("DomUtil",[],function(n,d){var r="undefined",o=n.util,a=o.getBody;o.areHostMethods(document,["createDocumentFragment","createElement","createTextNode"])||d.fail("document missing a Node creation method"),o.isHostMethod(document,"getElementsByTagName")||d.fail("document missing getElementsByTagName method");var e=document.createElement("div");o.areHostMethods(e,["insertBefore","appendChild","cloneNode"])||d.fail("Incomplete Element implementation"),o.isHostProperty(e,"innerHTML")||d.fail("Element is missing innerHTML property");var t=document.createTextNode("test");o.areHostMethods(t,["splitText","deleteData","insertData","appendData","cloneNode"])||d.fail("Incomplete Text Node implementation");var i=function(e,t){for(var n=e.length;n--;)if(e[n]===t)return!0;return!1};function f(e){for(var t=0;e=e.previousSibling;)++t;return t}function u(e,t){var n,r=[];for(n=e;n;n=n.parentNode)r.push(n);for(n=t;n;n=n.parentNode)if(i(r,n))return n;return null}function s(e,t,n){for(var r=n?t:t.parentNode;r;){if(r===e)return!0;r=r.parentNode}return!1}function l(e,t,n){for(var r,o=n?e:e.parentNode;o;){if((r=o.parentNode)===t)return o;o=r}return null}function c(e){var t=e.nodeType;return 3==t||4==t||8==t}function h(e,t){var n=t.nextSibling,r=t.parentNode;return n?r.insertBefore(e,n):r.appendChild(e),e}function g(e){if(9==e.nodeType)return e;if(typeof e.ownerDocument!=r)return e.ownerDocument;if(typeof e.document!=r)return e.document;if(e.parentNode)return g(e.parentNode);throw d.createError("getDocument: no document found for node")}function p(e){var t=g(e);if(typeof t.defaultView!=r)return t.defaultView;if(typeof t.parentWindow!=r)return t.parentWindow;throw d.createError("Cannot get a window object for node")}function m(e){if(typeof e.contentDocument!=r)return e.contentDocument;if(typeof e.contentWindow!=r)return e.contentWindow.document;throw d.createError("getIframeDocument: No Document object found for iframe element")}function R(e){return e&&o.isHostMethod(e,"setTimeout")&&o.isHostObject(e,"document")}var v,C=!1;function N(e){try{return e.parentNode,!1}catch(e){return!0}}function E(e){if(!e)return"[No node]";if(C&&N(e))return"[Broken node]";if(c(e))return'"'+e.data+'"';if(1==e.nodeType){var t=e.id?' id="'+e.id+'"':"";return"<"+e.nodeName+t+">[index:"+f(e)+",length:"+e.childNodes.length+"]["+(e.innerHTML||"[innerHTML not supported]").slice(0,25)+"]"}return e.nodeName}function S(e){this.root=e,this._next=e}function y(e,t){this.node=e,this.offset=t}function w(e){this.code=this[e],this.codeName=e,this.message="DOMException: "+this.codeName}!function(){var e=document.createElement("b");e.innerHTML="1";var t=e.firstChild;e.innerHTML="<br />",C=N(t),n.features.crashyTextNodes=C}(),typeof window.getComputedStyle!=r?v=function(e,t){return p(e).getComputedStyle(e,null)[t]}:typeof document.documentElement.currentStyle!=r?v=function(e,t){return e.currentStyle?e.currentStyle[t]:""}:d.fail("No means of obtaining computed style properties found"),S.prototype={_current:null,hasNext:function(){return!!this._next},next:function(){var e,t,n=this._current=this._next;if(this._current)if(e=n.firstChild)this._next=e;else{for(t=null;n!==this.root&&!(t=n.nextSibling);)n=n.parentNode;this._next=t}return this._current},detach:function(){this._current=this._next=this.root=null}},y.prototype={equals:function(e){return!!e&&this.node===e.node&&this.offset==e.offset},inspect:function(){return"[DomPosition("+E(this.node)+":"+this.offset+")]"},toString:function(){return this.inspect()}},(w.prototype={INDEX_SIZE_ERR:1,HIERARCHY_REQUEST_ERR:3,WRONG_DOCUMENT_ERR:4,NO_MODIFICATION_ALLOWED_ERR:7,NOT_FOUND_ERR:8,NOT_SUPPORTED_ERR:9,INVALID_STATE_ERR:11,INVALID_NODE_TYPE_ERR:24}).toString=function(){return this.message},n.dom={arrayContains:i,isHtmlNamespace:function(e){var t;return typeof e.namespaceURI==r||null===(t=e.namespaceURI)||"http://www.w3.org/1999/xhtml"==t},parentElement:function(e){var t=e.parentNode;return 1==t.nodeType?t:null},getNodeIndex:f,getNodeLength:function(e){switch(e.nodeType){case 7:case 10:return 0;case 3:case 8:return e.length;default:return e.childNodes.length}},getCommonAncestor:u,isAncestorOf:s,isOrIsAncestorOf:function(e,t){return s(e,t,!0)},getClosestAncestorIn:l,isCharacterDataNode:c,isTextOrCommentNode:function(e){if(!e)return!1;var t=e.nodeType;return 3==t||8==t},insertAfter:h,splitDataNode:function(e,t,n){var r=e.cloneNode(!1);if(r.deleteData(0,t),e.deleteData(t,e.length-t),h(r,e),n)for(var o,i=0;o=n[i++];)o.node==e&&o.offset>t?(o.node=r,o.offset-=t):o.node==e.parentNode&&o.offset>f(e)&&++o.offset;return r},getDocument:g,getWindow:p,getIframeWindow:function(e){if(typeof e.contentWindow!=r)return e.contentWindow;if(typeof e.contentDocument!=r)return e.contentDocument.defaultView;throw d.createError("getIframeWindow: No Window object found for iframe element")},getIframeDocument:m,getBody:a,isWindow:R,getContentDocument:function(e,t,n){var r;if(e?o.isHostProperty(e,"nodeType")?r=1==e.nodeType&&"iframe"==e.tagName.toLowerCase()?m(e):g(e):R(e)&&(r=e.document):r=document,!r)throw t.createError(n+"(): Parameter must be a Window object or DOM node");return r},getRootContainer:function(e){for(var t;t=e.parentNode;)e=t;return e},comparePoints:function(e,t,n,r){var o,i,a,s,c;if(e==n)return t===r?0:t<r?-1:1;if(o=l(n,e,!0))return t<=f(o)?-1:1;if(o=l(e,n,!0))return f(o)<r?-1:1;if(!(i=u(e,n)))throw new Error("comparePoints error: nodes have no common ancestor");if((a=e===i?i:l(e,i,!0))===(s=n===i?i:l(n,i,!0)))throw d.createError("comparePoints got to case 4 and childA and childB are the same!");for(c=i.firstChild;c;){if(c===a)return-1;if(c===s)return 1;c=c.nextSibling}},isBrokenNode:N,inspectNode:E,getComputedStyleProperty:v,createTestElement:function(e,t,n){var r=a(e),o=e.createElement("div");o.contentEditable=""+!!n,t&&(o.innerHTML=t);var i=r.firstChild;return i?r.insertBefore(o,i):r.appendChild(o),o},removeNode:function(e){return e.parentNode.removeChild(e)},fragmentFromNodeChildren:function(e){for(var t,n=g(e).createDocumentFragment();t=e.firstChild;)n.appendChild(t);return n},createIterator:function(e){return new S(e)},DomPosition:y},n.DOMException=w}),E.createCoreModule("DomRange",["DomUtil"],function(a,e){var s=a.dom,r=a.util,t=s.DomPosition,c=a.DOMException,u=s.isCharacterDataNode,l=s.getNodeIndex,d=s.isOrIsAncestorOf,o=s.getDocument,h=s.comparePoints,f=s.splitDataNode,g=s.getClosestAncestorIn,p=s.getNodeLength,i=s.arrayContains,m=s.getRootContainer,n=a.features.crashyTextNodes,R=s.removeNode;function v(e,t){return 3!=e.nodeType&&(d(e,t.startContainer)||d(e,t.endContainer))}function C(e){return e.document||o(e.startContainer)}function N(e){return new t(e.parentNode,l(e))}function E(e){return new t(e.parentNode,l(e)+1)}function S(e,t,n){var r=11==e.nodeType?e.firstChild:e;return u(t)?n==t.length?s.insertAfter(e,t):t.parentNode.insertBefore(e,0==n?t:f(t,n)):n>=t.childNodes.length?t.appendChild(e):t.insertBefore(e,t.childNodes[n]),r}function y(e,t,n){if(q(e),q(t),C(t)!=C(e))throw new c("WRONG_DOCUMENT_ERR");var r=h(e.startContainer,e.startOffset,t.endContainer,t.endOffset),o=h(e.endContainer,e.endOffset,t.startContainer,t.startOffset);return n?r<=0&&0<=o:r<0&&0<o}function w(e,t,n){var r,o,i,a;for(n=n||{stop:!1};i=e.next();)if(e.isPartiallySelectedSubtree()){if(!1===t(i))return void(n.stop=!0);if(w(a=e.getSubtreeIterator(),t,n),a.detach(),n.stop)return}else for(r=s.createIterator(i);o=r.next();)if(!1===t(o))return void(n.stop=!0)}function T(e){for(var t;e.next();)e.isPartiallySelectedSubtree()?(T(t=e.getSubtreeIterator()),t.detach()):e.remove()}function O(e){for(var t,n,r=C(e.range).createDocumentFragment();t=e.next();){if(e.isPartiallySelectedSubtree()?(t=t.cloneNode(!1),n=e.getSubtreeIterator(),t.appendChild(O(n)),n.detach()):e.remove(),10==t.nodeType)throw new c("HIERARCHY_REQUEST_ERR");r.appendChild(t)}return r}function _(e){return"["+(void 0===e.getName?"Range":e.getName())+"("+s.inspectNode(e.startContainer)+":"+e.startOffset+", "+s.inspectNode(e.endContainer)+":"+e.endOffset+")]"}function D(e,t){if(this.range=e,this.clonePartiallySelectedTextNodes=t,!e.collapsed){this.sc=e.startContainer,this.so=e.startOffset,this.ec=e.endContainer,this.eo=e.endOffset;var n=e.commonAncestorContainer;this.sc===this.ec&&u(this.sc)?(this.isSingleCharacterDataNode=!0,this._first=this._last=this._next=this.sc):(this._first=this._next=this.sc!==n||u(this.sc)?g(this.sc,n,!0):this.sc.childNodes[this.so],this._last=this.ec!==n||u(this.ec)?g(this.ec,n,!0):this.ec.childNodes[this.eo-1])}}D.prototype={_current:null,_next:null,_first:null,_last:null,isSingleCharacterDataNode:!1,reset:function(){this._current=null,this._next=this._first},hasNext:function(){return!!this._next},next:function(){var e=this._current=this._next;return e&&(this._next=e!==this._last?e.nextSibling:null,u(e)&&this.clonePartiallySelectedTextNodes&&(e===this.ec&&(e=e.cloneNode(!0)).deleteData(this.eo,e.length-this.eo),this._current===this.sc&&(e=e.cloneNode(!0)).deleteData(0,this.so))),e},remove:function(){var e,t,n=this._current;!u(n)||n!==this.sc&&n!==this.ec?n.parentNode&&R(n):(e=n===this.sc?this.so:0)!=(t=n===this.ec?this.eo:n.length)&&n.deleteData(e,t-e)},isPartiallySelectedSubtree:function(){return v(this._current,this.range)},getSubtreeIterator:function(){var e;if(this.isSingleCharacterDataNode)(e=this.range.cloneRange()).collapse(!1);else{e=new le(C(this.range));var t=this._current,n=t,r=0,o=t,i=p(t);d(t,this.sc)&&(n=this.sc,r=this.so),d(t,this.ec)&&(o=this.ec,i=this.eo),ue(e,n,r,o,i)}return new D(e,this.clonePartiallySelectedTextNodes)},detach:function(){this.range=this._current=this._next=this._first=this._last=this.sc=this.so=this.ec=this.eo=null}};var A=[1,3,4,5,7,8,10],x=[2,9,11],P=[1,3,4,5,7,8,10,11],b=[1,3,4,5,7,8];function I(o){return function(e,t){for(var n,r=t?e:e.parentNode;r;){if(n=r.nodeType,i(o,n))return r;r=r.parentNode}return null}}var B=I([9,11]),H=I([5,6,10,12]),M=I([6,10,12]);function k(e,t){if(M(e,t))throw new c("INVALID_NODE_TYPE_ERR")}function L(e,t){if(!i(t,e.nodeType))throw new c("INVALID_NODE_TYPE_ERR")}function W(e,t){if(t<0||t>(u(e)?e.length:e.childNodes.length))throw new c("INDEX_SIZE_ERR")}function F(e,t){if(B(e,!0)!==B(t,!0))throw new c("WRONG_DOCUMENT_ERR")}function z(e){if(H(e,!0))throw new c("NO_MODIFICATION_ALLOWED_ERR")}function j(e,t){if(!e)throw new c(t)}function U(e,t){return t<=(u(e)?e.length:e.childNodes.length)}function V(e){return!!e.startContainer&&!!e.endContainer&&!(n&&(s.isBrokenNode(e.startContainer)||s.isBrokenNode(e.endContainer)))&&m(e.startContainer)==m(e.endContainer)&&U(e.startContainer,e.startOffset)&&U(e.endContainer,e.endOffset)}function q(e){if(!V(e))throw new Error("Range error: Range is not valid. This usually happens after DOM mutation. Range: ("+e.inspect()+")")}var Y=document.createElement("style"),Q=!1;try{Y.innerHTML="<b>x</b>",Q=3==Y.firstChild.nodeType}catch(e){}var G=(a.features.htmlParsingConforms=Q)?function(e){var t=this.startContainer,n=o(t);if(!t)throw new c("INVALID_STATE_ERR");var r=null;return 1==t.nodeType?r=t:u(t)&&(r=s.parentElement(t)),(r=null===r||"HTML"==r.nodeName&&s.isHtmlNamespace(o(r).documentElement)&&s.isHtmlNamespace(r)?n.createElement("body"):r.cloneNode(!1)).innerHTML=e,s.fragmentFromNodeChildren(r)}:function(e){var t=C(this).createElement("body");return t.innerHTML=e,s.fragmentFromNodeChildren(t)};function X(e,t){q(e);var n=e.startContainer,r=e.startOffset,o=e.endContainer,i=e.endOffset,a=n===o;u(o)&&0<i&&i<o.length&&f(o,i,t),u(n)&&0<r&&r<n.length&&(n=f(n,r,t),a?(i-=r,o=n):o==n.parentNode&&i>=l(n)&&i++,r=0),e.setStartAndEnd(n,r,o,i)}function Z(e){q(e);var t=e.commonAncestorContainer.parentNode.cloneNode(!1);return t.appendChild(e.cloneContents()),t.innerHTML}var $=["startContainer","startOffset","endContainer","endOffset","collapsed","commonAncestorContainer"],J=0,K=1,ee=2,te=3,ne=0,re=1,oe=2,ie=3;function ae(e){e.START_TO_START=J,e.START_TO_END=K,e.END_TO_END=ee,e.END_TO_START=te,e.NODE_BEFORE=ne,e.NODE_AFTER=re,e.NODE_BEFORE_AND_AFTER=oe,e.NODE_INSIDE=ie}function se(e){ae(e),ae(e.prototype)}function ce(a,s){return function(){q(this);var e,t=this.startContainer,n=this.startOffset,r=this.commonAncestorContainer,o=new D(this,!0);t!==r&&(t=(e=E(g(t,r,!0))).node,n=e.offset),w(o,z),o.reset();var i=a(o);return o.detach(),s(this,t,n,t,n),i}}function de(e,f){function t(n,r){return function(e){L(e,A),L(m(e),x);var t=(n?N:E)(e);(r?o:i)(this,t.node,t.offset)}}function o(e,t,n){var r=e.endContainer,o=e.endOffset;t===e.startContainer&&n===e.startOffset||(m(t)==m(r)&&1!=h(t,n,r,o)||(r=t,o=n),f(e,t,n,r,o))}function i(e,t,n){var r=e.startContainer,o=e.startOffset;t===e.endContainer&&n===e.endOffset||(m(t)==m(r)&&-1!=h(t,n,r,o)||(r=t,o=n),f(e,r,o,t,n))}var n=function(){};n.prototype=a.rangePrototype,e.prototype=new n,r.extend(e.prototype,{setStart:function(e,t){k(e,!0),W(e,t),o(this,e,t)},setEnd:function(e,t){k(e,!0),W(e,t),i(this,e,t)},setStartAndEnd:function(){var e=arguments,t=e[0],n=e[1],r=t,o=n;switch(e.length){case 3:o=e[2];break;case 4:r=e[2],o=e[3]}f(this,t,n,r,o)},setBoundary:function(e,t,n){this["set"+(n?"Start":"End")](e,t)},setStartBefore:t(!0,!0),setStartAfter:t(!1,!0),setEndBefore:t(!0,!1),setEndAfter:t(!1,!1),collapse:function(e){q(this),e?f(this,this.startContainer,this.startOffset,this.startContainer,this.startOffset):f(this,this.endContainer,this.endOffset,this.endContainer,this.endOffset)},selectNodeContents:function(e){k(e,!0),f(this,e,0,e,p(e))},selectNode:function(e){k(e,!1),L(e,A);var t=N(e),n=E(e);f(this,t.node,t.offset,n.node,n.offset)},extractContents:ce(O,f),deleteContents:ce(T,f),canSurroundContents:function(){q(this),z(this.startContainer),z(this.endContainer);var e=new D(this,!0),t=e._first&&v(e._first,this)||e._last&&v(e._last,this);return e.detach(),!t},splitBoundaries:function(){X(this)},splitBoundariesPreservingPositions:function(e){X(this,e)},normalizeBoundaries:function(){q(this);var e,o=this.startContainer,i=this.startOffset,a=this.endContainer,s=this.endOffset,t=function(e){var t=e.nextSibling;t&&t.nodeType==e.nodeType&&(s=(a=e).length,e.appendData(t.data),R(t))},n=function(e){var t=e.previousSibling;if(t&&t.nodeType==e.nodeType){var n=(o=e).length;if(i=t.length,e.insertData(0,t.data),R(t),o==a)s+=i,a=o;else if(a==e.parentNode){var r=l(e);s==r?(a=e,s=n):r<s&&s--}}},r=!0;if(u(a))s==a.length?t(a):0==s&&(e=a.previousSibling)&&e.nodeType==a.nodeType&&(s=e.length,o==a&&(r=!1),e.appendData(a.data),R(a),a=e);else{if(0<s){var c=a.childNodes[s-1];c&&u(c)&&t(c)}r=!this.collapsed}if(r){if(u(o))0==i?n(o):i==o.length&&(e=o.nextSibling)&&e.nodeType==o.nodeType&&(a==e&&(s+=(a=o).length),o.appendData(e.data),R(e));else if(i<o.childNodes.length){var d=o.childNodes[i];d&&u(d)&&n(d)}}else o=a,i=s;f(this,o,i,a,s)},collapseToPoint:function(e,t){k(e,!0),W(e,t),this.setStartAndEnd(e,t)}}),se(e)}function fe(e){e.collapsed=e.startContainer===e.endContainer&&e.startOffset===e.endOffset,e.commonAncestorContainer=e.collapsed?e.startContainer:s.getCommonAncestor(e.startContainer,e.endContainer)}function ue(e,t,n,r,o){e.startContainer=t,e.startOffset=n,e.endContainer=r,e.endOffset=o,e.document=s.getDocument(t),fe(e)}function le(e){this.startContainer=e,this.startOffset=0,this.endContainer=e,this.endOffset=0,this.document=e,fe(this)}r.extend(a.rangePrototype,{compareBoundaryPoints:function(e,t){var n,r,o,i;q(this),F(this.startContainer,t.startContainer);var a=e==te||e==J?"start":"end",s=e==K||e==J?"start":"end";return n=this[a+"Container"],r=this[a+"Offset"],o=t[s+"Container"],i=t[s+"Offset"],h(n,r,o,i)},insertNode:function(e){if(q(this),L(e,P),z(this.startContainer),d(e,this.startContainer))throw new c("HIERARCHY_REQUEST_ERR");var t=S(e,this.startContainer,this.startOffset);this.setStartBefore(t)},cloneContents:function(){var e,t;if(q(this),this.collapsed)return C(this).createDocumentFragment();if(this.startContainer===this.endContainer&&u(this.startContainer))return(e=this.startContainer.cloneNode(!0)).data=e.data.slice(this.startOffset,this.endOffset),(t=C(this).createDocumentFragment()).appendChild(e),t;var n=new D(this,!0);return e=function e(t){for(var n,r,o,i=C(t.range).createDocumentFragment();r=t.next();){if(n=t.isPartiallySelectedSubtree(),r=r.cloneNode(!n),n&&(o=t.getSubtreeIterator(),r.appendChild(e(o)),o.detach()),10==r.nodeType)throw new c("HIERARCHY_REQUEST_ERR");i.appendChild(r)}return i}(n),n.detach(),e},canSurroundContents:function(){q(this),z(this.startContainer),z(this.endContainer);var e=new D(this,!0),t=e._first&&v(e._first,this)||e._last&&v(e._last,this);return e.detach(),!t},surroundContents:function(e){if(L(e,b),!this.canSurroundContents())throw new c("INVALID_STATE_ERR");var t=this.extractContents();if(e.hasChildNodes())for(;e.lastChild;)e.removeChild(e.lastChild);S(e,this.startContainer,this.startOffset),e.appendChild(t),this.selectNode(e)},cloneRange:function(){q(this);for(var e,t=new le(C(this)),n=$.length;n--;)t[e=$[n]]=this[e];return t},toString:function(){q(this);var e=this.startContainer;if(e===this.endContainer&&u(e))return 3==e.nodeType||4==e.nodeType?e.data.slice(this.startOffset,this.endOffset):"";var t=[],n=new D(this,!0);return w(n,function(e){3!=e.nodeType&&4!=e.nodeType||t.push(e.data)}),n.detach(),t.join("")},compareNode:function(e){q(this);var t=e.parentNode,n=l(e);if(!t)throw new c("NOT_FOUND_ERR");var r=this.comparePoint(t,n),o=this.comparePoint(t,n+1);return r<0?0<o?oe:ne:0<o?re:ie},comparePoint:function(e,t){return q(this),j(e,"HIERARCHY_REQUEST_ERR"),F(e,this.startContainer),h(e,t,this.startContainer,this.startOffset)<0?-1:0<h(e,t,this.endContainer,this.endOffset)?1:0},createContextualFragment:G,toHtml:function(){return Z(this)},intersectsNode:function(e,t){if(q(this),m(e)!=m(this.startContainer))return!1;var n=e.parentNode,r=l(e);if(!n)return!0;var o=h(n,r,this.endContainer,this.endOffset),i=h(n,r+1,this.startContainer,this.startOffset);return t?o<=0&&0<=i:o<0&&0<i},isPointInRange:function(e,t){return q(this),j(e,"HIERARCHY_REQUEST_ERR"),F(e,this.startContainer),0<=h(e,t,this.startContainer,this.startOffset)&&h(e,t,this.endContainer,this.endOffset)<=0},intersectsRange:function(e){return y(this,e,!1)},intersectsOrTouchesRange:function(e){return y(this,e,!0)},intersection:function(e){if(this.intersectsRange(e)){var t=h(this.startContainer,this.startOffset,e.startContainer,e.startOffset),n=h(this.endContainer,this.endOffset,e.endContainer,e.endOffset),r=this.cloneRange();return-1==t&&r.setStart(e.startContainer,e.startOffset),1==n&&r.setEnd(e.endContainer,e.endOffset),r}return null},union:function(e){if(this.intersectsOrTouchesRange(e)){var t=this.cloneRange();return-1==h(e.startContainer,e.startOffset,this.startContainer,this.startOffset)&&t.setStart(e.startContainer,e.startOffset),1==h(e.endContainer,e.endOffset,this.endContainer,this.endOffset)&&t.setEnd(e.endContainer,e.endOffset),t}throw new c("Ranges do not intersect")},containsNode:function(e,t){return t?this.intersectsNode(e,!1):this.compareNode(e)==ie},containsNodeContents:function(e){return 0<=this.comparePoint(e,0)&&this.comparePoint(e,p(e))<=0},containsRange:function(e){var t=this.intersection(e);return null!==t&&e.equals(t)},containsNodeText:function(e){var t=this.cloneRange();t.selectNode(e);var n=t.getNodes([3]);if(0<n.length){t.setStart(n[0],0);var r=n.pop();return t.setEnd(r,r.length),this.containsRange(t)}return this.containsNodeContents(e)},getNodes:function(e,t){return q(this),function(r,e,o){var i,a=!(!e||!e.length),s=!!o;a&&(i=new RegExp("^("+e.join("|")+")$"));var c=[];return w(new D(r,!1),function(e){if((!a||i.test(e.nodeType))&&(!s||o(e))){var t=r.startContainer;if(e!=t||!u(t)||r.startOffset!=t.length){var n=r.endContainer;e==n&&u(n)&&0==r.endOffset||c.push(e)}}}),c}(this,e,t)},getDocument:function(){return C(this)},collapseBefore:function(e){this.setEndBefore(e),this.collapse(!1)},collapseAfter:function(e){this.setStartAfter(e),this.collapse(!0)},getBookmark:function(e){var t=C(this),n=a.createRange(t);e=e||s.getBody(t),n.selectNodeContents(e);var r=this.intersection(n),o=0,i=0;return r&&(n.setEnd(r.startContainer,r.startOffset),i=(o=n.toString().length)+r.toString().length),{start:o,end:i,containerNode:e}},moveToBookmark:function(e){var t=e.containerNode,n=0;this.setStart(t,0),this.collapse(!0);for(var r,o,i,a,s=[t],c=!1,d=!1;!d&&(r=s.pop());)if(3==r.nodeType)o=n+r.length,!c&&e.start>=n&&e.start<=o&&(this.setStart(r,e.start-n),c=!0),c&&e.end>=n&&e.end<=o&&(this.setEnd(r,e.end-n),d=!0),n=o;else for(i=(a=r.childNodes).length;i--;)s.push(a[i])},getName:function(){return"DomRange"},equals:function(e){return le.rangesEqual(this,e)},isValid:function(){return V(this)},inspect:function(){return _(this)},detach:function(){}}),de(le,ue),r.extend(le,{rangeProperties:$,RangeIterator:D,copyComparisonConstants:se,createPrototypeRange:de,inspect:_,toHtml:Z,getRangeDocument:C,rangesEqual:function(e,t){return e.startContainer===t.startContainer&&e.startOffset===t.startOffset&&e.endContainer===t.endContainer&&e.endOffset===t.endOffset}}),a.DomRange=le}),E.createCoreModule("WrappedRange",["DomRange"],function(f,u){var l,e,S=f.dom,h=f.util,y=S.DomPosition,g=f.DomRange,p=S.getBody,m=S.getContentDocument,w=S.isCharacterDataNode;if(f.features.implementsDomRange&&function(){var t,n,r=g.rangeProperties;function o(e){for(var t,n=r.length;n--;)e[t=r[n]]=e.nativeRange[t];e.collapsed=e.startContainer===e.endContainer&&e.startOffset===e.endOffset}l=function(e){if(!e)throw u.createError("WrappedRange: Range must be specified");this.nativeRange=e,o(this)},g.createPrototypeRange(l,function(e,t,n,r,o){var i=e.startContainer!==t||e.startOffset!=n,a=e.endContainer!==r||e.endOffset!=o,s=!e.equals(e.nativeRange);(i||a||s)&&(e.setEnd(r,o),e.setStart(t,n))}),(t=l.prototype).selectNode=function(e){this.nativeRange.selectNode(e),o(this)},t.cloneContents=function(){return this.nativeRange.cloneContents()},t.surroundContents=function(e){this.nativeRange.surroundContents(e),o(this)},t.collapse=function(e){this.nativeRange.collapse(e),o(this)},t.cloneRange=function(){return new l(this.nativeRange.cloneRange())},t.refresh=function(){o(this)},t.toString=function(){return this.nativeRange.toString()};var e=document.createTextNode("test");p(document).appendChild(e);var i=document.createRange();i.setStart(e,0),i.setEnd(e,0);try{i.setStart(e,1),t.setStart=function(e,t){this.nativeRange.setStart(e,t),o(this)},t.setEnd=function(e,t){this.nativeRange.setEnd(e,t),o(this)},n=function(t){return function(e){this.nativeRange[t](e),o(this)}}}catch(e){t.setStart=function(t,n){try{this.nativeRange.setStart(t,n)}catch(e){this.nativeRange.setEnd(t,n),this.nativeRange.setStart(t,n)}o(this)},t.setEnd=function(t,n){try{this.nativeRange.setEnd(t,n)}catch(e){this.nativeRange.setStart(t,n),this.nativeRange.setEnd(t,n)}o(this)},n=function(n,r){return function(t){try{this.nativeRange[n](t)}catch(e){this.nativeRange[r](t),this.nativeRange[n](t)}o(this)}}}t.setStartBefore=n("setStartBefore","setEndBefore"),t.setStartAfter=n("setStartAfter","setEndAfter"),t.setEndBefore=n("setEndBefore","setStartBefore"),t.setEndAfter=n("setEndAfter","setStartAfter"),t.selectNodeContents=function(e){this.setStartAndEnd(e,0,S.getNodeLength(e))},i.selectNodeContents(e),i.setEnd(e,3);var a=document.createRange();a.selectNodeContents(e),a.setEnd(e,4),a.setStart(e,2),-1==i.compareBoundaryPoints(i.START_TO_END,a)&&1==i.compareBoundaryPoints(i.END_TO_START,a)?t.compareBoundaryPoints=function(e,t){return e==(t=t.nativeRange||t).START_TO_END?e=t.END_TO_START:e==t.END_TO_START&&(e=t.START_TO_END),this.nativeRange.compareBoundaryPoints(e,t)}:t.compareBoundaryPoints=function(e,t){return this.nativeRange.compareBoundaryPoints(e,t.nativeRange||t)};var s=document.createElement("div");s.innerHTML="123";var c=s.firstChild,d=p(document);d.appendChild(s),i.setStart(c,1),i.setEnd(c,2),i.deleteContents(),"13"==c.data&&(t.deleteContents=function(){this.nativeRange.deleteContents(),o(this)},t.extractContents=function(){var e=this.nativeRange.extractContents();return o(this),e}),d.removeChild(s),d=null,h.isHostMethod(i,"createContextualFragment")&&(t.createContextualFragment=function(e){return this.nativeRange.createContextualFragment(e)}),p(document).removeChild(e),t.getName=function(){return"WrappedRange"},f.WrappedRange=l,f.createNativeRange=function(e){return(e=m(e,u,"createNativeRange")).createRange()}}(),f.features.implementsTextRange){var i=function(e,t,n,r,o){var i=e.duplicate();i.collapse(n);var a=i.parentElement();if(S.isOrIsAncestorOf(t,a)||(a=t),!a.canHaveHTML){var s=new y(a.parentNode,S.getNodeIndex(a));return{boundaryPosition:s,nodeInfo:{nodeIndex:s.offset,containerElement:s.node}}}var c=S.getDocument(a).createElement("span");c.parentNode&&S.removeNode(c);for(var d,f,u,l,h,g=n?"StartToStart":"StartToEnd",p=o&&o.containerElement==a?o.nodeIndex:0,m=a.childNodes.length,R=m,v=R;v==m?a.appendChild(c):a.insertBefore(c,a.childNodes[v]),i.moveToElementText(c),0!=(d=i.compareEndPoints(g,e))&&p!=R;){if(-1==d){if(R==p+1)break;p=v}else R=R==p+1?p:v;v=Math.floor((p+R)/2),a.removeChild(c)}if(h=c.nextSibling,-1==d&&h&&w(h)){var C;if(i.setEndPoint(n?"EndToStart":"EndToEnd",e),/[\r\n]/.test(h.data)){var N=i.duplicate(),E=N.text.replace(/\r\n/g,"\r").length;for(C=N.moveStart("character",E);-1==(d=N.compareEndPoints("StartToEnd",N));)C++,N.moveStart("character",1)}else C=i.text.length;l=new y(h,C)}else f=(r||!n)&&c.previousSibling,l=(u=(r||n)&&c.nextSibling)&&w(u)?new y(u,0):f&&w(f)?new y(f,f.data.length):new y(a,S.getNodeIndex(c));return S.removeNode(c),{boundaryPosition:l,nodeInfo:{nodeIndex:v,containerElement:a}}},o=function(e,t){var n,r,o,i,a=e.offset,s=S.getDocument(e.node),c=p(s).createTextRange(),d=w(e.node);return d?r=(n=e.node).parentNode:(n=a<(i=e.node.childNodes).length?i[a]:null,r=e.node),(o=s.createElement("span")).innerHTML="&#feff;",n?r.insertBefore(o,n):r.appendChild(o),c.moveToElementText(o),c.collapse(!t),r.removeChild(o),d&&c[t?"moveStart":"moveEnd"]("character",a),c};((e=function(e){this.textRange=e,this.refresh()}).prototype=new g(document)).refresh=function(){var e,t,n,r,o=function(e){var t=e.parentElement(),n=e.duplicate();n.collapse(!0);var r=n.parentElement();(n=e.duplicate()).collapse(!1);var o=n.parentElement(),i=r==o?r:S.getCommonAncestor(r,o);return i==t?i:S.getCommonAncestor(t,i)}(this.textRange);0==(r=this.textRange).compareEndPoints("StartToEnd",r)?t=e=i(this.textRange,o,!0,!0).boundaryPosition:(e=(n=i(this.textRange,o,!0,!1)).boundaryPosition,t=i(this.textRange,o,!1,!1,n.nodeInfo).boundaryPosition),this.setStart(e.node,e.offset),this.setEnd(t.node,t.offset)},e.prototype.getName=function(){return"WrappedTextRange"},g.copyComparisonConstants(e);var t=function(e){if(e.collapsed)return o(new y(e.startContainer,e.startOffset),!0);var t=o(new y(e.startContainer,e.startOffset),!0),n=o(new y(e.endContainer,e.endOffset),!1),r=p(g.getRangeDocument(e)).createTextRange();return r.setEndPoint("StartToStart",t),r.setEndPoint("EndToEnd",n),r};if(e.rangeToTextRange=t,e.prototype.toTextRange=function(){return t(this)},f.WrappedTextRange=e,!f.features.implementsDomRange||f.config.preferTextRange){var n=Function("return this;")();void 0===n.Range&&(n.Range=e),f.createNativeRange=function(e){return e=m(e,u,"createNativeRange"),p(e).createTextRange()},f.WrappedRange=e}}f.createRange=function(e){return e=m(e,u,"createRange"),new f.WrappedRange(f.createNativeRange(e))},f.createRangyRange=function(e){return e=m(e,u,"createRangyRange"),new g(e)},h.createAliasForDeprecatedMethod(f,"createIframeRange","createRange"),h.createAliasForDeprecatedMethod(f,"createIframeRangyRange","createRangyRange"),f.addShimListener(function(e){var t=e.document;void 0===t.createRange&&(t.createRange=function(){return f.createRange(t)}),t=e=null})}),E.createCoreModule("WrappedSelection",["DomRange","WrappedRange"],function(u,c){u.config.checkSelectionRanges=!0;var o,i,e="boolean",t="number",l=u.dom,n=u.util,r=n.isHostMethod,s=u.DomRange,a=u.WrappedRange,d=u.DOMException,f=l.DomPosition,h=u.features,g="Control",p=l.getDocument,m=l.getBody,R=s.rangesEqual;function v(e){return"string"==typeof e?/^backward(s)?$/i.test(e):!!e}function C(e,t){if(e){if(l.isWindow(e))return e;if(e instanceof q)return e.win;var n=l.getContentDocument(e,c,t);return l.getWindow(n)}return window}function N(e){return C(e,"getDocSelection").document.selection}function E(e){var t=!1;return e.anchorNode&&(t=1==l.comparePoints(e.anchorNode,e.anchorOffset,e.focusNode,e.focusOffset)),t}var S=r(window,"getSelection"),y=n.isHostObject(document,"selection");h.implementsWinGetSelection=S;var w=(h.implementsDocSelection=y)&&(!S||u.config.preferTextRange);if(w)o=N,u.isSelectionValid=function(e){var t=C(e,"isSelectionValid").document,n=t.selection;return"None"!=n.type||p(n.createRange().parentElement())==t};else{if(!S)return c.fail("Neither document.selection or window.getSelection() detected."),!1;o=function(e){return C(e,"getWinSelection").getSelection()},u.isSelectionValid=function(){return!0}}var T=(u.getNativeSelection=o)();if(!T)return c.fail("Native selection was null (possibly issue 138?)"),!1;var O=u.createNativeRange(document),_=m(document),D=n.areHostProperties(T,["anchorNode","focusNode","anchorOffset","focusOffset"]);h.selectionHasAnchorAndFocus=D;var A=r(T,"extend");h.selectionHasExtend=A;var x=typeof T.rangeCount==t;h.selectionHasRangeCount=x;var P=!1,b=!0,I=A?function(e,t){var n=s.getRangeDocument(t),r=u.createRange(n);r.collapseToPoint(t.endContainer,t.endOffset),e.addRange(W(r)),e.extend(t.startContainer,t.startOffset)}:null;n.areHostMethods(T,["addRange","getRangeAt","removeAllRanges"])&&typeof T.rangeCount==t&&h.implementsDomRange&&function(){var e=window.getSelection();if(e){for(var t=e.rangeCount,n=1<t,r=[],o=E(e),i=0;i<t;++i)r[i]=e.getRangeAt(i);var a=l.createTestElement(document,"",!1),s=a.appendChild(document.createTextNode("   ")),c=document.createRange();if(c.setStart(s,1),c.collapse(!0),e.removeAllRanges(),e.addRange(c),b=1==e.rangeCount,e.removeAllRanges(),!n){var d=window.navigator.appVersion.match(/Chrome\/(.*?) /);if(d&&36<=parseInt(d[1]))P=!1;else{var f=c.cloneRange();c.setStart(s,0),f.setEnd(s,3),f.setStart(s,2),e.addRange(c),e.addRange(f),P=2==e.rangeCount}}for(l.removeNode(a),e.removeAllRanges(),i=0;i<t;++i)0==i&&o?I?I(e,r[i]):(u.warn("Rangy initialization: original selection was backwards but selection has been restored forwards because the browser does not support Selection.extend"),e.addRange(r[i])):e.addRange(r[i])}}(),h.selectionSupportsMultipleRanges=P,h.collapsedNonEditableSelectionsSupported=b;var B,H,M=!1;function k(e,t,n){var r=n?"end":"start",o=n?"start":"end";e.anchorNode=t[r+"Container"],e.anchorOffset=t[r+"Offset"],e.focusNode=t[o+"Container"],e.focusOffset=t[o+"Offset"]}function L(e){e.anchorNode=e.focusNode=null,e.anchorOffset=e.focusOffset=0,e.rangeCount=0,e.isCollapsed=!0,e._ranges.length=0}function W(e){var t;return e instanceof s?((t=u.createNativeRange(e.getDocument())).setEnd(e.endContainer,e.endOffset),t.setStart(e.startContainer,e.startOffset)):e instanceof a?t=e.nativeRange:h.implementsDomRange&&e instanceof l.getWindow(e.startContainer).Range&&(t=e),t}function F(e){var t=e.getNodes();if(!function(e){if(!e.length||1!=e[0].nodeType)return!1;for(var t=1,n=e.length;t<n;++t)if(!l.isAncestorOf(e[0],e[t]))return!1;return!0}(t))throw c.createError("getSingleElementFromRange: range "+e.inspect()+" did not consist of a single element");return t[0]}function z(e){return!!e&&void 0!==e.text}function j(e,t){var n=new a(t);e._ranges=[n],k(e,n,!1),e.rangeCount=1,e.isCollapsed=n.collapsed}function U(e){if(e._ranges.length=0,"None"==e.docSelection.type)L(e);else{var t=e.docSelection.createRange();if(z(t))j(e,t);else{e.rangeCount=t.length;for(var n,r=p(t.item(0)),o=0;o<e.rangeCount;++o)(n=u.createRange(r)).selectNode(t.item(o)),e._ranges.push(n);e.isCollapsed=1==e.rangeCount&&e._ranges[0].collapsed,k(e,e._ranges[e.rangeCount-1],!1)}}}function V(e,t){for(var n=e.docSelection.createRange(),r=F(t),o=p(n.item(0)),i=m(o).createControlRange(),a=0,s=n.length;a<s;++a)i.add(n.item(a));try{i.add(r)}catch(e){throw c.createError("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)")}i.select(),U(e)}function q(e,t,n){this.nativeSelection=e,this.docSelection=t,this._ranges=[],this.win=n,this.refresh()}function Y(e){e.win=e.anchorNode=e.focusNode=e._ranges=null,e.rangeCount=e.anchorOffset=e.focusOffset=0,e.detached=!0}_&&r(_,"createControlRange")&&(B=_.createControlRange(),n.areHostProperties(B,["item","add"])&&(M=!0)),h.implementsControlRange=M,i=D?function(e){return e.anchorNode===e.focusNode&&e.anchorOffset===e.focusOffset}:function(e){return!!e.rangeCount&&e.getRangeAt(e.rangeCount-1).collapsed},r(T,"getRangeAt")?H=function(e,t){try{return e.getRangeAt(t)}catch(e){return null}}:D&&(H=function(e){var t=p(e.anchorNode),n=u.createRange(t);return n.setStartAndEnd(e.anchorNode,e.anchorOffset,e.focusNode,e.focusOffset),n.collapsed!==this.isCollapsed&&n.setStartAndEnd(e.focusNode,e.focusOffset,e.anchorNode,e.anchorOffset),n}),q.prototype=u.selectionPrototype;var Q=[];function G(e,t){for(var n,r,o=Q.length;o--;)if(r=(n=Q[o]).selection,"deleteAll"==t)Y(r);else if(n.win==e)return"delete"==t?(Q.splice(o,1),!0):r;return"deleteAll"==t&&(Q.length=0),null}var X=function(e){if(e&&e instanceof q)return e.refresh(),e;var t=G(e=C(e,"getNativeSelection")),n=o(e),r=y?N(e):null;return t?(t.nativeSelection=n,t.docSelection=r,t.refresh()):(t=new q(n,r,e),Q.push({win:e,selection:t})),t};u.getSelection=X,n.createAliasForDeprecatedMethod(u,"getIframeSelection","getSelection");var Z,$=q.prototype;function J(e,t){for(var n,r=p(t[0].startContainer),o=m(r).createControlRange(),i=0,a=t.length;i<a;++i){n=F(t[i]);try{o.add(n)}catch(e){throw c.createError("setRanges(): Element within one of the specified Ranges could not be added to control selection (does it have layout?)")}}o.select(),U(e)}if(!w&&D&&n.areHostMethods(T,["removeAllRanges","addRange"])){$.removeAllRanges=function(){this.nativeSelection.removeAllRanges(),L(this)};var K=function(e,t){I(e.nativeSelection,t),e.refresh()};$.addRange=x?function(e,t){if(M&&y&&this.docSelection.type==g)V(this,e);else if(v(t)&&A)K(this,e);else{var n;P?n=this.rangeCount:(this.removeAllRanges(),n=0);var r=W(e).cloneRange();try{this.nativeSelection.addRange(r)}catch(e){}if(this.rangeCount=this.nativeSelection.rangeCount,this.rangeCount==n+1){if(u.config.checkSelectionRanges){var o=H(this.nativeSelection,this.rangeCount-1);o&&!R(o,e)&&(e=new a(o))}this._ranges[this.rangeCount-1]=e,k(this,e,ee(this.nativeSelection)),this.isCollapsed=i(this)}else this.refresh()}}:function(e,t){v(t)&&A?K(this,e):(this.nativeSelection.addRange(W(e)),this.refresh())},$.setRanges=function(e){if(M&&y&&1<e.length)J(this,e);else{this.removeAllRanges();for(var t=0,n=e.length;t<n;++t)this.addRange(e[t])}}}else{if(!(r(T,"empty")&&r(O,"select")&&M&&w))return c.fail("No means of selecting a Range or TextRange was found"),!1;$.removeAllRanges=function(){try{if(this.docSelection.empty(),"None"!=this.docSelection.type){var e;if(this.anchorNode)e=p(this.anchorNode);else if(this.docSelection.type==g){var t=this.docSelection.createRange();t.length&&(e=p(t.item(0)))}if(e)m(e).createTextRange().select(),this.docSelection.empty()}}catch(e){}L(this)},$.addRange=function(e){this.docSelection.type==g?V(this,e):(u.WrappedTextRange.rangeToTextRange(e).select(),this._ranges[0]=e,this.rangeCount=1,this.isCollapsed=this._ranges[0].collapsed,k(this,e,!1))},$.setRanges=function(e){this.removeAllRanges();var t=e.length;1<t?J(this,e):t&&this.addRange(e[0])}}if($.getRangeAt=function(e){if(e<0||e>=this.rangeCount)throw new d("INDEX_SIZE_ERR");return this._ranges[e].cloneRange()},w)Z=function(e){var t;u.isSelectionValid(e.win)?t=e.docSelection.createRange():(t=m(e.win.document).createTextRange()).collapse(!0),e.docSelection.type==g?U(e):z(t)?j(e,t):L(e)};else if(r(T,"getRangeAt")&&typeof T.rangeCount==t)Z=function(e){if(M&&y&&e.docSelection.type==g)U(e);else if(e._ranges.length=e.rangeCount=e.nativeSelection.rangeCount,e.rangeCount){for(var t=0,n=e.rangeCount;t<n;++t)e._ranges[t]=new u.WrappedRange(e.nativeSelection.getRangeAt(t));k(e,e._ranges[e.rangeCount-1],ee(e.nativeSelection)),e.isCollapsed=i(e)}else L(e)};else{if(!D||typeof T.isCollapsed!=e||typeof O.collapsed!=e||!h.implementsDomRange)return c.fail("No means of obtaining a Range or TextRange from the user's selection was found"),!1;Z=function(e){var t,n,r,o=e.nativeSelection;o.anchorNode?(t=H(o,0),e._ranges=[t],e.rangeCount=1,r=(n=e).nativeSelection,n.anchorNode=r.anchorNode,n.anchorOffset=r.anchorOffset,n.focusNode=r.focusNode,n.focusOffset=r.focusOffset,e.isCollapsed=i(e)):L(e)}}$.refresh=function(e){var t=e?this._ranges.slice(0):null,n=this.anchorNode,r=this.anchorOffset;if(Z(this),e){var o=t.length;if(o!=this._ranges.length)return!0;if(this.anchorNode!=n||this.anchorOffset!=r)return!0;for(;o--;)if(!R(t[o],this._ranges[o]))return!0;return!1}};var ee,te=function(e,t){var n=e.getAllRanges();e.removeAllRanges();for(var r=0,o=n.length;r<o;++r)R(t,n[r])||e.addRange(n[r]);e.rangeCount||L(e)};function ne(e,t){if(e.win.document!=p(t))throw new d("WRONG_DOCUMENT_ERR")}function re(r){return function(e,t){var n;this.rangeCount?(n=this.getRangeAt(0))["set"+(r?"Start":"End")](e,t):(n=u.createRange(this.win.document)).setStartAndEnd(e,t),this.setSingleRange(n,this.isBackward())}}function oe(e){var t=[],n=new f(e.anchorNode,e.anchorOffset),r=new f(e.focusNode,e.focusOffset),o="function"==typeof e.getName?e.getName():"Selection";if(void 0!==e.rangeCount)for(var i=0,a=e.rangeCount;i<a;++i)t[i]=s.inspect(e.getRangeAt(i));return"["+o+"(Ranges: "+t.join(", ")+")(anchor: "+n.inspect()+", focus: "+r.inspect()+"]"}$.removeRange=M&&y?function(e){if(this.docSelection.type==g){for(var t=this.docSelection.createRange(),n=F(e),r=p(t.item(0)),o=m(r).createControlRange(),i=!1,a=0,s=t.length;a<s;++a)t.item(a)!==n||i?o.add(t.item(a)):i=!0;o.select(),U(this)}else te(this,e)}:function(e){te(this,e)},!w&&D&&h.implementsDomRange?(ee=E,$.isBackward=function(){return ee(this)}):ee=$.isBackward=function(){return!1},$.isBackwards=$.isBackward,$.toString=function(){for(var e=[],t=0,n=this.rangeCount;t<n;++t)e[t]=""+this._ranges[t];return e.join("")},$.collapse=function(e,t){ne(this,e);var n=u.createRange(e);n.collapseToPoint(e,t),this.setSingleRange(n),this.isCollapsed=!0},$.collapseToStart=function(){if(!this.rangeCount)throw new d("INVALID_STATE_ERR");var e=this._ranges[0];this.collapse(e.startContainer,e.startOffset)},$.collapseToEnd=function(){if(!this.rangeCount)throw new d("INVALID_STATE_ERR");var e=this._ranges[this.rangeCount-1];this.collapse(e.endContainer,e.endOffset)},$.selectAllChildren=function(e){ne(this,e);var t=u.createRange(e);t.selectNodeContents(e),this.setSingleRange(t)},$.deleteFromDocument=function(){if(M&&y&&this.docSelection.type==g){for(var e,t=this.docSelection.createRange();t.length;)e=t.item(0),t.remove(e),l.removeNode(e);this.refresh()}else if(this.rangeCount){var n=this.getAllRanges();if(n.length){this.removeAllRanges();for(var r=0,o=n.length;r<o;++r)n[r].deleteContents();this.addRange(n[o-1])}}},$.eachRange=function(e,t){for(var n=0,r=this._ranges.length;n<r;++n)if(e(this.getRangeAt(n)))return t},$.getAllRanges=function(){var t=[];return this.eachRange(function(e){t.push(e)}),t},$.setSingleRange=function(e,t){this.removeAllRanges(),this.addRange(e,t)},$.callMethodOnEachRange=function(t,n){var r=[];return this.eachRange(function(e){r.push(e[t].apply(e,n||[]))}),r},$.setStart=re(!0),$.setEnd=re(!1),u.rangePrototype.select=function(e){X(this.getDocument()).setSingleRange(this,e)},$.changeEachRange=function(t){var n=[],e=this.isBackward();this.eachRange(function(e){t(e),n.push(e)}),this.removeAllRanges(),e&&1==n.length?this.addRange(n[0],"backward"):this.setRanges(n)},$.containsNode=function(t,n){return this.eachRange(function(e){return e.containsNode(t,n)},!0)||!1},$.getBookmark=function(e){return{backward:this.isBackward(),rangeBookmarks:this.callMethodOnEachRange("getBookmark",[e])}},$.moveToBookmark=function(e){for(var t,n,r=[],o=0;t=e.rangeBookmarks[o++];)(n=u.createRange(this.win)).moveToBookmark(t),r.push(n);e.backward?this.setSingleRange(r[0],"backward"):this.setRanges(r)},$.saveRanges=function(){return{backward:this.isBackward(),ranges:this.callMethodOnEachRange("cloneRange")}},$.restoreRanges=function(e){this.removeAllRanges();for(var t,n=0;t=e.ranges[n];++n)this.addRange(t,e.backward&&0==n)},$.toHtml=function(){var t=[];return this.eachRange(function(e){t.push(s.toHtml(e))}),t.join("")},h.implementsTextRange&&($.getNativeTextRange=function(){var e;if(e=this.docSelection){var t=e.createRange();if(z(t))return t;throw c.createError("getNativeTextRange: selection is a control selection")}if(0<this.rangeCount)return u.WrappedTextRange.rangeToTextRange(this.getRangeAt(0));throw c.createError("getNativeTextRange: selection contains no range")}),$.getName=function(){return"WrappedSelection"},$.inspect=function(){return oe(this)},$.detach=function(){G(this.win,"delete"),Y(this)},q.detachAll=function(){G(null,"deleteAll")},q.inspect=oe,q.isDirectionBackward=v,u.Selection=q,u.selectionPrototype=$,u.addShimListener(function(e){void 0===e.getSelection&&(e.getSelection=function(){return X(e)}),e=null})});var B=!1,H=function(e){B||(B=!0,!E.initialized&&E.config.autoInitialize&&_())};return C&&("complete"==document.readyState?H():(f(document,"addEventListener")&&document.addEventListener("DOMContentLoaded",H,!1),R(window,"load",H))),E},this);
// Rangy class applier
!function(e,t){"function"==typeof define&&define.amd?define(["./rangy-core"],e):"undefined"!=typeof module&&"object"==typeof exports?module.exports=e(require("rangy")):e(t.rangy)}(function(e){return e.createModule("ClassApplier",["WrappedSelection"],function(s,d){var h=s.dom,r=h.DomPosition,o=h.arrayContains,e=s.util,m=e.forEach,a=e.isHostMethod(document,"createElementNS");function p(e,t){for(var n in e)if(e.hasOwnProperty(n)&&!1===t(n,e[n]))return!1;return!0}function g(e){return e.replace(/^\s\s*/,"").replace(/\s\s*$/,"")}function l(e,t){return!!e&&new RegExp("(?:^|\\s)"+t+"(?:\\s|$)").test(e)}function u(e,t){return"object"==typeof e.classList?e.classList.contains(t):l("string"==typeof e.className?e.className:e.getAttribute("class"),t)}function c(e,t){if("object"==typeof e.classList)e.classList.add(t);else{var n="string"==typeof e.className,s=n?e.className:e.getAttribute("class");s?l(s,t)||(s+=" "+t):s=t,n?e.className=s:e.setAttribute("class",s)}}var N=function(){function i(e,t,n){return t&&n?" ":""}return function(e,t){if("object"==typeof e.classList)e.classList.remove(t);else{var n="string"==typeof e.className,s=n?e.className:e.getAttribute("class");s=s.replace(new RegExp("(^|\\s)"+t+"(\\s|$)"),i),n?e.className=s:e.setAttribute("class",s)}}}();function t(e){return"string"==typeof e.className?e.className:e.getAttribute("class")}function v(e){return e&&e.split(/\s+/).sort().join(" ")}function n(e){return v(t(e))}function f(e,t){return n(e)==n(t)}function y(e,t){for(var n=t.split(/\s+/),s=0,i=n.length;s<i;++s)if(!u(e,g(n[s])))return!1;return!0}function C(e,f,c,t){-1==c&&(c=f.childNodes.length);var p=e.parentNode,d=h.getNodeIndex(e);m(t,function(e){var t,n,s,i,r,o,a,l,u;n=p,s=d,i=f,r=c,o=(t=e).node,a=t.offset,u=a,(l=o)==i&&r<a&&++u,o!=n||a!=s&&a!=s+1||(l=i,u+=r-s),o==n&&s+1<a&&--u,t.node=l,t.offset=u}),f.childNodes.length==c?f.appendChild(e):f.insertBefore(e,f.childNodes[c])}function T(e,t){var i=e.parentNode,r=h.getNodeIndex(e);m(t,function(e){var t,n,s;n=i,s=r,(t=e).node==n&&t.offset>s&&--t.offset}),h.removeNode(e)}function E(e,t){return function(e,t,n,s,i){for(var r,o=[];r=e.firstChild;)C(r,t,n++,i),o.push(r);return s&&T(e,i),o}(e,e.parentNode,h.getNodeIndex(e),!0,t)}function b(e,t){var n=e.cloneRange();n.selectNodeContents(t);var s=n.intersection(e);return""!=(s?s.toString():"")}function A(e){for(var t,n=e.getNodes([3]),s=0;(t=n[s])&&!b(e,t);)++s;for(var i=n.length-1;(t=n[i])&&!b(e,t);)--i;return n.slice(s,i+1)}function S(e,t){if(e.attributes.length!=t.attributes.length)return!1;for(var n,s,i,r=0,o=e.attributes.length;r<o;++r)if("class"!=(i=(n=e.attributes[r]).name)){if(null===n!=(null===(s=t.attributes.getNamedItem(i))))return!1;if(n.specified!=s.specified)return!1;if(n.specified&&n.nodeValue!==s.nodeValue)return!1}return!0}function x(e,t){for(var n,s=0,i=e.attributes.length;s<i;++s)if(n=e.attributes[s].name,(!t||!o(t,n))&&e.attributes[s].specified&&"class"!=n)return!0;return!1}var R=h.getComputedStyleProperty,P="boolean"==typeof document.createElement("div").isContentEditable?function(e){return e&&1==e.nodeType&&e.isContentEditable}:function(e){return!(!e||1!=e.nodeType||"false"==e.contentEditable)&&("true"==e.contentEditable||P(e.parentNode))};function w(e){var t;return e&&1==e.nodeType&&((t=e.parentNode)&&9==t.nodeType&&"on"==t.designMode||P(e)&&!P(e.parentNode))}function O(e){return(P(e)||1!=e.nodeType&&P(e.parentNode))&&!w(e)}var I=/^inline(-block|-table)?$/i;function W(e){return e&&1==e.nodeType&&!I.test(R(e,"display"))}var L=/[^\r\n\t\f \u200B]/;function M(e){var t,n,s=[];for(t=0;n=e[t++];)s.push(new r(n.startContainer,n.startOffset),new r(n.endContainer,n.endOffset));return s}function H(e,t){for(var n,s,i,r=0,o=e.length;r<o;++r)n=e[r],s=t[2*r],i=t[2*r+1],n.setStartAndEnd(s.node,s.offset,i.node,i.offset)}function j(e,t,n,s){var i,r,o,a,l=0==n;if(h.isAncestorOf(t,e))return e;if(h.isCharacterDataNode(t)){var u=h.getNodeIndex(t);if(0==n)n=u;else{if(n!=t.length)throw d.createError("splitNodeAt() should not be called with offset in the middle of a data node ("+n+" in "+t.data);n=u+1}t=t.parentNode}if(o=t,a=n,h.isCharacterDataNode(o)?0==a?o.previousSibling:a!=o.length||o.nextSibling:0<a&&a<o.childNodes.length){i=t.cloneNode(!1),r=t.parentNode,i.id&&i.removeAttribute("id");for(var f,c=0;f=t.childNodes[n];)C(f,i,c++,s);return C(i,r,h.getNodeIndex(t)+1,s),t==e?i:j(e,r,h.getNodeIndex(i),s)}if(e!=t){i=t.parentNode;var p=h.getNodeIndex(t);return l||p++,j(e,i,p,s)}return e}function $(a){var l=a?"nextSibling":"previousSibling";return function(e,t){var n,s,i=e.parentNode,r=e[l];if(r){if(r&&3==r.nodeType)return r}else if(t&&(r=i[l])&&1==r.nodeType&&(s=r,(n=i).namespaceURI==s.namespaceURI&&n.tagName.toLowerCase()==s.tagName.toLowerCase()&&f(n,s)&&S(n,s)&&"inline"==R(n,"display")&&"inline"==R(s,"display"))){var o=r[a?"firstChild":"lastChild"];if(o&&3==o.nodeType)return o}return null}}var z=$(!1),B=$(!0);function D(e){this.isElementMerge=1==e.nodeType,this.textNodes=[];var t=this.isElementMerge?e.lastChild:e;t&&(this.textNodes[0]=t)}var U=["elementTagName","ignoreWhiteSpace","applyToEditableOnly","useExistingElements","removeEmptyElements","onElementCreate"],V={};function k(e,t,n){var s,i,r,o,a=this;a.cssClass=a.className=e;var l=null,u={};if("object"==typeof t&&null!==t){for(void 0!==t.elementTagName&&(t.elementTagName=t.elementTagName.toLowerCase()),n=t.tagNames,l=t.elementProperties,u=t.elementAttributes,i=0;o=U[i++];)t.hasOwnProperty(o)&&(a[o]=t[o]);s=t.normalize}else s=t;a.normalize=void 0===s||s,a.attrExceptions=[];var f=document.createElement(a.elementTagName);a.elementProperties=a.copyPropertiesToElement(l,f,!0),p(u,function(e,t){a.attrExceptions.push(e),u[e]=""+t}),a.elementAttributes=u,a.elementSortedClassName=a.elementProperties.hasOwnProperty("className")?v(a.elementProperties.className+" "+e):e,a.applyToAnyTagName=!1;var c=typeof n;if("string"==c)"*"==n?a.applyToAnyTagName=!0:a.tagNames=g(n.toLowerCase()).split(/\s*,\s*/);else if("object"==c&&"number"==typeof n.length)for(a.tagNames=[],i=0,r=n.length;i<r;++i)"*"==n[i]?a.applyToAnyTagName=!0:a.tagNames.push(n[i].toLowerCase());else a.tagNames=[a.elementTagName]}k.prototype={elementTagName:"span",elementProperties:{},elementAttributes:{},ignoreWhiteSpace:!0,applyToEditableOnly:!(D.prototype={doMerge:function(e){var t=this.textNodes,s=t[0];if(1<t.length){var i,r=h.getNodeIndex(s),o=[],a=0;m(t,function(t,n){i=t.parentNode,0<n&&(i.removeChild(t),i.hasChildNodes()||h.removeNode(i),e&&m(e,function(e){e.node==t&&(e.node=s,e.offset+=a),e.node==i&&e.offset>r&&(--e.offset,e.offset==r+1&&n<len-1&&(e.node=s,e.offset=a))})),o[n]=t.data,a+=t.data.length}),s.data=o.join("")}return s.data},getLength:function(){for(var e=this.textNodes.length,t=0;e--;)t+=this.textNodes[e].length;return t},toString:function(){var n=[];return m(this.textNodes,function(e,t){n[t]="'"+e.data+"'"}),"[Merge("+n.join(",")+")]"}}),useExistingElements:!0,removeEmptyElements:!0,onElementCreate:null,copyPropertiesToElement:function(e,t,n){var s,i,r,o,a,l,u={};for(var f in e)if(e.hasOwnProperty(f))if(o=e[f],a=t[f],"className"==f)c(t,o),c(t,this.className),t[f]=v(t[f]),n&&(u[f]=o);else if("style"==f){for(s in i=a,n&&(u[f]=r={}),e[f])e[f].hasOwnProperty(s)&&(i[s]=o[s],n&&(r[s]=i[s]));this.attrExceptions.push(f)}else t[f]=o,n&&(u[f]=t[f],l=V.hasOwnProperty(f)?V[f]:f,this.attrExceptions.push(l));return n?u:""},copyAttributesToElement:function(e,t){for(var n in e)e.hasOwnProperty(n)&&!/^class(?:Name)?$/i.test(n)&&t.setAttribute(n,e[n])},appliesToElement:function(e){return o(this.tagNames,e.tagName.toLowerCase())},getEmptyElements:function(e){var t=this;return e.getNodes([1],function(e){return t.appliesToElement(e)&&!e.hasChildNodes()})},hasClass:function(e){return 1==e.nodeType&&(this.applyToAnyTagName||this.appliesToElement(e))&&u(e,this.className)},getSelfOrAncestorWithClass:function(e){for(;e;){if(this.hasClass(e))return e;e=e.parentNode}return null},isModifiable:function(e){return!this.applyToEditableOnly||O(e)},isIgnorableWhiteSpaceNode:function(e){return this.ignoreWhiteSpace&&e&&3==e.nodeType&&function(e){if(0==e.data.length)return!0;if(L.test(e.data))return!1;switch(R(e.parentNode,"whiteSpace")){case"pre":case"pre-wrap":case"-moz-pre-wrap":return!1;case"pre-line":if(/[\r\n]/.test(e.data))return!1}return W(e.previousSibling)||W(e.nextSibling)}(e)},postApply:function(e,t,n,s){var r,o,a=e[0],l=e[e.length-1],u=[],f=a,c=l,p=0,d=l.length;m(e,function(e){(o=z(e,!s))?(r||(r=new D(o),u.push(r)),r.textNodes.push(e),e===a&&(f=r.textNodes[0],p=f.length),e===l&&(c=r.textNodes[0],d=r.getLength())):r=null});var h=B(l,!s);if(h&&(r||(r=new D(l),u.push(r)),r.textNodes.push(h)),u.length){for(i=0,len=u.length;i<len;++i)u[i].doMerge(n);t.setStartAndEnd(f,p,c,d)}},createContainer:function(e){var t=h.getDocument(e),n=a&&!h.isHtmlNamespace(e)&&e.namespaceURI?t.createElementNS(e.namespaceURI,this.elementTagName):t.createElement(this.elementTagName);return this.copyPropertiesToElement(this.elementProperties,n,!1),this.copyAttributesToElement(this.elementAttributes,n),c(n,this.className),this.onElementCreate&&this.onElementCreate(n,this),n},elementHasProperties:function(n,e){var s=this;return p(e,function(e,t){if("className"==e)return y(n,t);if("object"==typeof t){if(!s.elementHasProperties(n[e],t))return!1}else if(n[e]!==t)return!1})},elementHasAttributes:function(n,e){return p(e,function(e,t){if(n.getAttribute(e)!==t)return!1})},applyToTextNode:function(e,t){if((r=e.parentNode)&&1==r.nodeType&&!/^(textarea|style|script|select|iframe)$/i.test(r.nodeName)){var n=e.parentNode;if(1==n.childNodes.length&&this.useExistingElements&&this.appliesToElement(n)&&this.elementHasProperties(n,this.elementProperties)&&this.elementHasAttributes(n,this.elementAttributes))c(n,this.className);else{var s=e.parentNode,i=this.createContainer(s);s.insertBefore(i,e),i.appendChild(e)}}var r},isRemovable:function(e){return e.tagName.toLowerCase()==this.elementTagName&&n(e)==this.elementSortedClassName&&this.elementHasProperties(e,this.elementProperties)&&!x(e,this.attrExceptions)&&this.elementHasAttributes(e,this.elementAttributes)&&this.isModifiable(e)},isEmptyContainer:function(e){var t=e.childNodes.length;return 1==e.nodeType&&this.isRemovable(e)&&(0==t||1==t&&this.isEmptyContainer(e.firstChild))},removeEmptyContainers:function(e){var t=this,n=e.getNodes([1],function(e){return t.isEmptyContainer(e)}),s=[e],i=M(s);m(n,function(e){T(e,i)}),H(s,i)},undoToTextNode:function(e,t,n,s){if(!t.containsNode(n)){var i=t.cloneRange();i.selectNode(n),i.isPointInRange(t.endContainer,t.endOffset)&&(j(n,t.endContainer,t.endOffset,s),t.setEndAfter(n)),i.isPointInRange(t.startContainer,t.startOffset)&&(n=j(n,t.startContainer,t.startOffset,s))}this.isRemovable(n)?E(n,s):N(n,this.className)},splitAncestorWithClass:function(e,t,n){var s=this.getSelfOrAncestorWithClass(e);s&&j(s,e,t,n)},undoToAncestor:function(e,t){this.isRemovable(e)?E(e,t):N(e,this.className)},applyToRange:function(e,t){var n=this,s=M((t=t||[])||[]);e.splitBoundariesPreservingPositions(s),n.removeEmptyElements&&n.removeEmptyContainers(e);var i=A(e);if(i.length){m(i,function(e){n.isIgnorableWhiteSpaceNode(e)||n.getSelfOrAncestorWithClass(e)||!n.isModifiable(e)||n.applyToTextNode(e,s)});var r=i[i.length-1];e.setStartAndEnd(i[0],0,r,r.length),n.normalize&&n.postApply(i,e,s,!1),H(t,s)}var o=n.getEmptyElements(e);m(o,function(e){c(e,n.className)})},applyToRanges:function(e){for(var t=e.length;t--;)this.applyToRange(e[t],e);return e},applyToSelection:function(e){var t=s.getSelection(e);t.setRanges(this.applyToRanges(t.getAllRanges()))},undoToRange:function(e,t){var n=this,s=M(t=t||[]);e.splitBoundariesPreservingPositions(s),n.removeEmptyElements&&n.removeEmptyContainers(e,s);var i,r,o=A(e),a=o[o.length-1];if(o.length){n.splitAncestorWithClass(e.endContainer,e.endOffset,s),n.splitAncestorWithClass(e.startContainer,e.startOffset,s);for(var l=0,u=o.length;l<u;++l)i=o[l],(r=n.getSelfOrAncestorWithClass(i))&&n.isModifiable(i)&&n.undoToAncestor(r,s);e.setStartAndEnd(o[0],0,a,a.length),n.normalize&&n.postApply(o,e,s,!0),H(t,s)}var f=n.getEmptyElements(e);m(f,function(e){N(e,n.className)})},undoToRanges:function(e){for(var t=e.length;t--;)this.undoToRange(e[t],e);return e},undoToSelection:function(e){var t=s.getSelection(e),n=s.getSelection(e).getAllRanges();this.undoToRanges(n),t.setRanges(n)},isAppliedToRange:function(e){if(e.collapsed||""==e.toString())return!!this.getSelfOrAncestorWithClass(e.commonAncestorContainer);var t=e.getNodes([3]);if(t.length)for(var n,s=0;n=t[s++];)if(!this.isIgnorableWhiteSpaceNode(n)&&b(e,n)&&this.isModifiable(n)&&!this.getSelfOrAncestorWithClass(n))return!1;return!0},isAppliedToRanges:function(e){var t=e.length;if(0==t)return!1;for(;t--;)if(!this.isAppliedToRange(e[t]))return!1;return!0},isAppliedToSelection:function(e){var t=s.getSelection(e);return this.isAppliedToRanges(t.getAllRanges())},toggleRange:function(e){this.isAppliedToRange(e)?this.undoToRange(e):this.applyToRange(e)},toggleSelection:function(e){this.isAppliedToSelection(e)?this.undoToSelection(e):this.applyToSelection(e)},getElementsWithClassIntersectingRange:function(e){var n=[],s=this;return e.getNodes([3],function(e){var t=s.getSelfOrAncestorWithClass(e);t&&!o(n,t)&&n.push(t)}),n},detach:function(){}},k.util={hasClass:u,addClass:c,removeClass:N,getClass:t,hasSameClasses:f,hasAllClasses:y,replaceWithOwnChildren:E,elementsHaveSameNonClassAttributes:S,elementHasNonClassAttributes:x,splitNodeAt:j,isEditableElement:P,isEditingHost:w,isEditable:O},s.CssClassApplier=s.ClassApplier=k,s.createClassApplier=function(e,t,n){return new k(e,t,n)},e.createAliasForDeprecatedMethod(s,"createCssClassApplier","createClassApplier",d)}),e},this);
// Rangy highlighter
!function(e,t){"function"==typeof define&&define.amd?define(["./rangy-core"],e):"undefined"!=typeof module&&"object"==typeof exports?module.exports=e(require("rangy")):e(t.rangy)}(function(e){return e.createModule("Highlighter",["ClassApplier"],function(T,e){var t=T.dom,i=t.arrayContains,o=t.getBody,x=T.util.createOptions,A=T.util.forEach,s=1;function n(e,t){return e.characterRange.start-t.characterRange.start}function f(e,t){return t?e.getElementById(t):o(e)}var r={};function a(e,t){this.type=e,this.converterCreator=t}function h(e,t){r[e]=new a(e,t)}function R(e){var t=r[e];if(t instanceof a)return t.create();throw new Error("Highlighter type '"+e+"' is not valid")}function H(e,t){this.start=e,this.end=t}a.prototype.create=function(){var e=this.converterCreator();return e.type=this.type,e},T.registerHighlighterType=h,H.prototype={intersects:function(e){return this.start<e.end&&this.end>e.start},isContiguousWith:function(e){return this.start==e.end||this.end==e.start},union:function(e){return new H(Math.min(this.start,e.start),Math.max(this.end,e.end))},intersection:function(e){return new H(Math.max(this.start,e.start),Math.min(this.end,e.end))},getComplements:function(e){var t=[];if(this.start>=e.start){if(this.end<=e.end)return[];t.push(new H(e.end,this.end))}else t.push(new H(this.start,Math.min(this.end,e.start))),this.end>e.end&&t.push(new H(e.end,this.end));return t},toString:function(){return"[CharacterRange("+this.start+", "+this.end+")]"}},H.fromCharacterRange=function(e){return new H(e.start,e.end)};var c,g={rangeToCharacterRange:function(e,t){var n=e.getBookmark(t);return new H(n.start,n.end)},characterRangeToRange:function(e,t,n){var r=T.createRange(e);return r.moveToBookmark({start:t.start,end:t.end,containerNode:n}),r},serializeSelection:function(e,t){for(var n=e.getAllRanges(),r=[],i=1==n.length&&e.isBackward(),a=0,s=n.length;a<s;++a)r[a]={characterRange:this.rangeToCharacterRange(n[a],t),backward:i};return r},restoreSelection:function(e,t,n){e.removeAllRanges();for(var r,i,a=e.win.document,s=0,h=t.length;s<h;++s)(i=t[s]).characterRange,r=this.characterRangeToRange(a,i.characterRange,n),e.addRange(r,i.backward)}};function I(e,t,n,r,i,a){i?(this.id=i,s=Math.max(s,i+1)):this.id=s++,this.characterRange=t,this.doc=e,this.classApplier=n,this.converter=r,this.containerElementId=a||null,this.applied=!1}function l(e,t){t=t||"textContent",this.doc=e||document,this.classAppliers={},this.highlights=[],this.converter=R(t)}h("textContent",function(){return g}),h("TextRange",function(){if(!c){var e=T.modules.TextRange;if(!e)throw new Error("TextRange module is missing.");if(!e.supported)throw new Error("TextRange module is present but not supported.");c={rangeToCharacterRange:function(e,t){return H.fromCharacterRange(e.toCharacterRange(t))},characterRangeToRange:function(e,t,n){var r=T.createRange(e);return r.selectCharacters(n,t.start,t.end),r},serializeSelection:function(e,t){return e.saveCharacterRanges(t)},restoreSelection:function(e,t,n){e.restoreCharacterRanges(n,t)}}}return c}),I.prototype={getContainerElement:function(){return f(this.doc,this.containerElementId)},getRange:function(){return this.converter.characterRangeToRange(this.doc,this.characterRange,this.getContainerElement())},fromRange:function(e){this.characterRange=this.converter.rangeToCharacterRange(e,this.getContainerElement())},getText:function(){return this.getRange().toString()},containsElement:function(e){return this.getRange().containsNodeContents(e.firstChild)},unapply:function(){this.classApplier.undoToRange(this.getRange()),this.applied=!1},apply:function(){this.classApplier.applyToRange(this.getRange()),this.applied=!0},getHighlightElements:function(){return this.classApplier.getElementsWithClassIntersectingRange(this.getRange())},toString:function(){return"[Highlight(ID: "+this.id+", class: "+this.classApplier.className+", character range: "+this.characterRange.start+" - "+this.characterRange.end+")]"}},l.prototype={addClassApplier:function(e){this.classAppliers[e.className]=e},getHighlightForElement:function(e){for(var t=this.highlights,n=0,r=t.length;n<r;++n)if(t[n].containsElement(e))return t[n];return null},removeHighlights:function(e){for(var t,n=0,r=this.highlights.length;n<r;++n)t=this.highlights[n],i(e,t)&&(t.unapply(),this.highlights.splice(n--,1))},removeAllHighlights:function(){this.removeHighlights(this.highlights)},getIntersectingHighlights:function(e){var n=[],r=this.highlights;return A(e,function(t){A(r,function(e){t.intersectsRange(e.getRange())&&!i(n,e)&&n.push(e)})}),n},highlightCharacterRanges:function(e,t,n){var r,i,a,s,h,o,c,g,l,u,p,d,f=this.highlights,R=this.converter,v=this.doc,m=[],C=e?this.classAppliers[e]:null,w=(n=x(n,{containerElementId:null,exclusive:!0})).containerElementId,y=n.exclusive;for(w&&(s=this.doc.getElementById(w))&&((h=T.createRange(this.doc)).selectNodeContents(s),o=new H(0,h.toString().length)),r=0,i=t.length;r<i;++r)if(c=t[r],p=[],o&&(c=c.intersection(o)),c.start!=c.end){for(a=0;a<f.length;++a)l=!1,w==f[a].containerElementId&&(g=f[a].characterRange,d=!(u=C==f[a].classApplier)&&y,(g.intersects(c)||g.isContiguousWith(c))&&(u||d)&&(d&&A(g.getComplements(c),function(e){p.push(new I(v,e,f[a].classApplier,R,null,w))}),l=!0,u&&(c=g.union(c)))),l?(m.push(f[a]),f[a]=new I(v,g.union(c),C,R,null,w)):p.push(f[a]);C&&p.push(new I(v,c,C,R,null,w)),this.highlights=f=p}A(m,function(e){e.unapply()});var E=[];return A(f,function(e){e.applied||(e.apply(),E.push(e))}),E},highlightRanges:function(e,t,n){var r,i=[],a=this.converter,s=(n=x(n,{containerElement:null,exclusive:!0})).containerElement,h=s?s.id:null;return s&&(r=T.createRange(s)).selectNodeContents(s),A(t,function(e){var t=s?r.intersection(e):e;i.push(a.rangeToCharacterRange(t,s||o(e.getDocument())))}),this.highlightCharacterRanges(e,i,{containerElementId:h,exclusive:n.exclusive})},highlightSelection:function(e,t){var n=this.converter,r=!!e&&this.classAppliers[e],i=(t=x(t,{containerElementId:null,exclusive:!0})).containerElementId,a=t.exclusive,s=t.selection||T.getSelection(this.doc),h=f(s.win.document,i);if(!r&&!1!==e)throw new Error("No class applier found for class '"+e+"'");var o=n.serializeSelection(s,h),c=[];A(o,function(e){c.push(H.fromCharacterRange(e.characterRange))});var g=this.highlightCharacterRanges(e,c,{containerElementId:i,exclusive:a});return n.restoreSelection(s,o,h),g},unhighlightSelection:function(e){e=e||T.getSelection(this.doc);var t=this.getIntersectingHighlights(e.getAllRanges());return this.removeHighlights(t),e.removeAllRanges(),t},getHighlightsInSelection:function(e){return e=e||T.getSelection(this.doc),this.getIntersectingHighlights(e.getAllRanges())},selectionOverlapsHighlight:function(e){return 0<this.getHighlightsInSelection(e).length},serialize:function(i){var e,a,s,h,o=this,t=o.highlights;return t.sort(n),e=(i=x(i,{serializeHighlightText:!1,type:o.converter.type})).type,(s=e!=o.converter.type)&&(h=R(e)),a=["type:"+e],A(t,function(e){var t,n=e.characterRange;s&&(t=e.getContainerElement(),n=h.rangeToCharacterRange(o.converter.characterRangeToRange(o.doc,n,t),t));var r=[n.start,n.end,e.id,e.classApplier.className,e.containerElementId];i.serializeHighlightText&&r.push(e.getText()),a.push(r.join("$"))}),a.join("|")},deserialize:function(e){var t,n,r,i,a,s,h,o,c=e.split("|"),g=[],l=c[0],u=!1;if(!l||!(t=/^type:(\w+)$/.exec(l)))throw new Error("Serialized highlights are invalid.");(n=t[1])!=this.converter.type&&(r=R(n),u=!0),c.shift();for(var p,d=c.length;0<d--;){if(s=new H(+(p=c[d].split("$"))[0],+p[1]),h=p[4]||null,u&&(o=f(this.doc,h),s=this.converter.rangeToCharacterRange(r.characterRangeToRange(this.doc,s,o),o)),!(i=this.classAppliers[p[3]]))throw new Error("No class applier found for class '"+p[3]+"'");(a=new I(this.doc,s,i,this.converter,parseInt(p[2]),h)).apply(),g.push(a)}this.highlights=g}},T.Highlighter=l,T.createHighlighter=function(e,t){return new l(e,t)}}),e},this);
// Rangy text range
!function(e,t){"function"==typeof define&&define.amd?define(["./rangy-core"],e):"undefined"!=typeof module&&"object"==typeof exports?module.exports=e(require("rangy")):e(t.rangy)}(function(e){return e.createModule("TextRange",["WrappedSelection"],function(S,t){var e,n,r,g="character",v="word",c=S.dom,i=S.util,a=i.extend,s=i.createOptions,d=c.getBody,o=/^[ \t\f\r\n]+$/,u=/^[ \t\f\r]+$/,h=/^[\t-\r \u0085\u00A0\u1680\u180E\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]+$/,l=/^[\t \u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]+$/,p="en",C=S.Selection.isDirectionBackward,f=!1,N=!1;function y(e,t){for(var n=e.slice(t.start,t.end),r={isWord:t.isWord,chars:n,toString:function(){return n.join("")}},i=0,o=n.length;i<o;++i)n[i].token=r;return r}function m(e,t,n){for(var r,i=n(e,t),o=[],a=0;r=i[a++];)o.push(y(e,r));return o}e=c.createTestElement(document,"<p>1 </p><p></p>",!0),n=e.firstChild,(r=S.getSelection()).collapse(n.lastChild,2),r.setStart(n.firstChild,0),e.innerHTML="1 <br />",r.collapse(e,2),r.setStart(e.firstChild,0),f=1==(""+r).length,e.innerHTML="1 <p>1</p>",r.collapse(e,2),r.setStart(e.firstChild,0),N=1==(""+r).length,c.removeNode(e),r.removeAllRanges();var x={includeBlockContentTrailingSpace:!0,includeSpaceBeforeBr:!0,includeSpaceBeforeBlock:!0,includePreLineTrailingSpace:!0,ignoreCharacters:""};var T={includeBlockContentTrailingSpace:!1,includeSpaceBeforeBr:!f,includeSpaceBeforeBlock:!N,includePreLineTrailingSpace:!0},P={en:{wordRegex:/[a-z0-9]+('[a-z0-9]+)*/gi,includeTrailingSpace:!1,tokenizer:function(e,t){var n,r=e.join(""),i=[];function o(e,t,n){i.push({start:e,end:t,isWord:n})}for(var a,s,c=0;n=t.wordRegex.exec(r);){if(s=(a=n.index)+n[0].length,c<a&&o(c,a,!1),t.includeTrailingSpace)for(;l.test(e[s]);)++s;o(a,s,!0),c=s}return c<e.length&&o(c,e.length,!1),i}}},b={caseSensitive:!1,withinRange:null,wholeWordsOnly:!1,wrap:!1,direction:"forward",wordOptions:null,characterOptions:null},w={wordOptions:null,characterOptions:null},R={wordOptions:null,characterOptions:null,trim:!1,trimStart:!0,trimEnd:!0},E={wordOptions:null,characterOptions:null,direction:"forward"};function B(e,t){var n,r,i,o=s(e,t);return t.hasOwnProperty("wordOptions")&&(o.wordOptions=(n=o.wordOptions)?(r=n.language||p,a(i={},P[r]||P[p]),a(i,n),i):P[p]),t.hasOwnProperty("characterOptions")&&(o.characterOptions=s(o.characterOptions,x)),o}var O,k,L,I=c.getComputedStyleProperty;k=document.createElement("table"),(L=d(document)).appendChild(k),O="block"==I(k,"display"),L.removeChild(k);var A={table:"table",caption:"table-caption",colgroup:"table-column-group",col:"table-column",thead:"table-header-group",tbody:"table-row-group",tfoot:"table-footer-group",tr:"table-row",td:"table-cell",th:"table-cell"};function W(e,t){var n=I(e,"display",t),r=e.tagName.toLowerCase();return"block"==n&&O&&A.hasOwnProperty(r)?A[r]:n}function _(e){for(var t,n=function(e){for(var t=[];e.parentNode;)t.unshift(e.parentNode),e=e.parentNode;return t}(t=e).concat([t]),r=0,i=n.length;r<i;++r)if(1==n[r].nodeType&&"none"==W(n[r]))return!0;return!1}function D(e,t){return!t&&e.hasChildNodes()?e.firstChild:function(e){for(;e&&!e.nextSibling;)e=e.parentNode;return e?e.nextSibling:null}(e)}function F(e){var t=e.previousSibling;if(t){for(e=t;e.hasChildNodes();)e=e.lastChild;return e}var n=e.parentNode;return n&&1==n.nodeType?n:null}function V(e){if(!e||3!=e.nodeType)return!1;var t=e.data;if(""===t)return!0;var n=e.parentNode;if(!n||1!=n.nodeType)return!1;var r=I(e.parentNode,"whiteSpace");return/^[\t\n\r ]+$/.test(t)&&/^(normal|nowrap)$/.test(r)||/^[\t\r ]+$/.test(t)&&"pre-line"==r}function $(e){return""===e.data||!!V(e)&&(!e.parentNode||!!_(e))}function M(e){var t,n,r=e.nodeType;return 7==r||8==r||_(e)||/^(script|style)$/i.test(e.nodeName)||3==(t=e).nodeType&&(n=t.parentNode)&&"hidden"==I(n,"visibility")||$(e)}function q(e,t){var n=e.nodeType;return 7==n||8==n||1==n&&"none"==W(e,t)}function j(){this.store={}}j.prototype={get:function(e){return this.store.hasOwnProperty(e)?this.store[e]:null},set:function(e,t){return this.store[e]=t}};function U(r,i,o){return function(e){var t=this.cache;if(t.hasOwnProperty(r))return 0,t[r];0;var n=i.call(this,o?this[o]:this,e);return t[r]=n}}function G(e,t){this.node=e,this.session=t,this.cache=new j,this.positions=new j}var K={getPosition:function(e){var t=this.positions;return t.get(e)||t.set(e,new te(this,e))},toString:function(){return"[NodeWrapper("+c.inspectNode(this.node)+")]"}},z="NON_SPACE",H="UNCOLLAPSIBLE_SPACE",Y="COLLAPSIBLE_SPACE",J="TRAILING_SPACE_BEFORE_BLOCK",Q="TRAILING_SPACE_IN_BLOCK",X="TRAILING_SPACE_BEFORE_BR",Z="PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK",ee="INCLUDED_TRAILING_LINE_BREAK_AFTER_BR";function te(e,t){this.offset=t,this.nodeWrapper=e,this.node=e.node,this.session=e.session,this.cache=new j}a(G.prototype=K,{isCharacterDataNode:U("isCharacterDataNode",c.isCharacterDataNode,"node"),getNodeIndex:U("nodeIndex",c.getNodeIndex,"node"),getLength:U("nodeLength",c.getNodeLength,"node"),containsPositions:U("containsPositions",function(e){return c.isCharacterDataNode(e)||!/^(area|base|basefont|br|col|frame|hr|img|input|isindex|link|meta|param)$/i.test(e.nodeName)},"node"),isWhitespace:U("isWhitespace",V,"node"),isCollapsedWhitespace:U("isCollapsedWhitespace",$,"node"),getComputedDisplay:U("computedDisplay",W,"node"),isCollapsed:U("collapsed",M,"node"),isIgnored:U("ignored",q,"node"),next:U("nextPos",D,"node"),previous:U("previous",F,"node"),getTextNodeInfo:U("textNodeInfo",function(e){var t=null,n=!1,r=I(e.parentNode,"whiteSpace"),i="pre-line"==r;return i?(t=u,n=!0):"normal"!=r&&"nowrap"!=r||(t=o,n=!0),{node:e,text:e.data,spaceRegex:t,collapseSpaces:n,preLine:i}},"node"),hasInnerText:U("hasInnerText",function(e,t){for(var n=this.session,r=n.getPosition(e.parentNode,this.getNodeIndex()+1),i=n.getPosition(e,0),o=t?r:i,a=t?i:r;o!==a;){if(o.prepopulateChar(),o.isDefinitelyNonEmpty())return!0;o=t?o.previousVisible():o.nextVisible()}return!1},"node"),isRenderedBlock:U("isRenderedBlock",function(e){for(var t=e.getElementsByTagName("br"),n=0,r=t.length;n<r;++n)if(!M(t[n]))return!0;return this.hasInnerText()},"node"),getTrailingSpace:U("trailingSpace",function(e){if("br"==e.tagName.toLowerCase())return"";switch(this.getComputedDisplay()){case"inline":for(var t=e.lastChild;t;){if(!q(t))return 1==t.nodeType?this.session.getNodeWrapper(t).getTrailingSpace():"";t=t.previousSibling}break;case"inline-block":case"inline-table":case"none":case"table-column":case"table-column-group":break;case"table-cell":return"\t";default:return this.isRenderedBlock(!0)?"\n":""}return""},"node"),getLeadingSpace:U("leadingSpace",function(e){switch(this.getComputedDisplay()){case"inline":case"inline-block":case"inline-table":case"none":case"table-column":case"table-column-group":case"table-cell":break;default:return this.isRenderedBlock(!1)?"\n":""}return""},"node")});var ne={character:"",characterType:"EMPTY",isBr:!1,prepopulateChar:function(){var e=this;if(!e.prepopulatedChar){var t=e.node,n=e.offset,r="",i="EMPTY",o=!1;if(0<n)if(3==t.nodeType){var a=t.data,s=a.charAt(n-1),c=e.nodeWrapper.getTextNodeInfo(),d=c.spaceRegex;c.collapseSpaces?d.test(s)?1<n&&d.test(a.charAt(n-2))||(c.preLine&&"\n"===a.charAt(n)?(r=" ",i=Z):(r=" ",i=Y)):(r=s,i=z,o=!0):(r=s,i=H,o=!0)}else{var u=t.childNodes[n-1];if(u&&1==u.nodeType&&!M(u)&&("br"==u.tagName.toLowerCase()?(r="\n",e.isBr=!0,o=!(i=Y)):e.checkForTrailingSpace=!0),!r){var l=t.childNodes[n];l&&1==l.nodeType&&!M(l)&&(e.checkForLeadingSpace=!0)}}e.prepopulatedChar=!0,e.character=r,e.characterType=i,e.isCharInvariant=o}},isDefinitelyNonEmpty:function(){var e=this.characterType;return e==z||e==H},resolveLeadingAndTrailingSpaces:function(){if(this.prepopulatedChar||this.prepopulateChar(),this.checkForTrailingSpace){var e=this.session.getNodeWrapper(this.node.childNodes[this.offset-1]).getTrailingSpace();e&&(this.isTrailingSpace=!0,this.character=e,this.characterType=Y),this.checkForTrailingSpace=!1}if(this.checkForLeadingSpace){var t=this.session.getNodeWrapper(this.node.childNodes[this.offset]).getLeadingSpace();t&&(this.isLeadingSpace=!0,this.character=t,this.characterType=Y),this.checkForLeadingSpace=!1}},getPrecedingUncollapsedPosition:function(e){for(var t=this;t=t.previousVisible();)if(""!==t.getCharacter(e))return t;return null},getCharacter:function(e){this.resolveLeadingAndTrailingSpaces();var t,n,r,i=this.character,o=(t=e.ignoreCharacters,(r="string"==typeof(n=t||"")?n.split(""):n).sort(function(e,t){return e.charCodeAt(0)-t.charCodeAt(0)}),r.join("").replace(/(.)\1+/g,"$1")),a=""!==i&&-1<o.indexOf(i);if(this.isCharInvariant)return a?"":i;var s=["character",e.includeSpaceBeforeBr,e.includeBlockContentTrailingSpace,e.includePreLineTrailingSpace,o].join("_"),c=this.cache.get(s);if(null!==c)return c;var d,u,l="",h=this.characterType==Y,p=!1,f=this;function g(){return p||(u=f.getPrecedingUncollapsedPosition(e),p=!0),u}return h&&(this.type==ee?l="\n":" "==i&&(!g()||u.isTrailingSpace||"\n"==u.character||" "==u.character&&u.characterType==Y)||("\n"==i&&this.isLeadingSpace?g()&&"\n"!=u.character&&(l="\n"):(d=this.nextUncollapsed())&&(d.isBr?this.type=X:d.isTrailingSpace&&"\n"==d.character?this.type=Q:d.isLeadingSpace&&"\n"==d.character&&(this.type=J),"\n"==d.character?(this.type!=X||e.includeSpaceBeforeBr)&&(this.type!=J||e.includeSpaceBeforeBlock)&&(this.type==Q&&d.isTrailingSpace&&!e.includeBlockContentTrailingSpace||(this.type!=Z||d.type!=z||e.includePreLineTrailingSpace)&&("\n"==i?d.isTrailingSpace?this.isTrailingSpace||this.isBr&&(d.type="TRAILING_LINE_BREAK_AFTER_BR",g()&&u.isLeadingSpace&&!u.isTrailingSpace&&"\n"==u.character?d.character="":d.type=ee):l="\n":" "==i&&(l=" "))):l=i))),-1<o.indexOf(l)&&(l=""),this.cache.set(s,l),l},equals:function(e){return!!e&&this.node===e.node&&this.offset===e.offset},inspect:function(){return"[Position("+c.inspectNode(this.node)+":"+this.offset+")]"},toString:function(){return this.character}};a(te.prototype=ne,{next:U("nextPos",function(e){var t,n,r,i=e.nodeWrapper,o=e.node,a=e.offset,s=i.session;return o?(a==i.getLength()?n=(t=o.parentNode)?i.getNodeIndex()+1:0:i.isCharacterDataNode()?(t=o,n=a+1):(r=o.childNodes[a],s.getNodeWrapper(r).containsPositions()?(t=r,n=0):(t=o,n=a+1)),t?s.getPosition(t,n):null):null}),previous:U("previous",function(e){var t,n,r,i=e.nodeWrapper,o=e.node,a=e.offset,s=i.session;return 0==a?n=(t=o.parentNode)?i.getNodeIndex():0:i.isCharacterDataNode()?(t=o,n=a-1):(r=o.childNodes[a-1],s.getNodeWrapper(r).containsPositions()?(t=r,n=c.getNodeLength(r)):(t=o,n=a-1)),t?s.getPosition(t,n):null}),nextVisible:U("nextVisible",function(e){var t=e.next();if(!t)return null;var n=t.nodeWrapper,r=t.node,i=t;return n.isCollapsed()&&(i=n.session.getPosition(r.parentNode,n.getNodeIndex()+1)),i}),nextUncollapsed:U("nextUncollapsed",function(e){for(var t=e;t=t.nextVisible();)if(t.resolveLeadingAndTrailingSpaces(),""!==t.character)return t;return null}),previousVisible:U("previousVisible",function(e){var t=e.previous();if(!t)return null;var n=t.nodeWrapper,r=t.node,i=t;return n.isCollapsed()&&(i=n.session.getPosition(r.parentNode,n.getNodeIndex())),i})});var re=null,ie=function(){function e(i){var o=new j;return{get:function(e){var t=o.get(e[i]);if(t)for(var n,r=0;n=t[r++];)if(n.node===e)return n;return null},set:function(e){var t=e.node[i];(o.get(t)||o.set(t,[])).push(e)}}}var n=i.isHostProperty(document.documentElement,"uniqueID");function t(){this.initCaches()}return t.prototype={initCaches:function(){var t;this.elementCache=n?(t=new j,{get:function(e){return t.get(e.uniqueID)},set:function(e){t.set(e.node.uniqueID,e)}}):e("tagName"),this.textNodeCache=e("data"),this.otherNodeCache=e("nodeName")},getNodeWrapper:function(e){var t;switch(e.nodeType){case 1:t=this.elementCache;break;case 3:t=this.textNodeCache;break;default:t=this.otherNodeCache}var n=t.get(e);return n||(n=new G(e,this),t.set(n)),n},getPosition:function(e,t){return this.getNodeWrapper(e).getPosition(t)},getRangeBoundaryPosition:function(e,t){var n=t?"start":"end";return this.getPosition(e[n+"Container"],e[n+"Offset"])},detach:function(){this.elementCache=this.textNodeCache=this.otherNodeCache=null}},t}();function oe(){return re||(ae(),re=new ie)}function ae(){re&&re.detach(),re=null}function se(e,n,r,i){r&&(n?M(r.node)&&(r=e.previousVisible()):M(r.node)&&(r=r.nextVisible()));var o=e,a=!1;var s,c=!1;return{next:function(){if(c)return c=!1,s;for(var e;t=void 0,t=null,n?(t=o,a||(o=o.previousVisible(),a=!o||r&&o.equals(r))):a||(t=o=o.nextVisible(),a=!o||r&&o.equals(r)),a&&(o=null),e=t;)if(e.getCharacter(i))return s=e;return null;var t},rewind:function(){if(!s)throw t.createError("createCharacterIterator: cannot rewind. Only one position can be rewound.");c=!0},dispose:function(){e=r=null}}}a(c,{nextNode:D,previousNode:F});var ce=Array.prototype.indexOf?function(e,t){return e.indexOf(t)}:function(e,t){for(var n=0,r=e.length;n<r;++n)if(e[n]===t)return n;return-1};function de(e,t,n){var s=se(e,!1,null,t),c=se(e,!0,null,t),r=n.tokenizer;function i(e){for(var t,n,r=[],i=e?s:c,o=!1,a=!1;t=i.next();){if(n=t.character,h.test(n))a&&(o=!(a=!1));else{if(o){i.rewind();break}a=!0}r.push(t)}return r}var o=i(!0),a=i(!1).reverse(),d=m(a.concat(o),n,r),u=o.length?d.slice(ce(d,o[0].token)):[],l=a.length?d.slice(0,ce(d,a.pop().token)+1):[];return{nextEndToken:function(){for(var e,t;1==u.length&&!(e=u[0]).isWord&&0<(t=i(!0)).length;)u=m(e.chars.concat(t),n,r);return u.shift()},previousStartToken:function(){for(var e,t;1==l.length&&!(e=l[0]).isWord&&0<(t=i(!1)).length;)l=m(t.reverse().concat(e.chars),n,r);return l.pop()},dispose:function(){s.dispose(),c.dispose(),u=l=null}}}function ue(e,t,n,r){var i=e.getRangeBoundaryPosition(t,!0),o=e.getRangeBoundaryPosition(t,!1);return se(r?o:i,!!r,r?i:o,n)}function le(e,t,n,r,c){var i,o,a,s,d,u,l=C(c.direction),h=se(e,l,e.session.getRangeBoundaryPosition(r,l),c.characterOptions),p="",f=[],g=null;function v(e,t){var n,r,i,o,a=f[e].previousVisible(),s=f[t-1];return{startPos:a,endPos:s,valid:!c.wholeWordsOnly||(n=a,r=s,i=c.wordOptions,(o=S.createRange(n.node)).setStartAndEnd(n.node,n.offset,r.node,r.offset),!o.expand("word",{wordOptions:i}))}}for(;i=h.next();)if(o=i.character,n||c.caseSensitive||(o=o.toLowerCase()),l?(f.unshift(i),p=o+p):(f.push(i),p+=o),n){if(d=t.exec(p))if(s=(a=d.index)+d[0].length,u){if(!l&&s<p.length||l&&0<a){g=v(a,s);break}}else u=!0}else if(-1!=(a=p.indexOf(t))){g=v(a,a+t.length);break}return u&&(g=v(a,s)),h.dispose(),g}function he(r){return function(){var e=!!re,t=[oe()].concat(i.toArray(arguments)),n=r.apply(this,t);return e||ae(),n}}function pe(s,c){return he(function(e,t,n,r){void 0===n&&(n=t,t=g),r=B(r,w);var i=s;c&&(i=0<=n,this.collapse(!i));var o=function(e,t,n,r,i){var o,a,s,c,d=0,u=e,l=Math.abs(n);if(0!==n){var h=n<0;switch(t){case g:for(a=se(e,h,null,r);(o=a.next())&&d<l;)++d,u=o;s=o,a.dispose();break;case v:for(var p=de(e,r,i),f=h?p.previousStartToken:p.nextEndToken;(c=f())&&d<l;)c.isWord&&(++d,u=h?c.chars[0]:c.chars[c.chars.length-1]);break;default:throw new Error("movePositionBy: unit '"+t+"' not implemented")}h?(u=u.previousVisible(),d=-d):u&&u.isLeadingSpace&&!u.isTrailingSpace&&(t==v&&(s=(a=se(e,!1,null,r)).next(),a.dispose()),s&&(u=s.previousVisible()))}return{position:u,unitsMoved:d}}(e.getRangeBoundaryPosition(this,i),t,n,r.characterOptions,r.wordOptions),a=o.position;return this[i?"setStart":"setEnd"](a.node,a.offset),o.unitsMoved})}function fe(a){return he(function(e,t){for(var n,r=ue(e,this,t=s(t,x),!a),i=0;(n=r.next())&&h.test(n.character);)++i;r.dispose();var o=0<i;return o&&this[a?"moveStart":"moveEnd"]("character",a?i:-i,{characterOptions:t}),o})}function ge(r){return he(function(e,t){var n=!1;return this.changeEachRange(function(e){n=e[r](t)||n}),n})}a(S.rangePrototype,{moveStart:pe(!0,!1),moveEnd:pe(!1,!1),move:pe(!0,!0),trimStart:fe(!0),trimEnd:fe(!1),trim:he(function(e,t){var n=this.trimStart(t),r=this.trimEnd(t);return n||r}),expand:he(function(e,t,n){var r=!1,i=(n=B(n,R)).characterOptions;if(t||(t=g),t==v){var o,a,s=n.wordOptions,c=e.getRangeBoundaryPosition(this,!0),d=e.getRangeBoundaryPosition(this,!1),u=de(c,i,s).nextEndToken(),l=u.chars[0].previousVisible();if(this.collapsed)o=u;else o=de(d,i,s).previousStartToken();return a=o.chars[o.chars.length-1],l.equals(c)||(this.setStart(l.node,l.offset),r=!0),a&&!a.equals(d)&&(this.setEnd(a.node,a.offset),r=!0),n.trim&&(n.trimStart&&(r=this.trimStart(i)||r),n.trimEnd&&(r=this.trimEnd(i)||r)),r}return this.moveEnd(g,1,n)}),text:he(function(e,t){return this.collapsed?"":function(e,t,n){for(var r,i=[],o=ue(e,t,n);r=o.next();)i.push(r);return o.dispose(),i}(e,this,s(t,x)).join("")}),selectCharacters:he(function(e,t,n,r,i){var o={characterOptions:i};t||(t=d(this.getDocument())),this.selectNodeContents(t),this.collapse(!0),this.moveStart("character",n,o),this.collapse(!0),this.moveEnd("character",r-n,o)}),toCharacterRange:he(function(e,t,n){t||(t=d(this.getDocument()));var r,i=t.parentNode,o=c.getNodeIndex(t),a=-1==c.comparePoints(this.startContainer,this.endContainer,i,o),s=this.cloneRange();return a?(s.setStartAndEnd(this.startContainer,this.startOffset,i,o),r=-s.text(n).length):(s.setStartAndEnd(i,o,this.startContainer,this.startOffset),r=s.text(n).length),{start:r,end:r+this.text(n).length}}),findText:he(function(e,t,n){(n=B(n,b)).wholeWordsOnly&&(n.wordOptions.includeTrailingSpace=!1);var r=C(n.direction),i=n.withinRange;i||(i=S.createRange()).selectNodeContents(this.getDocument());var o=t,a=!1;"string"==typeof o?n.caseSensitive||(o=o.toLowerCase()):a=!0;var s=e.getRangeBoundaryPosition(this,!r),c=i.comparePoint(s.node,s.offset);-1===c?s=e.getRangeBoundaryPosition(i,!0):1===c&&(s=e.getRangeBoundaryPosition(i,!1));for(var d,u=s,l=!1;;)if(d=le(u,o,a,i,n)){if(d.valid)return this.setStartAndEnd(d.startPos.node,d.startPos.offset,d.endPos.node,d.endPos.offset),!0;u=r?d.startPos:d.endPos}else{if(!n.wrap||l)return!1;i=i.cloneRange(),u=e.getRangeBoundaryPosition(i,!r),i.setBoundary(s.node,s.offset,r),l=!0}}),pasteHtml:function(e){if(this.deleteContents(),e){var t=this.createContextualFragment(e),n=t.lastChild;this.insertNode(t),this.collapseAfter(n)}}}),a(S.selectionPrototype,{expand:he(function(e,t,n){this.changeEachRange(function(e){e.expand(t,n)})}),move:he(function(e,t,n,r){var i=0;if(this.focusNode){this.collapse(this.focusNode,this.focusOffset);var o=this.getRangeAt(0);r||(r={}),r.characterOptions=s(r.characterOptions,T),i=o.move(t,n,r),this.setSingleRange(o)}return i}),trimStart:ge("trimStart"),trimEnd:ge("trimEnd"),trim:ge("trim"),selectCharacters:he(function(e,t,n,r,i,o){var a=S.createRange(t);a.selectCharacters(t,n,r,o),this.setSingleRange(a,i)}),saveCharacterRanges:he(function(e,t,n){for(var r=this.getAllRanges(),i=[],o=1==r.length&&this.isBackward(),a=0,s=r.length;a<s;++a)i[a]={characterRange:r[a].toCharacterRange(t,n),backward:o,characterOptions:n};return i}),restoreCharacterRanges:he(function(e,t,n){this.removeAllRanges();for(var r,i,o,a=0,s=n.length;a<s;++a)o=(i=n[a]).characterRange,(r=S.createRange(t)).selectCharacters(t,o.start,o.end,i.characterOptions),this.addRange(r,i.backward)}),text:he(function(e,t){for(var n=[],r=0,i=this.rangeCount;r<i;++r)n[r]=this.getRangeAt(r).text(t);return n.join("")})}),S.innerText=function(e,t){var n=S.createRange(e);return n.selectNodeContents(e),n.text(t)},S.createWordIterator=function(e,t,n){var r=oe();n=B(n,E);var i=de(r.getPosition(e,t),n.characterOptions,n.wordOptions),o=C(n.direction);return{next:function(){return o?i.previousStartToken():i.nextEndToken()},dispose:function(){i.dispose(),this.next=function(){}}}},S.noMutation=function(e){e(oe()),ae()},S.noMutation.createEntryPointFunction=he,S.textRange={isBlockNode:function(e){return e&&(1==e.nodeType&&!/^(inline(-block|-table)?|none)$/.test(W(e))||9==e.nodeType||11==e.nodeType)},isCollapsedWhitespaceNode:$,createPosition:he(function(e,t,n){return e.getPosition(t,n)})}}),e},this);

let highlighter;
const rangyOptions = { exclusive: false };
function initHighlighter() {
    highlighter = rangy.createHighlighter(simpleArticleIframe);

    const rangeOptions = { onElementCreate: elem => {
        elem.id = 'jr-' + Date.now();
        hasSavedLink = false;
        shareDropdown.classList.remove("active");
        setTimeout(() => updateSavedVersion(), 10);
    } };

    highlighter.addClassApplier(rangy.createClassApplier("jr-highlight-yellow", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-highlight-blue", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-highlight-green", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-highlight-pink", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-highlight-purple", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-highlight-orange", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-highlight-red", rangeOptions));

    highlighter.addClassApplier(rangy.createClassApplier("jr-color-white", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-color-black", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-color-yellow", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-color-blue", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-color-green", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-color-pink", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-color-purple", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-color-orange", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-color-red", rangeOptions));

    highlighter.addClassApplier(rangy.createClassApplier("jr-strike-through", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-underline", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-italicize", rangeOptions));
    highlighter.addClassApplier(rangy.createClassApplier("jr-bolden", rangeOptions));
}


let lastMessage;
let editorShortcutsEnabled = false;
function handleEnd(e) {
    let isTouch = e.type === "touchend";

    if(typeof editBar === "undefined") {
        editBar = createEditBar();
        editBar.style.display = "none";
        simpleArticleIframe.body.appendChild(editBar);

        if(isTouch) {
            editBar.style.transform = "translateY(-100%)";
            editBar.querySelectorAll(".jr-color-picker").foreach(picker => {
                picker.style.top = "auto";
                picker.style.bottom = "100%";
            });
        }

        editBar.addEventListener("click", hidePickers);

        editBar.querySelector(".jr-bold").addEventListener("click", bolden);
        editBar.querySelector(".jr-italics").addEventListener("click", italicize);
        editBar.querySelector(".jr-underl").addEventListener("click", underline);
        editBar.querySelector(".jr-strike").addEventListener("click", strikeThrough);
        editBar.querySelector(".jr-deleteSel").addEventListener("click", deleteSelection);

        textPicker = editBar.querySelector(".jr-text-picker");
        editBar.querySelector(".jr-text-color").addEventListener("click", function(e) {
            hidePickers();
            textPicker.style.display = "block";
            e.stopPropagation();
        });
        textPicker.querySelectorAll(".jr-color-swatch").forEach(function(swatch) {
            swatch.addEventListener("click", function(e) {
                colorSelectedText(swatch.dataset.color);
                e.stopPropagation();
            });
        });

        highlightPicker = editBar.querySelector(".jr-highlight-picker");
        editBar.querySelector(".jr-highlight-color").addEventListener("click", function(e) {
            hidePickers();
            highlightSelectedText(lastHighlightColor);
            highlightPicker.style.display = "block";
            e.stopPropagation();
        });
        highlightPicker.querySelectorAll(".jr-color-swatch").forEach(function(swatch) {
            swatch.addEventListener("click", function(e) {
                highlightSelectedText(swatch.dataset.color);
                e.stopPropagation();
            });
        });

        editBar.querySelector(".jr-remove-styles").addEventListener("click", removeHighlightFromSelectedText);
    }

    const sel = rangy.getSelection(simpleArticleIframe).toString();
    if(sel !== ""
    && sel !== lastMessage
    && isContentElem(e.target)) {
        editorShortcutsEnabled = true;
        lastMessage = sel;

        editBar.style.display = "block";
        const r = rangy.getSelection(simpleArticleIframe).nativeSelection.getRangeAt(0).getBoundingClientRect();
        editBar.style.top = (r.top + simpleArticleIframe.defaultView.pageYOffset - 60) + 'px';
        editBar.style.left = (r.left + r.width / 2 + simpleArticleIframe.defaultView.pageXOffset - 105) + 'px';
    } else if(!editBar.contains(e.target)) {
        hideToolbar();

        if(simpleArticleIframe.querySelector(".jr-adding")
        && simpleArticleIframe.querySelector(".jr-adding textarea").value === ""
        && !simpleArticleIframe.querySelector(".jr-adding").contains(e.target)) {
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

    if(editBar) {
        editBar.style.display = "none";
        hidePickers();
    }

    checkBreakpoints();
}

function checkBreakpoints() {
    if(simpleArticleIframe) {
        let container = simpleArticleIframe.querySelector(".simple-article-container");
        if(window.innerWidth - container.offsetWidth < 320) { // Too small to show regular comments
            simpleArticleIframe.body.classList.add("simple-compact-view");
        } else {
            simpleArticleIframe.body.classList.remove("simple-compact-view");
        }
    }
}

function addHighlighterNotification() {
    const notification = {
        textContent: "To annotate this article, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>! Annotations are just <em>one</em> of the additional features included.",
        url: "https://justread.link/#get-Just-Read",
        primaryText: "Learn more",
        secondaryText: "Maybe later",
    };
    simpleArticleIframe.body.appendChild(createNotification(notification));
}

let lastHighlightColor = "yellow";
function highlightSelectedText(colorName) {
    lastHighlightColor = colorName;
    if(isPremium) {
        highlighter.highlightSelection("jr-highlight-" + colorName, { exclusive: true });
    } else {
        addHighlighterNotification();
    }
}

let lastFontColor = "black";
function colorSelectedText(colorName) {
    lastFontColor = colorName;
    if(isPremium) {
        highlighter.highlightSelection("jr-color-" + colorName, rangyOptions);
    } else {
        addHighlighterNotification();
    }
}

function bolden() {
    if(isPremium) {
        highlighter.highlightSelection("jr-bolden", rangyOptions);
    } else {
        addHighlighterNotification();
    }
}

function italicize() {
    if(isPremium) {
        highlighter.highlightSelection("jr-italicize", rangyOptions);
    } else {
        addHighlighterNotification();
    }
}

function underline() {
    if(isPremium) {
        highlighter.highlightSelection("jr-underline", rangyOptions);
    } else {
        addHighlighterNotification();
    }
}

function strikeThrough() {
    if(isPremium) {
        highlighter.highlightSelection("jr-strike-through", rangyOptions);
    } else {
        addHighlighterNotification();
    }
}

function deleteSelection() {
    if(isPremium) {
        const sel = rangy.getSelection(simpleArticleIframe);
        if(sel.rangeCount > 0) {
            for(let i = 0; i < sel.rangeCount; i++) {
                sel.getRangeAt(i).deleteContents();
            }
            hideToolbar();
        }
    } else {
        addHighlighterNotification();
    }
}

function noteSelectedText() {
    highlighter.highlightSelection("note");
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
    editBar.innerHTML = '\
        <button class="jr-bold" title="Bold (Ctrl+b)"><svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"><path d="M9,3.5 C9,1.57 7.43,0 5.5,0 L1.77635684e-15,0 L1.77635684e-15,12 L6.25,12 C8.04,12 9.5,10.54 9.5,8.75 C9.5,7.45 8.73,6.34 7.63,5.82 C8.46,5.24 9,4.38 9,3.5 Z M5,2 C5.82999992,2 6.5,2.67 6.5,3.5 C6.5,4.33 5.82999992,5 5,5 L3,5 L3,2 L5,2 Z M3,10 L3,7 L5.5,7 C6.32999992,7 7,7.67 7,8.5 C7,9.33 6.32999992,10 5.5,10 L3,10 Z" transform="translate(4 3)"/></svg></button>\
        <button class="jr-italics" title="Italicize (Ctrl+i)"><svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"><polygon points="4 0 4 2 6.58 2 2.92 10 0 10 0 12 8 12 8 10 5.42 10 9.08 2 12 2 12 0" transform="translate(3 3)"/></svg></button>\
        <button class="jr-underl" title="Underline (Ctrl+u)"><svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M6,12 C8.76,12 11,9.76 11,7 L11,0 L9,0 L9,7 C9,8.75029916 7.49912807,10 6,10 C4.50087193,10 3,8.75837486 3,7 L3,0 L1,0 L1,7 C1,9.76 3.24,12 6,12 Z M0,13 L0,15 L12,15 L12,13 L0,13 Z" transform="translate(3 3)"/></svg></button>\
        <button class="jr-strike" title="Strike-through (Ctrl+Shift+s)"><svg viewBox="0 0 533.333 533.333" xmlns="http://www.w3.org/2000/svg"><path d="M533.333,266.667V300H411.195c14.325,20.058,22.139,43.068,22.139,66.667c0,36.916-19.094,72.409-52.386,97.377   C350.033,487.23,309.446,500,266.667,500c-42.78,0-83.366-12.77-114.281-35.956C119.094,439.076,100,403.583,100,366.667h66.667   c0,36.137,45.795,66.666,100,66.666s100-30.529,100-66.666c0-36.138-45.795-66.667-100-66.667H0v-33.333h155.999   c-1.218-0.862-2.425-1.731-3.613-2.623C119.094,239.075,100,203.582,100,166.667s19.094-72.408,52.385-97.377   c30.916-23.187,71.501-35.956,114.281-35.956c42.779,0,83.366,12.77,114.281,35.956c33.292,24.969,52.386,60.461,52.386,97.377   h-66.667c0-36.136-45.795-66.667-100-66.667s-100,30.53-100,66.667c0,36.137,45.795,66.667,100,66.667   c41.135,0,80.236,11.811,110.668,33.333H533.333z"/></svg></button>\
        <button class="jr-text-color" title="Text color (Ctrl+Shift+c)"><svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"><path d="M7,0 L5,0 L0.5,12 L2.5,12 L3.62,9 L8.37,9 L9.49,12 L11.49,12 L7,0 L7,0 Z M4.38,7 L6,2.67 L7.62,7 L4.38,7 L4.38,7 Z" transform="translate(3 1)"/></svg></button>\
        <button class="jr-highlight-color" title="Highlight color (Ctrl+Shift+h)"><svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"><path d="M6,5 L2,9 L3,10 L0,13 L4,13 L5,12 L5,12 L6,13 L10,9 L6,5 L6,5 Z M10.2937851,0.706214905 C10.6838168,0.316183183 11.3138733,0.313873291 11.7059121,0.705912054 L14.2940879,3.29408795 C14.6839524,3.68395241 14.6796852,4.32031476 14.2937851,4.7062149 L11,8 L7,4 L10.2937851,0.706214905 Z"/></svg></button>\
        <button class="jr-remove-styles" title="Clear formatting (Ctrl+\\)"><svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"><path d="M0.27,1.55 L5.43,6.7 L3,12 L5.5,12 L7.14,8.42 L11.73,13 L13,11.73 L1.55,0.27 L0.27,1.55 L0.27,1.55 Z M3.82,0 L5.82,2 L7.58,2 L7.03,3.21 L8.74,4.92 L10.08,2 L14,2 L14,0 L3.82,0 L3.82,0 Z" transform="translate(2 3)"/></svg></button>\
        <button class="jr-deleteSel" title="Delete highlighted text (Ctrl+Shift+d)"><svg viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="m702.89 734.91v579.46c0 9.3908-3.0099 17.096-9.0296 23.116-6.0197 6.0198-13.725 9.0296-23.116 9.0296h-64.411c-9.3908 0-17.096-3.0098-23.116-9.0296-6.0197-6.0197-9.0296-13.725-9.0296-23.116v-579.46c0-9.3908 3.0099-17.096 9.0296-23.116s13.725-9.0296 23.116-9.0296h64.411c9.3908 0 17.096 3.0099 23.116 9.0296s9.0296 13.725 9.0296 23.116zm257.52 0v579.46c0 9.3908-3.0099 17.096-9.0296 23.116-6.0197 6.0198-13.725 9.0296-23.116 9.0296h-64.411c-9.3908 0-17.096-3.0098-23.116-9.0296-6.0197-6.0197-9.0296-13.725-9.0296-23.116v-579.46c0-9.3908 3.0099-17.096 9.0296-23.116s13.725-9.0296 23.116-9.0296h64.411c9.3908 0 17.096 3.0099 23.116 9.0296s9.0296 13.725 9.0296 23.116zm257.52 0v579.46c0 9.3908-3.0098 17.096-9.0296 23.116-6.0197 6.0198-13.725 9.0296-23.116 9.0296h-64.411c-9.3908 0-17.096-3.0098-23.116-9.0296-6.0197-6.0197-9.0295-13.725-9.0295-23.116v-579.46c0-9.3908 3.0098-17.096 9.0295-23.116 6.0198-6.0197 13.725-9.0296 23.116-9.0296h64.411c9.3908 0 17.096 3.0099 23.116 9.0296 6.0198 6.0197 9.0296 13.725 9.0296 23.116zm128.7 728.27v-953.52h-901.27v953.65c0 14.809 2.2875 28.293 6.9829 40.693 4.6954 12.401 9.5112 21.43 14.568 27.209 5.0566 5.6585 8.548 8.548 10.595 8.548h836.86c2.0467 0 5.5381-2.8895 10.595-8.548 5.0566-5.6586 9.8724-14.809 14.568-27.209 4.8158-12.401 7.1033-26.005 7.1033-40.814zm-675.9-1082.3h450.64l-48.278-117.75c-4.6954-6.0197-10.354-9.752-17.096-11.076h-318.93c-6.7421 1.3243-12.401 5.0566-17.096 11.076zm933.42 32.266v64.411c0 9.3908-3.0099 17.096-9.0296 23.116-6.0197 6.0197-13.725 9.0296-23.116 9.0296h-96.556v953.65c0 55.622-15.772 103.78-47.315 144.35-31.543 40.573-69.347 60.799-113.65 60.799h-836.98c-44.305 0-82.109-19.624-113.65-58.873-31.543-39.249-47.315-86.684-47.315-142.31v-957.62h-96.556c-9.3908 0-17.096-3.0099-23.116-9.0296-6.0197-6.0197-9.0296-13.725-9.0296-23.116v-64.411c0-9.3908 3.0099-17.096 9.0296-23.116s13.725-9.0296 23.116-9.0296h310.86l70.431-167.95c10.113-24.801 28.172-45.991 54.298-63.328 26.126-17.457 52.612-26.126 79.46-26.126h321.94c26.848 0 53.335 8.6684 79.46 26.126s44.305 38.526 54.298 63.328l70.431 167.95h310.86c9.3908 0 17.096 3.0099 23.116 9.0296 6.0197 5.8993 9.0296 13.725 9.0296 23.116z" stroke-width="1.2039"/></svg></button>\
        <div class="jr-color-picker jr-text-picker">\
            <div class="jr-color-swatch jr-highlight-white" data-color="white"></div>\
            <div class="jr-color-swatch jr-highlight-black" data-color="black"></div>\
            <div class="jr-color-swatch jr-highlight-yellow" data-color="yellow"></div>\
            <div class="jr-color-swatch jr-highlight-green" data-color="green"></div>\
            <div class="jr-color-swatch jr-highlight-blue" data-color="blue"></div>\
            <div class="jr-color-swatch jr-highlight-purple" data-color="purple"></div>\
            <div class="jr-color-swatch jr-highlight-pink" data-color="pink"></div>\
            <div class="jr-color-swatch jr-highlight-red" data-color="red"></div>\
            <div class="jr-color-swatch jr-highlight-orange" data-color="orange"></div>\
        </div>\
        <div class="jr-color-picker jr-highlight-picker">\
            <div class="jr-color-swatch jr-highlight-yellow" data-color="yellow"></div>\
            <div class="jr-color-swatch jr-highlight-green" data-color="green"></div>\
            <div class="jr-color-swatch jr-highlight-blue" data-color="blue"></div>\
            <div class="jr-color-swatch jr-highlight-purple" data-color="purple"></div>\
            <div class="jr-color-swatch jr-highlight-pink" data-color="pink"></div>\
            <div class="jr-color-swatch jr-highlight-red" data-color="red"></div>\
            <div class="jr-color-swatch jr-highlight-orange" data-color="orange"></div>\
            <!-- Fix some gimp alignment issue --><div class="jr-color-swatch" style="visibility: hidden;"></div>\
        </div>';

    window.addEventListener("resize", hideToolbar);

    return editBar;
}


function addComment(loc) {
    if(!simpleArticleIframe.body.classList.contains("simple-deleting")) {
        simpleArticleIframe.body.classList.add("simple-with-comments");
        simpleArticleIframe.body.classList.add("simple-commenting");

        // Add the compact comment
        let compactComment = document.createElement("a");
        compactComment.className = "simple-comment-link";
        let commentId = 'jr-' + Date.now();
        compactComment.href = '#' + commentId;
        compactComment.innerText = '[*]';
        compactComment.style.top = loc.y + 'px';
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
        // commentContainer.style.left = loc.x;

        comments.appendChild(commentContainer);

        textarea.focus();
        setTimeout(function() {
            if(simpleArticleIframe.body.classList.contains("simple-compact-view"))
                commentContainer.scrollIntoView()
        }, 50)
    }
}

function textChange() {
    if(this.value !== "") {
        this.nextSibling.disabled = false;
    } else {
        this.nextSibling.disabled = true;
    }
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight + 10) + 'px';
}

function placeComment() {
    hasSavedLink = false;
    shareDropdown.classList.remove("active");

    simpleArticleIframe.body.classList.remove("simple-commenting");

    const parent = this.parentElement;

    parent.parentElement.classList.remove("jr-adding");
    parent.parentElement.classList.add("jr-posted");

    const date = new Date();
    const dateString = (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear() + " at " + date.getHours() + ":" + date.getMinutes();
    const timestamp = document.createElement("div");
    timestamp.className = "jr-timestamp";
    timestamp.innerText = 'Left on ' + dateString;

    const textarea = parent.querySelector("textarea");

    const comment = document.createElement("p");
    comment.className = "simple-comment";
    comment.innerText = textarea.value;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-button";
    deleteBtn.innerText = "X";
    deleteBtn.onclick = function() {
        hasSavedLink = false;
        shareDropdown.classList.remove("active");
        const compactRef = simpleArticleIframe.querySelector("[href *= " + this.parentElement.parentElement.id + ']');
        compactRef.parentElement.removeChild(compactRef);
        cancelComment(null, parent);
    }

    const backBtn = document.createElement("button");
    backBtn.className = "back-to-ref";
    backBtn.innerText = "↑";
    backBtn.onclick = function() {
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
    if(el) {
        parent = el.parentElement;
    } else {
        parent = this.parentElement.parentElement;
    }

    parent.parentElement.removeChild(parent);

    if(simpleArticleIframe.querySelectorAll(".simple-comment-container").length === 0) {
        simpleArticleIframe.body.classList.remove("simple-with-comments");
    }
    simpleArticleIframe.body.classList.remove("simple-commenting");
}


function handleMouseMove(e) {
    let leftEdge, rightEdge;
    if(!simpleArticleIframe.querySelector(".simple-container").classList.contains("rtl")) {
        const edge = simpleArticleIframe.querySelector(".simple-article-container").getBoundingClientRect().right;
        leftEdge = edge - 70;
        rightEdge = edge + 170;
    } else {
        const edge = simpleArticleIframe.querySelector(".simple-article-container").getBoundingClientRect().left;
        leftEdge = edge - 170;
        rightEdge = edge + 70;
    }
    const paddingTop = parseInt(window.getComputedStyle(simpleArticleIframe.querySelector(".simple-container")).getPropertyValue("padding-top"));
    if(e.clientX > leftEdge
    && e.clientX < rightEdge) {
        simpleArticleIframe.body.classList.add("simple-show-adder");
        addCommentBtn.style.top = e.clientY - paddingTop + simpleArticleIframe.defaultView.scrollY - 27;
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

    if(isNaN(lineHeight)) lineHeight = fontSize * 1.2;

    if(boxSizing === 'border-box') {
        const paddingTop = parseInt(computedStyle.getPropertyValue("padding-top"));
        const paddingBottom = parseInt(computedStyle.getPropertyValue("padding-bottom"));
        const borderTop = parseInt(computedStyle.getPropertyValue("border-top-width"));
        const borderBottom = parseInt(computedStyle.getPropertyValue("border-bottom-width"));
        height = height - paddingTop - paddingBottom - borderTop - borderBottom;
    }
    const lines = Math.ceil(height / lineHeight);
    return { lines, lineHeight };
}

// JS functionality to allow more precision/dynamic results for above SCSS
let useGradText = false;
function gradientText(colors) {
    useGradText = true;
    const ps = simpleArticleIframe.querySelectorAll(".content-container p");

    ps.forEach(p => {
        if(!(p.childElementCount === 1
        && (p.firstElementChild.tagName === "IMG"
        || p.firstElementChild.tagName === "A")
        && p.querySelector("img"))) {
            p.classList.add("gradient-text");

            let colorIndex = 0;
            const computedStyle = getComputedStyle(p);

            const lineInfo = getLineInfo(p, computedStyle);
            const numLines = lineInfo.lines;
            const lineHeight = lineInfo.lineHeight;

            p.classList.add("jsGrad");
            let colorOverlay;
            if(p.querySelector(".colorOverlay") == null) {
                colorOverlay = document.createElement("span");
                colorOverlay.className = "colorOverlay";
                p.appendChild(colorOverlay);
            } else {
                colorOverlay = p.querySelector(".colorOverlay");
            }

            let grads = ``;
            let sizes = ``;
            let poses = ``;

            for(let i = 0; i < numLines; i++) {
                let nextIndex = colors[colorIndex + 1] ? colorIndex + 1 : 0;

                if(i !== 0) {
                    grads += `, `;
                    sizes += `, `;
                    poses += `, `;
                }

                grads += `linear-gradient(to right, ${colors[colorIndex]} 0%, ${colors[colorIndex]} 10%, ${colors[nextIndex]} 90%, ${colors[nextIndex]} 100%)`;
                sizes += `100% ${lineHeight}px`;
                poses += `0 ${lineHeight * i + parseInt(computedStyle.paddingTop)}px`;
                // Alternatively remove $poses and use
                // sizes += ", 100% ${lineHeight * i}";

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
    simpleFind.innerHTML = '<input class="simple-find-input" type="text"><span class="simple-find-count">0</span><button title="Close find bar" class="simple-close-find" tabindex="0">X</button>';
    return simpleFind;
}

let find,
    findInput,
    findCount,
    findBtn,
    closeFind;

let searchResultApplier;
function initFindBar() {
    find = simpleArticleIframe.querySelector(".simple-find");
    findInput = find.querySelector(".simple-find-input");
    findCount = find.querySelector(".simple-find-count");
    findBtn = find.querySelector(".simple-find-btn");
    closeFind = find.querySelector(".simple-close-find");

    searchResultApplier = rangy.createClassApplier("simple-found");

    findInput.addEventListener("keydown", function(e) {
        // Esc
        if(e.keyCode === 27) {
            closeFindBar();
            e.stopPropagation();
        }

        else if(!e.ctrlKey) {
            scheduleSearch();
        }
    });

    findInput.addEventListener("keyup", e => { if(!e.ctrlKey) scheduleSearch });
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
    searchScopeRange.selectNodeContents(simpleArticleIframe.querySelector(".content-container"));

    range.selectNodeContents(simpleArticleIframe.querySelector(".content-container"));
    searchResultApplier.undoToRange(range);
}

function doSearch() {
    if(find.classList.contains("active")) {
        // Remove existing highlights
        const range = rangy.createRange();
        const searchScopeRange = rangy.createRange();
        searchScopeRange.selectNodeContents(simpleArticleIframe.querySelector(".content-container"));

        const options = {
            caseSensitive: false,
            wholeWordsOnly: false,
            withinRange: searchScopeRange,
            direction: "forward" // This is redundant because "forward" is the default
        };

        range.selectNodeContents(simpleArticleIframe.querySelector(".content-container"));
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

            findCount.innerText = simpleArticleIframe.querySelectorAll(".simple-found").length;
            findCount.classList.add("active");

            // Jump to the first found instance
            if(simpleArticleIframe.querySelector(".simple-found"))
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
    if(simpleArticleIframe
    && !simpleArticleIframe.body.classList.contains("paused")) {
        let curTime = Date.now(),
            timePassed = curTime - lastTime;

        if(timePassed > 16.6666667) { // Run at a max of 60 fps
            nextMove += scrollSpeed;
            simpleArticleIframe.defaultView.scrollBy(0, nextMove);

            lastTime = curTime;

            if(nextMove > 1)
                nextMove = 0;
        }
    }

    requestAnimationFrame(scrollPage);
}

function toggleScroll() {
    simpleArticleIframe.body.classList.toggle("paused");
    if(simpleArticleIframe.body.classList.contains("paused")) {
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
    if(speed) {
        scrollSpeed = speed;
        chrome.storage.sync.set({'scroll-speed': speed});
    }
}

function getScrollSpeedInput() {
    scrollSpeedInput = document.createElement("input");
    scrollSpeedInput.type = "number";
    scrollSpeedInput.className = "scroll-input";
    scrollSpeedInput.value = scrollSpeed;
    scrollSpeedInput.step = "0.1";
    scrollSpeedInput.pattern = "^\d*(\.\d{0,2})?$";
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
        D.body.scrollHeight, D.documentElement.scrollHeight,
        D.body.offsetHeight, D.documentElement.offsetHeight,
        D.body.clientHeight, D.documentElement.clientHeight
    );
}

function getMeasurements() {
    if(chromeStorage['scrollbar']) {
        let D = simpleArticleIframe;
        winheight = D.defaultView.innerHeight || (D.documentElement || D.body).clientHeight;
        docheight = getDocHeight();
        trackLength = docheight - winheight;
        requestTick();
    }
}

function requestTick() {
    if(!ticking) {
        requestAnimationFrame(updateProgressBar);
        ticking = true;
    }
}

function updateProgressBar() {
    if(progressBar && simpleArticleIframe) {
        const D = simpleArticleIframe;
        const scrollTop = D.defaultView.pageYOffset || (D.documentElement || D.body.parentElement || D.body).scrollTop;
        const pctScrolled = scrollTop / trackLength * 100 || 0;

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
    simpleArticleIframe.querySelector(".content-container").appendChild(progressBar);

    getMeasurements();
    simpleArticleIframe.defaultView.addEventListener("scroll", requestTick, false);
    simpleArticleIframe.defaultView.addEventListener("resize", getMeasurements, false);

    return progressBar;
}

function getContent(keepJR) {
    // Create a copy of the Just Read content
    const copy = simpleArticleIframe.querySelector(".simple-container").cloneNode(true);

    // Change all relative URL links to absolute ones
    copy.querySelectorAll("a").forEach(function(a) {
        const newURL = new URL(a.href, window.location.href);
        if (newURL.pathname !== window.location.pathname
        || newURL.protocol !== window.location.protocol
        || newURL.host !== window.location.host) {
            if(!newURL.href.startsWith("about:blank"))
                a.href = newURL.href;
            else
                a.href = newURL.href.substring(11);
        }
    });

    // Change all relative URL images to absolute ones
    copy.querySelectorAll("img").forEach(function(img) {
        const newURL = new URL(img.src, window.location.href);
        if (newURL.pathname !== window.location.pathname
        || newURL.protocol !== window.location.protocol
        || newURL.host !== window.location.host) {
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

    if(copy.querySelector(".simple-meta"))
        copy.querySelector(".simple-meta").insertBefore(originalLink, copy.querySelector(".simple-title"));


    // If there were changes from the GUI, update the <style> element based on the changed stylesheet
    if(usedGUI)
        styleElem.innerText = stylesheetToString(s);
    // Add the user's styles to the copy
    copy.appendChild(styleElem.cloneNode(true));

    // Remove JR elements that are not used on the shared version
    let removeElems;
    if(keepJR) {
        removeElems = copy.querySelectorAll(".simple-control:not(.simple-print), .simple-find, .simple-edit, .simple-add-comment, .delete-button, .simple-add-comment-container");
    } else {
        removeElems = copy.querySelectorAll(".simple-control, .simple-find, .simple-edit, .simple-add-comment, .delete-button, .simple-add-comment-container");
    }
    removeElems.forEach(function(elem) {
        elem.parentElement.removeChild(elem);
    });

    return copy;
}


// Duplicating content to make a savable copy
let hasSavedLink = false,
    alertTimeout;
function getSavableLink() {
    if(isPremium && jrSecret) {
        if(!hasSavedLink) {
            hasSavedLink = true;
    
            let copy = getContent(true);

            const myTitle = copy.querySelector(".simple-title") ? copy.querySelector(".simple-title").innerText : "Unknown title",
                  myAuthor = copy.querySelector(".simple-author") ? copy.querySelector(".simple-author").innerText : "Unknown author";

            const comments = copy.querySelectorAll(".simple-comment-container");
            comments.forEach(comment => {
                const timestamp = comment.querySelector(".jr-timestamp");
                timestamp.innerHTML = 'Left on <a href="#' + comment.id + '">' + timestamp.innerText.split('Left on ').pop() + '</a>';
            });
            // Hack to add hide segments to the actual content
            if(hideSegments) {
                let hideCSS = document.createElement("style");
                hideCSS.innerText = '.content-container script,.content-container [class="ad"],.content-container [class *="ads"],.content-container [class ^="ad-"],.content-container [class ^="ad_"],.content-container [class *="-ad-"],.content-container [class $="-ad"],.content-container [class $="_ad"],.content-container [class ~="ad"],.content-container [class *="navigation"],.content-container [class *="nav"],.content-container nav,.content-container [class *="search"],.content-container [class *="menu"],.content-container [class *="print"],.content-container [class *="nocontent"],.content-container .hidden,.content-container [class *="popup"],.content-container [class *="share"],.content-container [class *="sharing"],.content-container [class *="social"],.content-container [class *="follow"],.content-container [class *="newsletter"],.content-container [class *="meta"],.content-container [class *="author"],.content-container [id *="author"],.content-container form,.content-container [class ^="form"],.content-container [class *="-form-"],.content-container [class $="form"],.content-container [class ~="form"],.content-container [class *="related"],.content-container [class *="recommended"],.content-container [class *="see-also"],.content-container [class *="popular"],.content-container [class *="trail"],.content-container [class *="comment"],.content-container [class *="disqus"],.content-container [id *="disqus"],.content-container [class ^="tag"],.content-container [class *="-tag-"],.content-container [class $="-tag"],.content-container [class $="_tag"],.content-container [class ~="tag"],.content-container [class *="-tags-"],.content-container [class $="-tags"],.content-container [class $="_tags"],.content-container [class ~="tags"],.content-container [id *="-tags-"],.content-container [id $="-tags"],.content-container [id $="_tags"],.content-container [id ~="tags"],.content-container [class *="subscribe"],.content-container [id *="subscribe"],.content-container [class *="subscription"],.content-container [id *="subscription"],.content-container [class ^="fav"],.content-container [class *="-fav-"],.content-container [class $="-fav"],.content-container [class $="_fav"],.content-container [class ~="fav"],.content-container [id ^="fav"],.content-container [id *="-fav-"],.content-container [id $="-fav"],.content-container [id $="_fav"],.content-container [id ~="fav"],.content-container [class *="favorites"],.content-container [id *="favorites"],.content-container [class *="signup"],.content-container [id *="signup"],.content-container [class *="signin"],.content-container [id *="signin"],.content-container [class *="signIn"],.content-container [id *="signIn"],.content-container footer,.content-container [class *="footer"],.content-container [id *="footer"],.content-container svg[class *="pinterest"],.content-container [class *="pinterest"] svg,.content-container svg[id *="pinterest"],.content-container [id *="pinterest"] svg,.content-container svg[class *="pinit"],.content-container [class *="pinit"] svg,.content-container svg[id *="pinit"],.content-container [id *="pinit"] svg,.content-container svg[class *="facebook"],.content-container [class *="facebook"] svg,.content-container svg[id *="facebook"],.content-container [id *="facebook"] svg,.content-container svg[class *="github"],.content-container [class *="github"] svg,.content-container svg[id *="github"],.content-container [id *="github"] svg,.content-container svg[class *="twitter"],.content-container [class *="twitter"] svg,.content-container svg[id *="twitter"],.content-container [id *="twitter"] svg,.content-container svg[class *="instagram"],.content-container [class *="instagram"] svg,.content-container svg[id *="instagram"],.content-container [id *="instagram"] svg,.content-container svg[class *="tumblr"],.content-container [class *="tumblr"] svg,.content-container svg[id *="tumblr"],.content-container [id *="tumblr"] svg,.content-container svg[class *="youtube"],.content-container [class *="youtube"] svg,.content-container svg[id *="youtube"],.content-container [id *="youtube"] svg,.content-container svg[class *="codepen"],.content-container [class *="codepen"] svg,.content-container svg[id *="codepen"],.content-container [id *="codepen"] svg,.content-container svg[class *="dribble"],.content-container [class *="dribble"] svg,.content-container svg[id *="dribble"],.content-container [id *="dribble"] svg,.content-container svg[class *="soundcloud"],.content-container [class *="soundcloud"] svg,.content-container svg[id *="soundcloud"],.content-container [id *="soundcloud"] svg,.content-container svg[class *="rss"],.content-container [class *="rss"] svg,.content-container svg[id *="rss"],.content-container [id *="rss"] svg,.content-container svg[class *="linkedin"],.content-container [class *="linkedin"] svg,.content-container svg[id *="linkedin"],.content-container [id *="linkedin"] svg,.content-container svg[class *="vimeo"],.content-container [class *="vimeo"] svg,.content-container svg[id *="vimeo"],.content-container [id *="vimeo"] svg,.content-container svg[class *="email"],.content-container [class *="email"] svg,.content-container svg[id *="email"],.content-container [id *="email"] svg{display: none;}.entry-content.entry-content,pre *{display: initial !important;}';
                copy.appendChild(hideCSS);
            }

            

            const date = new Date();
            fetch(jrDomain + "newEntry", {
                mode: 'cors',
                method: 'POST',
                headers: { "Content-type": "application/json; charset=UTF-8" },
                body: JSON.stringify({
                    'jrSecret': jrSecret,
                    'origURL': window.location.href,
                    'datetime': date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + ":" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(),
                    'title': myTitle,
                    'author': myAuthor,
                    'content': copy.outerHTML
                })
            })
            .then(function(response) {
                if (!response.ok) throw response;
                else return response.text();
            })
            .then(function(url) {
                if(url) {

                    // Close the original page if the option is enabled
                    if((chromeStorage["openSharedPage"] || typeof chromeStorage["openSharedPage"] === "undefined")
                    && chromeStorage["closeOldPage"]) {
                        chrome.runtime.sendMessage({closeTab: "true"});
                    }

                    // Open up the sharable copy if the options is enabled
                    if((chromeStorage["openSharedPage"] || typeof chromeStorage["openSharedPage"] === "undefined")) {
                        window.open(url, "_blank");
                    }

                    // Show the link in the dropdown
                    shareDropdown.classList.add("active");
                    shareDropdown.innerText = url;
                }
            })
            .catch(function(err) {
                hasSavedLink = false;
                if(err.status === 428) {
                    simpleArticleIframe.querySelector(".simple-share-alert").classList.add("active");
                    window.clearTimeout(alertTimeout);
                    alertTimeout = setTimeout(function() {
                        simpleArticleIframe.querySelector(".simple-share-alert").classList.remove("active");
                    }, 10000);
                } else {
                    console.error(`Fetch Error =\n`, err);
                }
            });
        }
    } else {
        const notification = {
            textContent: "To share this reader view with others, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>! Shared pages are just <em>one</em> of the additional features included.",
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
    undoBtn;

let titleSelector,
    authorSelector,
    dateSelector,
    contentSelector,
    headerImageSelector,
    selectorsToDelete;

let savedComments, savedCompactComments;

function getDomainSelectors() {
    // Get custom domain selectors if applicable
    if(chromeStorage['domainSelectors']) {
        let domainSelectorArr = chromeStorage['domainSelectors'];
        for(let i = 0; i < domainSelectorArr.length; i++) {

            let domainSelObj = domainSelectorArr[i];
            let domainPattern = domainSelObj.domainPattern;

            let regex = new RegExp(domainPattern, "i");
            let url = window.location.href;

            if( url.match( regex ) ) {
                if(domainSelObj.titleSelector)
                    titleSelector = domainSelObj.titleSelector;
                if(domainSelObj.authorSelector)
                    authorSelector = domainSelObj.authorSelector;
                if(domainSelObj.dateSelector)
                    dateSelector = domainSelObj.dateSelector;
                if(domainSelObj.contentSelector)
                    contentSelector = domainSelObj.contentSelector;
                if(domainSelObj.headerImageSelector)
                    headerImageSelector = domainSelObj.headerImageSelector;
                if(domainSelObj.selectorsToDelete)
                    selectorsToDelete = domainSelObj.selectorsToDelete;
            }
        }
    }

    if(chromeStorage["backup"]) {
        chrome.runtime.sendMessage({ hasSavedVersion: true }, function(response) {
            if(response
            && response.content) {
                let tempElem = document.createElement("div");
                tempElem.innerHTML = response.content;
                pageSelectedContainer = tempElem;

                if(response.savedComments) {
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
    if(userSelected) {
        pageSelectedContainer = userSelected;
    }

    // If there is no text selected, auto-select the content
    if(!pageSelectedContainer) {
        pageSelectedContainer = getContainer();

        const pattern = new RegExp ("<br/?>[ \r\n\s]*<br/?>", "g");
        pageSelectedContainer.innerHTML = pageSelectedContainer.innerHTML.replace(pattern, "</p><p>");
    }

    selected = pageSelectedContainer;

    // Get the title, author, etc.
    articleContainer.appendChild(addArticleMeta())

    // Set the text as our text
    const contentContainer = document.createElement("div");
    contentContainer.className = "content-container";
    contentContainer.innerHTML = pageSelectedContainer.innerHTML;

    const lightboxes = [];

    // Strip inline styles
    const allElems = contentContainer.querySelectorAll("*");
    allElems.forEach(elem => {
        if(elem != undefined) {
            elem.removeAttribute("style");
            elem.removeAttribute("color");
            elem.removeAttribute("width");
            elem.removeAttribute("height");
            elem.removeAttribute("background");
            elem.removeAttribute("bgcolor");
            elem.removeAttribute("border");

            // See if the pres have code in them
            let isPreNoCode = true;
            if(elem.nodeName === "PRE"
            && !chromeStorage["leavePres"]) {
                isPreNoCode = false;

                Array.from(elem.children).forEach(child => {
                    if(child.nodeName === "CODE") {
                        isPreNoCode = true;
                    }
                });

                // If there's no code, format it
                if(!isPreNoCode) {
                    elem.innerHTML = elem.innerHTML.replace(/\n/g, '<br/>')
                }
            }

            // Replace the depreciated font element and pres without code with ps
            if((elem.nodeName === "FONT"
            || !isPreNoCode)
            && elem.parentElement) {
                const p = document.createElement('p');
                p.innerHTML = elem.innerHTML;

                elem.parentElement.insertBefore(p, elem);
                elem.parentElement.removeChild(elem);
            }

            // Remove any inline style, LaTeX text, or noindex elements and things with aria hidden
            if((elem.nodeName === "STYLE"
            || elem.nodeName === "NOINDEX"
            || elem.nodeName === "LINK"
            || elem.getAttribute("encoding") == "application/x-tex"
            || (elem.getAttribute("aria-hidden") == "true"
               && !elem.classList.contains("mwe-math-fallback-image-inline"))))
                elem.setAttribute("data-simple-delete", true);

            // Show LaTeX plain text on hover
            if(elem.classList.contains("mwe-math-fallback-image-inline")) {
                const plainText = document.createElement("div");
                plainText.className = "simple-plain-text";
                plainText.innerText = elem.alt;
                elem.parentElement.insertBefore(plainText, elem.nextSibling);
            }

            if(elem.nodeName === "IMG") {
                // Lightbox our images
                let img = elem;
                lightboxes.push(img);

                // Load lazy loaded images
                if(img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                } else if(img.dataset.src) {
                    img.src = img.dataset.src;
                }
            }

            // Update our scrollbar sizing
            if(elem.nodeName === "IFRAME"
            || elem.nodeName === "VIDEO"
            || elem.nodeName === "IMG") {
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
    addCommentBtn.innerHTML = '<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M676,368.3H520.1V212.4c0-11.1-9-20.1-20.1-20.1c-11.1,0-20.1,9-20.1,20.1v155.9H324c-11.1,0-20.1,9-20.1,20.1c0,11.1,9,20.1,20.1,20.1h155.9v155.9c0,11.1,9,20.1,20.1,20.1c11.1,0,20.1-9,20.1-20.1V408.5H676c11.1,0,20.1-9,20.1-20.1C696.1,377.3,687.1,368.3,676,368.3z"/><path transform="scale(-1, 1) translate(-1000, 0)" d="M657.9,19.3H342.1C159,19.3,10,181.4,10,380.6C10,549.8,117.2,695,267.1,732.5v228.1c0,7.9,4.6,15.1,11.8,18.3c2.7,1.2,5.5,1.8,8.3,1.8c4.8,0,9.6-1.7,13.3-5L566,741.8h91.9C841,741.8,990,579.7,990,380.6S841,19.3,657.9,19.3z M657.9,701.6h-99.5c-4.9,0-9.6,1.8-13.3,5L307.4,916V716.3c0-9.6-6.8-17.9-16.3-19.8c-139.5-27.1-240.8-160-240.8-316c0-177,130.9-321,291.9-321h315.8c160.9,0,291.9,144,291.9,321C949.8,557.6,818.8,701.6,657.9,701.6z"/></svg>';
    addCommentBtn.title = "Add a comment";
    addCommentBtn.onclick = function() {
        if(isPremium) {
            addComment({x: parseInt(this.style.left), y: parseInt(this.style.top)});
        } else {
            const notification = {
                textContent: "To add comments, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>! Comments are just <em>one</em> of the additional features included.",
                url: "https://justread.link/#get-Just-Read",
                primaryText: "Learn more",
                secondaryText: "Maybe later",
            };
            simpleArticleIframe.body.appendChild(createNotification(notification));
        }
    }
    addCommentContainer.appendChild(addCommentBtn);

    // Add the next chapter button if there is one
    const potentialOldMatches = [...contentContainer.querySelectorAll('a[href]')];
    if(!potentialOldMatches.some(match => {
        const text = match.innerText.replace(/\s/g,'').toUpperCase();
        if(text === 'NEXTCHAPTER'
        || text === 'NEXT') {
            match.className = 'jrNextChapter';
            return true;
        }
    })) {
        const potentialNewMatches = [...document.querySelectorAll('a[href]')];

        potentialNewMatches.some(match => {
            const text = match.innerText.replace(/\s/g,'').toUpperCase();
            if(text === 'NEXTCHAPTER'
            || text === 'NEXT') {
                match.className = 'jrNextChapter';
                contentContainer.appendChild(match);
                return true;
            }
        });
    }

    // Handle RTL sites
    const direction = window.getComputedStyle(document.body).getPropertyValue("direction");
    if(direction === "rtl" || isRTL(contentContainer.firstChild.innerText)) {
        container.classList.add("rtl");
    }

    articleContainer.appendChild(contentContainer);

    // Add small bit of info about our extension
    articleContainer.appendChild(addExtInfo());

    if(headerImageSelector && document.querySelector(headerImageSelector)) {
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
    if(savedComments) {
        comments.innerHTML = savedComments;
        comments.querySelectorAll(".delete-button").forEach(btn => {
            btn.onclick = function() {
                hasSavedLink = false;
                shareDropdown.classList.remove("active");
                const compactRef = simpleArticleIframe.querySelector("[href *= " + this.parentElement.parentElement.id + ']');
                compactRef.parentElement.removeChild(compactRef);
                cancelComment(null, this.parentElement);
            }
        });

        compactComments.innerHTML = savedCompactComments;
    }

    function doStuff() { 
        simpleArticleIframe = document.getElementById("simple-article").contentWindow.document;
        simpleArticleIframe.body.appendChild(container);

        simpleArticleIframe.body.className = window.location.hostname.replace(/\./g, "-");

        // Update the word count if it exists
        if(chromeStorage['addTimeEstimate']) {
            let wordCount = simpleArticleIframe.querySelector(".content-container").innerHTML.split(/\s+/).length;
            simpleArticleIframe.querySelector(".simple-time-estimate").innerText = Math.floor(wordCount / 200) + ' minute read';
        }

        // Add a notification of premium if necessary
        if(!isPremium
        && (jrOpenCount === 5
           || jrOpenCount % 15 === 0)
        && jrOpenCount < 151) {
            addPremiumNofifier();
        }

        // Add MathJax support
        const mj = document.querySelector("script[src *= 'mathjax']");
        if(mj) {
            const mathjax = document.createElement("script");
            mathjax.src = mj.src;
            simpleArticleIframe.head.appendChild(mathjax);

            const scripts = document.querySelectorAll("script");
            scripts.forEach(script => {
                if(script.innerText.indexOf("MathJax.Hub.Config") >= 0) {
                    const clone = scripts[i].cloneNode(true);
                    articleContainer.appendChild(clone);
                }
            });
        }

        // Flag any elements in the selectorsToDelete list for removal
        if(selectorsToDelete) {
            selectorsToDelete.forEach(selector => {
                simpleArticleIframe.querySelectorAll(selector).forEach(elem => {
                    elem.dataset.simpleDelete = true; // Flag it for removal later
                });
            });
        }

        // Remove the elements we flagged earlier
        simpleArticleIframe.querySelectorAll("[data-simple-delete]").forEach(elem => {
            elem.parentElement.removeChild(elem);
        });

        uiContainer.insertBefore(addGUI(), delModeBtn);

        // Add our listeners we need
        // The "X" button listener; exit if clicked
        simpleArticleIframe.querySelector(".simple-close").addEventListener('click', closeOverlay);

        // The print button
        simpleArticleIframe.querySelector(".simple-print").addEventListener('click', function() {
            simpleArticleIframe.defaultView.print();
        });

        // The share button
        simpleArticleIframe.querySelector(".simple-share").addEventListener('click', getSavableLink);
        // The share dropdown
        shareDropdown = simpleArticleIframe.querySelector(".simple-share-dropdown");

        // The deletion mode button
        const sd = simpleArticleIframe.querySelector(".simple-delete");
        if(sd) {
            sd.onclick = function() {
                startDeleteElement(simpleArticleIframe);
            };
        }

        // The undo button
        undoBtn.addEventListener('click', popStack);

        // Add lightboxes
        lightboxes.forEach(elem => {
            // Wrap our image in a link
            const imgId = uuidv4();
            const wrapper = document.createElement("a");
            wrapper.href = "#" + imgId;
            if(elem.parentElement) {
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
                simpleArticleIframe.querySelector(".simple-container").appendChild(lightbox);
            }
        });

        simpleArticleIframe.onkeydown = function(e) {
            // Listen for the "Esc" key and exit if so
            if(e.keyCode === 27 && !simpleArticleIframe.body.classList.contains("simple-deleting") && document.hasFocus())
                closeOverlay();

            // Listen for CTRL/CMD + SHIFT + ; and allow node deletion if so
            if(e.keyCode === 186 && (e.ctrlKey || e.metaKey) && e.shiftKey)
                startDeleteElement(simpleArticleIframe);

            // Listen for CTRL/CMD + P and do our print function if so
            if((e.ctrlKey || e.metaKey) && e.keyCode === 80) {
                simpleArticleIframe.defaultView.print();
                e.preventDefault();
            }

            // Listen for CTRL/CMD + Z for our undo function
            if((e.ctrlKey || e.metaKey) && e.keyCode === 90) {
                popStack();
            }

            // Listen for CTRL/CMD + F or F3
            if(e.keyCode === 114 || ((e.ctrlKey || e.metaKey) && e.keyCode === 70)) {
                find.classList.add("active");
                findInput.focus();
                e.preventDefault();
            }

            // Listen for editor shortcuts
            if(editorShortcutsEnabled) {
                // CTRL/CMD + B
                if((e.ctrlKey || e.metaKey) && e.keyCode === 66) {
                    bolden();
                }

                // CTRL/CMD + I
                if((e.ctrlKey || e.metaKey) && e.keyCode === 73) {
                    italicize();
                }

                // CTRL + U
                if((e.ctrlKey || e.metaKey) && e.keyCode === 85) {
                    underline();
                    e.preventDefault();
                }

                // CTRL/CMD + SHIFT + S
                if((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 83) {
                    strikeThrough();
                    e.preventDefault();
                }

                // CTRL/CMD + SHIFT + D
                if((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 68) {
                    deleteSelection();
                    e.preventDefault();
                }

                // CTRL/CMD + SHIFT + C
                if((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 67) {
                    colorSelectedText(lastFontColor);
                    e.preventDefault();
                }

                // CTRL/CMD + SHIFT + H
                if((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 72) {
                    highlightSelectedText(lastHighlightColor);
                    e.preventDefault();
                }

                // CTRL/CMD + \
                if((e.ctrlKey || e.metaKey) && e.keyCode === 220) {
                    removeHighlightFromSelectedText();
                    e.preventDefault();
                }
            }
        }

        // Size our YouTube containers appropriately
        const youtubeFrames = simpleArticleIframe.querySelectorAll("iframe[src *= 'youtube.com/embed/']");
        youtubeFrames.forEach(frame => frame.parentElement.classList.add("youtubeContainer"));

        simpleArticleIframe.addEventListener("mouseup", handleEnd);
        simpleArticleIframe.addEventListener("touchend", handleEnd);
        simpleArticleIframe.addEventListener("mousemove", handleMouseMove);

        setTimeout(() => checkBreakpoints(), 10);

        finishLoading();
    }

    // Fix a bug in FF
    if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
        setTimeout(doStuff, 100);
    } else {
        doStuff();
    }
    
}


// Loads the styles after the xhr request finishes
let theme,
    styleElem;
function continueLoading() {
    // Create a style tag and place our styles in there from localStorage
    styleElem = document.createElement('style');

    // Get how many times the user has opened Just Read
    if(typeof chromeStorage['jrOpenCount'] === "undefined") {
        chrome.storage.sync.set({'jrOpenCount': 0});
        jrOpenCount = 0;
    } else {
        jrOpenCount = chromeStorage['jrOpenCount'];
        chrome.storage.sync.set({'jrOpenCount': jrOpenCount + 1});
    }

    // Get current theme
    if(chromeStorage['currentTheme']) {
        theme = chromeStorage['currentTheme'];
    } else {
        chrome.storage.sync.set({'currentTheme': "default-styles.css"});
        theme = "default-styles.css";
    }
    styleElem.appendChild(document.createTextNode(stylesheetObj[theme]));

    // Create our version of the article
    getDomainSelectors();
}

let removeOrigContent = false;
function fadeIn() {
    if(simpleArticleIframe.styleSheets.length > 2) {
        simpleArticle.classList.remove("no-trans");
        simpleArticle.classList.remove("simple-fade-up");
        
        // Remove contents of original page to make page more performant
        if(removeOrigContent) {
            simpleArticle.addEventListener("transitionend", e => {
                [...document.body.children].forEach(child => child !== simpleArticle ? document.body.removeChild(child) : null);
            }, { once: true });
        }
    } else {
        setTimeout(fadeIn, 10);
    }
}

function finishLoading() {
    // Add our required stylesheet for the article
    if(!simpleArticleIframe.head.querySelector(".required-styles"))
        addStylesheet(simpleArticleIframe, "required-styles.css", "required-styles");

    // Add the segments hider if needed
    if((chromeStorage['hideSegments']
        && !simpleArticleIframe.head.querySelector(".hide-segments"))
    || typeof chromeStorage['hideSegments'] === "undefined") {
        hideSegments = true;
        addStylesheet(simpleArticleIframe, "hide-segments.css", "hide-segments");
    }

    // Change the top most page when regular links are clicked
    for(let i = 0, l = simpleArticleIframe.links.length; i < l; i++) {
        simpleArticleIframe.links[i].onclick = linkListener;
    }

    // Navigate to the element specified by the URL # if it exists
    if(top.window.location.hash != null) {
        setTimeout(function () { simpleArticleIframe.location.hash = top.window.location.hash; }, 10);
    }

    // Append our theme styles to the overlay
    simpleArticleIframe.head.appendChild(styleElem);

    fadeIn();

    // Apply the gradient text if the user has the option enabled
    if(chromeStorage["gradient-text"]) {
        if(chromeStorage["gradient-colors"])
            gradientText(chromeStorage["gradient-colors"]);
        else
            gradientText(["black", "blue", "black", "red"]);
    }

    // Apply the auto-scroll if necessary
    if(chromeStorage['autoscroll']) {
        if(chromeStorage['scroll-speed'])
            scrollSpeed = chromeStorage["scroll-speed"];

        simpleArticleIframe.body.appendChild(getScrollSpeedInput());
        simpleArticleIframe.body.appendChild(getPauseScrollBtn());

        lastTime = Date.now();
        scrollPage();
    }

    // Add the article scrollbar if necessary
    if(chromeStorage['scrollbar']) {
        initScrollbar();
    }

    // Attempt to mute the elements on the original page
    mutePage();

    // Initiate JRP's find functionality
    if(typeof chromeStorage['findbar'] === "undefined"
    || chromeStorage['findbar']) {
        initFindBar();
    }

    // Allow content to be removed if enabled
    if(chromeStorage['remove-orig-content']) {
        removeOrigContent = true;
    }
}





/////////////////////////////////////
// Handle the stylesheet syncing
/////////////////////////////////////
const stylesheetObj = {},
      stylesheetVersion = 4.0; // THIS NUMBER MUST BE UPDATED FOR THE STYLESHEETS TO KNOW TO UPDATE

function launch() {
    // Detect past overlay - don't show another
    if(document.getElementById("simple-article") == null) {

        // Check to see if the user wants to select the text
        if(typeof useText !== "undefined" && useText) {
            // Start the process of the user selecting text to read
            startSelectElement(document);
        } else {
            // Add the stylesheet for the container
            if(!document.head.querySelector(".page-styles"))
                addStylesheet(document, "page.css", "page-styles");

            // Check to see if the user wants to hide the content while loading
            if(typeof runOnLoad !== "undefined" && runOnLoad) {
                window.onload = getStyles();
            } else {
                getStyles();
            }
        }

    } else {
        if(document.querySelector(".simple-fade-up") == null) // Make sure it's been able to load
            closeOverlay();
    }
}
// Assure our libraries have time to load before launching
setTimeout(launch, 10);



})();
