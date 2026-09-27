import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

for (const f of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

export const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres@localhost:5432/leadflow";
export const sql = postgres(DATABASE_URL, { max: 20, onnotice: () => {} });
export const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);

// Runs `fn` inside a transaction that impersonates a Supabase authenticated
// user, exactly like the app's data layer does.
export async function asUser(userId, fn) {
  return sql.begin(async (tx) => {
    await tx.unsafe(`set local role authenticated`);
    await tx.unsafe(`select set_config('request.jwt.claims', '${JSON.stringify({ sub: userId, role: "authenticated" })}', true)`);
    return fn(tx);
  });
}
