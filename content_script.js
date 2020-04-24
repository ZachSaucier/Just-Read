/////////////////////////////////////
// Generic helper functions
/////////////////////////////////////


// Add :scope functionality to QS & QSA
(function(doc, proto) {
  try { // Check if browser supports :scope natively
    doc.querySelector(':scope body');
  } catch (err) { // Polyfill native methods if it doesn't
    ['querySelector', 'querySelectorAll'].forEach(function(method) {
      var nativ = proto[method];
      proto[method] = function(selectors) {
        if (/(^|,)\s*:scope/.test(selectors)) { // Only if selectors contains :scope
          var id = this.id; // Remember current element id
          this.id = 'ID_' + Date.now(); // Assign new unique id
          selectors = selectors.replace(/((^|,)\s*):scope/g, '$1#' + this.id); // Replace :scope with #ID
          var result = doc[method](selectors);
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
    var videos = document.querySelectorAll("video"),
        audios = document.querySelectorAll("audio");

    [].forEach.call(videos, function(video) { muteMe(video); });
    [].forEach.call(audios, function(audio) { muteMe(audio); });
}

// Select text from highlight functionality
function getSelectionHtml() {
    var html = "";
    var sel = window.getSelection();
    if (sel.rangeCount) {
        var container = document.createElement("div");
        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
            container.appendChild(sel.getRangeAt(i).cloneContents());
        }
        html = container.innerHTML;
    }
    return html;
}

// Use the highlighted text if started from that
var pageSelectedContainer;
if(typeof textToRead !== "undefined" && textToRead) {
    pageSelectedContainer = document.createElement("div");
    pageSelectedContainer.className = "highlighted-html";
    pageSelectedContainer.innerHTML = getSelectionHtml();
}


/////////////////////////////////////
// State functions
/////////////////////////////////////

// User-selected text functionality
var last,
    bgc,
    userSelected;
function startSelectElement(doc) {
    var mouseFunc = function (e) {
        var elem = e.target;

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
            doc.getElementById("tempStyle").parentNode.removeChild(doc.getElementById("tempStyle"));

        launch();
    }

    doc.addEventListener('mouseover', mouseFunc);
    doc.addEventListener('click', clickFunc);
    doc.addEventListener('keydown', escFunc);

    doc.documentElement.focus();

    // Add our styles temporarily
    var tempStyle = doc.createElement("style");
    tempStyle.id = "temp-style";
    tempStyle.innerText = ".jr-hovered, .jr-hovered * { cursor: pointer !important; color: black !important; background-color: #2095f2 !important; }";

    doc.head.appendChild(tempStyle);

    // Make the next part wait until a user has selected an element to use
    useText = false;
}

// Similar to ^^ but for deletion once the article is open
function startDeleteElement(doc) {
    var mouseFunc = function (e) {
        var elem = e.target;

        if(!elem.classList.contains("simple-container")
        && !elem.classList.contains("simple-ui-container")
        && !elem.classList.contains("simple-control")
        && !elem.classList.contains("simple-edit")
        && (elem.parentNode.classList && !elem.parentNode.classList.contains("simple-control"))
        && doc.body != elem
        && doc.documentElement != elem
        && elem.tagName !== "path"
        && elem.tagName !== "rect"
        && elem.tagName !== "polygon") {
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
        && !selected.classList.contains("simple-edit")
        && (selected.parentNode.classList && !selected.parentNode.classList.contains("simple-control"))
        && doc.body != selected
        && doc.documentElement != selected
        && selected.tagName !== "path"
        && selected.tagName !== "rect"
        && selected.tagName !== "polygon")
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
    }

    var anchors = doc.querySelectorAll("a");
    anchors.forEach(function(a) {
        a.addEventListener("click", anchorFunc);
    });

    doc.body.classList.add("simple-deleting");

    doc.addEventListener('mouseover', mouseFunc);
    doc.addEventListener('click', clickFunc);
    doc.addEventListener('keydown', escFunc);

    var iframes = doc.querySelectorAll("iframe");
    [...iframes].forEach(elem => elem.style.pointerEvents = "none");

    var sd = simpleArticleIframe.querySelector(".simple-delete");

    sd.classList.add("active");
    sd.onclick = function() {
        exitFunc();
    };
}

var stack = [];
function actionWithStack(actionName, elem, startText) {
    hasSavedLink = false;

    let actionObj;
    if(actionName === "delete") {
        elem.classList.remove("jr-hovered");

        let parent = elem.parentNode;

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
}

function updateSavedVersion() {
    if(chromeStorage["backup"]) {
        chrome.runtime.sendMessage({ savedVersion: simpleArticleIframe.querySelector('.content-container').innerHTML });
    }
}





/////////////////////////////////////
// Chrome storage functions
/////////////////////////////////////

// Given a chrome storage object add them to our local stylsheet obj
function getStylesFromStorage(storage) {
    for(var key in storage) {
        if(key.substring(0, 3) === "jr-") { // Get stylesheets in the new format
            stylesheetObj[key.substring(3)] = storage[key];
        }
    }
}

// Set the chrome storage based on our stylesheet object
function setStylesOfStorage() {
    for(var stylesheet in stylesheetObj) {
        var obj = {};
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
    var ltrChars    = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF'+'\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF',
        rtlChars    = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC',
        rtlDirCheck = new RegExp('^[^'+ltrChars+']*['+rtlChars+']');

    return rtlDirCheck.test(s);
};

function checkElemForDate(elem, attrList, deleteMe) {
    var myDate = false;
    if(elem && checkAgainstBlacklist(elem, 3)) {
        for(var i = 0; i < attrList.length; i++) {
            if(elem[attrList[i]]
             && elem[attrList[i]] != "" //  Make sure it's not empty
             && elem[attrList[i]].split(' ').length < 10) { // Make sure the date isn't absurdly long
                myDate = elem[attrList[i]];

                if(deleteMe) {
                    elem.dataset.simpleDelete = true; // Flag it for removal later
                }
            }
        }
    }

    return myDate;
}

function getJSONSchema(text) {
  try {
    return JSON.parse(text);
  } catch(e) {
    console.log("Invalid JSON schema");
    return null;
  }
}

function getArticleDate() {
    // Make sure that the pageSelectedContainer isn't empty
    if(pageSelectedContainer == null)
        pageSelectedContainer = document.body;

    // Check to see if there's a date class
    var date = false;
    var toCheck = [];

    // Check schema first
    var jsonld;
    if(pageSelectedContainer.querySelector('script[type="application/ld+json"]')) {
      jsonld = getJSONSchema(pageSelectedContainer.querySelector('script[type="application/ld+json"]').innerText);
    } else if(document.querySelector('script[type="application/ld+json"]')) {
      jsonld = getJSONSchema(document.querySelector('script[type="application/ld+json"]').innerText);
    }

    if(jsonld) {
      if(jsonld.dateModified) {
        date = jsonld.dateModified;
      } else if(jsonld.datePublished) {
        date = jsonld.datePublished;
      }
    }

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


    for(var i = 0; i < toCheck.length; i++) {
        if(!date) {
            var checkObj = toCheck[i];
            date = checkElemForDate(checkObj[0], checkObj[1], checkObj[2])
        }
    }

    if(date)
        return date.replace(/on\s/gi, '').replace(/(?:\r\n|\r|\n)/gi, '&nbsp;').replace(/[<]br[^>]*[>]/gi,'&nbsp;'); // Replace <br>, \n, and "on"

    return "Unknown date";
}

function getArticleTitle() {
    // Get the page's title
    var title = document.head.querySelector("title");
    if(title) {
        title = title.innerText;

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

    var author = null;

    // Check schema first
    var jsonld;
    if(pageSelectedContainer.querySelector('script[type="application/ld+json"]')) {
      jsonld = getJSONSchema(pageSelectedContainer.querySelector('script[type="application/ld+json"]').innerText);
    } else if(document.querySelector('script[type="application/ld+json"]')) {
      jsonld = getJSONSchema(document.querySelector('script[type="application/ld+json"]').innerText);
    }

    if(jsonld) {
      if(jsonld.author) {
        if(typeof jsonld.author === "string") {
          author = jsonld.author;
        } else if(typeof jsonld.author.name === "string") {
          author = jsonld.author.name;
        }
      }
    }

    // Check to see if there's an author itemprop in the article
    var elem = pageSelectedContainer.querySelector('[itemprop="author"]');
    if(elem) {
        if(elem.innerText.split(/\s+/).length < 5 && elem.innerText.replace(/\s/g,'') !== "") {
            elem.dataset.simpleDelete = true; // Flag it for removal later
            author = elem.innerText;
        }
    }

    // Check to see if there's an author itemprop in the page
    var elem = document.body.querySelector('[itemprop="author"]');
    if(author === null && elem) {
        if(elem.innerText.split(/\s+/).length < 5 && elem.innerText.replace(/\s/g,'') !== "") {
            author = elem.innerText;
        }
    }

    // Check to see if there's an author rel in the article
    var elem = pageSelectedContainer.querySelector('[rel*="author"]');
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
    elem = document.body.querySelector('[rel*="author"]');
    if(elem) {
        if(elem.innerText.split(/\s+/).length < 5 && elem.innerText.replace(/\s/g,'') !== "") {
            author = elem.innerText;
        }
    }

    elem = document.body.querySelector('[class*="author"]');
    if(author === null && elem && checkAgainstBlacklist(elem, 3)) {
        if(elem.innerText.split(/\s+/).length < 6 && elem.innerText.replace(/\s/g,'') !== "") {
            author = elem.innerText;
        }
    }

    if(author !== null && typeof author !== "undefined") {
        // If it's all caps, try to properly capitalize it
        if(author === author.toUpperCase()) {
            var words = author.split(" "),
                wordsLength = words.length;
            for(var i = 0; i < wordsLength; i++) {
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
    // Remove the GUI if it is open
    if(typeof datGUI != "undefined") {
        datGUI.destroy();
        datGUI = undefined;
    }

    // Fade out
    simpleArticle.classList.add("simple-fade-up");

    // Reset our variables
    simpleArticleIframe = undefined;
    pageSelectedContainer = null;
    userSelected = null;
    textToRead = null;

    setTimeout(function() {
        // Enable scroll
        document.documentElement.classList.remove("simple-no-scroll");

        // Remove our overlay
        simpleArticle.parentNode.removeChild(simpleArticle);
        simpleArticle = undefined;
    }, 100); // Make sure we can animate it
}

function getContainer() {
    var numWordsOnPage = document.body.innerText.match(/\S+/g).length,
        ps = document.body.querySelectorAll("p");

    // Find the paragraphs with the most words in it
    var pWithMostWords = document.body,
        highestWordCount = 0;

    if(ps.length === 0) {
        ps = document.body.querySelectorAll("div");
    }

    for(var i = 0; i < ps.length; i++) {
        if(checkAgainstBlacklist(ps[i], 3) // Make sure it's not in our blacklist
        && ps[i].offsetHeight !== 0) { //  Make sure it's visible on the regular page
            var myInnerText = ps[i].innerText.match(/\S+/g);
            if(myInnerText) {
                var wordCount = myInnerText.length;
                if(wordCount > highestWordCount) {
                    highestWordCount = wordCount;
                    pWithMostWords = ps[i];
                }
            }
        }

        // Remove elements in JR that were hidden on the original page
        if(ps[i].offsetHeight === 0)
            ps[i].dataset.simpleDelete = true;
    }

    // Keep selecting more generally until over 2/5th of the words on the page have been selected
    var selectedContainer = pWithMostWords,
        wordCountSelected = highestWordCount;

    while(wordCountSelected / numWordsOnPage < 0.4
    && selectedContainer != document.body
    && selectedContainer.parentNode.innerText) {
        selectedContainer = selectedContainer.parentNode;
        wordCountSelected = selectedContainer.innerText.match(/\S+/g).length;
    }

    // Make sure a single p tag is not selected
    if(selectedContainer.tagName === "P") {
        selectedContainer = selectedContainer.parentNode;
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
        var hrefArr = this.href.split("#");

        if(hrefArr.length < 2 // No anchor
        || (hrefArr[0].replace(/\/$/, "") != top.window.location.origin + top.window.location.pathname.replace(/\/$/, "") // Anchored to an ID on another page
            && hrefArr[0] != "about:blank"
            && hrefArr[0] != "_blank")
        || (simpleArticleIframe.getElementById(hrefArr[1]) == null // The element is not in the article section
            && simpleArticleIframe.querySelector("a[name='" + hrefArr[1] + "']") == null)
        ) {
            top.window.location.href = this.href; // Regular link
        } else { // Anchored to an element in the article
            top.window.location.hash = hrefArr[1];
            simpleArticleIframe.location.hash = hrefArr[1];
        }
    }
}

// Check given item against blacklist, return null if in blacklist
var blacklist = ["comment"];
function checkAgainstBlacklist(elem, level) {
    if(typeof elem != "undefined" && elem != null) {
        var className = elem.className,
            id = elem.id;
        for(var i = 0; i < blacklist.length; i++) {
            if((typeof className === "string" && className.indexOf(blacklist[i]) >= 0)
            || (typeof id === "string" && id.indexOf(blacklist[i]) >= 0)
            ) {
                return null;
            }
        }

        if(level > 0) {
            return checkAgainstBlacklist(elem.parentNode, --level);
        }
    }
    return elem;
}



/////////////////////////////////////
// Extension-related adder functions
/////////////////////////////////////

// Get theme's CSS sheets from storage
var chromeStorage;
function getStyles() {
    // Check to see if the stylesheets are already in Chrome storage
    chrome.storage.sync.get(null, function (result) {
        chromeStorage = result;

        // Collect all of our stylesheets in our object
        getStylesFromStorage(chromeStorage);

        // Check to see if the default stylesheet needs to be updated
        let needsUpdate = false;
        let versionResult = chromeStorage['stylesheet-version'];

        // If the user has a version of the stylesheets and it is less than the current one, update it
        if(typeof versionResult === "undefined"
        || versionResult['stylesheet-version'] < stylesheetVersion) {
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
            xhr2.open('GET', chrome.extension.getURL("dark-styles.css"), true);
            xhr2.onreadystatechange = function() {
                if(xhr2.readyState == XMLHttpRequest.DONE && xhr2.status == 200) {
                    // Save the file's contents to our object
                    stylesheetObj["dark-styles.css"] = xhr2.responseText;

                    // Save it to Chrome storage
                    setStylesOfStorage();
                }
            }
            xhr2.send();

            needsUpdate = false;

            return;
        }

        continueLoading();
    });
}

// Add our styles to the page
function addStylesheet(doc, link, classN) {
    var path = chrome.extension.getURL(link),
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
    var editSVG = '<svg class="simple-edit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="M422.953,176.019c0.549-0.48,1.09-0.975,1.612-1.498l21.772-21.772c12.883-12.883,12.883-33.771,0-46.654   l-40.434-40.434c-12.883-12.883-33.771-12.883-46.653,0l-21.772,21.772c-0.523,0.523-1.018,1.064-1.498,1.613L422.953,176.019z"></path><polygon fill="#020202" points="114.317,397.684 157.317,440.684 106.658,448.342 56,456 63.658,405.341 71.316,354.683  "></polygon><polygon fill="#020202" points="349.143,125.535 118.982,355.694 106.541,343.253 336.701,113.094 324.26,100.653 81.659,343.253    168.747,430.341 411.348,187.74  "></polygon></g></svg>'

    var metaContainer = document.createElement("div");
    metaContainer.className = "simple-meta";
    var author = document.createElement("div"),
        date = document.createElement("div"),
        title = document.createElement("h1");

    var authorContent = document.createElement("div"),
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
    printButton.className = "simple-control simple-print";
    printButton.title = "Print article";
    printButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M49,0H15v19H0v34h15v11h34V53h15V19H49V0z M17,2h30v17H17V2z M47,62H17V40h30V62z M62,21v30H49V38H15v13H2V21h13h34H62z"/><rect x="6" y="26" width="4" height="2"/><rect x="12" y="26" width="4" height="2"/><rect x="22" y="46" width="20" height="2"/><rect x="22" y="54" width="20" height="2"/></svg>Print';

    return printButton;
}

// Add the deletion mode button
function addDelModeButton() {
    let delModeButton = document.createElement("button");
    delModeButton.className = "simple-control simple-delete";
    delModeButton.title = "Start/end deletion mode";
    delModeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-255.5 -411.5 1648 1676"><path d="M1044.6,215.65v481.3c0,7.8-2.5,14.2-7.5,19.2s-11.399,7.5-19.199,7.5h-53.5c-7.801,0-14.2-2.5-19.2-7.5s-7.5-11.4-7.5-19.2v-481.3c0-7.8,2.5-14.2,7.5-19.2s11.399-7.5,19.2-7.5h53.5c7.8,0,14.199,2.5,19.199,7.5S1044.6,207.85,1044.6,215.65z M823.2,196.45c-5-5-11.4-7.5-19.2-7.5h-53.5c-7.8,0-14.2,2.5-19.2,7.5s-7.5,11.4-7.5,19.2v481.3c0,7.8,2.5,14.2,7.5,19.2s11.4,7.5,19.2,7.5H804c7.8,0,14.2-2.5,19.2-7.5s7.5-11.4,7.5-19.2v-481.3C830.7,207.85,828.2,201.45,823.2,196.45z M609.3,196.45c-5-5-11.399-7.5-19.2-7.5h-53.5c-7.8,0-14.199,2.5-19.199,7.5s-7.5,11.4-7.5,19.2v199.07c12.06,5.96,20.399,18.59,20.399,33.23v171.7c0,20.899,16.9,37.8,37.8,37.8c20.9,0,37.801-16.9,37.801-37.8v-109.9c0-10.31,4.18-19.66,10.899-26.37V215.65C616.8,207.85,614.3,201.45,609.3,196.45z M1365.4-51.65v53.5c0,7.8-2.5,14.2-7.5,19.2s-11.4,7.5-19.2,7.5h-80.2V820.65c0,46.199-13.1,86.199-39.3,119.899s-57.601,50.5-94.4,50.5H631.02c9.82-34.97,19.681-72.2,27.82-106.899h465.86c1.7,0,4.6-2.4,8.8-7.101s8.2-12.3,12.1-22.6c4-10.3,5.9-21.601,5.9-33.9v-792H402.9v575.37c-12.13-6.28-20.4-18.95-20.4-33.57v-171.6c0-20.3-16.2-36.9-36.1-36.9s-36.1,16.6-36.1,36.9v122.4c0,12.06-5.63,22.79-14.4,29.699V28.55h-80.2c-7.8,0-14.2-2.5-19.2-7.5S189,9.65,189,1.85v-53.5c0-7.8,2.5-14.2,7.5-19.2s11.4-7.5,19.2-7.5h258.2l58.5-139.5c8.399-20.6,23.399-38.2,45.1-52.6c21.7-14.5,43.7-21.7,66-21.7h267.4c22.3,0,44.3,7.2,66,21.7c21.699,14.5,36.8,32,45.1,52.6l58.5,139.5h258.2c7.8,0,14.2,2.5,19.2,7.5C1362.9-65.95,1365.4-59.45,1365.4-51.65z M964.4-78.45l-40.101-97.8c-3.899-5-8.6-8.1-14.2-9.2H645.2c-5.601,1.1-10.3,4.2-14.2,9.2l-40.9,97.8H964.4z"/><path d="M723.8,433.45c-20.41-22.19-49.569-36.1-81.899-36.1c-8.62,0-17.021,0.98-25.101,2.85c-6.54,1.51-12.859,3.61-18.899,6.25c-14.54-36.8-47.87-64.08-88-69.79c-5.131-0.73-10.371-1.11-15.7-1.11c-17.4,0-34,4.1-48.7,11.3c-9.75-18.77-24.56-34.45-42.6-45.14c-16.55-9.83-35.82-15.46-56.4-15.46c-12.6,0-24.8,2.2-36.1,6.1v-123.7c0-20.13-5.27-39.03-14.5-55.39c-19.19-34.02-55.5-57.01-97.1-57.01c-61.5,0-111.6,50.4-111.6,112.4v445.3l-80.4-92c-0.5-0.601-1.1-1.2-1.7-1.8c-21.1-21.101-49.2-32.9-79.1-33h-0.6c-29.8,0-57.8,11.5-78.7,32.5c-36.9,36.899-39,91.699-5.6,150.399c43.2,75.9,90.2,147.5,131.6,210.601c30.3,46.199,58.9,89.8,79.8,125.8c18.1,31.3,66.2,132.7,66.7,133.7c6.2,13.199,19.5,21.6,34.1,21.6h477.4c16.399,0,30.899-10.6,35.899-26.2c4.17-12.979,23.54-73.78,42.94-144.5c9.53-34.74,19.08-71.87,26.83-106.899C746.52,838.32,753.6,796.1,753.6,767.55v-257.7C753.6,480.39,742.29,453.52,723.8,433.45z M678.1,767.45c0,25.58-7.979,68.72-19.26,116.7c-8.14,34.699-18,71.93-27.82,106.899c-10.029,35.771-20,69.181-28.02,95.101H177.1c-15.6-32.601-45-93-59.3-117.7c-22-37.8-51.1-82.3-82-129.3c-40.8-62.2-87.1-132.7-129.1-206.5c-10.9-19.301-21-45.301-6.6-59.7c6.7-6.7,15.7-10.2,25.5-10.3c9.5,0,18.4,3.6,25.3,10.1l145.4,166.5c10.4,11.8,27,16,41.7,10.5s24.5-19.6,24.5-35.3v-545.8c0-20.3,16.2-36.9,36.1-36.9s36.1,16.6,36.1,36.9v352.5c0,20.899,16.9,37.8,37.8,37.8c8.84,0,16.96-3.03,23.4-8.101c8.77-6.909,14.4-17.64,14.4-29.699v-122.4c0-20.3,16.2-36.9,36.1-36.9s36.1,16.6,36.1,36.9v171.6c0,14.62,8.27,27.29,20.4,33.57c5.21,2.7,11.12,4.23,17.4,4.23c20.9,0,37.8-16.9,37.8-37.801V447.95c0-20.3,16.2-36.9,36.1-36.9c5.62,0,10.95,1.32,15.7,3.67c12.06,5.96,20.399,18.59,20.399,33.23v171.7c0,20.899,16.9,37.8,37.8,37.8c20.9,0,37.801-16.9,37.801-37.8v-109.9c0-10.31,4.18-19.66,10.899-26.37c6.5-6.51,15.41-10.53,25.2-10.53c19.9,0,36.1,16.5,36.1,36.9V767.45z"/></svg>';

    return delModeButton;
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
    var extContainer = document.createElement("div"),
        viewedUsing = document.createElement("p");
    extContainer.className = "simple-ext-info";
    viewedUsing.innerText = "Viewed using ";
    viewedUsing.className = "simple-viewed-using";

    var extAnchor = document.createElement("a");
    extAnchor.href = "https://justread.link/";
    extAnchor.innerText = "Just Read";
    extAnchor.target = "_blank";
    viewedUsing.appendChild(extAnchor);

    var bugReporter = document.createElement("p");
    bugReporter.className = "simple-bug-reporter";
    var bugAnchor = document.createElement("a");
    bugAnchor.href = "https://github.com/ZachSaucier/Just-Read/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3Abug%20";
    bugAnchor.innerText = "Report an error";
    bugAnchor.target = "_blank";
    bugReporter.appendChild(bugAnchor);

    extContainer.appendChild(viewedUsing);
    extContainer.appendChild(bugReporter);

    return extContainer;
}

// Add the theme editor button
var datGUI, s;
var dat=dat||{};dat.gui=dat.gui||{},dat.utils=dat.utils||{},dat.controllers=dat.controllers||{},dat.dom=dat.dom||{},dat.color=dat.color||{},dat.utils.css=function(){return{load:function(a,b){b=b||document;var c=b.createElement("link");c.type="text/css",c.rel="stylesheet",c.href=a,b.getElementsByTagName("head")[0].appendChild(c)},inject:function(a,b){b=b||document;var c=document.createElement("style");c.type="text/css",c.innerHTML=a,b.getElementsByTagName("head")[0].appendChild(c)}}}(),dat.utils.common=function(){var a=Array.prototype.forEach,b=Array.prototype.slice;return{BREAK:{},extend:function(a){return this.each(b.call(arguments,1),function(b){for(var c in b)this.isUndefined(b[c])||(a[c]=b[c])},this),a},defaults:function(a){return this.each(b.call(arguments,1),function(b){for(var c in b)this.isUndefined(a[c])&&(a[c]=b[c])},this),a},compose:function(){var a=b.call(arguments);return function(){for(var c=b.call(arguments),d=a.length-1;0<=d;d--)c=[a[d].apply(this,c)];return c[0]}},each:function(b,c,d){if(b)if(a&&b.forEach&&b.forEach===a)b.forEach(c,d);else if(b.length===b.length+0)for(var e=0,f=b.length;e<f&&!(e in b&&c.call(d,b[e],e)===this.BREAK);e++);else for(e in b)if(c.call(d,b[e],e)===this.BREAK)break},defer:function(a){setTimeout(a,0)},toArray:function(a){return a.toArray?a.toArray():b.call(a)},isUndefined:function(a){return void 0===a},isNull:function(a){return null===a},isNaN:function(a){return a!==a},isArray:Array.isArray||function(a){return a.constructor===Array},isObject:function(a){return a===Object(a)},isNumber:function(a){return a===a+0},isString:function(a){return a===a+""},isBoolean:function(a){return!1===a||!0===a},isFunction:function(a){return"[object Function]"===Object.prototype.toString.call(a)}}}(),dat.controllers.Controller=function(a){var b=function(a,b){this.initialValue=a[b],this.domElement=document.createElement("div"),this.object=a,this.property=b,this.__onFinishChange=this.__onChange=void 0};return a.extend(b.prototype,{onChange:function(a){return this.__onChange=a,this},onFinishChange:function(a){return this.__onFinishChange=a,this},setValue:function(a){return this.object[this.property]=a,this.__onChange&&this.__onChange.call(this,a),this.updateDisplay(),this},getValue:function(){return this.object[this.property]},updateDisplay:function(){return this},isModified:function(){return this.initialValue!==this.getValue()}}),b}(dat.utils.common),dat.dom.dom=function(a){function b(b){return"0"===b||a.isUndefined(b)?0:(b=b.match(d),a.isNull(b)?0:parseFloat(b[1]))}var c={};a.each({HTMLEvents:["change"],MouseEvents:["click","mousemove","mousedown","mouseup","mouseover"],KeyboardEvents:["keydown"]},function(b,d){a.each(b,function(a){c[a]=d})});var d=/(\d+(\.\d+)?)px/,e={makeSelectable:function(a,b){void 0!==a&&void 0!==a.style&&(a.onselectstart=b?function(){return!1}:function(){},a.style.MozUserSelect=b?"auto":"none",a.style.KhtmlUserSelect=b?"auto":"none",a.unselectable=b?"on":"off")},makeFullscreen:function(b,c,d){a.isUndefined(c)&&(c=!0),a.isUndefined(d)&&(d=!0),b.style.position="absolute",c&&(b.style.left=0,b.style.right=0),d&&(b.style.top=0,b.style.bottom=0)},fakeEvent:function(b,d,e,f){e=e||{};var g=c[d];if(!g)throw Error("Event type "+d+" not supported.");var h=document.createEvent(g);switch(g){case"MouseEvents":h.initMouseEvent(d,e.bubbles||!1,e.cancelable||!0,window,e.clickCount||1,0,0,e.x||e.clientX||0,e.y||e.clientY||0,!1,!1,!1,!1,0,null);break;case"KeyboardEvents":g=h.initKeyboardEvent||h.initKeyEvent,a.defaults(e,{cancelable:!0,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1,keyCode:void 0,charCode:void 0}),g(d,e.bubbles||!1,e.cancelable,window,e.ctrlKey,e.altKey,e.shiftKey,e.metaKey,e.keyCode,e.charCode);break;default:h.initEvent(d,e.bubbles||!1,e.cancelable||!0)}a.defaults(h,f),b.dispatchEvent(h)},bind:function(a,b,c,d){return a.addEventListener?a.addEventListener(b,c,d||!1):a.attachEvent&&a.attachEvent("on"+b,c),e},unbind:function(a,b,c,d){return a.removeEventListener?a.removeEventListener(b,c,d||!1):a.detachEvent&&a.detachEvent("on"+b,c),e},addClass:function(a,b){if(void 0===a.className)a.className=b;else if(a.className!==b){var c=a.className.split(/ +/);-1==c.indexOf(b)&&(c.push(b),a.className=c.join(" ").replace(/^\s+/,"").replace(/\s+$/,""))}return e},removeClass:function(a,b){if(b){if(void 0!==a.className)if(a.className===b)a.removeAttribute("class");else{var c=a.className.split(/ +/),d=c.indexOf(b);-1!=d&&(c.splice(d,1),a.className=c.join(" "))}}else a.className=void 0;return e},hasClass:function(a,b){return new RegExp("(?:^|\\s+)"+b+"(?:\\s+|$)").test(a.className)||!1},getWidth:function(a){return a=getComputedStyle(a),b(a["border-left-width"])+b(a["border-right-width"])+b(a["padding-left"])+b(a["padding-right"])+b(a.width)},getHeight:function(a){return a=getComputedStyle(a),b(a["border-top-width"])+b(a["border-bottom-width"])+b(a["padding-top"])+b(a["padding-bottom"])+b(a.height)},getOffset:function(a){var b={left:0,top:0};if(a.offsetParent)do b.left+=a.offsetLeft,b.top+=a.offsetTop;while(a=a.offsetParent);return b},isActive:function(a){return a===document.activeElement&&(a.type||a.href)}};return e}(dat.utils.common),dat.controllers.OptionController=function(a,b,c){var d=function(a,e,f){d.superclass.call(this,a,e);var g=this;if(this.__select=document.createElement("select"),c.isArray(f)){var h={};c.each(f,function(a){h[a]=a}),f=h}c.each(f,function(a,b){var c=document.createElement("option");c.innerHTML=b,c.setAttribute("value",a),g.__select.appendChild(c)}),this.updateDisplay(),b.bind(this.__select,"change",function(){g.setValue(this.options[this.selectedIndex].value)}),this.domElement.appendChild(this.__select)};return d.superclass=a,c.extend(d.prototype,a.prototype,{setValue:function(a){return a=d.superclass.prototype.setValue.call(this,a),this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue()),a},updateDisplay:function(){return this.__select.value=this.getValue(),d.superclass.prototype.updateDisplay.call(this)}}),d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.controllers.NumberController=function(a,b){function c(a){return a=a.toString(),-1<a.indexOf(".")?a.length-a.indexOf(".")-1:0}var d=function(a,e,f){d.superclass.call(this,a,e),f=f||{},this.__min=f.min,this.__max=f.max,this.__step=f.step,b.isUndefined(this.__step)?this.__impliedStep=0==this.initialValue?1:Math.pow(10,Math.floor(Math.log(Math.abs(this.initialValue))/Math.LN10))/10:this.__impliedStep=this.__step,this.__precision=c(this.__impliedStep)};return d.superclass=a,b.extend(d.prototype,a.prototype,{setValue:function(a){return void 0!==this.__min&&a<this.__min?a=this.__min:void 0!==this.__max&&a>this.__max&&(a=this.__max),void 0!==this.__step&&0!=a%this.__step&&(a=Math.round(a/this.__step)*this.__step),d.superclass.prototype.setValue.call(this,a)},min:function(a){return this.__min=a,this},max:function(a){return this.__max=a,this},step:function(a){return this.__impliedStep=this.__step=a,this.__precision=c(a),this}}),d}(dat.controllers.Controller,dat.utils.common),dat.controllers.NumberControllerBox=function(a,b,c){var d=function(a,e,f){function g(){var a=parseFloat(j.__input.value);c.isNaN(a)||j.setValue(a)}function h(a){var b=k-a.clientY;j.setValue(j.getValue()+b*j.__impliedStep),k=a.clientY}function i(){b.unbind(window,"mousemove",h),b.unbind(window,"mouseup",i)}this.__truncationSuspended=!1,d.superclass.call(this,a,e,f);var k,j=this;this.__input=document.createElement("input"),this.__input.setAttribute("type","text"),b.bind(this.__input,"change",g),b.bind(this.__input,"blur",function(){g(),j.__onFinishChange&&j.__onFinishChange.call(j,j.getValue())}),b.bind(this.__input,"mousedown",function(a){b.bind(window,"mousemove",h),b.bind(window,"mouseup",i),k=a.clientY}),b.bind(this.__input,"keydown",function(a){13===a.keyCode&&(j.__truncationSuspended=!0,this.blur(),j.__truncationSuspended=!1)}),this.updateDisplay(),this.domElement.appendChild(this.__input)};return d.superclass=a,c.extend(d.prototype,a.prototype,{updateDisplay:function(){var b,a=this.__input;if(this.__truncationSuspended)b=this.getValue();else{b=this.getValue();var c=Math.pow(10,this.__precision);b=Math.round(b*c)/c}return a.value=b,d.superclass.prototype.updateDisplay.call(this)}}),d}(dat.controllers.NumberController,dat.dom.dom,dat.utils.common),dat.controllers.NumberControllerSlider=function(a,b,c,d,e){function f(a,b,c,d,e){return d+(a-b)/(c-b)*(e-d)}var g=function(a,c,d,e,h){function i(a){a.preventDefault();var c=b.getOffset(k.__background),d=b.getWidth(k.__background);return k.setValue(f(a.clientX,c.left,c.left+d,k.__min,k.__max)),!1}function j(){b.unbind(window,"mousemove",i),b.unbind(window,"mouseup",j),k.__onFinishChange&&k.__onFinishChange.call(k,k.getValue())}g.superclass.call(this,a,c,{min:d,max:e,step:h});var k=this;this.__background=document.createElement("div"),this.__foreground=document.createElement("div"),b.bind(this.__background,"mousedown",function(a){b.bind(window,"mousemove",i),b.bind(window,"mouseup",j),i(a)}),b.addClass(this.__background,"slider"),b.addClass(this.__foreground,"slider-fg"),this.updateDisplay(),this.__background.appendChild(this.__foreground),this.domElement.appendChild(this.__background)};return g.superclass=a,g.useDefaultStyles=function(){c.inject(e)},d.extend(g.prototype,a.prototype,{updateDisplay:function(){var a=(this.getValue()-this.__min)/(this.__max-this.__min);return this.__foreground.style.width=100*a+"%",g.superclass.prototype.updateDisplay.call(this)}}),g}(dat.controllers.NumberController,dat.dom.dom,dat.utils.css,dat.utils.common,"/**\n * dat-gui JavaScript Controller Library\n * http://code.google.com/p/dat-gui\n *\n * Copyright 2011 Data Arts Team, Google Creative Lab\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n * http://www.apache.org/licenses/LICENSE-2.0\n */\n\n.slider {\n  box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);\n  height: 1em;\n  border-radius: 1em;\n  background-color: #eee;\n  padding: 0 0.5em;\n  overflow: hidden;\n}\n\n.slider-fg {\n  padding: 1px 0 2px 0;\n  background-color: #aaa;\n  height: 1em;\n  margin-left: -0.5em;\n  padding-right: 0.5em;\n  border-radius: 1em 0 0 1em;\n}\n\n.slider-fg:after {\n  display: inline-block;\n  border-radius: 1em;\n  background-color: #fff;\n  border:  1px solid #aaa;\n  content: '';\n  float: right;\n  margin-right: -1em;\n  margin-top: -1px;\n  height: 0.9em;\n  width: 0.9em;\n}"),dat.controllers.FunctionController=function(a,b,c){var d=function(a,c,e){d.superclass.call(this,a,c);var f=this;this.__button=document.createElement("div"),this.__button.innerHTML=void 0===e?"Fire":e,b.bind(this.__button,"click",function(a){return a.preventDefault(),f.fire(),!1}),b.addClass(this.__button,"button"),this.domElement.appendChild(this.__button)};return d.superclass=a,c.extend(d.prototype,a.prototype,{fire:function(){this.__onChange&&this.__onChange.call(this),this.getValue().call(this.object),this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue())}}),d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.controllers.BooleanController=function(a,b,c){var d=function(a,c){d.superclass.call(this,a,c);var e=this;this.__prev=this.getValue(),this.__checkbox=document.createElement("input"),this.__checkbox.setAttribute("type","checkbox"),b.bind(this.__checkbox,"change",function(){e.setValue(!e.__prev)},!1),this.domElement.appendChild(this.__checkbox),this.updateDisplay()};return d.superclass=a,c.extend(d.prototype,a.prototype,{setValue:function(a){return a=d.superclass.prototype.setValue.call(this,a),this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue()),this.__prev=this.getValue(),a},updateDisplay:function(){return!0===this.getValue()?(this.__checkbox.setAttribute("checked","checked"),this.__checkbox.checked=!0):this.__checkbox.checked=!1,d.superclass.prototype.updateDisplay.call(this)}}),d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.color.toString=function(a){return function(b){if(1==b.a||a.isUndefined(b.a)){for(b=b.hex.toString(16);6>b.length;)b="0"+b;return"#"+b}return"rgba("+Math.round(b.r)+","+Math.round(b.g)+","+Math.round(b.b)+","+b.a+")"}}(dat.utils.common),dat.color.interpret=function(a,b){var c,d,e=[{litmus:b.isString,conversions:{THREE_CHAR_HEX:{read:function(a){return a=a.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i),null!==a&&{space:"HEX",hex:parseInt("0x"+a[1].toString()+a[1].toString()+a[2].toString()+a[2].toString()+a[3].toString()+a[3].toString())}},write:a},SIX_CHAR_HEX:{read:function(a){return a=a.match(/^#([A-F0-9]{6})$/i),null!==a&&{space:"HEX",hex:parseInt("0x"+a[1].toString())}},write:a},CSS_RGB:{read:function(a){return a=a.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/),null!==a&&{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3])}},write:a},CSS_RGBA:{read:function(a){return a=a.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\,\s*(.+)\s*\)/),null!==a&&{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3]),a:parseFloat(a[4])}},write:a}}},{litmus:b.isNumber,conversions:{HEX:{read:function(a){return{space:"HEX",hex:a,conversionName:"HEX"}},write:function(a){return a.hex}}}},{litmus:b.isArray,conversions:{RGB_ARRAY:{read:function(a){return 3==a.length&&{space:"RGB",r:a[0],g:a[1],b:a[2]}},write:function(a){return[a.r,a.g,a.b]}},RGBA_ARRAY:{read:function(a){return 4==a.length&&{space:"RGB",r:a[0],g:a[1],b:a[2],a:a[3]}},write:function(a){return[a.r,a.g,a.b,a.a]}}}},{litmus:b.isObject,conversions:{RGBA_OBJ:{read:function(a){return!!(b.isNumber(a.r)&&b.isNumber(a.g)&&b.isNumber(a.b)&&b.isNumber(a.a))&&{space:"RGB",r:a.r,g:a.g,b:a.b,a:a.a}},write:function(a){return{r:a.r,g:a.g,b:a.b,a:a.a}}},RGB_OBJ:{read:function(a){return!!(b.isNumber(a.r)&&b.isNumber(a.g)&&b.isNumber(a.b))&&{space:"RGB",r:a.r,g:a.g,b:a.b}},write:function(a){return{r:a.r,g:a.g,b:a.b}}},HSVA_OBJ:{read:function(a){return!!(b.isNumber(a.h)&&b.isNumber(a.s)&&b.isNumber(a.v)&&b.isNumber(a.a))&&{space:"HSV",h:a.h,s:a.s,v:a.v,a:a.a}},write:function(a){return{h:a.h,s:a.s,v:a.v,a:a.a}}},HSV_OBJ:{read:function(a){return!!(b.isNumber(a.h)&&b.isNumber(a.s)&&b.isNumber(a.v))&&{space:"HSV",h:a.h,s:a.s,v:a.v}},write:function(a){return{h:a.h,s:a.s,v:a.v}}}}}];return function(){d=!1;var a=1<arguments.length?b.toArray(arguments):arguments[0];return b.each(e,function(e){if(e.litmus(a))return b.each(e.conversions,function(e,f){if(c=e.read(a),!1===d&&!1!==c)return d=c,c.conversionName=f,c.conversion=e,b.BREAK}),b.BREAK}),d}}(dat.color.toString,dat.utils.common),dat.GUI=dat.gui.GUI=function(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o){function p(a,b,c,f){if(void 0===b[c])throw Error("Object "+b+' has no property "'+c+'"');f.color?b=new k(b,c):(b=[b,c].concat(f.factoryArgs),b=d.apply(a,b)),f.before instanceof e&&(f.before=f.before.__li),s(a,b),n.addClass(b.domElement,"c"),c=document.createElement("span"),n.addClass(c,"property-name"),c.innerHTML=b.property;var g=document.createElement("div");return g.appendChild(c),g.appendChild(b.domElement),f=q(a,g,f.before),n.addClass(f,G.CLASS_CONTROLLER_ROW),n.addClass(f,typeof b.getValue()),r(a,f,b),a.__controllers.push(b),b}function q(a,b,c){var d=document.createElement("li");return b&&d.appendChild(b),c?a.__ul.insertBefore(d,params.before):a.__ul.appendChild(d),a.onResize(),d}function r(a,b,c){if(c.__li=b,c.__gui=a,o.extend(c,{options:function(b){return 1<arguments.length?(c.remove(),p(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[o.toArray(arguments)]})):o.isArray(b)||o.isObject(b)?(c.remove(),p(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[b]})):void 0},name:function(a){return c.__li.firstElementChild.firstElementChild.innerHTML=a,c},listen:function(){return c.__gui.listen(c),c},remove:function(){return c.__gui.remove(c),c}}),c instanceof i){var d=new h(c.object,c.property,{min:c.__min,max:c.__max,step:c.__step});o.each(["updateDisplay","onChange","onFinishChange"],function(a){var b=c[a],e=d[a];c[a]=d[a]=function(){var a=Array.prototype.slice.call(arguments);return b.apply(c,a),e.apply(d,a)}}),n.addClass(b,"has-slider"),c.domElement.insertBefore(d.domElement,c.domElement.firstElementChild)}else if(c instanceof h){var e=function(b){return o.isNumber(c.__min)&&o.isNumber(c.__max)?(c.remove(),p(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[c.__min,c.__max,c.__step]})):b};c.min=o.compose(e,c.min),c.max=o.compose(e,c.max)}else c instanceof f?(n.bind(b,"click",function(){n.fakeEvent(c.__checkbox,"click")}),n.bind(c.__checkbox,"click",function(a){a.stopPropagation()})):c instanceof g?(n.bind(b,"click",function(){n.fakeEvent(c.__button,"click")}),n.bind(b,"mouseover",function(){n.addClass(c.__button,"hover")}),n.bind(b,"mouseout",function(){n.removeClass(c.__button,"hover")})):c instanceof k&&(n.addClass(b,"color"),c.updateDisplay=o.compose(function(a){return b.style.borderLeftColor=c.__color.toString(),a},c.updateDisplay),c.updateDisplay());c.setValue=o.compose(function(b){return a.getRoot().__preset_select&&c.isModified()&&y(a.getRoot(),!0),b},c.setValue)}function s(a,b){var c=a.getRoot(),d=c.__rememberedObjects.indexOf(b.object);if(-1!=d){var e=c.__rememberedObjectIndecesToControllers[d];if(void 0===e&&(e={},c.__rememberedObjectIndecesToControllers[d]=e),e[b.property]=b,c.load&&c.load.remembered){if(c=c.load.remembered,c[a.preset])c=c[a.preset];else{if(!c.Default)return;c=c.Default}c[d]&&void 0!==c[d][b.property]&&(d=c[d][b.property],b.initialValue=d,b.setValue(d))}}}function t(a){var b=a.__save_row=document.createElement("li");n.addClass(a.domElement,"has-save"),a.__ul.insertBefore(b,a.__ul.firstChild),n.addClass(b,"save-row");var c=document.createElement("span");c.innerHTML="&nbsp;",n.addClass(c,"button gears");var d=document.createElement("span");d.innerHTML="Save",n.addClass(d,"button"),n.addClass(d,"save");var e=document.createElement("span");e.innerHTML="New",n.addClass(e,"button"),n.addClass(e,"save-as");var f=document.createElement("span");f.innerHTML="Revert",n.addClass(f,"button"),n.addClass(f,"revert");var g=a.__preset_select=document.createElement("select");if(a.load&&a.load.remembered?o.each(a.load.remembered,function(b,c){x(a,c,c==a.preset)}):x(a,"Default",!1),n.bind(g,"change",function(){for(var b=0;b<a.__preset_select.length;b++)a.__preset_select[b].innerHTML=a.__preset_select[b].value;a.preset=this.value}),b.appendChild(g),b.appendChild(c),b.appendChild(d),b.appendChild(e),b.appendChild(f),A){var h=function(){i.style.display=a.useLocalStorage?"block":"none"},b=document.getElementById("dg-save-locally"),i=document.getElementById("dg-local-explain");b.style.display="block",b=document.getElementById("dg-local-storage"),"true"===localStorage.getItem(document.location.href+".isLocal")&&b.setAttribute("checked","checked"),h(),n.bind(b,"change",function(){a.useLocalStorage=!a.useLocalStorage,h()})}var j=document.getElementById("dg-new-constructor");n.bind(j,"keydown",function(a){!a.metaKey||67!==a.which&&67!=a.keyCode||B.hide()}),n.bind(c,"click",function(){j.innerHTML=JSON.stringify(a.getSaveObject(),void 0,2),B.show(),j.focus(),j.select()}),n.bind(d,"click",function(){a.save()}),n.bind(e,"click",function(){var b=prompt("Enter a new preset name.");b&&a.saveAs(b)}),n.bind(f,"click",function(){a.revert()})}function u(a){function b(b){return b.preventDefault(),e=b.clientX,n.addClass(a.__closeButton,G.CLASS_DRAG),n.bind(window,"mousemove",c),n.bind(window,"mouseup",d),!1}function c(b){return b.preventDefault(),a.width+=e-b.clientX,a.onResize(),e=b.clientX,!1}function d(){n.removeClass(a.__closeButton,G.CLASS_DRAG),n.unbind(window,"mousemove",c),n.unbind(window,"mouseup",d)}a.__resize_handle=document.createElement("div"),o.extend(a.__resize_handle.style,{width:"6px",marginLeft:"-3px",height:"200px",cursor:"ew-resize",position:"absolute"});var e;n.bind(a.__resize_handle,"mousedown",b),n.bind(a.__closeButton,"mousedown",b),a.domElement.insertBefore(a.__resize_handle,a.domElement.firstElementChild)}function v(a,b){a.domElement.style.width=b+"px",a.__save_row&&a.autoPlace&&(a.__save_row.style.width=b+"px"),a.__closeButton&&(a.__closeButton.style.width=b+"px")}function w(a,b){var c={};return o.each(a.__rememberedObjects,function(d,e){var f={};o.each(a.__rememberedObjectIndecesToControllers[e],function(a,c){f[c]=b?a.initialValue:a.getValue()}),c[e]=f}),c}function x(a,b,c){var d=document.createElement("option");d.innerHTML=b,d.value=b,a.__preset_select.appendChild(d),c&&(a.__preset_select.selectedIndex=a.__preset_select.length-1)}function y(a,b){var c=a.__preset_select[a.__preset_select.selectedIndex];c.innerHTML=b?c.value+"*":c.value}function z(a){0!=a.length&&l(function(){z(a)}),o.each(a,function(a){a.updateDisplay()})}a.inject(c);var A;try{A="localStorage"in window&&null!==window.localStorage}catch(a){A=!1}var B,D,C=!0,E=!1,F=[],G=function(a){function b(){var a=c.getRoot();a.width+=1,o.defer(function(){--a.width})}var c=this;this.domElement=document.createElement("div"),this.__ul=document.createElement("ul"),this.domElement.appendChild(this.__ul),n.addClass(this.domElement,"dg"),this.__folders={},this.__controllers=[],this.__rememberedObjects=[],this.__rememberedObjectIndecesToControllers=[],this.__listening=[],a=a||{},a=o.defaults(a,{autoPlace:!0,width:G.DEFAULT_WIDTH}),a=o.defaults(a,{resizable:a.autoPlace,hideable:a.autoPlace}),o.isUndefined(a.load)?a.load={preset:"Default"}:a.preset&&(a.load.preset=a.preset),o.isUndefined(a.parent)&&a.hideable&&F.push(this),a.resizable=o.isUndefined(a.parent)&&a.resizable,a.autoPlace&&o.isUndefined(a.scrollable)&&(a.scrollable=!0);var e,d=A&&"true"===localStorage.getItem(document.location.href+".isLocal");if(Object.defineProperties(this,{parent:{get:function(){return a.parent}},scrollable:{get:function(){return a.scrollable}},autoPlace:{get:function(){return a.autoPlace}},preset:{get:function(){return c.parent?c.getRoot().preset:a.load.preset},set:function(b){for(c.parent?c.getRoot().preset=b:a.load.preset=b,b=0;b<this.__preset_select.length;b++)this.__preset_select[b].value==this.preset&&(this.__preset_select.selectedIndex=b);c.revert()}},width:{get:function(){return a.width},set:function(b){a.width=b,v(c,b)}},name:{get:function(){return a.name},set:function(b){a.name=b,g&&(g.innerHTML=a.name)}},closed:{get:function(){return a.closed},set:function(b){a.closed=b,a.closed?n.addClass(c.__ul,G.CLASS_CLOSED):n.removeClass(c.__ul,G.CLASS_CLOSED),this.onResize(),c.__closeButton&&(c.__closeButton.innerHTML=b?G.TEXT_OPEN:G.TEXT_CLOSED)}},load:{get:function(){return a.load}},useLocalStorage:{get:function(){return d},set:function(a){A&&((d=a)?n.bind(window,"unload",e):n.unbind(window,"unload",e),localStorage.setItem(document.location.href+".isLocal",a))}}}),o.isUndefined(a.parent)){if(a.closed=!1,n.addClass(this.domElement,G.CLASS_MAIN),n.makeSelectable(this.domElement,!1),A&&d){c.useLocalStorage=!0;var f=localStorage.getItem(document.location.href+".gui");f&&(a.load=JSON.parse(f))}this.__closeButton=document.createElement("div"),this.__closeButton.innerHTML=G.TEXT_CLOSED,n.addClass(this.__closeButton,G.CLASS_CLOSE_BUTTON),this.domElement.appendChild(this.__closeButton),n.bind(this.__closeButton,"click",function(){c.closed=!c.closed})}else{void 0===a.closed&&(a.closed=!0);var g=document.createTextNode(a.name);n.addClass(g,"controller-name"),f=q(c,g),n.addClass(this.__ul,G.CLASS_CLOSED),n.addClass(f,"title"),n.bind(f,"click",function(a){return a.preventDefault(),c.closed=!c.closed,!1}),a.closed||(this.closed=!1)}a.autoPlace&&(o.isUndefined(a.parent)&&(C&&(D=document.createElement("div"),n.addClass(D,"dg"),n.addClass(D,G.CLASS_AUTO_PLACE_CONTAINER),document.body.appendChild(D),C=!1),D.appendChild(this.domElement),n.addClass(this.domElement,G.CLASS_AUTO_PLACE)),this.parent||v(c,a.width)),n.bind(window,"resize",function(){c.onResize()}),n.bind(this.__ul,"webkitTransitionEnd",function(){c.onResize()}),n.bind(this.__ul,"transitionend",function(){c.onResize()}),n.bind(this.__ul,"oTransitionEnd",function(){c.onResize()}),this.onResize(),a.resizable&&u(this),this.saveToLocalStorageIfPossible=e=function(){A&&"true"===localStorage.getItem(document.location.href+".isLocal")&&localStorage.setItem(document.location.href+".gui",JSON.stringify(c.getSaveObject()))},c.getRoot(),a.parent||b()};return G.toggleHide=function(){E=!E,o.each(F,function(a){a.domElement.style.zIndex=E?-999:999,a.domElement.style.opacity=E?0:1})},G.CLASS_AUTO_PLACE="a",G.CLASS_AUTO_PLACE_CONTAINER="ac",G.CLASS_MAIN="main",G.CLASS_CONTROLLER_ROW="cr",G.CLASS_TOO_TALL="taller-than-window",G.CLASS_CLOSED="closed",G.CLASS_CLOSE_BUTTON="close-button",G.CLASS_DRAG="drag",G.DEFAULT_WIDTH=245,G.TEXT_CLOSED="Close Controls",G.TEXT_OPEN="Open Controls",n.bind(window,"keydown",function(a){"text"===document.activeElement.type||72!==a.which&&72!=a.keyCode||G.toggleHide()},!1),o.extend(G.prototype,{add:function(a,b){return p(this,a,b,{factoryArgs:Array.prototype.slice.call(arguments,2)})},addColor:function(a,b){return p(this,a,b,{color:!0})},remove:function(a){this.__ul.removeChild(a.__li),this.__controllers.splice(this.__controllers.indexOf(a),1);var b=this;o.defer(function(){b.onResize()})},destroy:function(){this.autoPlace&&D.removeChild(this.domElement)},addFolder:function(a){if(void 0!==this.__folders[a])throw Error('You already have a folder in this GUI by the name "'+a+'"');var b={name:a,parent:this};return b.autoPlace=this.autoPlace,this.load&&this.load.folders&&this.load.folders[a]&&(b.closed=this.load.folders[a].closed,b.load=this.load.folders[a]),b=new G(b),this.__folders[a]=b,a=q(this,b.domElement),n.addClass(a,"folder"),b},open:function(){this.closed=!1},close:function(){this.closed=!0},onResize:function(){var a=this.getRoot();if(a.scrollable){var b=n.getOffset(a.__ul).top,c=0;o.each(a.__ul.childNodes,function(b){a.autoPlace&&b===a.__save_row||(c+=n.getHeight(b))}),window.innerHeight-b-20<c?(n.addClass(a.domElement,G.CLASS_TOO_TALL),a.__ul.style.height=window.innerHeight-b-20+"px"):(n.removeClass(a.domElement,G.CLASS_TOO_TALL),a.__ul.style.height="auto")}a.__resize_handle&&o.defer(function(){a.__resize_handle.style.height=a.__ul.offsetHeight+"px"}),a.__closeButton&&(a.__closeButton.style.width=a.width+"px")},remember:function(){if(o.isUndefined(B)&&(B=new m,B.domElement.innerHTML=b),this.parent)throw Error("You can only call remember on a top level GUI.");var a=this;o.each(Array.prototype.slice.call(arguments),function(b){0==a.__rememberedObjects.length&&t(a),-1==a.__rememberedObjects.indexOf(b)&&a.__rememberedObjects.push(b)}),this.autoPlace&&v(this,this.width)},getRoot:function(){for(var a=this;a.parent;)a=a.parent;return a},getSaveObject:function(){var a=this.load;return a.closed=this.closed,0<this.__rememberedObjects.length&&(a.preset=this.preset,a.remembered||(a.remembered={}),a.remembered[this.preset]=w(this)),a.folders={},o.each(this.__folders,function(b,c){a.folders[c]=b.getSaveObject()}),a},save:function(){this.load.remembered||(this.load.remembered={}),this.load.remembered[this.preset]=w(this),y(this,!1),this.saveToLocalStorageIfPossible()},saveAs:function(a){this.load.remembered||(this.load.remembered={},this.load.remembered.Default=w(this,!0)),this.load.remembered[a]=w(this),this.preset=a,x(this,a,!0),this.saveToLocalStorageIfPossible()},revert:function(a){o.each(this.__controllers,function(b){this.getRoot().load.remembered?s(a||this.getRoot(),b):b.setValue(b.initialValue)},this),o.each(this.__folders,function(a){a.revert(a)}),a||y(this.getRoot(),!1)},listen:function(a){var b=0==this.__listening.length;this.__listening.push(a),b&&z(this.__listening)}}),G}(dat.utils.css,'<div id="dg-save" class="dg dialogue">\n\n  Here\'s the new load parameter for your <code>GUI</code>\'s constructor:\n\n  <textarea id="dg-new-constructor"></textarea>\n\n  <div id="dg-save-locally">\n\n    <input id="dg-local-storage" type="checkbox"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id="dg-local-explain">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>\'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n      \n    </div>\n    \n  </div>\n\n</div>',".dg {\n  /** Clear list styles */\n  /* Auto-place container */\n  /* Auto-placed GUI's */\n  /* Line items that don't contain folders. */\n  /** Folder names */\n  /** Hides closed items */\n  /** Controller row */\n  /** Name-half (left) */\n  /** Controller-half (right) */\n  /** Controller placement */\n  /** Shorter number boxes when slider is present. */\n  /** Ensure the entire boolean and function row shows a hand */ }\n  .dg ul {\n    list-style: none;\n    margin: 0;\n    padding: 0;\n    width: 100%;\n    clear: both; }\n  .dg.ac {\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    height: 0;\n    z-index: 0; }\n  .dg:not(.ac) .main {\n    /** Exclude mains in ac so that we don't hide close button */\n    overflow: hidden; }\n  .dg.main {\n    -webkit-transition: opacity 0.1s linear;\n    -o-transition: opacity 0.1s linear;\n    -moz-transition: opacity 0.1s linear;\n    transition: opacity 0.1s linear; }\n    .dg.main.taller-than-window {\n      overflow-y: auto; }\n      .dg.main.taller-than-window .close-button {\n        opacity: 1;\n        \n        margin-top: -1px;\n        border-top: 1px solid #2c2c2c; }\n    .dg.main ul.closed .close-button {\n      opacity: 1 !important; }\n    .dg.main:hover .close-button,\n    .dg.main .close-button.drag {\n      opacity: 1; }\n    .dg.main .close-button {\n      /*opacity: 0;*/\n      -webkit-transition: opacity 0.1s linear;\n      -o-transition: opacity 0.1s linear;\n      -moz-transition: opacity 0.1s linear;\n      transition: opacity 0.1s linear;\n      border: 0;\n      position: absolute;\n      line-height: 19px;\n      height: 20px;\n      \n      cursor: pointer;\n      text-align: center;\n      background-color: #000; }\n      .dg.main .close-button:hover {\n        background-color: #111; }\n  .dg.a {\n    float: right;\n    margin-right: 15px;\n    overflow-x: hidden; }\n    .dg.a.has-save > ul {\n      margin-top: 27px; }\n      .dg.a.has-save > ul.closed {\n        margin-top: 0; }\n    .dg.a .save-row {\n      position: fixed;\n      top: 0;\n      z-index: 1002; }\n  .dg li {\n    -webkit-transition: height 0.1s ease-out;\n    -o-transition: height 0.1s ease-out;\n    -moz-transition: height 0.1s ease-out;\n    transition: height 0.1s ease-out; }\n  .dg li:not(.folder) {\n    cursor: auto;\n    height: 27px;\n    line-height: 27px;\n    overflow: hidden;\n    padding: 0 4px 0 5px; }\n  .dg li.folder {\n    padding: 0;\n    border-left: 4px solid rgba(0, 0, 0, 0); }\n  .dg li.title {\n    cursor: pointer;\n    margin-left: -4px; }\n  .dg .closed li:not(.title),\n  .dg .closed ul li,\n  .dg .closed ul li > * {\n    height: 0;\n    overflow: hidden;\n    border: 0; }\n  .dg .cr {\n    clear: both;\n    padding-left: 3px;\n    height: 27px; }\n  .dg .property-name {\n    cursor: default;\n    float: left;\n    clear: left;\n    width: 40%;\n    overflow: hidden;\n    text-overflow: ellipsis; }\n  .dg .c {\n    float: left;\n    width: 60%; }\n  .dg .c input[type=text] {\n    border: 0;\n    margin-top: 4px;\n    padding: 3px;\n    width: 100%;\n    float: right; }\n  .dg .has-slider input[type=text] {\n    width: 30%;\n    /*display: none;*/\n    margin-left: 0; }\n  .dg .slider {\n    float: left;\n    width: 66%;\n    margin-left: -5px;\n    margin-right: 0;\n    height: 19px;\n    margin-top: 4px; }\n  .dg .slider-fg {\n    height: 100%; }\n  .dg .c input[type=checkbox] {\n    margin-top: 9px; }\n  .dg .c select {\n    margin-top: 5px; }\n  .dg .cr.function,\n  .dg .cr.function .property-name,\n  .dg .cr.function *,\n  .dg .cr.boolean,\n  .dg .cr.boolean * {\n    cursor: pointer; }\n  .dg .selector {\n    display: none;\n    position: absolute;\n    margin-left: -9px;\n    margin-top: 23px;\n    z-index: 10; }\n  .dg .c:hover .selector,\n  .dg .selector.drag {\n    display: block; }\n  .dg li.save-row {\n    padding: 0; }\n    .dg li.save-row .button {\n      display: inline-block;\n      padding: 0px 6px; }\n  .dg.dialogue {\n    background-color: #222;\n    width: 460px;\n    padding: 15px;\n    font-size: 13px;\n    line-height: 15px; }\n\n\n#dg-new-constructor {\n  padding: 10px;\n  color: #222;\n  font-family: Monaco, monospace;\n  font-size: 10px;\n  border: 0;\n  resize: none;\n  box-shadow: inset 1px 1px 1px #888;\n  word-wrap: break-word;\n  margin: 12px 0;\n  display: block;\n  width: 440px;\n  overflow-y: scroll;\n  height: 100px;\n  position: relative; }\n\n#dg-local-explain {\n  display: none;\n  font-size: 11px;\n  line-height: 17px;\n  border-radius: 3px;\n  background-color: #333;\n  padding: 8px;\n  margin-top: 10px; }\n  #dg-local-explain code {\n    font-size: 10px; }\n\n#dat-gui-save-locally {\n  display: none; }\n\n/** Main type */\n.dg {\n  color: #eee;\n  font: 11px 'Lucida Grande', sans-serif;\n  text-shadow: 0 -1px 0 #111;\n  /** Auto place */\n  /* Controller row, <li> */\n  /** Controllers */ }\n  .dg.main {\n    /** Scrollbar */ }\n    .dg.main::-webkit-scrollbar {\n      width: 5px;\n      background: #1a1a1a; }\n    .dg.main::-webkit-scrollbar-corner {\n      height: 0;\n      display: none; }\n    .dg.main::-webkit-scrollbar-thumb {\n      border-radius: 5px;\n      background: #676767; }\n  .dg li:not(.folder) {\n    background: #1a1a1a;\n    border-bottom: 1px solid #2c2c2c; }\n  .dg li.save-row {\n    line-height: 25px;\n    background: #dad5cb;\n    border: 0; }\n    .dg li.save-row select {\n      margin-left: 5px;\n      width: 108px; }\n    .dg li.save-row .button {\n      margin-left: 5px;\n      margin-top: 1px;\n      border-radius: 2px;\n      font-size: 9px;\n      line-height: 7px;\n      padding: 4px 4px 5px 4px;\n      background: #c5bdad;\n      color: #fff;\n      text-shadow: 0 1px 0 #b0a58f;\n      box-shadow: 0 -1px 0 #b0a58f;\n      cursor: pointer; }\n      .dg li.save-row .button.gears {\n        background: #c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;\n        height: 7px;\n        width: 8px; }\n      .dg li.save-row .button:hover {\n        background-color: #bab19e;\n        box-shadow: 0 -1px 0 #b0a58f; }\n  .dg li.folder {\n    border-bottom: 0; }\n  .dg li.title {\n    padding-left: 16px;\n    background: black url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;\n    cursor: pointer;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.2); }\n  .dg .closed li.title {\n    background-image: url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==); }\n  .dg .cr.boolean {\n    border-left: 3px solid #806787; }\n  .dg .cr.function {\n    border-left: 3px solid #e61d5f; }\n  .dg .cr.number {\n    border-left: 3px solid #2fa1d6; }\n    .dg .cr.number input[type=text] {\n      color: #2fa1d6; }\n  .dg .cr.string {\n    border-left: 3px solid #1ed36f; }\n    .dg .cr.string input[type=text] {\n      color: #1ed36f; }\n  .dg .cr.function:hover, .dg .cr.boolean:hover {\n    background: #111; }\n  .dg .c input[type=text] {\n    background: #303030;\n    outline: none; }\n    .dg .c input[type=text]:hover {\n      background: #3c3c3c; }\n    .dg .c input[type=text]:focus {\n      background: #494949;\n      color: #fff; }\n  .dg .c .slider {\n    background: #303030;\n    cursor: ew-resize; }\n  .dg .c .slider-fg {\n    background: #2fa1d6; }\n  .dg .c .slider:hover {\n    background: #3c3c3c; }\n    .dg .c .slider:hover .slider-fg {\n      background: #44abda; }\n",dat.controllers.factory=function(a,b,c,d,e,f,g){return function(h,i,j,k){var l=h[i];return g.isArray(j)||g.isObject(j)?new a(h,i,j):g.isNumber(l)?g.isNumber(j)&&g.isNumber(k)?new c(h,i,j,k):new b(h,i,{min:j,max:k}):g.isString(l)?new d(h,i):g.isFunction(l)?new e(h,i,""):g.isBoolean(l)?new f(h,i):void 0}}(dat.controllers.OptionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.StringController=function(a,b,c){var d=function(a,c){function e(){f.setValue(f.__input.value)}d.superclass.call(this,a,c);var f=this;this.__input=document.createElement("input"),this.__input.setAttribute("type","text"),b.bind(this.__input,"keyup",e),b.bind(this.__input,"change",e),b.bind(this.__input,"blur",function(){f.__onFinishChange&&f.__onFinishChange.call(f,f.getValue())}),b.bind(this.__input,"keydown",function(a){13===a.keyCode&&this.blur()}),this.updateDisplay(),this.domElement.appendChild(this.__input)};return d.superclass=a,c.extend(d.prototype,a.prototype,{updateDisplay:function(){return b.isActive(this.__input)||(this.__input.value=this.getValue()),d.superclass.prototype.updateDisplay.call(this)}}),d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.controllers.FunctionController,dat.controllers.BooleanController,dat.utils.common),dat.controllers.Controller,dat.controllers.BooleanController,dat.controllers.FunctionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.OptionController,dat.controllers.ColorController=function(a,b,c,d,e){function f(a,b,c,d){a.style.background="",e.each(i,function(e){a.style.cssText+="background: "+e+"linear-gradient("+b+", "+c+" 0%, "+d+" 100%); "})}function g(a){a.style.background="",a.style.cssText+="background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);",a.style.cssText+="background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",a.style.cssText+="background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",a.style.cssText+="background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",a.style.cssText+="background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);"}var h=function(a,i){function j(a){n(a),b.bind(window,"mousemove",n),b.bind(window,"mouseup",k)}function k(){b.unbind(window,"mousemove",n),b.unbind(window,"mouseup",k)}function l(){var a=d(this.value);!1!==a?(p.__color.__state=a,p.setValue(p.__color.toOriginal())):this.value=p.__color.toString()}function m(){b.unbind(window,"mousemove",o),b.unbind(window,"mouseup",m)}function n(a){a.preventDefault();var c=b.getWidth(p.__saturation_field),d=b.getOffset(p.__saturation_field),e=(a.clientX-d.left+document.body.scrollLeft)/c;return a=1-(a.clientY-d.top+document.body.scrollTop)/c,1<a?a=1:0>a&&(a=0),1<e?e=1:0>e&&(e=0),p.__color.v=a,p.__color.s=e,p.setValue(p.__color.toOriginal()),!1}function o(a){a.preventDefault();var c=b.getHeight(p.__hue_field),d=b.getOffset(p.__hue_field);return a=1-(a.clientY-d.top+document.body.scrollTop)/c,1<a?a=1:0>a&&(a=0),p.__color.h=360*a,p.setValue(p.__color.toOriginal()),!1}h.superclass.call(this,a,i),this.__color=new c(this.getValue()),this.__temp=new c(0);var p=this;this.domElement=document.createElement("div"),b.makeSelectable(this.domElement,!1),this.__selector=document.createElement("div"),this.__selector.className="selector",this.__saturation_field=document.createElement("div"),this.__saturation_field.className="saturation-field",this.__field_knob=document.createElement("div"),this.__field_knob.className="field-knob",this.__field_knob_border="2px solid ",this.__hue_knob=document.createElement("div"),this.__hue_knob.className="hue-knob",this.__hue_field=document.createElement("div"),this.__hue_field.className="hue-field",this.__input=document.createElement("input"),this.__input.type="text",this.__input_textShadow="0 1px 1px ",b.bind(this.__input,"keydown",function(a){13===a.keyCode&&l.call(this)}),b.bind(this.__input,"blur",l),b.bind(this.__selector,"mousedown",function(a){b.addClass(this,"drag").bind(window,"mouseup",function(a){b.removeClass(p.__selector,"drag")})});var q=document.createElement("div");e.extend(this.__selector.style,{width:"122px",height:"102px",padding:"3px",backgroundColor:"#222",boxShadow:"0px 1px 3px rgba(0,0,0,0.3)"}),e.extend(this.__field_knob.style,{position:"absolute",width:"12px",height:"12px",border:this.__field_knob_border+(.5>this.__color.v?"#fff":"#000"),boxShadow:"0px 1px 3px rgba(0,0,0,0.5)",borderRadius:"12px",zIndex:1}),e.extend(this.__hue_knob.style,{position:"absolute",width:"15px",height:"2px",borderRight:"4px solid #fff",zIndex:1}),e.extend(this.__saturation_field.style,{width:"100px",height:"100px",border:"1px solid #555",marginRight:"3px",display:"inline-block",cursor:"pointer"}),e.extend(q.style,{width:"100%",height:"100%",background:"none"}),f(q,"top","rgba(0,0,0,0)","#000"),e.extend(this.__hue_field.style,{width:"15px",height:"100px",display:"inline-block",border:"1px solid #555",cursor:"ns-resize"}),g(this.__hue_field),e.extend(this.__input.style,{outline:"none",textAlign:"center",color:"#fff",border:0,fontWeight:"bold",textShadow:this.__input_textShadow+"rgba(0,0,0,0.7)"}),b.bind(this.__saturation_field,"mousedown",j),b.bind(this.__field_knob,"mousedown",j),b.bind(this.__hue_field,"mousedown",function(a){o(a),b.bind(window,"mousemove",o),b.bind(window,"mouseup",m)}),this.__saturation_field.appendChild(q),this.__selector.appendChild(this.__field_knob),this.__selector.appendChild(this.__saturation_field),this.__selector.appendChild(this.__hue_field),this.__hue_field.appendChild(this.__hue_knob),this.domElement.appendChild(this.__input),this.domElement.appendChild(this.__selector),this.updateDisplay()};h.superclass=a,e.extend(h.prototype,a.prototype,{updateDisplay:function(){var a=d(this.getValue());if(!1!==a){var b=!1;e.each(c.COMPONENTS,function(c){if(!e.isUndefined(a[c])&&!e.isUndefined(this.__color.__state[c])&&a[c]!==this.__color.__state[c])return b=!0,{}},this),b&&e.extend(this.__color.__state,a)}e.extend(this.__temp.__state,this.__color.__state),this.__temp.a=1;var g=.5>this.__color.v||.5<this.__color.s?255:0,h=255-g;e.extend(this.__field_knob.style,{marginLeft:100*this.__color.s-7+"px",marginTop:100*(1-this.__color.v)-7+"px",backgroundColor:this.__temp.toString(),border:this.__field_knob_border+"rgb("+g+","+g+","+g+")"}),this.__hue_knob.style.marginTop=100*(1-this.__color.h/360)+"px",this.__temp.s=1,this.__temp.v=1,f(this.__saturation_field,"left","#fff",this.__temp.toString()),e.extend(this.__input.style,{backgroundColor:this.__input.value=this.__color.toString(),color:"rgb("+g+","+g+","+g+")",textShadow:this.__input_textShadow+"rgba("+h+","+h+","+h+",.7)"})}});var i=["-moz-","-o-","-webkit-","-ms-",""];return h}(dat.controllers.Controller,dat.dom.dom,dat.color.Color=function(a,b,c,d){function e(a,b,c){Object.defineProperty(a,b,{get:function(){return"RGB"===this.__state.space?this.__state[b]:(g(this,b,c),this.__state[b])},set:function(a){"RGB"!==this.__state.space&&(g(this,b,c),this.__state.space="RGB"),this.__state[b]=a}})}function f(a,b){Object.defineProperty(a,b,{get:function(){return"HSV"===this.__state.space?this.__state[b]:(h(this),this.__state[b])},set:function(a){"HSV"!==this.__state.space&&(h(this),this.__state.space="HSV"),this.__state[b]=a}})}function g(a,c,e){if("HEX"===a.__state.space)a.__state[c]=b.component_from_hex(a.__state.hex,e);else{if("HSV"!==a.__state.space)throw"Corrupted color state";d.extend(a.__state,b.hsv_to_rgb(a.__state.h,a.__state.s,a.__state.v))}}function h(a){var c=b.rgb_to_hsv(a.r,a.g,a.b);d.extend(a.__state,{s:c.s,v:c.v}),d.isNaN(c.h)?d.isUndefined(a.__state.h)&&(a.__state.h=0):a.__state.h=c.h}var i=function(){if(this.__state=a.apply(this,arguments),!1===this.__state)throw"Failed to interpret color arguments";this.__state.a=this.__state.a||1};return i.COMPONENTS="r g b h s v hex a".split(" "),d.extend(i.prototype,{toString:function(){return c(this)},toOriginal:function(){return this.__state.conversion.write(this)}}),e(i.prototype,"r",2),e(i.prototype,"g",1),e(i.prototype,"b",0),f(i.prototype,"h"),f(i.prototype,"s"),f(i.prototype,"v"),Object.defineProperty(i.prototype,"a",{get:function(){return this.__state.a},set:function(a){this.__state.a=a}}),Object.defineProperty(i.prototype,"hex",{get:function(){return"HEX"!==!this.__state.space&&(this.__state.hex=b.rgb_to_hex(this.r,this.g,this.b)),this.__state.hex},set:function(a){this.__state.space="HEX",this.__state.hex=a}}),i}(dat.color.interpret,dat.color.math=function(){var a;return{hsv_to_rgb:function(a,b,c){var d=a/60-Math.floor(a/60),e=c*(1-b),f=c*(1-d*b);return b=c*(1-(1-d)*b),a=[[c,b,e],[f,c,e],[e,c,b],[e,f,c],[b,e,c],[c,e,f]][Math.floor(a/60)%6],{r:255*a[0],g:255*a[1],b:255*a[2]}},rgb_to_hsv:function(a,b,c){var d=Math.min(a,b,c),e=Math.max(a,b,c),d=e-d;return 0==e?{h:NaN,s:0,v:0}:(a=(a==e?(b-c)/d:b==e?2+(c-a)/d:4+(a-b)/d)/6,0>a&&(a+=1),{h:360*a,s:d/e,v:e/255})},rgb_to_hex:function(a,b,c){return a=this.hex_with_component(0,2,a),a=this.hex_with_component(a,1,b),a=this.hex_with_component(a,0,c)},component_from_hex:function(a,b){return a>>8*b&255},hex_with_component:function(b,c,d){return d<<(a=8*c)|b&~(255<<a)}}}(),dat.color.toString,dat.utils.common),dat.color.interpret,dat.utils.common),dat.utils.requestAnimationFrame=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(a,b){window.setTimeout(a,1e3/60)}}(),dat.dom.CenteredDiv=function(a,b){var c=function(){this.backgroundElement=document.createElement("div"),b.extend(this.backgroundElement.style,{backgroundColor:"rgba(0,0,0,0.8)",top:0,left:0,display:"none",zIndex:"1000",opacity:0,WebkitTransition:"opacity 0.2s linear",transition:"opacity 0.2s linear"}),a.makeFullscreen(this.backgroundElement),this.backgroundElement.style.position="fixed",this.domElement=document.createElement("div"),b.extend(this.domElement.style,{position:"fixed",display:"none",zIndex:"1001",opacity:0,WebkitTransition:"-webkit-transform 0.2s ease-out, opacity 0.2s linear",transition:"transform 0.2s ease-out, opacity 0.2s linear"}),document.body.appendChild(this.backgroundElement),document.body.appendChild(this.domElement);var c=this;a.bind(this.backgroundElement,"click",function(){c.hide()})};return c.prototype.show=function(){var a=this;this.backgroundElement.style.display="block",this.domElement.style.display="block",this.domElement.style.opacity=0,this.domElement.style.webkitTransform="scale(1.1)",this.layout(),b.defer(function(){a.backgroundElement.style.opacity=1,a.domElement.style.opacity=1,a.domElement.style.webkitTransform="scale(1)"})},c.prototype.hide=function(){var b=this,c=function(){b.domElement.style.display="none",b.backgroundElement.style.display="none",a.unbind(b.domElement,"webkitTransitionEnd",c),a.unbind(b.domElement,"transitionend",c),a.unbind(b.domElement,"oTransitionEnd",c)};a.bind(this.domElement,"webkitTransitionEnd",c),a.bind(this.domElement,"transitionend",c),a.bind(this.domElement,"oTransitionEnd",c),this.backgroundElement.style.opacity=0,this.domElement.style.opacity=0,this.domElement.style.webkitTransform="scale(1.1)"},c.prototype.layout=function(){this.domElement.style.left=window.innerWidth/2-a.getWidth(this.domElement)/2+"px",this.domElement.style.top=window.innerHeight/2-a.getHeight(this.domElement)/2+"px"},c}(dat.dom.dom,dat.utils.common),dat.dom.dom,dat.utils.common);
function addGUI() {
    var button = simpleArticleIframe.createElement("button");

    button.className = "simple-control simple-edit-theme";
    button.title = "Edit your theme";
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 626 626"><g transform="translate(0,626) scale(0.1,-0.1)" stroke="none"><path d="M6155 5867 c-116 -63 -356 -224 -645 -433 -85 -62 -168 -122 -185 -134 -53 -38 -255 -190 -458 -344 -109 -83 -208 -158 -220 -166 -12 -8 -90 -69 -173 -135 -83 -66 -222 -176 -309 -245 -87 -69 -191 -151 -229 -183 -39 -32 -89 -73 -110 -90 -22 -18 -53 -44 -70 -58 -17 -15 -99 -82 -182 -150 -480 -394 -983 -857 -1140 -1049 -29 -36 -100 -145 -158 -243 -88 -149 -103 -179 -91 -189 8 -7 50 -44 93 -83 98 -88 192 -200 259 -310 28 -47 53 -91 55 -97 5 -15 411 189 488 245 183 134 659 610 1080 1082 78 88 159 178 179 200 112 122 633 729 757 881 27 33 148 182 269 330 122 148 250 306 285 352 36 46 110 140 165 210 224 283 445 602 445 642 0 18 -24 10 -105 -33z"/><path d="M1600 2230 c-216 -57 -398 -199 -572 -447 -40 -57 -135 -228 -158 -283 -36 -90 -113 -248 -165 -335 -103 -175 -295 -391 -446 -502 -73 -54 -187 -113 -217 -113 -49 0 -6 -21 131 -64 484 -151 904 -174 1250 -66 435 135 734 469 901 1005 46 149 58 214 45 254 -54 167 -231 392 -408 519 l-64 46 -111 3 c-86 2 -128 -2 -186 -17z"/></g></svg>Edit styles';
    button.onclick = openStyleEditor;

    return button;
}

var prevStyles = {},
    saved = false;

var StyleEditor = function() {
    this.theme = prevStyles.theme = theme;
    this.fontSize = prevStyles.fontSize = getStylesheetValue(s, "body", "font-size");
    this.textColor = prevStyles.textColor = getStylesheetValue(s, "body", "color");
    this.backgroundColor = prevStyles.backgroundColor = getStylesheetValue(s, "body", "background-color");
    this.linkColor = prevStyles.linkColor = getStylesheetValue(s, "a[href]", "color");
    this.linkHoverColor = prevStyles.linkHoverColor = getStylesheetValue(s, "a[href]:hover", "color");
    this.maxWidth = prevStyles.maxWidth = getStylesheetValue(s, ".simple-container", "max-width");
    this.openFullStyles = openFullStyles;
};

function updateEditorStyles(editor) {
    editor.fontSize = getStylesheetValue(s, "body", "font-size");
    editor.textColor = getStylesheetValue(s, "body", "color");
    editor.backgroundColor = getStylesheetValue(s, "body", "background-color");
    editor.linkColor = getStylesheetValue(s, "a[href]", "color");
    editor.linkHoverColor = getStylesheetValue(s, "a[href]:hover", "color");
    editor.maxWidth = getStylesheetValue(s, ".simple-container", "max-width");

    datGUI.__controllers.forEach(controller => controller.updateDisplay());
}

function openFullStyles() {
    chrome.runtime.sendMessage("Open options");
}

// Check to make sure there isn't a file with this name already. If so, add a number to the end
function checkFileName(fileName) {
    var tempName = fileName,
        count = 1;

    while(stylesheetObj[tempName])
        tempName = fileName.replace(/(\.[\w\d_-]+)$/i, "(" + count++ + ").css");
    return tempName;
}

function updatePrevStyles(theme) {
    prevStyles.theme = theme;
    prevStyles.fontSize = getStylesheetValue(s, "body", "font-size");
    prevStyles.textColor = getStylesheetValue(s, "body", "color");
    prevStyles.backgroundColor = getStylesheetValue(s, "body", "background-color");
    prevStyles.linkColor = getStylesheetValue(s, "a[href]", "color");
    prevStyles.linkHoverColor = getStylesheetValue(s, "a[href]:hover", "color");
    prevStyles.maxWidth = getStylesheetValue(s, ".simple-container", "max-width");
    prevStyles.originalThemeCSS = stylesheetObj[theme];
}

function saveStyles() {
    // Save styles to the stylesheet
    let newTheme = false;
    if(theme === "default-styles.css"
    || theme === "dark-styles.css") {
        theme = checkFileName(theme);
        chrome.storage.sync.set({'currentTheme': theme});
        newTheme = true;
    }

    var CSSString = "";
    for (var i = 0; i < s.cssRules.length; i++) {
        CSSString += s.cssRules[i].cssText + "\n";
    }

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
        changeStylesheetRule(s, "body", "font-size", prevStyles.fontSize);
        changeStylesheetRule(s, ".simple-container", "max-width", prevStyles.maxWidth);
        changeStylesheetRule(s, "body", "color", prevStyles.textColor);
        changeStylesheetRule(s, "body", "background-color", prevStyles.backgroundColor);
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
        let closeBtn = document.querySelector(".dg .close-button");
        closeBtn.innerText = "Save and close";
    } else {
        let editor = new StyleEditor();

        datGUI = new dat.GUI();

        let themeList = datGUI.add(editor, "theme", Object.keys(stylesheetObj));
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
        let fontSize = datGUI.add(editor, "fontSize", 8, 25);
        fontSize.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, "body", "font-size", value);
        });
        let maxWidth = datGUI.add(editor, "maxWidth");
        maxWidth.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, ".simple-container", "max-width", value);
        });
        let textColor = datGUI.addColor(editor, 'textColor');
        textColor.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, "body", "color", value);
        });
        let backgroundColor = datGUI.addColor(editor, 'backgroundColor');
        backgroundColor.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, "body", "background-color", value);
        });
        let linkColor = datGUI.addColor(editor, 'linkColor');
        linkColor.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, ".simple-author", "color", value);
            changeStylesheetRule(s, "a[href]", "color", value);
        });
        let linkHoverColor = datGUI.addColor(editor, 'linkHoverColor');
        linkHoverColor.onChange((value) => {
            saved = false;
            changeStylesheetRule(s, "a[href]:hover", "color", value);
        });
        datGUI.add(editor, 'openFullStyles');


        // Add the save and close buttons
        let closeBtn = document.querySelector(".dg .close-button");

        // Switch the variables to match DOM order
        let clone = closeBtn.cloneNode(true);
        closeBtn.parentNode.appendChild(clone);
        let saveAndClose = closeBtn;
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
    for(var i = 0; i < stylesheet.cssRules.length; i++) {
        var rule = stylesheet.cssRules[i];
        if(rule.selectorText === selector) {
            return rule.style[property];
        }
    }

    // Return null if not
    return null;
}

function changeStylesheetRule(stylesheet, selector, property, value) {
    // Make the strings lowercase
    selector = selector.toLowerCase();
    property = property.toLowerCase();
    value = value.toLowerCase();

    // Change it if it exists
    for(var i = 0; i < s.cssRules.length; i++) {
        var rule = s.cssRules[i];
        if(rule.selectorText === selector) {
            rule.style[property] = value;
            return;
        }
    }

    // Add it if it does not
    stylesheet.insertRule(selector + " { " + property + ": " + value + "; }", 0);
}

// Add edit meta functionality
function editText(elem) {
    if(!simpleArticleIframe.body.classList.contains("simple-deleting")) {
        let startText = elem.innerText;

        // Hide the item
        elem.style.display = "none";

        // Insert an input temporarily
        var textInput = document.createElement("input");
        textInput.type = "text";
        textInput.value = elem.innerText;

        // Update the element on blur
        textInput.onblur = function() {
            if(textInput.parentNode.contains(textInput)) {
                // Change the value
                elem.innerText = textInput.value;

                if(elem.innerText !== startText)
                    actionWithStack("edit", elem, startText);

                // Un-hide the elem
                elem.style.display = "block";

                // Remove the input
                textInput.parentNode.removeChild(textInput);
            }
        }

        // Allow enter to be used to save the edit
        textInput.onkeydown = function(e) {
            if(e.keyCode === 13)
                textInput.blur();
        }

        elem.parentNode.appendChild(textInput);

        textInput.focus();
    }
}

function addPremiumNofifier() {
    var notifier = document.createElement("div");
    notifier.className = "jr-tooltip jr-notifier";
    notifier.innerHTML = '<p>Thanks for using Just Read! Did you know there is a premium version of Just Read? It has additional features like the ability to save and share Just Read versions of pages.</p><div class="right-align-buttons"><button class="jr-secondary" onclick="this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode)">I\'m not interested</button><a href="https://justread.link" target="_blank"><button class="jr-primary" onclick="this.parentNode.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode.parentNode)">Learn more</button></a></div>';
    return notifier;
}





/////////////////////////////////////
// Actually create the iframe
/////////////////////////////////////

var simpleArticle,
    simpleArticleIframe,
    undoBtn,
    isInDelMode = false;
function createSimplifiedOverlay() {
    // Disable scroll on main page until closed
    document.documentElement.classList.add("simple-no-scroll");

    // Create an iframe so we don't use old styles
    simpleArticle = document.createElement("iframe");
    simpleArticle.id = "simple-article";
    simpleArticle.className = "simple-fade-up no-trans"; // Add fade

    var container = document.createElement("div");
    container.className = "simple-container";

    // Try using the selected element's content
    if(userSelected)
        pageSelectedContainer = userSelected;

    // Use the highlighted text if started from that
    if(!pageSelectedContainer && typeof textToRead !== "undefined" && textToRead) {
        pageSelectedContainer = window.getSelection().toString();
    }

    // If there is no text selected, auto-select the content
    if(!pageSelectedContainer) {
        pageSelectedContainer = getContainer();

        var pattern =  new RegExp ("<br/?>[ \r\n\s]*<br/?>", "g");
        pageSelectedContainer.innerHTML = pageSelectedContainer.innerHTML.replace(pattern, "</p><p>");
    }

    selected = pageSelectedContainer;

    // Get the title, author, etc.
    container.appendChild(addArticleMeta())

    // Set the text as our text
    var contentContainer = document.createElement("div");
    contentContainer.className = "content-container";
    contentContainer.innerHTML = pageSelectedContainer.innerHTML;


    // Strip inline styles
    var allElems = contentContainer.getElementsByTagName("*");
    for (var i = 0, max = allElems.length; i < max; i++) {
        var elem = allElems[i];

        if(elem != undefined) {
            elem.removeAttribute("style");
            elem.removeAttribute("color");
            elem.removeAttribute("width");
            elem.removeAttribute("height");
            elem.removeAttribute("background");
            elem.removeAttribute("bgcolor");
            elem.removeAttribute("border");

            // See if the pres have code in them
            var isPreNoCode = true;
            if(elem.nodeName === "PRE"
             && !chromeStorage["leavePres"]) {
                isPreNoCode = false;

                for(var j = 0, len = elem.children.length; j < len; j++) {
                    if(elem.children[j].nodeName === "CODE")
                        isPreNoCode = true;
                }

                // If there's no code, format it
                if(!isPreNoCode) {
                    elem.innerHTML = elem.innerHTML.replace(/\n/g, '<br/>')
                }
            }

            // Replace the depreciated font element and pres without code with ps
            if(elem.nodeName === "FONT"
            || !isPreNoCode) {
                var p = document.createElement('p');
                p.innerHTML = elem.innerHTML;

                elem.parentNode.insertBefore(p, elem);
                elem.parentNode.removeChild(elem);
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
                var plainText = document.createElement("div");
                plainText.className = "simple-plain-text";
                plainText.innerText = elem.alt;
                elem.parentNode.insertBefore(plainText, elem.nextSibling);
            }

            if(elem.nodeName === "IMG") {
                let img = elem;

                // Load lazy loaded images
                if(img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                } else if(img.dataset.src) {
                    img.src = img.dataset.src;
                }
            }
        }
    }

    // Handle RTL sites
    var direction = window.getComputedStyle(document.body).getPropertyValue("direction");
    if(direction === "rtl" || isRTL(contentContainer.firstChild.innerText)) {
        container.classList.add("rtl");
    }

    container.appendChild(contentContainer);

    // Remove the elements we flagged earlier
    var deleteObjs = container.querySelectorAll("[data-simple-delete]");
    for (var i = 0, max = deleteObjs.length; i < max; i++) {
        deleteObjs[i].parentNode.removeChild(deleteObjs[i]);
    };

    // Add small bit of info about our extension
    container.appendChild(addExtInfo());

    // Add our iframe to the page
    document.body.appendChild(simpleArticle);

    // Focus the article so our shortcuts work from the start
    document.getElementById("simple-article").focus();

    setTimeout(function() { // Fix a bug in FF
    // Append our custom HTML to the iframe
    simpleArticleIframe = document.getElementById("simple-article").contentWindow.document;
    simpleArticleIframe.body.appendChild(container);

    simpleArticleIframe.body.className = window.location.hostname.replace(/\./g, "-");

    // Update the word count if it exists
    if(chromeStorage['addTimeEstimate']) {
        let wordCount = simpleArticleIframe.querySelector(".content-container").innerHTML.split(/\s+/).length;
        simpleArticleIframe.querySelector(".simple-time-estimate").innerText = Math.floor(wordCount / 200) + ' minute read';
    }

    // Create a container for the UI buttons
    let uiContainer = document.createElement("div");
    uiContainer.className = "simple-ui-container";

    // Add the close button
    uiContainer.appendChild(addCloseButton());

    // Add the print button
    uiContainer.appendChild(addPrintButton());

    // Add the deletion mode button
    let delModeBtn = addDelModeButton();
    uiContainer.appendChild(delModeBtn);

    // Add the undo button
    uiContainer.appendChild(addUndoButton());

    container.appendChild(uiContainer);

    // Add the notification of premium if necessary
    if((jrCount === 5
    || jrCount % 15 === 0)
    && jrCount < 151) {
        container.appendChild(addPremiumNofifier());
    }

    // Add MathJax support
    var mj = document.querySelector("script[src *= 'mathjax");
    if(mj) {
        var mathjax = document.createElement("script");
        mathjax.src = mj.src;
        simpleArticleIframe.head.appendChild(mathjax);

        var scripts = document.getElementsByTagName("script");
        for(var i = 0; i < scripts.length; i++) {
            if(scripts[i].innerText.indexOf("MathJax.Hub.Config") >= 0) {
                var clone = scripts[i].cloneNode(true);
                container.appendChild(clone);
            }
        }
    }

    // Add the theme editor button
    uiContainer.insertBefore(addGUI(), delModeBtn);

    // Add our listeners we need
    // The "X" button listener; exit if clicked
    simpleArticleIframe.querySelector(".simple-close").addEventListener('click', closeOverlay);

    // The print button
    simpleArticleIframe.querySelector(".simple-print").addEventListener('click', function() {
        simpleArticleIframe.defaultView.print();
    });

    // The deletion mode button
    var sd = simpleArticleIframe.querySelector(".simple-delete");
    if(sd) {
        sd.onclick = function() {
            startDeleteElement(simpleArticleIframe);
        };
    }

    // The undo button
    undoBtn.addEventListener('click', popStack);

    simpleArticleIframe.onkeydown = function(e) {
        // Listen for the "Esc" key and exit if so
        if(e.keyCode === 27 && !simpleArticleIframe.body.classList.contains("simple-deleting") && document.hasFocus())
            closeOverlay();

        // Listen for CTRL/CMD + SHIFT + ; and allow node deletion if so
        if(e.keyCode === 186 && (e.ctrlKey || e.metaKey) && e.shiftKey)
            startDeleteElement(simpleArticleIframe);

        // Listen for CTRL/CMD + P and do our print function if so
        if((e.ctrlKey || e.metaKey) && e.keyCode == 80) {
            simpleArticleIframe.defaultView.print();
            e.preventDefault();
        }

        // Listen for CTRL/CMD + Z for our undo function
        if((e.ctrlKey || e.metaKey) && e.keyCode === 90) {
            popStack();
        }
    }

    // Size our YouTube containers appropriately
    var youtubeFrames = simpleArticleIframe.querySelectorAll("iframe[src *= 'youtube.com/embed/']");
    for(var i = 0; i < youtubeFrames.length; i++) {
        youtubeFrames[i].parentElement.classList.add("youtubeContainer");
    }

    finishLoading();
    }, 10);
}

function finishLoading() {
    // Add our required stylesheet for the article
    if(!simpleArticleIframe.head.querySelector(".required-styles"))
        addStylesheet(simpleArticleIframe, "required-styles.css", "required-styles");

    // Add the segments hider if needed
    if((chromeStorage['hideSegments']
        && !simpleArticleIframe.head.querySelector(".hide-segments"))
    || typeof chromeStorage['hideSegments'] === "undefined") {
        addStylesheet(simpleArticleIframe, "hide-segments.css", "hide-segments");
    }

    // Change the top most page when regular links are clicked
    var linkNum = simpleArticleIframe.links.length;
    for(var i = 0; i < linkNum; i++)
        simpleArticleIframe.links[i].onclick = linkListener;

    // Navigate to the element specified by the URL # if it exists
    if(top.window.location.hash != null)
        setTimeout(function () { simpleArticleIframe.location.hash = top.window.location.hash; }, 10);

    // Append our theme styles to the overlay
    simpleArticleIframe.head.appendChild(styleElem);

    fadeIn();

    // Attempt to mute the elements on the original page
    mutePage();
}

function fadeIn() {
    if(simpleArticleIframe.styleSheets.length > 2) {
        simpleArticle.classList.remove("no-trans");
        simpleArticle.classList.remove("simple-fade-up");
    } else {
        setTimeout(fadeIn, 10);
    }
}


// Loads the styles after the xhr request finishes
var theme,
    styleElem,
    jrCount;
function continueLoading() {
    // Create a style tag and place our styles in there from localStorage
    styleElem = document.createElement('style');

    if(chromeStorage['currentTheme']) {
        theme = chromeStorage['currentTheme'];
    } else {
        chrome.storage.sync.set({'currentTheme': "default-styles.css"});
        theme = "default-styles.css";
    }
    styleElem.type = 'text/css';
    styleElem.appendChild(document.createTextNode(stylesheetObj[theme]));

    // Get how many times the user has opened Just Read
    if(typeof chromeStorage['jrCount'] === "undefined") {
        chrome.storage.sync.set({'jrCount': 0});
        jrCount = 0;
    } else {
        jrCount = chromeStorage['jrCount'];
        chrome.storage.sync.set({'jrCount': jrCount + 1});
    }


    // Create our version of the article
    if(chromeStorage["backup"]) {
        chrome.runtime.sendMessage({ hasSavedVersion: "true" }, function(response) {
            if(response
            && response.content) {
                let tempElem = document.createElement("div");
                tempElem.innerHTML = response.content;
                pageSelectedContainer = tempElem;
            }

            createSimplifiedOverlay();
        });
    } else {
        createSimplifiedOverlay();
    }
}





/////////////////////////////////////
// Handle the stylesheet syncing
/////////////////////////////////////
var isPaused = false,
    stylesheetObj = {},
    stylesheetVersion = 1.31; // THIS NUMBER MUST BE CHANGED FOR THE STYLESHEETS TO KNOW TO UPDATE

function launch() {
    // Detect past overlay - don't show another
    if(document.getElementById("simple-article") == null) {

        // Check to see if the user wants to select the text
        if(typeof useText != "undefined" && useText) {
            // Start the process of the user selecting text to read
            startSelectElement(document);
        }

        else {
            // Add the stylesheet for the container
            if(!document.head.querySelector(".page-styles"))
                addStylesheet(document, "page.css", "page-styles");

            // Check to see if the user wants to hide the content while loading
            if(typeof runOnLoad != "undefined" && runOnLoad) {
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
launch();
