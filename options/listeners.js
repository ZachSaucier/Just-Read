function addEventListeners() {
  domainList.onkeyup = function (e) {
    const domainLine = domainList.value.split("\n").filter(String);
    chrome.storage.sync.set({ "auto-enable-site-list": domainLine });
  };

  summarizerOptions.onkeyup = function (e) {
    chrome.storage.sync.set({ "summarizer-options": summarizerOptions.value });
  };

  domainSelectors.onkeyup = function (e) {
    if (isPremium) {
      const domainSelectorArr = JSON.parse(domainSelectors.value);
      chrome.storage.sync.set({ domainSelectors: domainSelectorArr });
    } else {
      showPremiumNotification();
    }
  };

  newFileInput.onkeyup = function (e) {
    if (e.key === "Enter") addButton.onclick();
  };

  addButton.onclick = function () {
    if (newFileInput.value !== "") {
      let fileName = newFileInput.value;

      if (fileName.slice(-4) === ".css") fileName = fileName.slice(0, -4);

      fileName = fileName.replace(/[^a-z0-9]/gi, "-").toLowerCase() + ".css";

      fileName = checkFileName(fileName);

      const list = document.querySelector(".stylesheets"),
        li = document.createElement("li");
      li.innerText = fileName;

      if (document.querySelector(".stylesheets .active"))
        document
          .querySelector(".stylesheets .active")
          .classList.remove("active");
      li.classList.add("active");

      editor.setValue(
        "/* Some defaults you may want */\n.simple-container {\n  max-width: 600px;\n  margin: 0 auto;\n  padding-top: 70px;\n  padding-bottom: 20px;\n}\nimg { max-width: 100%; }\n/* Also keep in mind that the close button is by default black. */\n\n\n",
        -1,
      );

      changed = true;

      list.appendChild(li);

      document.querySelector(".stylesheets").lastChild.onclick =
        makeDoubleClick(rename, styleListOnClick);

      saveTheme();

      newFileInput.value = "";
    }
  };

  saveButton.onclick = saveTheme;

  useButton.onclick = useTheme;

  removeButton.onclick = function () {
    const elem = document.querySelector(".stylesheets .active");

    if (!elem.classList.contains("locked")) {
      if (window.confirm("Do you really want to remove this file?")) {
        delete stylesheetObj[
          document.querySelector(".stylesheets .active").innerText
        ];

        removeStyleFromStorage("jr-" + elem.innerText);

        if (elem.classList.contains("used")) {
          elem.classList.remove("active");
          chrome.storage.sync.set(
            { currentTheme: defaultStylesheet },
            function () {
              styleListOnClick.call(defaultLiItem);
              defaultLiItem.classList.add("used", "active");
            },
          );
        }

        elem.parentNode.removeChild(elem);

        editor.setValue("", -1);
      }
    } else
        alert("This file is locked and cannot be deleted.");
  };

  hideSegments.onchange = function () {
    chrome.storage.sync.set({ hideSegments: this.checked });
  };

  summaryReplace.onchange = function () {
    chrome.storage.sync.set({ summaryReplace: this.checked });
  };

  summaryAutoRun.onchange = function () {
    chrome.storage.sync.set({ summaryAutoRun: this.checked });
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
    chrome.runtime.sendMessage({ updateContextMenus: true });
  };
  linkCM.onchange = function () {
    chrome.storage.sync.set({ "enable-linkCM": this.checked });
    chrome.runtime.sendMessage({ updateContextMenus: true });
  };
  autorunCM.onchange = function () {
    chrome.storage.sync.set({ "enable-autorunCM": this.checked });
    chrome.runtime.sendMessage({ updateContextMenus: true });
  };

  alwaysAddAR.onchange = function () {
    chrome.storage.sync.set({ alwaysAddAR: this.checked });
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

  saveButton.addEventListener("animationend", function () {
    saveButton.classList.remove("saved");
  });
  saveButton.addEventListener("webkitAnimationEnd", function () {
    saveButton.classList.remove("saved");
  });
}
