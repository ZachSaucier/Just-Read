#!/usr/bin/env node
import { createWeblateClient } from "./lib/weblate-client.mjs";

try {
  const client = createWeblateClient();
  const data = await client.get("/");
  const user = data?.user?.full_name || data?.user?.username || "unknown";
  console.log(`Weblate API OK — authenticated as ${user}`);
  console.log(`  URL: ${client.config.apiUrl}`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
