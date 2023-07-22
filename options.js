const jrDomain = "https://justread.link/";

/* Use Ace https://ace.c9.io/ to create our CSS editor */
const editor = ace.edit("css-editor");
editor.setTheme("ace/theme/crimson_editor");
editor.session.setOptions({
  mode: "ace/mode/css",
  tabSize: 2,
});
editor.$blockScrolling = Infinity;

// Enable zooming of the editor itself
editor.commands.addCommands([
  {
    name: "increaseFontSize",
    bindKey: "Ctrl-=|Ctrl-+",
    exec: function (editor) {
      const size = parseInt(editor.getFontSize(), 10) || 12;
      editor.setFontSize(size + 1);
    },
  },
  {
    name: "decreaseFontSize",
    bindKey: "Ctrl+-|Ctrl-_",
    exec: function (editor) {
      const size = parseInt(editor.getFontSize(), 10) || 12;
      editor.setFontSize(Math.max(size - 1 || 1));
    },
  },
  {
    name: "resetFontSize",
    bindKey: "Ctrl+0|Ctrl-Numpad0",
    exec: function (editor) {
      editor.setFontSize(12);
    },
  },
  {
    name: "save",
    bindKey: "Ctrl+s",
    exec: saveTheme,
  },
]);

let changed = false,
  stylesheetObj = {},
  defaultLiItem,
  defaultStylesheet = "default-styles.css",
  darkStylesheet = "dark-styles.css",
  currTheme,
  hasAccount = false,
  jrSecret,
  isPremium = false,
  jrLastChecked;

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

// Given a chrome storage object, add them to our domain list
function setDomains(domains) {
  let domainString = "";
  for (let i = 0; i < domains.length; i++) {
    domainString += domains[i] + "\n";
  }

  domainList.value = domainString;
}

// Given a chrome storage object, setup our Options page
function getDataFromStorage(storage) {
  for (let key in storage) {
    if (key === "auto-enable-site-list") {
      setDomains(storage[key]);
    } else if (key === "hideSegments") {
      hideSegments.checked = storage[key];
    } else if (key === "summaryReplace") {
      summaryReplace.checked = storage[key];
    } else if (key === "openSharedPage") {
      openSharedPage.checked = storage[key];
    } else if (key === "closeOldPage") {
      closeOldPage.checked = storage[key];
    } else if (key === "enable-pageCM") {
      pageCM.checked = storage[key];
    } else if (key === "enable-linkCM") {
      linkCM.checked = storage[key];
    } else if (key === "enable-autorunCM") {
      autorunCM.checked = storage[key];
    } else if (key === "findbar") {
      findbar.checked = storage[key];
    } else if (key === "scrollbar") {
      scrollbar.checked = storage[key];
    } else if (key === "remove-orig-content") {
      removeOrig.checked = storage[key] !== false;
    } else if (key === "backup") {
      backup.checked = storage[key];
    } else if (key === "leave-pres") {
      leavePres.checked = storage[key];
    } else if (key === "addOrigURL") {
      addOrigURL.checked = storage[key];
    } else if (key === "addTimeEstimate") {
      addTimeEstimate.checked = storage[key];
    } else if (key === "alwaysAddAR") {
      alwaysAddAR.checked = storage[key];
    } else if (key === "gradient-text") {
      grdTxt.checked = storage[key];
    } else if (key === "gradient-colors") {
      grdColors.value = storage[key].join(", ");
    } else if (key === "autoscroll") {
      autoscroll.checked = storage[key];
    } else if (key === "scroll-speed") {
      scrollSpeed.value = storage[key];
    } else if (key === "domainSelectors") {
      domainSelectors.value = JSON.stringify(storage[key], null, 4);
    } else if (key === "summarizer-options") {
      summarizerOptions.value = storage[key];
    } else if (key === "currentTheme") {
      currTheme = storage[key];
    } else if (key === "jrSecret") {
      hasAccount = true;
      jrSecret = storage[key];
    } else if (key === "isPremium") {
      isPremium = storage[key];
    } else if (key === "jrLastChecked") {
      jrLastChecked = storage[key];
    } else if (key.substring(0, 3) === "jr-") {
      // Get the user's stylesheets
      stylesheetObj[key.substring(3)] = storage[key];
    }
  }
}

