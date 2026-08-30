import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** @returns {Record<string, string>} */
export function loadEnv() {
  const envPath = join(ROOT, ".env");
  const env = {};

  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (value != null && value !== "") env[key] ??= value;
  }

  return env;
}

export function getWeblateConfig() {
  const env = loadEnv();
  const token = env.WEBLATE_API_TOKEN || env.WEBLATE_API_KEY || "";
  if (!token) {
    throw new Error(
      "Missing WEBLATE_API_TOKEN (or WEBLATE_API_KEY) in .env or environment",
    );
  }

  return {
    apiUrl: (env.WEBLATE_API_URL || "https://hosted.weblate.org/api").replace(
      /\/$/,
      "",
    ),
    token,
    project: env.WEBLATE_PROJECT || "just-read",
    component: env.WEBLATE_COMPONENT || "extension",
  };
}

export function getOpenAiKey() {
  const env = loadEnv();
  return env.OPENAI_API_KEY || env.OPENAI_KEY || "";
}

export { ROOT };
