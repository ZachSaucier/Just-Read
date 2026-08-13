function isEmpty(obj) {
  if (obj) return Object.keys(obj).length === 0;
  return true;
}

function fetchExtensionCss(filename) {
  return fetch(chrome.runtime.getURL(filename)).then((response) => {
    if (!response.ok) throw new Error("Failed to load " + filename);
    return response.text();
  });
}
