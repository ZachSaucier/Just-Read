#!/usr/bin/env node
import { createWeblateClient } from "./lib/weblate-client.mjs";

try {
  const client = createWeblateClient();
  const { project, component } = client.config;
  const response = await client.get(
    `/components/${project}/${component}/statistics/`,
  );
  const stats = Array.isArray(response) ? response : response.results || [];

  console.log(`Component: ${project}/${component}\n`);
  if (stats.length === 0) {
    console.log("No translation statistics returned.");
    process.exit(0);
  }

  for (const row of stats) {
    const code = row.code || row.language?.code || "?";
    const name = row.name || row.language?.name || code;
    const translated = row.translated_percent ?? row.translated ?? "?";
    const fuzzy = row.fuzzy_percent ?? row.fuzzy ?? "?";
    const failing = row.failing_percent ?? row.failing ?? "?";
    const untranslated = row.total - row.translated;
    console.log(
      `${code.padEnd(8)} ${String(name).padEnd(24)} translated=${translated}%  fuzzy=${fuzzy}%  failing=${failing}%  untranslated=${untranslated}`,
    );
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
