function afterOptionsStorageLoaded() {
  if (typeof stylesheetObj[darkStylesheet] === "undefined") {
    loadBundledTheme(stylesheetObj, darkStylesheet);
  }

  refreshPremiumStatus({
    domain: jrDomain,
    secret: jrSecret,
    lastChecked: jrLastChecked,
    cachedIsPremium: isPremium,
    onReady: (result) => {
      isPremium = result.isPremium;
      renderOptionsPage();
    },
  });
}

function renderOptionsPage() {
  currTheme = currTheme || defaultStylesheet;

  const list = document.querySelector(".stylesheets");
  for (let stylesheet in stylesheetObj) {
    const li = document.createElement("li"),
      liClassList = li.classList;

    if (stylesheet === currTheme) {
      liClassList.add("used");
    }

    li.innerText += stylesheet;

    if (stylesheet === defaultStylesheet || stylesheet === darkStylesheet) {
      defaultLiItem = li;
      liClassList.add("locked");
    }

    if (stylesheet === currTheme) {
      liClassList.add("active");
      const fileName = li.textContent;
      editor.setValue(
        stylesheetObj[fileName] === undefined ? "" : stylesheetObj[fileName],
        -1,
      );
    }

    list.appendChild(li);
  }

  stylesheetListItems = document.querySelectorAll(".stylesheets li");

  stylesheetListItems.forEach(function (item, i) {
    if (!item.classList.contains("locked"))
      item.onclick = makeDoubleClick(rename, styleListOnClick);
    else item.onclick = styleListOnClick;
  });

  editor.on("change", function () {
    if (editor.curOp && editor.curOp.command.name) changed = true;
  });

  if (isPremium) {
    allowPremiumStuff();
  }

  addEventListeners();
}

function loadOptionsFromStorage() {
  chrome.storage.sync.get(null, function (result) {
    applyStorageToOptionsForm(result);

    if (isEmpty(stylesheetObj)) {
      loadBundledTheme(stylesheetObj, defaultStylesheet, afterOptionsStorageLoaded);
      return;
    }

    afterOptionsStorageLoaded();
  });
}

loadOptionsFromStorage();
