#!/usr/bin/env node
/**
 * Generate draft translations for all launch locales from _locales/en/messages.json.
 * Requires OPENAI_API_KEY in .env unless --copy-en is passed.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { ROOT, getOpenAiKey, loadEnv } from "./lib/load-env.mjs";

const EN_PATH = join(ROOT, "_locales/en/messages.json");

/** Chrome _locales folder names → human language names for the model. */
const LAUNCH_LOCALES = {
  ru: "Russian",
  es: "Spanish",
  pt_BR: "Portuguese (Brazil)",
  zh_CN: "Chinese (Simplified)",
  de: "German",
  fr: "French",
  zh_TW: "Chinese (Traditional)",
  ja: "Japanese",
  ko: "Korean",
  it: "Italian",
  pt_PT: "Portuguese (Portugal)",
  uk: "Ukrainian",
  sv: "Swedish",
  pl: "Polish",
  tr: "Turkish",
};

const copyEnOnly = process.argv.includes("--copy-en");
const localeFilter = process.argv.find((a) => a.startsWith("--locale="))?.slice(9);

function sortMessages(messages) {
  return Object.fromEntries(
    Object.keys(messages)
      .sort()
      .map((key) => [key, messages[key]]),
  );
}

function writeLocale(locale, messages) {
  const dir = join(ROOT, "_locales", locale);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "messages.json");
  writeFileSync(path, JSON.stringify(sortMessages(messages), null, 2) + "\n");
  console.log(`  wrote ${path}`);
}

async function translateWithOpenAI(enMessages, targetLanguage) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env or run with --copy-en.",
    );
  }

  const payload = {};
  for (const [key, entry] of Object.entries(enMessages)) {
    payload[key] = entry.message;
  }

  const system = `You translate Chrome extension UI strings to ${targetLanguage}.
Return ONLY valid JSON: an object mapping each key to its translated "message" string.
Rules:
- Preserve HTML tags and attributes exactly (<a>, <em>, href, target).
- Preserve placeholders exactly: $1, $2, $VIEWS$, $REVIEW_URL$, $MAILTO$, $COUNT$, $TOKENS$, and placeholder names in messages.
- Preserve URLs unchanged.
- Keep tone concise and natural for software UI.
- Do not translate brand name "Just Read" when it is a product name.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: loadEnv().OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${err}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  const translated = JSON.parse(content);
  const out = {};

  for (const [key, enEntry] of Object.entries(enMessages)) {
    out[key] = {
      message: translated[key] ?? enEntry.message,
      description: enEntry.description,
    };
    if (enEntry.placeholders) {
      out[key].placeholders = enEntry.placeholders;
    }
  }

  return out;
}

function copyFromEnglish(enMessages) {
  const out = {};
  for (const [key, enEntry] of Object.entries(enMessages)) {
    out[key] = structuredClone(enEntry);
  }
  return out;
}

const enMessages = JSON.parse(readFileSync(EN_PATH, "utf8"));
const targets = localeFilter
  ? { [localeFilter]: LAUNCH_LOCALES[localeFilter] }
  : LAUNCH_LOCALES;

if (localeFilter && !LAUNCH_LOCALES[localeFilter]) {
  console.error(`Unknown locale folder: ${localeFilter}`);
  process.exit(1);
}

console.log(
  copyEnOnly
    ? "Copying English messages to launch locales (--copy-en)"
    : "Translating launch locales via OpenAI",
);

for (const [locale, languageName] of Object.entries(targets)) {
  console.log(`\n${locale} (${languageName}):`);
  try {
    const messages = copyEnOnly
      ? copyFromEnglish(enMessages)
      : await translateWithOpenAI(enMessages, languageName);
    writeLocale(locale, messages);
  } catch (err) {
    console.error(`  failed: ${err.message}`);
    process.exitCode = 1;
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("\nDone. Run: npm run i18n:check");
