// Build step: prepares the built-in temporary database once, at build time, and
// saves it as a snapshot that ships with the app. A cold server then loads the
// snapshot (~0.7s) instead of creating a database from scratch (~3-5s).
// Demo data is still seeded at start-up (its dates are relative to "today").
// Never fails the build: without a snapshot the app simply starts the slow way.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(".pglite/snapshot.tgz");
try {
  const t0 = Date.now();
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto");
  const pg = await PGlite.create({ extensions: { pgcrypto } });
  // Same names as src/lib/demo/setup.ts so the app sees them as already applied.
  const files = [
    "supabase/local/0000_supabase_shim.sql",
    ...fs.readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort().map((f) => `supabase/migrations/${f}`),
  ];
  await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
  for (const f of files) {
    await pg.exec(fs.readFileSync(f, "utf8"));
    await pg.query("insert into _migrations(name) values ($1)", [f]);
  }
  const blob = await pg.dumpDataDir("gzip");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(await blob.arrayBuffer()));
  await pg.close();
  console.log(`[pglite-snapshot] ${files.length} files -> ${path.relative(process.cwd(), OUT)} (${Math.round(blob.size / 1024)}KB, ${Date.now() - t0}ms)`);
} catch (e) {
  console.warn("[pglite-snapshot] skipped:", e instanceof Error ? e.message : e);
  try { fs.rmSync(OUT, { force: true }); } catch {}
}
process.exit(0);