// Set the chrome storage based on our stylesheet object
function setStylesOfStorage(nextFunc) {
  for (let stylesheet in stylesheetObj) {
    const obj = {};
    obj["jr-" + stylesheet] = stylesheetObj[stylesheet];
    chrome.storage.sync.set(obj, function () {
      if (
        chrome.runtime.lastError &&
        chrome.runtime.lastError.message ===
          "QUOTA_BYTES_PER_ITEM quota exceeded"
      ) {
        chrome.runtime
          .getBackgroundPage()
          .alert(
            "File did not save: Your stylesheet is too big. Minifying it or removing lesser-used entries may help.\n\nYou can minify it at: https://cssminifier.com/"
          );
      } else {
        if (nextFunc) nextFunc();
      }
    });
  }
}

// Remove a given element from chrome storage
function removeStyleFromStorage(stylesheet) {
  chrome.storage.sync.remove(stylesheet);
}

// Detect double click - pulled from http://stackoverflow.com/a/26296759/2065702
function makeDoubleClick(doubleClickCallback, singleClickCallback) {
  return (function () {
    let clicks = 0,
      timeout;
    return function () {
      const me = this;
      clicks++;
      if (clicks == 1) {
        singleClickCallback && singleClickCallback.apply(me, arguments);
        timeout = setTimeout(function () {
          clicks = 0;
        }, 400);
      } else {
        timeout && clearTimeout(timeout);
        doubleClickCallback && doubleClickCallback.apply(me, arguments);
        clicks = 0;
      }
    };
  })();
}

// Check to make sure there isn't a file with this name already. If so, add a number to the end
function checkFileName(fileName) {
  let tempName = fileName,
    count = 1;
  while (stylesheetObj[tempName])
    tempName = fileName.replace(/(\.[\w\d_-]+)$/i, "(" + count++ + ").css");
  return tempName;
}

// Allow file names to be edited
function rename() {
  const liItem = this;

  // Hide the list item
  liItem.style.display = "none";

  // Insert an input temporarily
  const fileNameInput = document.createElement("input");
  fileNameInput.type = "text";
  fileNameInput.value = fileNameInput.dataset.originalName = liItem.innerText;

  // Update the style sheet object on blur
  fileNameInput.onblur = function () {
    // If the file name has changed
    if (fileNameInput.value != fileNameInput.dataset.originalName) {
      fileNameInput.value = checkFileName(fileNameInput.value);

      stylesheetObj[fileNameInput.value] = stylesheetObj[liItem.innerText];
      delete stylesheetObj[liItem.innerText];
      removeStyleFromStorage("jr-" + liItem.innerText);

      setTimeout(function () {
        saveTheme();
      }, 10);

      liItem.innerText = fileNameInput.value;
    }

    // Un-hide the list item
    liItem.style.display = "list-item";

    // Remove the input
    fileNameInput.parentNode.removeChild(fileNameInput);
  };

  // Allow enter to be used to save the rename
  fileNameInput.onkeyup = function (e) {
    if (e.key === "Enter") fileNameInput.onblur();
  };

  if (liItem.nextSibling) {
    liItem.parentNode.insertBefore(fileNameInput, liItem.nextSibling);
  } else {
    liItem.parentNode.appendChild(fileNameInput);
  }
  fileNameInput.focus();
}

// Make sure the user wants to change files before saving
function confirmChange() {
  if (changed)
    if (
      chrome.runtime
        .getBackgroundPage()
        .confirm("Do you really want to change files before saving?")
    )
      return false;
    else return true;
  else return false;
}

