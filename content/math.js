/**
 * Typeset .jr-math in the reader iframe using bundled MathJax 3.
 * MathJax loads in the extension isolated world via the background
 * scripting API (content scripts cannot use chrome.scripting in Firefox).
 */

function readerHasMath(doc) {
  return !!(doc && doc.querySelector && doc.querySelector(".jr-math"));
}

let mathJaxLoadPromise = null;

function waitForMathJaxReady(mjx, attempts) {
  attempts = attempts == null ? 80 : attempts;
  if (mjx?.startup?.promise) {
    return mjx.startup.promise.then(() => {
      if (typeof mjx.typesetPromise === "function") return mjx;
      throw new Error("MathJax failed to initialize");
    });
  }
  return new Promise((resolve, reject) => {
    function tick(n) {
      if (mjx && typeof mjx.typesetPromise === "function") {
        resolve(mjx);
        return;
      }
      if (n <= 0) {
        reject(new Error("MathJax failed to initialize"));
        return;
      }
      setTimeout(() => tick(n - 1), 50);
    }
    tick(attempts);
  });
}

/**
 * Load MathJax into the extension isolated world for this tab.
 * @returns {Promise<object>}
 */
function loadMathJaxIsolated() {
  if (globalThis.MathJax?.typesetPromise) {
    return waitForMathJaxReady(globalThis.MathJax);
  }
  if (mathJaxLoadPromise) return mathJaxLoadPromise;

  mathJaxLoadPromise = new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ jrLoadMathJax: true }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "MathJax load failed"));
        return;
      }
      waitForMathJaxReady(globalThis.MathJax).then(resolve).catch(reject);
    });
  }).catch((err) => {
    mathJaxLoadPromise = null;
    throw err;
  });

  return mathJaxLoadPromise;
}

/**
 * Typeset .jr-math under rootDocument (or a subtree).
 * @param {Document} doc
 * @returns {Promise<void>}
 */
function typesetMath(doc) {
  if (!readerHasMath(doc)) return Promise.resolve();

  const extract = typeof JRMathExtract !== "undefined" ? JRMathExtract : null;
  if (!extract) return Promise.resolve();

  const nodes = extract.prepareMathNodesForTypeset(doc);
  if (!nodes.length) return Promise.resolve();

  return loadMathJaxIsolated()
    .then((MathJax) => MathJax.typesetPromise(nodes))
    .catch((err) => {
      console.warn("Just Read math typeset failed", err);
    });
}

function typesetReaderMath() {
  const doc = JR.readerDocument;
  if (!doc) return Promise.resolve();
  return typesetMath(doc);
}
