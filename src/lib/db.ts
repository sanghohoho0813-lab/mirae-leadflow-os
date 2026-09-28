import postgres, { type Sql, type TransactionSql } from "postgres";

import { isDemoMode } from "@/lib/auth/mode";

declare global {
  // eslint-disable-next-line no-var
  var __lf_sql: Promise<Sql> | undefined;
}

/** True when running demo mode on an in-process database (no DATABASE_URL). */
export function isEphemeralDb(): boolean {
  return !process.env.DATABASE_URL && isDemoMode();
}

/** Random id of this server process; shows which instance served a page. */
export const DB_INSTANCE_ID = Math.random().toString(36).slice(2, 8);

async function create(): Promise<Sql> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return postgres(url, {
      max: 10,
      prepare: false, // Supabase transaction pooler does not support prepared statements
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {},
    });
  }
  if (!isDemoMode()) throw new Error("DATABASE_URL is not set");
  // Demo mode with no database configured: a throwaway in-memory Postgres
  // (PGlite) served over a local socket so the rest of the app is unchanged.
  // Data lives only as long as this server process.
  const port = await startEmbeddedPostgres();
  return postgres({ host: "127.0.0.1", port, user: "postgres", database: "postgres", max: 1, prepare: false, idle_timeout: 0, onnotice: () => {} });
}

async function startEmbeddedPostgres(): Promise<number> {
  const [{ PGlite }, { pgcrypto }, { PGLiteSocketServer }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite/contrib/pgcrypto"),
    import("@electric-sql/pglite-socket"),
  ]);
  // Built at `npm run build` (scripts/pglite-snapshot.mjs): schema already applied,
  // so a cold start skips initdb. Falls back to a fresh database if it is missing.
  let loadDataDir: Blob | undefined;
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    loadDataDir = new Blob([new Uint8Array(await readFile(join(process.cwd(), ".pglite", "snapshot.tgz")))]);
  } catch {}
  let pg;
  try {
    pg = await PGlite.create({ extensions: { pgcrypto }, loadDataDir });
  } catch (e) {
    if (!loadDataDir) throw e;
    console.warn("[db] snapshot unusable, creating a fresh database", e);
    pg = await PGlite.create({ extensions: { pgcrypto } });
  }
  for (let port = 54329 + Math.floor(Math.random() * 500), tries = 0; ; port++, tries++) {
    try {
      await new PGLiteSocketServer({ db: pg, port, host: "127.0.0.1" }).start();
      return port;
    } catch (e) {
      if (tries >= 20) throw e;
    }
  }
}

// Created on first query, not at import: `next build` loads route modules
// before runtime env vars exist (e.g. on Vercel).
function db(): Promise<Sql> {
  if (!globalThis.__lf_sql) {
    globalThis.__lf_sql = create().catch((e) => { globalThis.__lf_sql = undefined; throw e; });
  }
  return globalThis.__lf_sql;
}

export type Tx = TransactionSql;

/**
 * Runs `fn` inside a transaction that impersonates a Supabase `authenticated`
 * user, so every row-level-security policy applies exactly as it would through
 * PostgREST. This is the ONLY way application code touches business tables.
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("invalid user id");
  return (await db()).begin(async (tx) => {
    await tx.unsafe("set local role authenticated");
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

/** Privileged access (no RLS). Used only for auth bookkeeping in local mode. */
export async function withService<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await db()).begin(async (tx) => fn(tx)) as Promise<T>;
}

export class DbActionError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** Maps a Postgres RAISE EXCEPTION 'CODE' into a DbActionError('CODE'). */
export function toActionError(e: unknown): DbActionError {
  const msg = e instanceof Error ? e.message : String(e);
  const code = msg.match(/^([A-Z_]+)$/)?.[1] ?? msg.match(/^([A-Z_]{4,})/)?.[1] ?? "UNKNOWN";
  return new DbActionError(code);
}