function styleListOnClick() {
  // Don't do anything if it's already active
  if (!this.classList.contains("active")) {
    const cancel = confirmChange();

    if (!cancel) {
      // Switch out current CSS for the selected one
      const fileName = this.textContent;

      // Open up the file from localStorage
      editor.setValue(
        stylesheetObj[fileName] === undefined ? "" : stylesheetObj[fileName],
        -1
      );

      // Toggle the active class on the list items
      if (document.querySelector(".stylesheets .active"))
        document
          .querySelector(".stylesheets .active")
          .classList.remove("active");
      this.classList.add("active");

      localStorage.currentTheme = fileName;

      changed = false;
    }
  }
}

// The stuff to fire after the stylesheets have been loaded
function continueLoading() {
  if (typeof stylesheetObj[darkStylesheet] === "undefined") {
    // If the dark theme isn't found, add it
    const xhr = new XMLHttpRequest();
    xhr.overrideMimeType('text/css');
    xhr.open("GET", chrome.runtime.getURL(darkStylesheet), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        // Save the file's contents to our object
        stylesheetObj[darkStylesheet] = xhr.responseText;

        // Save it to Chrome storage
        setStylesOfStorage();
      }
    };
    xhr.send();
  }

  if (
    jrSecret &&
    (typeof jrLastChecked === "undefined" ||
      Date.now() - jrLastChecked > 86400000)
  ) {
    chrome.storage.sync.set({ jrLastChecked: Date.now() });

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

        finishLoading();
      })
      .catch((err) => console.error(`Fetch Error =\n`, err));
  } else {
    finishLoading();
  }
}

function finishLoading() {
  // Get the currently used stylesheet
  currTheme = currTheme || defaultStylesheet;

  // Based on that object, populate the list values
  const list = document.querySelector(".stylesheets");
  for (let stylesheet in stylesheetObj) {
    const li = document.createElement("li"),
      liClassList = li.classList;

    // If the sheet is the one currently applied, add a signifier class
    if (stylesheet === currTheme) {
      liClassList.add("used");
    }

    // Add them to the li element
    li.innerText += stylesheet;

    // Lock the default-styles.css file (prevent deletion)
    if (stylesheet === defaultStylesheet || stylesheet === darkStylesheet) {
      defaultLiItem = li;
      liClassList.add("locked");
    }

    // Make the current one active
    if (stylesheet === currTheme) {
      liClassList.add("active");
      const fileName = li.textContent;
      editor.setValue(
        stylesheetObj[fileName] === undefined ? "" : stylesheetObj[fileName],
        -1
      );
    }

    list.appendChild(li);
  }

  stylesheetListItems = document.querySelectorAll(".stylesheets li");

  stylesheetListItems.forEach(function (item, i) {
    if (!item.classList.contains("locked"))
      item.onclick = makeDoubleClick(rename, styleListOnClick);
    // Prevent the locked items from being changed in name
    else item.onclick = styleListOnClick;
  });

  // Keep track of changes since last save
  editor.on("change", function () {
    if (editor.curOp && editor.curOp.command.name) changed = true;
  });

  if (isPremium) {
    allowPremiumStuff();
  }

  addEventListeners();
}

function allowPremiumStuff() {
  document.querySelector(".options-subtitle").style.display = "block";
  document.querySelector(".upgrade").style.display = "none";
  document
    .querySelectorAll(".disabled")
    .forEach((el) => el.classList.remove("disabled"));
}

// Obtain the stylesheet strings from localStorage and put them in our stylesheet object
function getStylesheets() {
  chrome.storage.sync.get(null, function (result) {
    // Setup our options page based on the user's Chrome storage
    getDataFromStorage(result);

    if (isEmpty(stylesheetObj)) {
      // Not found, so we add our default
      // Open the default CSS file and save it to our object
      const xhr = new XMLHttpRequest();
      xhr.overrideMimeType('text/css');
      xhr.open("GET", chrome.runtime.getURL(defaultStylesheet), true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
          // Save the file's contents to our object
          stylesheetObj[defaultStylesheet] = xhr.responseText;

          // Save it to Chrome storage
          setStylesOfStorage();

          continueLoading();
        }
      };
      xhr.send();
      return;
    } else {
      continueLoading();
    }
  });
}

