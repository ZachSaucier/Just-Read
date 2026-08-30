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

function rename() {
  const liItem = this;

  liItem.style.display = "none";

  const fileNameInput = document.createElement("input");
  fileNameInput.type = "text";
  fileNameInput.value = fileNameInput.dataset.originalName = liItem.innerText;

  fileNameInput.onblur = function () {
    if (fileNameInput.value != fileNameInput.dataset.originalName) {
      fileNameInput.value = checkFileName(fileNameInput.value, stylesheetObj);

      stylesheetObj[fileNameInput.value] = stylesheetObj[liItem.innerText];
      delete stylesheetObj[liItem.innerText];
      removeStyleFromStorage("jr-" + liItem.innerText);

      setTimeout(function () {
        saveTheme();
      }, 10);

      liItem.innerText = fileNameInput.value;
    }

    liItem.style.display = "list-item";

    fileNameInput.parentNode.removeChild(fileNameInput);
  };

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

function confirmChange() {
  if (changed)
    if (confirm(t("optionsConfirmChangeBeforeSave")))
      return false;
    else return true;
  else return false;
}

function styleListOnClick() {
  if (!this.classList.contains("active")) {
    const cancel = confirmChange();

    if (!cancel) {
      const fileName = this.textContent;

      editor.setValue(
        stylesheetObj[fileName] === undefined ? "" : stylesheetObj[fileName],
        -1,
      );

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

function afterThemeSaved() {
  const currFileElem = document.querySelector(".stylesheets .active");

  if (currFileElem.classList.contains("locked")) {
    const fileName = checkFileName(currFileElem.innerText, stylesheetObj);

    const list = document.querySelector(".stylesheets"),
      li = document.createElement("li");

    li.innerText += fileName;

    if (document.querySelector(".stylesheets .active"))
      document.querySelector(".stylesheets .active").classList.remove("active");
    li.classList.add("active");

    changed = true;

    list.appendChild(li);

    document.querySelector(".stylesheets").lastChild.onclick = makeDoubleClick(
      rename,
      styleListOnClick,
    );

    useTheme();
  }

  saveButton.classList.add("saved");

  changed = false;
}

function saveTheme() {
  const currFileElem = document.querySelector(".stylesheets .active");

  if (!currFileElem.classList.contains("locked")) {
    stylesheetObj[currFileElem.innerText] = editor.getValue();
  }
  saveStylesheetsToStorage(stylesheetObj, afterThemeSaved);
}

function useTheme() {
  const themeToUse = document.querySelector(".stylesheets .active"),
    previouslyUsed = document.querySelector(".stylesheets .used");

  if (!themeToUse.classList.contains("locked")) saveTheme();

  if (previouslyUsed !== null) previouslyUsed.classList.remove("used");

  themeToUse.classList.add("used");

  const sheet = themeToUse.innerText;
  chrome.storage.sync.set({ currentTheme: sheet });

  useButton.classList.add("used");

  useButton.addEventListener("animationend", function () {
    useButton.classList.remove("used");
  });
  useButton.addEventListener("webkitAnimationEnd", function () {
    useButton.classList.remove("used");
  });
}
