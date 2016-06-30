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




/////////////////////////////////////
// State functions
/////////////////////////////////////

// User-selected text functionality
var last,
    bgc,
    selected;
function startSelectElement(doc) {
	var mouseFunc = function (e) {
	    var elem = e.target;

	    if (last != elem) {
	        if (last != null) {
	            last.classList.remove("hovered");
	        }

	        last = elem;
	        elem.classList.add("hovered");
	    }
	},
	clickFunc = function(e) {
		selected = e.target;

		isPaused = false; // Enable the extension to run

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
		doc.removeEventListener('keyup', escFunc);

		if(doc.querySelector(".hovered") != null)
			doc.querySelector(".hovered").classList.remove("hovered");

		if(doc.getElementById("tempStyle") != null)
			doc.getElementById("tempStyle").parentNode.removeChild(doc.getElementById("tempStyle"));
	}

	doc.addEventListener('mouseover', mouseFunc);
	doc.addEventListener('click', clickFunc);
	doc.addEventListener('keyup', escFunc);

	doc.documentElement.focus();

	// Add our styles temporarily
	var tempStyle = doc.createElement("style");
	tempStyle.id = "temp-style";
	tempStyle.innerText = ".hovered, .hovered * { cursor: pointer !important; color: black !important; background-color: #2095f2 !important; }";

	doc.head.appendChild(tempStyle);

	// Make the next part wait until a user has selected an element to use
	useText = false;
	isPaused = true;
}

// Similar to ^^ but for deletion once the article is open
function startDeleteElement(doc) {
	var mouseFunc = function (e) {
	    var elem = e.target;

	    if(!elem.classList.contains("simple-close")
	    && !elem.classList.contains("simple-print")
	    && doc.body != elem
	    && doc.documentElement != elem) {
		    if (last != elem) {
		        if (last != null) {
		            last.classList.remove("hovered");
		        }

		        last = elem;
		        elem.classList.add("hovered");
		    }
		}
	},
	clickFunc = function(e) {
		selected = e.target;

		if(!selected.classList.contains("simple-close")
		&& !selected.classList.contains("simple-print")
		&& doc.body != selected
		&& doc.documentElement != selected)
			selected.parentNode.removeChild(selected);
		
	    e.preventDefault();
	},
	escFunc = function(e) {
		// Listen for the "Esc" key and exit if so
	    if(e.keyCode === 27)
	        exitFunc();
	},
	exitFunc = function() {
		doc.removeEventListener('mouseover', mouseFunc);
		doc.removeEventListener('click', clickFunc);
		doc.removeEventListener('keyup', escFunc);

		if(doc.querySelector(".hovered") != null)
			doc.querySelector(".hovered").classList.remove("hovered");

		doc.body.classList.remove("simple-deleting");

		selected = null;
	}

	doc.body.classList.add("simple-deleting");

	doc.addEventListener('mouseover', mouseFunc);
	doc.addEventListener('click', clickFunc);
	doc.addEventListener('keyup', escFunc);
}







/////////////////////////////////////
// Chrome storage functions
/////////////////////////////////////