function continueSaving() {
  const currFileElem = document.querySelector(".stylesheets .active");

  if (currFileElem.classList.contains("locked")) {
    // The file is locked, so make a new one with the same name
    const fileName = checkFileName(currFileElem.innerText);

    // Add a new list element
    const list = document.querySelector(".stylesheets"),
      li = document.createElement("li");

    li.innerText += fileName;

    // Make it active
    if (document.querySelector(".stylesheets .active"))
      document.querySelector(".stylesheets .active").classList.remove("active");
    li.classList.add("active");

    // Force them to save to keep it
    changed = true;

    list.appendChild(li);

    document.querySelector(".stylesheets").lastChild.onclick = makeDoubleClick(
      rename,
      styleListOnClick
    );

    // Update our stylesheet storage
    useTheme();
  }

  // Show the save animation
  saveButton.classList.add("saved");

  // Note that the file has been saved
  changed = false;
}

function saveTheme() {
  // Get the name of the current file being edited
  const currFileElem = document.querySelector(".stylesheets .active");

  // Save that file to localStorage
  if (!currFileElem.classList.contains("locked")) {
    stylesheetObj[currFileElem.innerText] = editor.getValue();
  }
  setStylesOfStorage(continueSaving);
}

function useTheme() {
  const themeToUse = document.querySelector(".stylesheets .active"),
    previouslyUsed = document.querySelector(".stylesheets .used");

  // Save the current theme
  if (!themeToUse.classList.contains("locked")) saveTheme();

  // Remove the used class from the old list item
  if (previouslyUsed !== null) previouslyUsed.classList.remove("used");

  // Update the class to show it's applied
  themeToUse.classList.add("used");

  // Apply the current theme
  const sheet = themeToUse.innerText;
  chrome.storage.sync.set({ currentTheme: sheet });

  // Tell that we changed it
  useButton.classList.add("used");

  // Add the listener for the use animation
  useButton.addEventListener("animationend", function () {
    useButton.classList.remove("used");
  });
  useButton.addEventListener("webkitAnimationEnd", function () {
    useButton.classList.remove("used");
  });
}

