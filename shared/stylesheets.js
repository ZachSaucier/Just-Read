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

function saveStylesheetsToStorage(stylesheetObj, onSaved) {
  for (let stylesheet in stylesheetObj) {
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
}

function loadBundledTheme(stylesheetObj, filename, onLoaded) {
  fetchExtensionCss(filename)
    .then((text) => {
      stylesheetObj[filename] = text;
      saveStylesheetsToStorage(stylesheetObj);
      if (onLoaded) onLoaded();
    })
    .catch((err) => console.error(err));
}
