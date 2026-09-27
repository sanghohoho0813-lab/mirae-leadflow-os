import postgres, { type Sql, type TransactionSql } from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __lf_sql: Sql | undefined;
}

function create(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    max: 10,
    prepare: false, // Supabase transaction pooler does not support prepared statements
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
}

// Created on first query, not at import: `next build` loads route modules
// before runtime env vars exist (e.g. on Vercel).
function db(): Sql {
  return globalThis.__lf_sql ?? (globalThis.__lf_sql = create());
}

export type Tx = TransactionSql;

/**
 * Runs `fn` inside a transaction that impersonates a Supabase `authenticated`
 * user, so every row-level-security policy applies exactly as it would through
 * PostgREST. This is the ONLY way application code touches business tables.
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("invalid user id");
  return db().begin(async (tx) => {
    await tx.unsafe("set local role authenticated");
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

/** Privileged access (no RLS). Used only for auth bookkeeping in local mode. */
export async function withService<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db().begin(async (tx) => fn(tx)) as Promise<T>;
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
