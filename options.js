
var changed = false,
	stylesheetObj = {},
	editor = document.getElementById("css-editor"),
	defaultLiItem,
	defaultStylesheet = "default-styles.css";

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

// Make sure the user wants to change files before saving
function confirmChange() {
	if(changed)
		if (window.confirm("Do you really want to change files before saving?"))
				return false;
			else
				return true;
}

function styleListOnClick() {
	// Don't do anything if it's already active
	if(!this.classList.contains("active")) {
		// Make sure any changes are saved
		var cancel = confirmChange();
		
		if(!cancel) {
			// Switch out current CSS for the selected one
			var fileName = this.textContent;

			// Open up the file from localStorage
			editor.value = stylesheetObj[fileName] === undefined ? "" : stylesheetObj[fileName];

			// Toggle the active class on the list items
			if(document.querySelector(".stylesheets .active"))
				document.querySelector(".stylesheets .active").classList.remove("active");
			this.classList.add("active");

			localStorage.currentTheme = fileName;

			changed = false;
		}
	}
};


// The stuff to fire after the stylesheets have been loaded
function continueLoading() {
	// Get the currently used stylesheet
	chrome.storage.sync.get('currentTheme', function(result) {
		var currTheme = result.currentTheme;

		// Based on that object, populate the list values
		var list = document.querySelector(".stylesheets"),
			count = 0;
		for (var stylesheet in stylesheetObj) {
			var li = document.createElement("li"),
				liClassList = li.classList;
			li.innerText = stylesheet;

			// If the sheet is the one currently applied, add a signifier class
			if(stylesheet === currTheme)
				liClassList.add("used");

			// Lock the default-styles.css file (prevent deletion)
			if(stylesheet === defaultStylesheet) {
				defaultLiItem = li;
				liClassList.add("locked");
			}

			// Make the first one active
			if(count === 0) {
				liClassList.add("active");
				var fileName = li.textContent;
				editor.value = stylesheetObj[fileName] === undefined ? "" : stylesheetObj[fileName];
			}

			list.appendChild(li);

			count++;
		}

		stylesheetListItems = document.querySelectorAll(".stylesheets li");

		[].forEach.call(stylesheetListItems, function(item, i) {
			item.onclick = styleListOnClick;
		});
	});
}

// Obtain the stylesheet strings from localStorage and put them in our stylesheet object
function getStylesheets() {
	chrome.storage.sync.get('just-read-stylesheets', function (result) {

		if(isEmpty(result)) { // Not found, so we add our default	        
	        // Open the default CSS file and save it to our object
			var xhr = new XMLHttpRequest();
			xhr.open('GET', chrome.extension.getURL(defaultStylesheet), true);
			xhr.onreadystatechange = function() {
			    if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
			    	// Save the file's contents to our object
			        stylesheetObj[defaultStylesheet] =  xhr.responseText;

			        // Save it to Chrome storage
					chrome.storage.sync.set({'just-read-stylesheets': stylesheetObj});

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
}

getStylesheets();

var newFileInput = document.getElementById("new-file"),
	addButton = document.getElementById("add"),
	saveButton = document.getElementById("save"),
	//previewButton = document.getElementById("preview"),
	useButton = document.getElementById("use"),
	removeButton = document.getElementById("remove"),
	stylesheetListItems;


// Keep track of changes since last save
editor.onkeyup = function() {
	changed = true;
}


// Create a new file with the given name
add.onclick = function() {
	if(newFileInput.value !== "") {
		var fileName = newFileInput.value;

		// If it has .css at the end, remove it
		if(fileName.slice(-4) === ".css")
			fileName = fileName.slice(0, -4);

		// Parse out the other stuff we don't want and add .css
		fileName = fileName.replace(/[^a-z0-9]/gi, '-').toLowerCase() + ".css";

		// Add a new list element
		var list = document.querySelector(".stylesheets"),
			li = document.createElement("li");
		li.innerText = fileName;

		// Make it active
		document.querySelector(".stylesheets .active").classList.remove("active");
		li.classList.add("active");

		// Clear out the editor
		editor.value = "";

		// Force them to save to keep it	
		changed = true;

		list.appendChild(li);

		document.querySelector(".stylesheets").lastChild.onclick = styleListOnClick;

		newFileInput.value = "";
	}
}

function saveTheme() {
	// Get the name of the current file being edited
	var currFile = document.querySelector(".stylesheets .active").innerText;

	// Save that file to localStorage
	stylesheetObj[currFile] = editor.value;
	chrome.storage.sync.set({'just-read-stylesheets': stylesheetObj});

	// Note that the file has been saved
	changed = false;
}

// Save the current code to the current file
saveButton.onclick = saveTheme;

// Use the selected stylesheet
useButton.onclick = function() {
	// Save the current theme
	saveTheme();

	// Remove the used class from the old list item
	document.querySelector(".stylesheets .used").classList.remove("used");

	// Update the class to shop it's applied
	document.querySelector(".stylesheets .active").classList.add("used");

	// Apply the current theme
	var sheet = document.querySelector(".used").innerText;
	chrome.storage.sync.set({"currentTheme": sheet});

	// Tell that we changed it
	alert(sheet + " is now set as the active theme");
}

// Remove the selected file
removeButton.onclick = function() {
	// Select the item to be removed
	var elem = document.querySelector(".stylesheets .active");

	// Make sure they can't delete locked files
	if(!elem.classList.contains("locked")) {
		// Add confimation
		if (window.confirm("Do you really want to remove this file?")) {
			// Remove the file from our object
			delete stylesheetObj[document.querySelector(".stylesheets .active").innerText]; 

			// Sync our object with Chrome storage
			chrome.storage.sync.set({'just-read-stylesheets': stylesheetObj});

			// Check to see if it's the currently used sheet - if so set it to the default
			if(elem.classList.contains("used")) {
				defaultLiItem.classList.add("used");
				chrome.storage.sync.set({"currentTheme": defaultStylesheet});
			}

			// Remove it from the list
			elem.parentNode.removeChild(elem);

			editor.value = "";
		}
	} else 
		alert("This file is locked and cannot be deleted.");

	// Otherwise we do nothing
}

// Preview the current stylesheet with a made up article
// preview.onclick = function() {
// 	console.log("preview clicked");
// }