// Given a chrome storage object add them to our local stylsheet obj
function getStylesFromStorage(storage) {
	for(var key in storage) {
		// Convert the old format into the new format
		if(key === "just-read-stylesheets") {
			// Save each stylesheet in the new format
			for(var stylesheet in storage[key]) {
				var obj = {};
				obj['jr-' + stylesheet] = storage[key][stylesheet];
				chrome.storage.sync.set(obj);
				stylesheetObj[stylesheet] = storage[key][stylesheet];
			}

			// Remove the old format
			removeStyleFromStorage(key);

		} else if(key.substring(0, 3) === "jr-") // Get stylesheets in the new format
			stylesheetObj[key.substring(3)] = storage[key];
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

// Count the number of ps in the children using recursion
function countPs(container) {
	var count = container.querySelectorAll("p").length;

	for(var i = 0; i < container.children.length; i++)
		count += countPs(container.children[i]);

	return count;
}

function getArticleDate() {
	// Make sure that the globalMostPs isn't empty
	if(globalMostPs == null)
		globalMostPs = document.body;

	// Check to see if there's a date class
	var date = false;
	if(globalMostPs.querySelector('[class^="date"]')) {
		var elem = globalMostPs.querySelector('[class^="date"]');
		elem.dataset.simpleDelete = true; // Flag it for removal later
		date = elem.innerText;
	}
	if(!date && globalMostPs.querySelector('[class*="-date"]')) {
		var elem = globalMostPs.querySelector('[class*="-date"]');
		elem.dataset.simpleDelete = true; // Flag it for removal later
		date = elem.innerText;
	}
	if(!date && document.body.querySelector('[class^="date"]'))
		date = document.body.querySelector('[class^="date"]').innerText;
	if(!date && document.body.querySelector('[class*="-date"]'))
		date = document.body.querySelector('[class*="-date"]').innerText;

	// Check to see if there is a date available in the meta, if so get it
	if(!date && document.head.querySelector('meta[name^="date"]'))
		date = document.head.querySelector('meta[name^="date"]').getAttribute("content");
	if(!date && document.head.querySelector('meta[name*="-date"]'))
		date = document.head.querySelector('meta[name*="-date"]').getAttribute("content");

	// Check to see if there's a time element, if so get it
	if(!date && globalMostPs.querySelector('time')) {
		var elem = globalMostPs.querySelector('time');
		elem.dataset.simpleDelete = true; // Flag it for removal later
		date = elem.getAttribute("datetime");

		if(date === null)
			date = elem.innerText;
	}
	if(!date && document.body.querySelector('time')) {
		var elem = document.body.querySelector('time')
		date = elem.getAttribute("datetime");

		if(date === null)
			date = elem.innerText;
	}

	if(date)
		return date.replace(/on\s/ig, '').replace(/[<]br[^>]*[>]/gi,'&nbsp;'); // Replace <br> and "on"

	return "Unknown date";
}

function checkHeading(elem, heading, del) {
	if(elem && elem.querySelector(heading)) {
		// Remove it so we don't duplicate it
		var text = elem.querySelector(heading).innerText,
		    element = elem.querySelector(heading);
		if(del)
			element.dataset.simpleDelete = true; // Flag it for removal later
		return text;
	} else {
		return false;
	}
}

function getArticleTitle() {
	// Make sure that the globalMostPs isn't empty
	if(globalMostPs == null)
		globalMostPs = document.body;

	// Check to see if there is a h1 within globalMostPs
	var text = checkHeading(globalMostPs, 'h1', true);
	// Check to see if there is a h2 within globalMostPs
	if(!text)
		text = checkHeading(globalMostPs, 'h2', true);

	// Check to see if there's a h1 within the previous sibling of the article
	if(!text)
		text = checkHeading(globalMostPs.previousElementSibling, 'h1');
	// Check to see if there's a h2 within the previous sibling of the article
	if(!text)
		text = checkHeading(globalMostPs.previousElementSibling, 'h2');

	if(!text) {
		// Check to see if there's a h1 more generally
		if(document.body.querySelector('h1'))
			return document.body.querySelector('h1').innerText;

		// Check to see if there's a h2 more generally
		if(document.body.querySelector('h2'))
			return document.body.querySelector('h2').innerText;
	} else {
		return text;
	}

	// Check meta title
	if(document.head.querySelector("title"))
		return document.head.querySelector("title").innerText;
	
	return "Unknown title";
}

function getArticleAuthor() {
	// Make sure that the globalMostPs isn't empty
	if(globalMostPs == null)
		globalMostPs = document.body;

	var author = null;

	// Check to see if there's an author rel in the article
	var elem = globalMostPs.querySelector('[rel*="author"]');
	if(elem) {
		if(elem.innerText.split(/\s+/).length < 5 && elem.innerText.replace(/\s/g,'') !== "") {
			elem.dataset.simpleDelete = true; // Flag it for removal later
			author = elem.innerText;
		}
	}

	// Check to see if there's an author class
	elem = globalMostPs.querySelector('[class*="author"]');
	if(author === null && elem) {
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
			elem.dataset.simpleDelete = true; // Flag it for removal later
			author = elem.innerText;
		}
	}

	elem = document.body.querySelector('[class*="author"]')
	if(author === null && elem) {
		if(elem.innerText.split(/\s+/).length < 5 && elem.innerText.replace(/\s/g,'') !== "") {
			elem.dataset.simpleDelete = true; // Flag it for removal later
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
	// Fade out
	document.body.querySelector("#simple-article").classList.add("simple-fade-up");
	
	// Reset our variables
	globalMostPs = null;
	
	setTimeout(function() {
		// Enable scroll
		document.documentElement.classList.remove("simple-no-scroll");

		// Remove our overlay
		var element = document.querySelector("#simple-article");
		element.parentNode.removeChild(element);
	}, 500); // Make sure we can animate it
}

// Keep track of the element with the most ps in it
var globalMostPs = document.body,
	globalMostPCount = 0;
// Check a given element and all of its child nodes to see if it has the most ps
function checkLongestTextElement(container) {
	container = container || document.body; // Default to the whole page

	// Count the number of p direct children
	var pChildren = container.querySelectorAll(":scope > p");

	// Compare total to the largest total so far
	if(pChildren.length > globalMostPCount) {
		globalMostPCount = pChildren.length;
		globalMostPs = container;
	}

	// Check the children to see if they have more ps
	for(var i = 0; i < container.children.length; i++)
		checkLongestTextElement(container.children[i]);
}

// Check all of the <article>s on the page and return the one with the most ps
function getLongestArticle() {
    var articles = document.querySelectorAll("article");
    if(articles.length < 1)
        return null;
    
    var largestArticle = articles[0],
        mostPCount = countPs(largestArticle);
    for(var i = 1; i < articles.length; i++) {
        var pCount = countPs(articles[i]);
        if(pCount > mostPCount) {
            largestArticle = articles[i];
            mostPCount = pCount;
        }
    }
    
    if(mostPCount > 0)
        return {"article": largestArticle, "pCount": mostPCount};
    else
        return null;
}

// Handle link clicks
function linkListener(e) {
	// Don't change the top most if it's not in the current window
	if(e.ctrlKey
	|| e.shiftKey
	|| e.metaKey
	|| (e.button && e.button == 1)
	|| this.target === "about:blank") {
		return; // Do nothing
	}

	// Don't change the top most if it's referencing an anchor in the article
	var hrefArr = this.href.split("#");
	
	if(hrefArr.length < 2 // No anchor
	|| (hrefArr[0] != top.window.location.href // Anchored to an ID on another page
		&& hrefArr[0] != "about:blank")
	|| (simpleArticleIframe.getElementById(hrefArr[1]) == null // The element is not in the article section
		&& simpleArticleIframe.querySelector("a[name='" + hrefArr[1] + "']") == null)
	) {
		top.window.location.href = this.href; // Regular link
	} else { // Anchored to an element in the article
		top.window.location.hash = hrefArr[1];
		simpleArticleIframe.location.hash = hrefArr[1];
	}
}




/////////////////////////////////////
// Extension-related adder functions
/////////////////////////////////////


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
	var metaContainer = document.createElement("div");
	metaContainer.className = "simple-meta";
	var author = document.createElement("div"),
		date = document.createElement("div"),
		title = document.createElement("h1");

	author.className = "simple-author";
	date.className = "simple-date";

	// Check a couple places for the date, othewise say it's unknown
	date.innerHTML = getArticleDate();
	// Check to see if there is an author available in the meta, if so get it, otherwise say it's unknown
	author.innerText = getArticleAuthor();
	// Check h1s for the title, otherwise say it's unknown
	title.innerText = getArticleTitle();

	metaContainer.appendChild(date);
	metaContainer.appendChild(author);
	metaContainer.appendChild(title);

	return metaContainer;
}

// Add the close button
function addCloseButton() {
	var closeButton = document.createElement("button");
	closeButton.className = "simple-control simple-close";
	closeButton.textContent = "X";

	return closeButton;
}

// Add the print button
function addPrintButton() {
	var printButton = document.createElement("button");
	printButton.className = "simple-control simple-print";
	printButton.innerHTML = '<?xml version="1.0" encoding="iso-8859-1"?><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 64 64" style="enable-background:new 0 0 64 64;" xml:space="preserve"><path d="M49,0H15v19H0v34h15v11h34V53h15V19H49V0z M17,2h30v17H17V2z M47,62H17V40h30V62z M62,21v30H49V38H15v13H2V21h13h34H62z"/><rect x="6" y="26" width="4" height="2"/><rect x="12" y="26" width="4" height="2"/><rect x="22" y="46" width="20" height="2"/><rect x="22" y="54" width="20" height="2"/></svg>Print';

	return printButton;
}

// Add some information about our extension
function addExtInfo() {
	var extContainer = document.createElement("div");
	extContainer.className = "simple-ext-info";
	extContainer.innerText = "Viewed using ";

	var extAnchor = document.createElement("a");
	extAnchor.href = "https://github.com/ZachSaucier/Just-Read";
	extAnchor.innerText = "Just Read";
	extContainer.appendChild(extAnchor);

	return extContainer;
}





/////////////////////////////////////
// Actually create the iframe 
/////////////////////////////////////

var simpleArticleIframe;
function createSimplifiedOverlay() {

	// Create an iframe so we don't use old styles
	var simpleArticle = document.createElement("iframe");
	simpleArticle.id = "simple-article";
	simpleArticle.className = "simple-fade-up no-trans"; // Add fade

	var container = document.createElement("div");
	container.className = "simple-container";


	// Add the close button
	container.appendChild(addCloseButton());

	// Add the print button
	container.appendChild(addPrintButton());

	// Try using the selected element's content
	globalMostPs = selected;
	
	// If there is no text selected, get the container with the most ps
	if(!globalMostPs) {
    	checkLongestTextElement();
    	// globalMostPs is now updated, as is globalMostPCount
    
    	// Compare the longest article to the element with the most ps
        var articleObj = getLongestArticle();
        if(articleObj !== null
        && articleObj.pCount > globalMostPCount - 3) {
            globalMostPs = articleObj.article;
            globalMostPCount = articleObj.pCount;
        }
	}
    
	// See if the element we selected has the majority of ps found
	if(document.querySelector("article") == null
	   && globalMostPCount / document.querySelectorAll("p").length < 0.75) {
		var parent = globalMostPs.parentNode,
			parentPNum = countPs(parent);

		if(parentPNum > globalMostPCount)
			globalMostPs = parent;
	}

	// Get the title, author, etc.
	container.appendChild(addArticleMeta());

	// If settings say so, strip images, etc.?

	// Set the text as our text
	var contentContainer = document.createElement("div");
	contentContainer.className = "content-container";
	contentContainer.innerHTML = globalMostPs.innerHTML;

	// Strip inline styles
	var allElems = contentContainer.getElementsByTagName("*");
	for (var i = 0, max = allElems.length; i < max; i++) {
		var elem = allElems[i];

		if(elem != undefined) {
		    elem.removeAttribute("style");
		    elem.removeAttribute("width");
		    elem.removeAttribute("height");
		    elem.removeAttribute("background");
		    elem.removeAttribute("bgcolor");
		    elem.removeAttribute("border");

		    // Remove elements that only have &nbsp;
		    if(elem.dataset && elem.innerHTML === '&nbsp;') 
		     	elem.dataset.simpleDelete = true;


		    // See if the pres have code in them
		    var isPreNoCode = true;
		    if(elem.nodeName === "PRE") {
		    	isPreNoCode = false;

		    	for(var j = 0, len = elem.children.length; j < len; j++) {
		    		if(elem.children[j].nodeName === "CODE")
		    			isPreNoCode = true;
		    	}

		    	// If there's no code, format it
				if(!isPreNoCode) {
					elem.innerHTML = elem.innerHTML.replace(/\n\n/g, '<br/><br/>')
				}
		    }

		    // Replace the depreciated font element and pres without code with ps
		    if(elem.nodeName === "FONT" || !isPreNoCode) {
				var p = document.createElement('p');
				p.innerHTML = elem.innerHTML;

				elem.parentNode.insertBefore(p, elem);
				elem.parentNode.removeChild(elem);
		    }

		    // Remove any inline style or script elements and things with aria hidden
		    if(elem.nodeName === "STYLE"
		    //|| elem.nodeName === "SCRIPT"
		    || (elem.getAttribute("aria-hidden") == "true"))
		    	elem.dataset.simpleDelete = true;
		}
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

	// Append our custom HTML to the iframe
	simpleArticleIframe = document.getElementById("simple-article").contentWindow.document;
	simpleArticleIframe.body.appendChild(container);

	// Fade in and move up the simple article
	setTimeout(function() {
		simpleArticle.classList.remove("no-trans");
		simpleArticle.classList.remove("simple-fade-up");

		// Disable scroll on main page until closed
		document.documentElement.classList.add("simple-no-scroll");
	}, 500); // Make sure we can animate it
	

	// Add our listeners we need
	// The "X" button listener; exit if clicked
	simpleArticleIframe.querySelector(".simple-close").addEventListener('click', closeOverlay);

	// The print button
	simpleArticleIframe.querySelector(".simple-print").addEventListener('click', function() {
		simpleArticleIframe.defaultView.print();
	});

	simpleArticleIframe.onkeyup = function(e) {
		// Listen for the "Esc" key and exit if so
	    if(e.keyCode === 27 && !simpleArticleIframe.body.classList.contains("simple-deleting"))
	        closeOverlay();


	    // Listen for CTRL + SHIFT + ; and allow node deletion if so
	    if(e.keyCode === 186 && e.ctrlKey && e.shiftKey)
	    	startDeleteElement(simpleArticleIframe);
	}

	// Listen for CTRL+P and do our print function if so
	simpleArticleIframe.onkeydown = function(e) {
		if(e.ctrlKey && e.keyCode == 80) {
	        simpleArticleIframe.defaultView.print();
	        e.preventDefault();
	    }
	}
}


// Loads the styles after the xhr request finishes
function continueLoading() {
	// Create a style tag and place our styles in there from localStorage
	var theme,
		style = document.createElement('style');

	chrome.storage.sync.get('currentTheme', function(result) {
		theme = result.currentTheme || "default-styles.css";
		style.type = 'text/css';

		if(style.styleSheet) {
			style.styleSheet.cssText = stylesheetObj[theme];
		} else {
			style.appendChild(document.createTextNode(stylesheetObj[theme]));
		}

		// Append our theme styles to the overlay
		simpleArticleIframe.head.appendChild(style);
	});
}






/////////////////////////////////////
// Handle the stylesheet syncing 
/////////////////////////////////////

var isPaused = false,
	stylesheetObj = {},
	stylesheetVersion = 1.6; // THIS NUMBER MUST BE CHANGED FOR THE STYLESHEETS TO KNOW TO UPDATE
// Detect past overlay - don't show another
if(document.getElementById("simple-article") == null) {
	var interval = setInterval(function() {
		// Check to see if the user wants to select the text
		if(typeof useText != "undefined" && useText && !isPaused) {
			// Start the process of the user selecting text to read
			startSelectElement(document);
		}

		if(!isPaused) {
			// Add the stylesheet for the container
			if(!document.head.querySelector(".page-styles"))
				addStylesheet(document, "page.css", "page-styles");

			// Attempt to mute the elements on the original page
			mutePage();

			// Create our version of the article
			createSimplifiedOverlay();

			// Add our required stylesheet for the article
			if(!simpleArticleIframe.head.querySelector(".required-styles"))
				addStylesheet(simpleArticleIframe, "required-styles.css", "required-styles");
			
			// Change the top most page when regular links are clicked
			var linkNum = simpleArticleIframe.links.length;
			for(var i = 0; i < linkNum; i++)
				simpleArticleIframe.links[i].onclick = linkListener;




			// GET THEMES CSS SHEETS FROM CHROME STORAGE

			// Check to see if the stylesheets are already in Chrome storage
			chrome.storage.sync.get(null, function (result) {
				// Collect all of our stylesheets in our object
				getStylesFromStorage(result);

				// Check to see if the default stylesheet needs to be updated
				var needsUpdate = false;
				chrome.storage.sync.get('stylesheet-version', function (versionResult) {

					// If the user has a version of the stylesheets and it is less than the cufrent one, update it
					if(isEmpty(versionResult)
					|| versionResult['stylesheet-version'] < stylesheetVersion) {
						chrome.storage.sync.set({'stylesheet-version': stylesheetVersion});

						needsUpdate = true;
					}

					if(isEmpty(stylesheetObj) // Not found, so we add our default
					|| needsUpdate) { // Update the default stylesheet if it's on a previous version

				        // Open the default CSS file and save it to our object
						var xhr = new XMLHttpRequest();
						xhr.open('GET', chrome.extension.getURL('default-styles.css'), true);
						xhr.onreadystatechange = function() {
						    if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
						    	// Save the file's contents to our object
						        stylesheetObj["default-styles.css"] =  xhr.responseText;

						        // Save it to Chrome storage
								setStylesOfStorage();

								// Continue on loading the page
								continueLoading();
						    }
						}
						xhr.send();

						needsUpdate = false;

				        return;
				    }

				    // It's already found, so we use it

				    continueLoading();
				});

				
			});

			window.clearInterval(interval);
		}
	}, 100);
	
} else {
	if(document.querySelector(".simple-fade-up") == null) // Make sure it's been able to load
		closeOverlay();
}


