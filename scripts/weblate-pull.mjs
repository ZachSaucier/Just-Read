#!/usr/bin/env node
import { createWeblateClient } from "./lib/weblate-client.mjs";

try {
  const client = createWeblateClient();
  const { project, component } = client.config;
  const result = await client.post(
    `/components/${project}/${component}/repository/`,
    { operation: "pull" },
  );
  console.log(`Weblate pull triggered for ${project}/${component}`);
  if (result?.result) console.log(`  result: ${result.result}`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
