import { createRequire } from "node:module";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import createDOMPurify from "isomorphic-dompurify";
import {
  mathjax2TexScript,
  mathjax2Rendered,
  mathjax3Mjx,
  katex,
  wikipediaMwe,
  mathmlRaw,
  mixedArticle,
  noMath,
  sharePayload,
} from "./fixtures.mjs";

const require = createRequire(import.meta.url);
const JRMathSanitize = require("../../shared/math-sanitize.js");
const JRMathExtract = require("../../shared/math-extract.js");

function extractFrom(html) {
  const dom = new JSDOM(html);
  globalThis.DOMPurify = createDOMPurify(dom.window);
  const root = dom.window.document.body.firstElementChild;
  const count = JRMathExtract.extractMathPlaceholders(root);
  const nodes = [...root.querySelectorAll(".jr-math")];
  return { count, nodes, root, DOMPurify: globalThis.DOMPurify };
}

describe("JRMathExtract source formats", () => {
  before(() => {
    // Ensure sanitize module is the one extract bound to.
    assert.ok(JRMathSanitize.sanitizeTex);
    assert.ok(JRMathExtract.extractMathPlaceholders);
  });

  it("extracts MathJax 2 script[type=math/tex]", () => {
    const { nodes } = extractFrom(mathjax2TexScript);
    assert.equal(nodes.length, 2);
    assert.equal(nodes[0].getAttribute("data-jr-tex"), "E=mc^2");
    assert.equal(nodes[0].getAttribute("data-jr-display"), "inline");
    assert.equal(nodes[1].getAttribute("data-jr-display"), "block");
    assert.match(nodes[1].getAttribute("data-jr-tex"), /\\int/);
  });

  it("extracts MathJax 2 rendered + script pairs", () => {
    const { nodes } = extractFrom(mathjax2Rendered);
    assert.ok(nodes.length >= 2);
    const texes = nodes.map((n) => n.getAttribute("data-jr-tex"));
    assert.ok(texes.some((t) => t === "a^2+b^2=c^2"));
    assert.ok(texes.some((t) => t && t.includes("sum")));
  });

  it("extracts MathJax 3 mjx-container", () => {
    const { nodes } = extractFrom(mathjax3Mjx);
    assert.equal(nodes.length, 2);
    assert.equal(nodes[0].getAttribute("data-jr-tex"), "\\frac{1}{2}");
    assert.equal(nodes[0].getAttribute("data-jr-display"), "block");
    assert.equal(nodes[1].getAttribute("data-jr-tex"), "x+y");
    assert.equal(nodes[1].getAttribute("data-jr-display"), "inline");
  });

  it("extracts KaTeX annotation TeX", () => {
    const { nodes } = extractFrom(katex);
    assert.equal(nodes.length, 2);
    assert.equal(nodes[0].getAttribute("data-jr-tex"), "x");
    assert.equal(nodes[0].getAttribute("data-jr-display"), "inline");
    assert.equal(nodes[1].getAttribute("data-jr-tex"), "y = mx + b");
    assert.equal(nodes[1].getAttribute("data-jr-display"), "block");
  });

  it("extracts Wikipedia mwe-math alt TeX", () => {
    const { nodes } = extractFrom(wikipediaMwe);
    assert.equal(nodes.length, 2);
    assert.equal(nodes[0].getAttribute("data-jr-tex"), "a^{2}+b^{2}=c^{2}");
    assert.equal(nodes[1].getAttribute("data-jr-display"), "block");
  });

  it("extracts raw MathML", () => {
    const { nodes } = extractFrom(mathmlRaw);
    assert.equal(nodes.length, 2);
    assert.ok(nodes[0].getAttribute("data-jr-mathml")?.includes("<math"));
    assert.equal(nodes[1].getAttribute("data-jr-display"), "block");
  });

  it("extracts mixed article preserving multiple formats", () => {
    const { nodes } = extractFrom(mixedArticle);
    assert.equal(nodes.length, 3);
    const texes = nodes.map((n) => n.getAttribute("data-jr-tex"));
    assert.deepEqual(texes, ["1+1", "k", "n!"]);
  });

  it("produces zero placeholders for no-math HTML", () => {
    const { count, nodes } = extractFrom(noMath);
    assert.equal(count, 0);
    assert.equal(nodes.length, 0);
  });

  it("does not double-extract existing .jr-math", () => {
    const { count, nodes } = extractFrom(sharePayload);
    assert.equal(count, 0);
    assert.equal(nodes.length, 2);
  });

  it("rejects malicious TeX during extraction", () => {
    const html = `<article><script type="math/tex">\\href{javascript:alert(1)}{x}</script></article>`;
    const { nodes } = extractFrom(html);
    assert.equal(nodes.length, 0);
  });
});

describe("share-style sanitize keeps .jr-math data attrs", () => {
  it("round-trips placeholders through client share DOMPurify config", () => {
    const dom = new JSDOM(sharePayload);
    const purify = createDOMPurify(dom.window);
    const html = purify.sanitize(dom.window.document.body.innerHTML, {
      ADD_TAGS: ["style", "progress"],
      ADD_ATTR: ["target", "popover", "popovertarget"],
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
      ],
      FORBID_ATTR: ["srcdoc"],
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });
    const out = new JSDOM(html);
    const nodes = [...out.window.document.querySelectorAll(".jr-math")];
    assert.equal(nodes.length, 2);
    assert.equal(nodes[0].getAttribute("data-jr-tex"), "E=mc^2");
    assert.equal(nodes[1].getAttribute("data-jr-display"), "block");
    assert.ok(!html.includes("<script"));
  });
});
