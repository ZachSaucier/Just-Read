/**
 * Sanitize untrusted TeX / MathML before storing on .jr-math placeholders
 * or feeding MathJax. Usable from content scripts (global) and Node tests (CJS).
 */
(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? (module.exports = factory())
    : (global.JRMathSanitize = factory());
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MAX_TEX_LENGTH = 10000;
  var MAX_MATHML_LENGTH = 50000;

  // TeX that can load remote resources, escape MathJax, or inject active markup.
  var DENIED_TEX =
    /\\(href|url|includegraphics|input|include|write18?|catcode|special|RequirePackage|usepackage|open|read|immediate|csname|endcsname|pdfurl|pdflink|hyperlink|urldef)\b/i;

  function stripControls(str) {
    return String(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  }

  /**
   * @param {unknown} input
   * @returns {string|null} sanitized TeX, or null if rejected
   */
  function sanitizeTex(input) {
    if (input == null) return null;
    var tex = stripControls(String(input)).trim();
    if (!tex) return null;
    if (tex.length > MAX_TEX_LENGTH) return null;
    if (DENIED_TEX.test(tex)) return null;
    // Reject HTML-looking payloads mistaken for TeX.
    if (/<[a-zA-Z!/?]/.test(tex)) return null;
    return tex;
  }

  /**
   * @param {unknown} input
   * @param {(html: string, config?: object) => string} purifyFn DOMPurify.sanitize
   * @returns {string|null} sanitized MathML string, or null if rejected
   */
  function sanitizeMathMl(input, purifyFn) {
    if (input == null || typeof purifyFn !== "function") return null;
    var raw = stripControls(String(input)).trim();
    if (!raw) return null;
    if (raw.length > MAX_MATHML_LENGTH) return null;

    var cleaned = purifyFn(raw, {
      USE_PROFILES: { mathMl: true },
      FORBID_TAGS: [
        "script",
        "iframe",
        "object",
        "embed",
        "link",
        "meta",
        "base",
        "form",
        "input",
        "textarea",
        "select",
        "style",
        "img",
        "a",
      ],
      FORBID_ATTR: [
        "style",
        "href",
        "xlink:href",
        "src",
        "srcdoc",
        "onclick",
        "onload",
        "onerror",
      ],
      ALLOW_UNKNOWN_PROTOCOLS: false,
      KEEP_CONTENT: false,
    });

    cleaned = String(cleaned || "").trim();
    if (!cleaned) return null;
    // Must still look like MathML after purify.
    if (!/<math[\s>]/i.test(cleaned)) return null;
    return cleaned;
  }

  /**
   * Shared MathJax startup config (safe defaults). fontURL is set by callers.
   * @param {{ fontURL?: string }} opts
   */
  function mathJaxConfig(opts) {
    opts = opts || {};
    var cfg = {
      options: {
        enableEnrichment: false,
        enableExplorer: false,
        enableMenu: false,
      },
      tex: {
        inlineMath: [
          ["\\(", "\\)"],
          ["$", "$"],
        ],
        displayMath: [
          ["\\[", "\\]"],
          ["$$", "$$"],
        ],
        processEscapes: false,
        packages: { "[+]": ["noerrors", "noundefined"], "[-]": ["require", "newcommand"] },
      },
      startup: {
        typeset: false,
      },
    };
    if (opts.fontURL) {
      cfg.chtml = { fontURL: opts.fontURL };
    }
    return cfg;
  }

  return {
    MAX_TEX_LENGTH: MAX_TEX_LENGTH,
    MAX_MATHML_LENGTH: MAX_MATHML_LENGTH,
    sanitizeTex: sanitizeTex,
    sanitizeMathMl: sanitizeMathMl,
    mathJaxConfig: mathJaxConfig,
  };
});
