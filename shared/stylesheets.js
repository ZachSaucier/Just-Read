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
      const name = key.substring(3);
      if (isBundledTheme(name)) continue;
      stylesheetObj[name] = storage[key];
    }
  }
}

function dropStoredBundledThemes() {
  chrome.storage.sync.remove([
    "jr-default-styles.css",
    "jr-dark-styles.css",
    "stylesheet-version",
  ]);
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
        chrome.runtime.lastError.message ===
          "QUOTA_BYTES_PER_ITEM quota exceeded"
      ) {
        alert(
          "File did not save: Your stylesheet is too big. Minifying it or removing lesser-used entries may help.\n\nYou can minify it at: https://cssminifier.com/",
        );
      } else if (onSaved) {
        onSaved();
      }
    });
  }
  if (pending === 0 && onSaved) onSaved();
}

function loadBundledThemes(stylesheetObj, onLoaded) {
  Promise.all(
    BUNDLED_THEME_FILES.map((filename) =>
      fetchExtensionCss(filename).then((text) => {
        stylesheetObj[filename] = text;
      }),
    ),
  )
    .then(() => {
      if (onLoaded) onLoaded();
    })
    .catch((err) => console.error(err));
}
