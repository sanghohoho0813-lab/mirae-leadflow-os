/**
 * Demo mode = no passwords; anyone opening the site picks a persona.
 * On when AUTH_MODE=demo (or legacy "local"), or when AUTH_MODE is unset and
 * Supabase Auth is not configured. Set AUTH_MODE=supabase for real use.
 * Kept free of Node-only imports so middleware (edge runtime) can use it.
 */
export function isDemoMode(): boolean {
  const mode = process.env.AUTH_MODE;
  if (mode === "demo" || mode === "local") return true;
  if (mode === "supabase") return false;
  return !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export const DEMO_COOKIE = "lf_local_session";
