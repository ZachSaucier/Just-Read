const BUNDLED_THEME_FILES = ["default-styles.css", "dark-styles.css"];

function isBundledTheme(filename) {
  return BUNDLED_THEME_FILES.indexOf(filename) !== -1;
}

function checkFileName(fileName, stylesheetObj) {
  let tempName = fileName,
    count = 1;
  while (stylesheetObj[tempName])
    tempName = fileName.replace(/(\.[\w\d_-]+)$/i, "(" + count++ + ").css");
  return tempName;
}

function collectStylesheetsFromStorage(storage, stylesheetObj) {
  for (let key in storage) {
    if (key.substring(0, 3) === "jr-") {
      stylesheetObj[key.substring(3)] = storage[key];
    }
  }
}

function missingBundledThemes(stylesheetObj) {
  return BUNDLED_THEME_FILES.filter((filename) => !stylesheetObj[filename]);
}

function saveBundledThemesToStorage(stylesheetObj) {
  const obj = {};
  for (const filename of BUNDLED_THEME_FILES) {
    if (stylesheetObj[filename]) {
      obj["jr-" + filename] = stylesheetObj[filename];
    }
  }
  if (Object.keys(obj).length) {
    chrome.storage.sync.set(obj);
  }
}

function saveStylesheetsToStorage(stylesheetObj, onSaved) {
  let pending = 0;
  for (let stylesheet in stylesheetObj) {
    if (isBundledTheme(stylesheet)) continue;
    pending++;
    const obj = {};
    obj["jr-" + stylesheet] = stylesheetObj[stylesheet];
    chrome.storage.sync.set(obj, function () {
      if (
        chrome.runtime.lastError &&
        (chrome.runtime.lastError.message ===
          "QUOTA_BYTES_PER_ITEM quota exceeded" ||
          chrome.runtime.lastError.message.includes("QuotaExceededError"))
      ) {
        alert(t("stylesheetQuotaExceeded"));
      } else if (onSaved) {
        onSaved();
      }
    });
  }
  if (pending === 0 && onSaved) onSaved();
}

function ensureBundledThemes(stylesheetObj, onLoaded) {
  const missing = missingBundledThemes(stylesheetObj);
  if (missing.length === 0) {
    if (onLoaded) onLoaded();
    return;
  }

  Promise.all(
    missing.map((filename) =>
      fetchExtensionCss(filename).then((text) => {
        stylesheetObj[filename] = text;
      }),
    ),
  )
    .then(() => {
      saveBundledThemesToStorage(stylesheetObj);
      if (onLoaded) onLoaded();
    })
    .catch((err) => {
      console.error(err);
      if (
        missingBundledThemes(stylesheetObj).length < BUNDLED_THEME_FILES.length
      ) {
        if (onLoaded) onLoaded();
      }
    });
}
