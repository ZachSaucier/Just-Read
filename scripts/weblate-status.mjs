#!/usr/bin/env node
import { createWeblateClient } from "./lib/weblate-client.mjs";

try {
  const client = createWeblateClient();
  const { project, component } = client.config;
  const stats = await client.get(
    `/components/${project}/${component}/statistics/`,
  );

  console.log(`Component: ${project}/${component}\n`);
  if (!Array.isArray(stats) || stats.length === 0) {
    console.log("No translation statistics returned.");
    process.exit(0);
  }

  for (const row of stats) {
    const code = row.code || row.language?.code || "?";
    const name = row.name || row.language?.name || code;
    const translated = row.translated ?? row.translated_percent ?? "?";
    const fuzzy = row.fuzzy ?? "?";
    const untranslated = row.untranslated ?? "?";
    console.log(
      `${code.padEnd(8)} ${String(name).padEnd(24)} translated=${translated}  fuzzy=${fuzzy}  untranslated=${untranslated}`,
    );
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