function addEventListeners() {
  // Update the domain list with any new values
  domainList.onkeyup = function (e) {
    const domainLine = domainList.value.split("\n").filter(String);
    chrome.storage.sync.set({ "auto-enable-site-list": domainLine });
  };

  // Update the OpenAI params
  summarizerOptions.onkeyup = function (e) {
    chrome.storage.sync.set({ "summarizer-options": summarizerOptions.value });
  };

  // Update the domain-specific selectors list
  domainSelectors.onkeyup = function (e) {
    if (isPremium) {
      const domainSelectorArr = JSON.parse(domainSelectors.value);
      chrome.storage.sync.set({ domainSelectors: domainSelectorArr });
    } else {
      showPremiumNotification();
    }
  };

  // Allow the "Enter" key to be used to add new stylesheets
  newFileInput.onkeyup = function (e) {
    if (e.key === "Enter") add.onclick();
  };

  // Create a new file with the given name
  add.onclick = function () {
    if (newFileInput.value !== "") {
      let fileName = newFileInput.value;

      // If it has .css at the end, remove it
      if (fileName.slice(-4) === ".css") fileName = fileName.slice(0, -4);

      // Parse out the other stuff we don't want and add .css
      fileName = fileName.replace(/[^a-z0-9]/gi, "-").toLowerCase() + ".css";

      // If there's already a file with this name, change it
      fileName = checkFileName(fileName);

      // Add a new list element
      const list = document.querySelector(".stylesheets"),
        li = document.createElement("li");
      li.innerText = fileName;

      // Make it active
      if (document.querySelector(".stylesheets .active"))
        document
          .querySelector(".stylesheets .active")
          .classList.remove("active");
      li.classList.add("active");

      // Clear out the editor and add some smart defaults
      editor.setValue(
        "/* Some defaults you may want */\n.simple-container {\n  max-width: 600px;\n  margin: 0 auto;\n  padding-top: 70px;\n  padding-bottom: 20px;\n}\nimg { max-width: 100%; }\n/* Also keep in mind that the close button is by default black. */\n\n\n",
        -1
      );

      // Force them to save to keep it
      changed = true;

      list.appendChild(li);

      document.querySelector(".stylesheets").lastChild.onclick =
        makeDoubleClick(rename, styleListOnClick);

      // Update our stylesheet storage
      saveTheme();

      newFileInput.value = "";
    }
  };

  // Save the current code to the current file
  saveButton.onclick = saveTheme;

  // Use the selected stylesheet
  useButton.onclick = useTheme;

  // Remove the selected file
  removeButton.onclick = function () {
    // Select the item to be removed
    const elem = document.querySelector(".stylesheets .active");

    // Make sure they can't delete locked files
    if (!elem.classList.contains("locked")) {
      // Add confimation
      if (window.confirm("Do you really want to remove this file?")) {
        // Remove the file from our object
        delete stylesheetObj[
          document.querySelector(".stylesheets .active").innerText
        ];

        // Remove the file from Chrome's storage
        removeStyleFromStorage("jr-" + elem.innerText);

        // Check to see if it's the currently used sheet - if so set it to the default
        if (elem.classList.contains("used")) {
          elem.classList.remove("active");
          chrome.storage.sync.set(
            { currentTheme: defaultStylesheet },
            function () {
              styleListOnClick.call(defaultLiItem);
              defaultLiItem.classList.add("used", "active");
            }
          );
        }

        // Remove it from the list
        elem.parentNode.removeChild(elem);

        editor.setValue("", -1);
      }
    } else
      chrome.runtime
        .getBackgroundPage()
        .alert("This file is locked and cannot be deleted.");

    // Otherwise we do nothing
  };

  hideSegments.onchange = function () {
    chrome.storage.sync.set({ hideSegments: this.checked });
  };

  summaryReplace.onchange = function () {
    chrome.storage.sync.set({ summaryReplace: this.checked });
  };

  openSharedPage.onchange = function () {
    if (isPremium) {
      chrome.storage.sync.set({ openSharedPage: this.checked });
      if (this.checked) {
        closeOldPage.disabled = false;
      } else {
        closeOldPage.disabled = true;
      }
    } else {
      showPremiumNotification();
    }
  };
  closeOldPage.onchange = function () {
    if (isPremium) {
      chrome.storage.sync.set({ closeOldPage: this.checked });
    } else {
      showPremiumNotification();
    }
  };

  pageCM.onchange = function () {
    chrome.storage.sync.set({ "enable-pageCM": this.checked });
    chrome.runtime.sendMessage({ updateCMs: "true" });
  };
  linkCM.onchange = function () {
    chrome.storage.sync.set({ "enable-linkCM": this.checked });
    chrome.runtime.sendMessage({ updateCMs: "true" });
  };
  autorunCM.onchange = function () {
    chrome.storage.sync.set({ "enable-autorunCM": this.checked });
    chrome.runtime.sendMessage({ updateCMs: "true" });
  };

  alwaysAddAR.onchange = function () {
    chrome.storage.sync.set({ alwaysAddAR: this.checked });
  };

  grdTxt.onchange = function () {
    if (isPremium) {
      chrome.storage.sync.set({ "gradient-text": this.checked });
    } else {
      showPremiumNotification();
    }
  };
  grdColors.onkeyup = grdColors.onkeydown = function () {
    if (isPremium) {
      let colors = this.value.trim().split(/\s*,\s*/);
      if (colors.length < 2) {
        colors = ["black", "blue", "black", "red"];
      }
      chrome.storage.sync.set({ "gradient-colors": colors });
    } else {
      showPremiumNotification();
    }
  };
  autoscroll.onchange = function () {
    if (isPremium) {
      chrome.storage.sync.set({ autoscroll: this.checked });
    } else {
      showPremiumNotification();
    }
  };
  scrollSpeed.onkeyup = scrollSpeed.onkeydown = function () {
    if (isPremium) {
      chrome.storage.sync.set({ "scroll-speed": parseFloat(this.value) });
    } else {
      showPremiumNotification();
    }
  };

  const removeOrig = document.getElementById("removeOrig"),
    backup = document.getElementById("backup"),
    leavePres = document.getElementById("leavePres"),
    addOrigURL = document.getElementById("addOrigURL"),
    addTimeEstimate = document.getElementById("addTimeEstimate"),
    scrollbar = document.getElementById("scrollbar"),
    findbar = document.getElementById("findbar");

  removeOrig.onchange = function () {
    chrome.storage.sync.set({ "remove-orig-content": this.checked });
  };
  backup.onchange = function () {
    chrome.storage.sync.set({ backup: this.checked });
  };
  leavePres.onchange = function () {
    chrome.storage.sync.set({ "leave-pres": this.checked });
  };
  addOrigURL.onchange = function () {
    chrome.storage.sync.set({ addOrigURL: this.checked });
  };
  addTimeEstimate.onchange = function () {
    chrome.storage.sync.set({ addTimeEstimate: this.checked });
  };
  scrollbar.onchange = function () {
    if (isPremium) {
      chrome.storage.sync.set({ scrollbar: this.checked });
    } else {
      showPremiumNotification();
    }
  };
  findbar.onchange = function () {
    chrome.storage.sync.set({ findbar: this.checked });
  };

  // Add the listener for the save animation
  saveButton.addEventListener("animationend", function () {
    saveButton.classList.remove("saved");
  });
  saveButton.addEventListener("webkitAnimationEnd", function () {
    saveButton.classList.remove("saved");
  });
}

