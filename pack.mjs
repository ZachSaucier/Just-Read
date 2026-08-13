#!/usr/bin/env node
/**
 * Builds browser-specific extension packages from the shared manifest.json.
 *
 * Usage: node pack.mjs
 *
 * Outputs:
 *   dist/webkit/  – Chromium / Safari (service_worker)
 *   dist/gecko/   – Firefox (scripts + browser_specific_settings)
 *   dist/just-read-webkit-vX.Y.Z.zip
 *   dist/just-read-gecko-vX.Y.Z.zip
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");

const GECKO_ID = "{cb2b337b-99d7-4b86-aa04-84a6f5c3e218}";

/** Top-level paths that ship with the extension. */
const INCLUDE = [
  "background.js",
  "content",
  "shared",
  "messager.js",
  "options.html",
  "options",
  "options.css",
  "required-styles.css",
  "default-styles.css",
  "dark-styles.css",
  "hide-segments.css",
  "page.css",
  "icons",
  "external-libraries",
  "fonts",
];

function buildWebkitManifest(base) {
  return {
    ...base,
    background: {
      service_worker: "background.js",
    },
  };
}

function buildGeckoManifest(base) {
  return {
    ...base,
    background: {
      scripts: ["background.js"],
    },
    browser_specific_settings: {
      gecko: {
        id: GECKO_ID,
        strict_min_version: "115.0",
      },
    },
  };
}

function copyExtensionFiles(targetDir) {
  for (const name of INCLUDE) {
    const src = join(ROOT, name);
    if (!existsSync(src)) continue;
    cpSync(src, join(targetDir, name), { recursive: true });
  }
}

function writePackage(target, manifest) {
  const outDir = join(DIST, target);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  writeFileSync(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  copyExtensionFiles(outDir);

  const zipName = `just-read-${target}-v${manifest.version}.zip`;
  const zipPath = join(DIST, zipName);
  if (existsSync(zipPath)) rmSync(zipPath);

  // Zip from inside the package dir so paths are at the archive root.
  execFileSync("zip", ["-r", "-q", zipPath, "."], { cwd: outDir });

  console.log(`✓ ${target}: ${relative(ROOT, outDir)} + ${relative(ROOT, zipPath)}`);
}

const base = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));

mkdirSync(DIST, { recursive: true });

writePackage("webkit", buildWebkitManifest(base));
writePackage("gecko", buildGeckoManifest(base));

console.log("Done.");
