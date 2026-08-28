/**
 * Configure MathJax before tex-mml-chtml.js runs (same executeScript batch).
 */
(function () {
  if (globalThis.MathJax?.typesetPromise) return;
  if (typeof JRMathSanitize === "undefined") {
    console.warn("Just Read: JRMathSanitize missing; math disabled");
    return;
  }
  globalThis.MathJax = JRMathSanitize.mathJaxConfig({
    fontURL: chrome.runtime.getURL(
      "external-libraries/mathjax/output/chtml/fonts/woff-v2"
    ),
  });
})();
