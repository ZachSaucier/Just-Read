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
} from "./fixtures.mjs";

const require = createRequire(import.meta.url);
const JRMathSanitize = require("../../shared/math-sanitize.js");

describe("JRMathSanitize", () => {
  let purify;

  before(() => {
    purify = createDOMPurify(new JSDOM("").window).sanitize;
  });

  it("accepts normal TeX", () => {
    assert.equal(JRMathSanitize.sanitizeTex("E=mc^2"), "E=mc^2");
    assert.equal(
      JRMathSanitize.sanitizeTex("\\frac{1}{2}"),
      "\\frac{1}{2}"
    );
  });

  it("rejects dangerous TeX", () => {
    assert.equal(JRMathSanitize.sanitizeTex("\\href{javascript:alert(1)}{x}"), null);
    assert.equal(JRMathSanitize.sanitizeTex("\\url{https://evil.test}"), null);
    assert.equal(JRMathSanitize.sanitizeTex("\\input{/etc/passwd}"), null);
    assert.equal(JRMathSanitize.sanitizeTex("\\includegraphics{x}"), null);
    assert.equal(JRMathSanitize.sanitizeTex("\\RequirePackage{x}"), null);
  });

  it("rejects empty, overlong, control chars, and HTML-like TeX", () => {
    assert.equal(JRMathSanitize.sanitizeTex(""), null);
    assert.equal(JRMathSanitize.sanitizeTex("   "), null);
    assert.equal(JRMathSanitize.sanitizeTex("a\u0000b"), "ab");
    assert.equal(
      JRMathSanitize.sanitizeTex("x".repeat(JRMathSanitize.MAX_TEX_LENGTH + 1)),
      null
    );
    assert.equal(JRMathSanitize.sanitizeTex("<script>alert(1)</script>"), null);
  });

  it("sanitizes MathML and strips scripts / handlers / links", () => {
    const clean = JRMathSanitize.sanitizeMathMl(
      '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>',
      purify
    );
    assert.match(clean, /<math/i);
    assert.match(clean, /<mi>/i);

    assert.equal(
      JRMathSanitize.sanitizeMathMl(
        '<math><mi onclick="alert(1)">x</mi><script>evil()</script></math>',
        purify
      )?.includes("script"),
      false
    );

    const withLink = JRMathSanitize.sanitizeMathMl(
      '<math><a href="https://evil.test"><mi>x</mi></a></math>',
      purify
    );
    assert.ok(!withLink || !/href=/i.test(withLink));
  });

  it("rejects non-math after purify", () => {
    assert.equal(
      JRMathSanitize.sanitizeMathMl("<div>not math</div>", purify),
      null
    );
  });
});
