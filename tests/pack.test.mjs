import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("pack.mjs allowlist", () => {
  it("does not include tests/, package.json, or node_modules/", () => {
    const src = readFileSync(join(root, "pack.mjs"), "utf8");
    const match = src.match(/const INCLUDE = \[([\s\S]*?)\];/);
    assert.ok(match, "INCLUDE array not found");
    const block = match[1];
    assert.ok(!/"tests"/.test(block));
    assert.ok(!/"package\.json"/.test(block));
    assert.ok(!/"node_modules"/.test(block));
    assert.match(src, /never appear in customer zips/i);
  });

  it("includes _locales in customer packages", () => {
    const src = readFileSync(join(root, "pack.mjs"), "utf8");
    const match = src.match(/const INCLUDE = \[([\s\S]*?)\];/);
    assert.ok(match, "INCLUDE array not found");
    assert.match(match[1], /"_locales"/);
  });
});
