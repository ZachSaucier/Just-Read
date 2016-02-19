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


// Add our styles to the page
function addStylesheet(doc, link, classN) {
	// Possibly check settings for which stylesheet to use

	var path = chrome.extension.getURL(link),
		styleLink = document.createElement("link");

	styleLink.setAttribute("rel", "stylesheet");
	styleLink.setAttribute("type", "text/css");
	styleLink.setAttribute("href", path);

	if(classN) 
		styleLink.className = classN;

	doc.head.appendChild(styleLink);
}



function getArticleDate() {
	// Check to see if there is a date available in the meta, if so get it
	if(document.head.querySelector('meta[name="date"]'))
		return document.head.querySelector('meta[name="date"]').getAttribute("content"); 
	
	// Check to see if there's a time element, if so get it
	if(document.body.querySelector('time'))
		return document.body.querySelector('time').getAttribute("datetime");

	return "Unknown date";
}

function checkHeading(elem, heading, del) {
	if(elem && elem.querySelector(heading)) {
		// Remove it so we don't duplicate it
		var text = elem.querySelector(heading).innerText,
		    element = elem.querySelector(heading);
		if(del)
			element.parentNode.removeChild(element);
		return text; 
	} else {
		return false;
	}
}

function getArticleTitle() {
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

	// Check meta title?
	
	return "Unknown title";
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
	date.innerText = getArticleDate();
	// Check to see if there is an author available in the meta, if so get it, otherwise say it's unknown
	author.innerText = document.head.querySelector('meta[name="author"]') 
		? document.head.querySelector('meta[name="author"]').getAttribute("content") 
		  : "Unknown author";
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
	closeButton.className = "simple-close";
	closeButton.textContent = "X";

	return closeButton;
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

// Remove what we added (besides styles)
function closeOverlay() {
	// Fade out
	document.body.querySelector("#simple-article").classList.add("simple-fade-up");
	
	setTimeout(function() {
		// Enable scroll
		document.body.classList.remove("simple-no-scroll");

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



var simpleArticleIframe = false;
function createSimplifiedOverlay() {
	// Show temporary loader
	// var loader = document.createElement("div"),
	// 	centered = document.createElement("div");
	// loader.className = "simple-loader";
	// centered.innerText = "Loading simple page...";
	// loader.appendChild(centered);
	// document.body.appendChild(loader);


	// Create an iframe so we don't use old styles
	var simpleArticle = document.createElement("iframe");
	simpleArticle.id = "simple-article";
	simpleArticle.className = "simple-fade-up"; // Add fade

	var container = document.createElement("div");
	container.className = "simple-container";


	// Add the close button
	container.appendChild(addCloseButton());

	// Get element with the most text
	checkLongestTextElement();

	// Get the title, author, etc.
	container.appendChild(addArticleMeta());

	// If settings say so, strip images, etc.?

	// Set the text as our text
	container.innerHTML += globalMostPs.innerHTML;

	// Strip inline styles
	var allElems = container.getElementsByTagName("*");
	for (var i = 0, max = allElems.length; i < max; i++) {
		var elem = allElems[i];
	    elem.removeAttribute("style");
	    // Remove styles from the depreciated font element
	    if(elem.nodeName === "FONT") {
	    	console.log("test");
			var p = document.createElement('p');
			p.innerHTML = elem.innerHTML;

			elem.parentNode.insertBefore(p, elem);
			elem.parentNode.removeChild(elem);
	    }
	}

	// Add small bit of info about our extension
	container.appendChild(addExtInfo());

	// Add our iframe to the page
	document.body.appendChild(simpleArticle);

	// Append our custom HTML to the iframe
	simpleArticleIframe = document.getElementById("simple-article").contentWindow.document;
	simpleArticleIframe.body.appendChild(container);

	// Remove the loader
	// var remove = document.querySelector(".simple-loader");
	// remove.parentNode.removeChild(remove);

	// Fade in and move up the simple article
	setTimeout(function() {
		simpleArticle.classList.remove("simple-fade-up");

		// Disable scroll on main page until closed
		document.body.classList.add("simple-no-scroll");
	}, 500); // Make sure we can animate it
	

	// Add our listeners we need
	// The "X" button listener; exit if clicked
	simpleArticleIframe.querySelector(".simple-close").addEventListener('click', closeOverlay);
	// Listen for the "Esc" key and exit if so
	simpleArticleIframe.onkeyup = function(e) {
	    if(e.keyCode === 27) 
	        closeOverlay();
	}
}


// Loads the styles after the xhr request finishes
function continueLoading() {
	// Create a style tag and place our styles in there from localStorage
	var theme,
		style = document.createElement('style');

	chrome.storage.sync.get('currentTheme', function(result) {
		theme = result.currentTheme;
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


// Detect past overlay - don't show another
if(!simpleArticleIframe) {
	// Add the stylesheet for the loader/container
	if(!document.head.querySelector(".page-styles")) 
		addStylesheet(document, "page.css", "page-styles");

	// Create our version of the article
	createSimplifiedOverlay();

	// Add our stylesheet for the article
	if(!simpleArticleIframe.head.querySelector(".required-styles"))
		addStylesheet(simpleArticleIframe, "required-styles.css", "required-styles");
	
	// Change the top most page when regular links are clicked
	var linkNum = simpleArticleIframe.links.length;
	for(var i = 0; i < linkNum; i++) {
		simpleArticleIframe.links[i].onclick = function() {

			// Don't change the top most if it's referencing an anchor in the article
			var hrefArr = this.href.split('#');
			if(hrefArr.length < 2 // No anchor
				|| (hrefArr[0] != top.window.location.href // Anchored to an ID on another page
					&& hrefArr[0] != "about:blank")
				|| !simpleArticleIframe.getElementById(hrefArr[1]) // The element is not in the article section
			) {
				top.window.location.href = this.href; // Regular link
			} else { // Anchored to an element in the article
				top.window.location.hash = hrefArr[1];
				simpleArticleIframe.location.hash = hrefArr[1];
			}
		}
	}




	// GET THEMES CSS SHEETS FROM CHROME STORAGE
	var stylesheetObj = {};
	// Check to see if the stylesheets are already in Chrome storage
	chrome.storage.sync.get('just-read-stylesheets', function (result) {

		if(isEmpty(result) || isEmpty(result["just-read-stylesheets"])) { // Not found, so we add our default	        
	        // Open the default CSS file and save it to our object
			var xhr = new XMLHttpRequest();
			xhr.open('GET', chrome.extension.getURL('default-styles.css'), true);
			xhr.onreadystatechange = function() {
			    if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
			    	// Save the file's contents to our object
			        stylesheetObj["default-styles.css"] = xhr.responseText;

			        // Save it to Chrome storage
					chrome.storage.sync.set({'just-read-stylesheets': stylesheetObj});

					// Set it as our current theme
					chrome.storage.sync.set({"currentTheme": "default-styles.css"});

					continueLoading();
			    }
			}
			xhr.send();
	        return;
	    }

	    // It's already found, so we use it

	    stylesheetObj = result["just-read-stylesheets"];

	    continueLoading();
	});
} else {
	console.log("Simple container is already applied on this page!");
}