const newFileInput = document.getElementById("new-file"),
  addButton = document.getElementById("add"),
  saveButton = document.getElementById("save"),
  useButton = document.getElementById("use"),
  removeButton = document.getElementById("remove"),
  domainList = document.getElementById("domainList"),
  domainSelectors = document.querySelector(".domainSelectors"),
  summarizerOptions = document.getElementById("summarizerOptions");

let stylesheetListItems;

const hideSegments = document.getElementById("hideSegments"),
  summaryReplace = document.getElementById("summaryReplace"),
  openSharedPage = document.getElementById("openSharedPage"),
  closeOldPage = document.getElementById("closeOldPage"),
  pageCM = document.getElementById("pageCM"),
  linkCM = document.getElementById("linkCM"),
  autorunCM = document.getElementById("autorunCM"),
  alwaysAddAR = document.getElementById("alwaysAddAR"),
  grdTxt = document.getElementById("grdTxt"),
  grdColors = document.querySelector("[name='gradientColors']"),
  autoscroll = document.getElementById("autoscroll"),
  scrollSpeed = document.querySelector("[name='scrollSpeed']");

getStylesheets();

function createNotification(options) {
  const oldNotification = document.querySelector(".jr-notifier");
  if (oldNotification)
    oldNotification.parentElement.removeChild(oldNotification);

  const notifier = document.createElement("div");
  notifier.className = "jr-tooltip jr-notifier";

  const notificationText = document.createElement("p");
  notificationText.innerHTML = options.textContent;

  const btnContainer = document.createElement("div");
  btnContainer.className = "right-align-buttons";

  const secondaryBtn = document.createElement("button");
  secondaryBtn.className = "jr-secondary";
  secondaryBtn.addEventListener(
    "click",
    function () {
      this.parentNode.parentNode.parentNode.removeChild(
        this.parentNode.parentNode
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

  document.body.appendChild(notifier);
}

function showPremiumNotification() {
  const notification = {
    textContent:
      "To access this feature, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>!",
    url: "https://justread.link/#get-Just-Read",
    primaryText: "Learn more",
    secondaryText: "Maybe later",
  };
  createNotification(notification);
}
