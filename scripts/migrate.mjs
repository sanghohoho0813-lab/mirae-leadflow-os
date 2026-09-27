// Applies supabase/migrations/*.sql in order. On a local Postgres (no `auth`
// schema) it first applies supabase/local/*.sql to emulate Supabase roles.
// Usage: node scripts/migrate.mjs [--reset]
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

for (const f of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const url = process.env.DATABASE_URL || "postgres://postgres@localhost:5432/leadflow";
const reset = process.argv.includes("--reset");
const dbName = new URL(url).pathname.slice(1);
const isLocal = /localhost|127\.0\.0\.1/.test(url);

if (isLocal) {
  const admin = postgres(url.replace(`/${dbName}`, "/postgres"), { onnotice: () => {} });
  if (reset) await admin.unsafe(`drop database if exists "${dbName}" with (force)`);
  const exists = await admin`select 1 from pg_database where datname = ${dbName}`;
  if (exists.length === 0) await admin.unsafe(`create database "${dbName}"`);
  await admin.end();
} else if (reset) {
  console.error("--reset is only allowed against a local database.");
  process.exit(1);
}

const sql = postgres(url, { onnotice: () => {} });
await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`;

const hasAuth = await sql`select 1 from pg_namespace where nspname = 'auth'`;
const dirs = [];
if (hasAuth.length === 0) dirs.push("supabase/local");
dirs.push("supabase/migrations");

for (const dir of dirs) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const name = `${dir}/${file}`;
    const done = await sql`select 1 from _migrations where name = ${name}`;
    if (done.length) continue;
    const body = fs.readFileSync(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into _migrations(name) values (${name})`;
    });
    console.log(`applied ${name}`);
  }
}
await sql.end();
console.log("migrations up to date");
