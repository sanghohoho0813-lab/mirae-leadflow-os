import { withService } from "@/lib/db";
import { ORG_ID, seedDemo } from "./seed";
import shimSql from "../../../supabase/local/0000_supabase_shim.sql";
import initSql from "../../../supabase/migrations/0001_init.sql";
import addressSql from "../../../supabase/migrations/0002_lead_address.sql";
import trainingSql from "../../../supabase/migrations/0003_training_and_limits.sql";

// Bundled as strings (webpack asset/source) so they exist on Vercel.
// Names match scripts/migrate.mjs so both record into the same _migrations table.
// Add new migration files here as well as in supabase/migrations/.
const SHIM = { name: "supabase/local/0000_supabase_shim.sql", sql: shimSql };
const MIGRATIONS = [
  { name: "supabase/migrations/0001_init.sql", sql: initSql },
  { name: "supabase/migrations/0002_lead_address.sql", sql: addressSql },
  { name: "supabase/migrations/0003_training_and_limits.sql", sql: trainingSql },
];

// Same check as the shim, re-run on every start so a DB set up by an older
// shim (without the PG16 SET grant) repairs itself.
const ENSURE_SET_ROLE = `do $$ begin
  if current_setting('server_version_num')::int >= 160000 then
    if not pg_has_role(current_user, 'authenticated', 'SET') then
      execute format('grant authenticated to %I with set true', current_user);
    end if;
  elsif not pg_has_role(current_user, 'authenticated', 'MEMBER') then
    execute format('grant authenticated to %I', current_user);
  end if;
end $$;`;

let ready: Promise<void> | null = null;

/**
 * Demo mode only: on first use, creates the schema and demo data in whatever
 * empty Postgres DATABASE_URL points to. Cheap after the first call per process.
 */
export function ensureDemoReady(): Promise<void> {
  if (!ready) ready = prepare().catch((e) => { ready = null; throw e; });
  return ready;
}

async function prepare() {
  await withService(async (tx) => {
    await tx`select pg_advisory_xact_lock(727001)`;
    await tx`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`;
    const [{ has_auth }] = await tx<{ has_auth: boolean }[]>`select exists(select 1 from pg_namespace where nspname = 'auth') as has_auth`;
    const files = has_auth ? MIGRATIONS : [SHIM, ...MIGRATIONS];
    for (const f of files) {
      const done = await tx`select 1 from _migrations where name = ${f.name}`;
      if (done.length) continue;
      await tx.unsafe(f.sql);
      await tx`insert into _migrations(name) values (${f.name})`;
    }
    await tx.unsafe(ENSURE_SET_ROLE);
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from organizations where id = ${ORG_ID}`;
    if (n === 0) await seedDemo(tx);
  });
}

/** Restores all demo data (dates re-anchored to today). */
export async function resetDemoData(): Promise<void> {
  await ensureDemoReady();
  await withService(async (tx) => {
    await tx`select pg_advisory_xact_lock(727001)`;
    await seedDemo(tx);
  });
}
