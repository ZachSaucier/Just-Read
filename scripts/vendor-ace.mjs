#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const aceRoot = dirname(require.resolve("ace-builds/package.json"));
const acePkg = require("ace-builds/package.json");
const ACE_SRC = join(aceRoot, "src-min-noconflict");
const TARGET = join(ROOT, "external-libraries", "ace");

const FILES = [
  "ace.js",
  "mode-css.js",
  "theme-crimson_editor.js",
  "theme-cloud_editor_dark.js",
  "worker-css.js",
];

rmSync(TARGET, { recursive: true, force: true });
mkdirSync(join(TARGET, "snippets"), { recursive: true });

for (const file of FILES) {
  cpSync(join(ACE_SRC, file), join(TARGET, file));
}

cpSync(join(ACE_SRC, "snippets", "css.js"), join(TARGET, "snippets", "css.js"));
writeFileSync(join(TARGET, "VERSION"), acePkg.version + "\n");

console.log(`Vendored ace-builds ${acePkg.version} to external-libraries/ace/`);
