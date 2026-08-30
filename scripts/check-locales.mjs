#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/load-env.mjs";

const LOCALES_DIR = join(ROOT, "_locales");
const BASE = "en";

function loadMessages(locale) {
  const path = join(LOCALES_DIR, locale, "messages.json");
  if (!existsSync(path)) {
    throw new Error(`Missing locale file: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function messageKeys(messages) {
  return Object.keys(messages).sort();
}

const baseMessages = loadMessages(BASE);
const baseKeys = messageKeys(baseMessages);
const locales = readdirSync(LOCALES_DIR).filter((name) => {
  return existsSync(join(LOCALES_DIR, name, "messages.json"));
});

let failed = false;

for (const locale of locales) {
  if (locale === BASE) continue;
  const messages = loadMessages(locale);
  const keys = messageKeys(messages);
  const missing = baseKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !baseKeys.includes(k));

  if (missing.length || extra.length) {
    failed = true;
    console.error(`\n${locale}:`);
    if (missing.length) {
      console.error(`  missing keys (${missing.length}): ${missing.join(", ")}`);
    }
    if (extra.length) {
      console.error(`  extra keys (${extra.length}): ${extra.join(", ")}`);
    }
  } else {
    console.log(`${locale}: OK (${keys.length} keys)`);
  }
}

console.log(`\nBase locale ${BASE}: ${baseKeys.length} keys`);

if (failed) {
  process.exit(1);
}

console.log("All locale key sets match.");
