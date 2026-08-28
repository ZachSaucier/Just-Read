/**
 * Inject bundled MathJax 3 into the reader document and typeset .jr-math nodes.
 * Requires JRMathSanitize + JRMathExtract (shared/).
 */

function jrMathScriptUrl(file) {
  return chrome.runtime.getURL("external-libraries/mathjax/" + file);
}

function jrMathFontUrl() {
  return chrome.runtime.getURL(
    "external-libraries/mathjax/output/chtml/fonts/woff-v2"
  );
}

function readerHasMath(doc) {
  return !!(doc && doc.querySelector && doc.querySelector(".jr-math"));
}

function configureMathJaxOnWindow(win) {
  // Do not overwrite an existing page config (e.g. shared justread.link bootstrap).
  if (!win || win.MathJax) return;
  win.MathJax = JRMathSanitize.mathJaxConfig({ fontURL: jrMathFontUrl() });
}

function loadScript(doc, src) {
  return new Promise((resolve, reject) => {
    const existing = doc.querySelector('script[src="' + src + '"]');
    if (existing) {
      if (doc.defaultView?.MathJax?.typesetPromise) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("MathJax script failed"))
      );
      return;
    }
    const script = doc.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load " + src));
    (doc.head || doc.documentElement).appendChild(script);
  });
}

/**
 * Load MathJax into a document (reader iframe or shared page via extension).
 * For shared pages with CSP script-src 'self', page-world chrome-extension
 * scripts are blocked — callers should prefer window.MathJax from the server
 * or run typeset after injecting via chrome.scripting (isolated world).
 */
function injectMathJax(doc) {
  if (!doc) return Promise.resolve(false);
  const win = doc.defaultView;
  if (!win) return Promise.resolve(false);

  if (win.MathJax?.typesetPromise) return Promise.resolve(true);

  configureMathJaxOnWindow(win);
  return loadScript(doc, jrMathScriptUrl("tex-mml-chtml.js")).then(() => {
    // Optional safe extension if present.
    return loadScript(doc, jrMathScriptUrl("safe.js")).catch(() => {});
  }).then(() => true);
}

function waitForMathJax(win, attempts) {
  attempts = attempts == null ? 40 : attempts;
  return new Promise((resolve, reject) => {
    function tick(n) {
      if (win.MathJax && typeof win.MathJax.typesetPromise === "function") {
        resolve(win.MathJax);
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

  const win = doc.defaultView;
  if (!win) return Promise.resolve();

  // Prefer MathJax already on the page (shared pages). Only inject the
  // extension bundle when the document has no MathJax config yet.
  const ensure = win.MathJax
    ? Promise.resolve(true)
    : injectMathJax(doc);

  return ensure
    .then(() => waitForMathJax(win))
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
