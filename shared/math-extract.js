/**
 * Extract math from article DOM into .jr-math placeholders.
 * Depends on JRMathSanitize (load math-sanitize.js first).
 */
(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? (module.exports = factory(
        typeof require !== "undefined"
          ? require("./math-sanitize.js")
          : global.JRMathSanitize
      ))
    : (global.JRMathExtract = factory(global.JRMathSanitize));
})(typeof globalThis !== "undefined" ? globalThis : this, function (sanitizeApi) {
  "use strict";

  if (!sanitizeApi) {
    throw new Error("JRMathSanitize is required before JRMathExtract");
  }

  var sanitizeTex = sanitizeApi.sanitizeTex;
  var sanitizeMathMl = sanitizeApi.sanitizeMathMl;

  function getPurify() {
    if (typeof DOMPurify !== "undefined" && DOMPurify.sanitize) {
      return DOMPurify.sanitize.bind(DOMPurify);
    }
    return null;
  }

  function isDisplayFromType(typeAttr) {
    return /mode\s*=\s*display/i.test(String(typeAttr || ""));
  }

  function annotationTex(root) {
    if (!root || !root.querySelector) return null;
    var ann =
      root.querySelector('annotation[encoding="application/x-tex"]') ||
      root.querySelector('annotation[encoding="application/x-latex"]') ||
      root.querySelector("annotation");
    return ann ? ann.textContent : null;
  }

  function createPlaceholder(doc, display, tex, mathml) {
    var safeTex = tex != null ? sanitizeTex(tex) : null;
    var purify = getPurify();
    var safeMl =
      mathml != null && purify ? sanitizeMathMl(mathml, purify) : null;
    if (!safeTex && !safeMl) return null;

    var span = doc.createElement("span");
    span.className = "jr-math";
    span.setAttribute("data-jr-display", display ? "block" : "inline");
    if (safeTex) span.setAttribute("data-jr-tex", safeTex);
    if (safeMl) span.setAttribute("data-jr-mathml", safeMl);
    // Visible fallback before typeset / if MathJax fails.
    span.textContent = safeTex || "[math]";
    return span;
  }

  function replaceNode(node, placeholder) {
    if (!node || !node.parentNode || !placeholder) return false;
    node.parentNode.replaceChild(placeholder, node);
    return true;
  }

  function collectRoots(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  /**
   * Replace math markup under `root` with .jr-math placeholders (in place).
   * @param {ParentNode} root
   * @returns {number} number of placeholders inserted
   */
  function extractMathPlaceholders(root) {
    if (!root || !root.querySelectorAll) return 0;
    var doc = root.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!doc) return 0;

    var count = 0;
    var seen = new Set();

    function markSeen(el) {
      if (!el) return;
      seen.add(el);
      if (el.querySelectorAll) {
        collectRoots(el, "*").forEach(function (c) {
          seen.add(c);
        });
      }
    }

    function tryReplace(node, display, tex, mathml) {
      if (!node || seen.has(node)) return;
      // Skip if already a placeholder or inside one.
      if (node.classList && node.classList.contains("jr-math")) return;
      if (node.closest && node.closest(".jr-math")) return;

      var ph = createPlaceholder(doc, display, tex, mathml);
      if (!ph) return;
      if (replaceNode(node, ph)) {
        markSeen(ph);
        count++;
      }
    }

    // 1) MathJax 2 script sources (highest-fidelity TeX).
    collectRoots(root, 'script[type^="math/tex"]').forEach(function (script) {
      var display = isDisplayFromType(script.getAttribute("type"));
      // Prefer replacing the rendered sibling when present.
      var rendered =
        script.previousElementSibling &&
        script.previousElementSibling.classList &&
        (script.previousElementSibling.classList.contains("MathJax") ||
          script.previousElementSibling.classList.contains("MathJax_Display") ||
          script.previousElementSibling.classList.contains("MathJax_SVG") ||
          script.previousElementSibling.classList.contains("MathJax_SVG_Display"))
          ? script.previousElementSibling
          : null;

      var tex = script.textContent;
      if (rendered) {
        tryReplace(rendered, display, tex, null);
        if (script.parentNode) script.parentNode.removeChild(script);
      } else {
        tryReplace(script, display, tex, null);
      }
    });

    // 2) MathJax 3 mjx-container
    collectRoots(root, "mjx-container").forEach(function (mjx) {
      if (seen.has(mjx)) return;
      var display =
        mjx.getAttribute("display") === "true" ||
        mjx.classList.contains("MathJax_Display");
      var tex =
        mjx.getAttribute("data-tex") ||
        mjx.getAttribute("data-latex") ||
        annotationTex(mjx);
      var mmlEl = mjx.querySelector("math") || mjx.querySelector("mjx-assistive-mml math");
      var mathml = mmlEl ? mmlEl.outerHTML : null;
      tryReplace(mjx, display, tex, mathml);
    });

    // 3) KaTeX
    collectRoots(root, ".katex-display, .katex").forEach(function (katex) {
      if (seen.has(katex)) return;
      // Prefer outermost .katex-display over nested .katex
      if (
        katex.classList.contains("katex") &&
        katex.closest &&
        katex.closest(".katex-display")
      ) {
        return;
      }
      var display = katex.classList.contains("katex-display");
      var tex = annotationTex(katex);
      var mmlEl = katex.querySelector(".katex-mathml math, math");
      var mathml = mmlEl ? mmlEl.outerHTML : null;
      tryReplace(katex, display, tex, mathml);
    });

    // 4) Remaining MathJax 2 rendered nodes (without script sibling already handled)
    collectRoots(
      root,
      ".MathJax_Display, .MathJax, .MathJax_SVG_Display, .MathJax_SVG"
    ).forEach(function (mj) {
      if (seen.has(mj)) return;
      if (mj.id && String(mj.id).indexOf("MathJax_Font_Test") === 0) return;
      var display =
        mj.classList.contains("MathJax_Display") ||
        mj.classList.contains("MathJax_SVG_Display");
      var tex =
        mj.getAttribute("data-math") ||
        annotationTex(mj) ||
        (mj.nextElementSibling &&
        mj.nextElementSibling.matches &&
        mj.nextElementSibling.matches('script[type^="math/tex"]')
          ? mj.nextElementSibling.textContent
          : null);
      var mmlEl = mj.querySelector("math");
      tryReplace(mj, display, tex, mmlEl ? mmlEl.outerHTML : null);
    });

    // 5) Wikipedia MediaWiki math fallback images
    collectRoots(root, "img.mwe-math-fallback-image-inline, img.mwe-math-fallback-image-display").forEach(
      function (img) {
        if (seen.has(img)) return;
        var display = img.classList.contains("mwe-math-fallback-image-display");
        var tex = img.getAttribute("alt");
        tryReplace(img, display, tex, null);
      }
    );

    // 6) Raw MathML not already inside a handled root
    collectRoots(root, "math").forEach(function (math) {
      if (seen.has(math)) return;
      if (math.closest && math.closest(".jr-math")) return;
      var display = math.getAttribute("display") === "block";
      var tex = annotationTex(math.parentElement || math);
      tryReplace(math, display, tex, math.outerHTML);
    });

    return count;
  }

  /**
   * Prepare .jr-math nodes for MathJax typesetting (re-sanitize + set text).
   * @param {ParentNode} root
   * @returns {Element[]} nodes ready to typeset
   */
  function prepareMathNodesForTypeset(root) {
    if (!root || !root.querySelectorAll) return [];
    var purify = getPurify();
    var nodes = collectRoots(root, ".jr-math");
    var ready = [];

    nodes.forEach(function (el) {
      var display = el.getAttribute("data-jr-display") === "block";
      var tex = sanitizeTex(el.getAttribute("data-jr-tex"));
      var mathml =
        purify && el.getAttribute("data-jr-mathml")
          ? sanitizeMathMl(el.getAttribute("data-jr-mathml"), purify)
          : null;

      if (tex) {
        el.setAttribute("data-jr-tex", tex);
        el.textContent = display ? "\\[" + tex + "\\]" : "\\(" + tex + "\\)";
        ready.push(el);
      } else if (mathml) {
        el.setAttribute("data-jr-mathml", mathml);
        el.innerHTML = mathml;
        ready.push(el);
      } else {
        el.textContent = el.textContent || "[math]";
      }
    });

    return ready;
  }

  return {
    extractMathPlaceholders: extractMathPlaceholders,
    prepareMathNodesForTypeset: prepareMathNodesForTypeset,
    createPlaceholder: createPlaceholder,
  };
});
