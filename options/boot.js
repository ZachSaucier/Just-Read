function localizeOptionsPage() {
  populateExtensionLocaleSelect(extensionLocale);

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    setLocalizedHtml(el, el.getAttribute("data-i18n-html"));
  });

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = t(key);
    if (text) el.textContent = text;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const text = t(key);
    if (text) el.placeholder = text;
  });

  const titleEl = document.querySelector("title[data-i18n]");
  if (titleEl) {
    document.title = t(titleEl.getAttribute("data-i18n"));
  }

  let fb = document.getElementById("jr-i18n-feedback");
  if (!fb) {
    fb = document.createElement("style");
    fb.id = "jr-i18n-feedback";
    document.head.appendChild(fb);
  }
  const saved = t("optionsSavedFeedback").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const done = t("optionsDoneFeedback").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  fb.textContent =
    `#save::before { content: "${saved}"; }\n#use::before { content: "${done}"; }`;

  const summarizerEl = document.getElementById("summarizerOptions");
  if (summarizerEl && summarizerEl.value.includes("YOUR_API_KEY_GOES_HERE")) {
    try {
      const opts = JSON.parse(summarizerEl.value);
      opts.prompt = t("defaultSummarizerPrompt");
      summarizerEl.value = JSON.stringify(opts, null, 4)
        .replace(/^/gm, "    ")
        .trim();
    } catch (e) {
      // leave default textarea as-is if malformed
    }
  }

  applySiteLinks();
  syncOptionsColorSchemeUI();
}

initI18nFromStorage().then(() => {
  localizeOptionsPage();
  loadOptionsFromStorage();
});

function afterOptionsStorageLoaded() {
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
  list.textContent = "";
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
    ensureBundledThemes(stylesheetObj, afterOptionsStorageLoaded);
  });
}

