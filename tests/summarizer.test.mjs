import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

// content/summarizer.js is a classic content script, so evaluate it in a
// sandbox and pull out the provider table.
const source = readFileSync(
  new URL("../content/summarizer.js", import.meta.url),
  "utf8",
);
const AI_PROVIDERS = vm.runInNewContext(`${source}\n;AI_PROVIDERS`, {});

const PROVIDERS = ["openai", "anthropic", "gemini", "perplexity"];

function bodyFor(provider, temperature) {
  const body = AI_PROVIDERS[provider].buildBody(
    "some-model",
    "prompt",
    "content",
    temperature,
    {},
  );
  return provider === "gemini" ? body.generationConfig : body;
}

describe("summarizer request bodies", () => {
  for (const provider of PROVIDERS) {
    it(`${provider} omits temperature when it is not configured`, () => {
      const body = bodyFor(provider, undefined);
      assert.equal("temperature" in body, false);
      assert.equal(JSON.stringify(body).includes("temperature"), false);
    });

    it(`${provider} sends temperature when it is configured`, () => {
      assert.equal(bodyFor(provider, 0).temperature, 0);
      assert.equal(bodyFor(provider, 0.7).temperature, 0.7);
    });
  }
});
