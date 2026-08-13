function isEmpty(obj) {
  if (obj) return Object.keys(obj).length === 0;
  return true;
}

function serializeHeaders(headers) {
  if (!headers) return {};
  if (typeof headers.forEach === "function") {
    const out = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  return headers;
}

// Firefox applies the page CSP to content-script fetch(). Shared justread.link
// pages use connect-src 'none', so API and extension-file requests go through
// the background script instead.
function jrFetch(url, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        jrFetch: {
          url: url,
          method: options.method || "GET",
          headers: serializeHeaders(options.headers),
          body: options.body,
        },
      },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(new TypeError(chrome.runtime.lastError.message));
          return;
        }
        if (!result) {
          reject(new TypeError("NetworkError when attempting to fetch resource."));
          return;
        }
        if (result.networkError) {
          reject(new TypeError("NetworkError when attempting to fetch resource."));
          return;
        }
        resolve({
          ok: result.ok,
          status: result.status,
          headers: {
            get: function (name) {
              if ((name || "").toLowerCase() === "content-type") {
                return result.contentType || "";
              }
              return null;
            },
          },
          text: function () {
            return Promise.resolve(result.text);
          },
          json: function () {
            return Promise.resolve(JSON.parse(result.text));
          },
        });
      },
    );
  });
}

function fetchExtensionCss(filename) {
  return jrFetch(chrome.runtime.getURL(filename)).then((response) => {
    if (!response.ok) throw new Error("Failed to load " + filename);
    return response.text();
  });
}
