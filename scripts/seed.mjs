// Local/QA seed. Creates one organization with users for every role and
// sample leads across every status (see src/lib/demo/seed.ts).
// Usage: node scripts/seed.mjs   (safe to re-run: wipes demo org data first)
import { sql, isLocal } from "./db.mjs";
import { seedDemo, ORG_ID } from "../src/lib/demo/seed.ts";

if (!isLocal && process.env.ALLOW_REMOTE_SEED !== "1") {
  console.error("Refusing to seed a non-local database. Set ALLOW_REMOTE_SEED=1 for a demo database.");
  process.exit(1);
}

const r = await sql.begin((tx) => seedDemo(tx));
console.log(`seeded: org ${ORG_ID}, ${r.users} users, ${r.leads} leads`);
await sql.end();
