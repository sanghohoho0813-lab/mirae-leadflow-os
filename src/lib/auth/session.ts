import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { withUser } from "@/lib/db";
import type { Organization, Profile } from "@/lib/types";
import { isDemoMode, LOCAL_COOKIE, verifyLocalSession } from "./local";
import { ensureDemoReady } from "@/lib/demo/setup";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export interface Session {
  userId: string;
  email: string | null;
}

export const getSession = cache(async (): Promise<Session | null> => {
  if (isDemoMode()) {
    const store = await cookies();
    const userId = verifyLocalSession(store.get(LOCAL_COOKIE)?.value);
    return userId ? { userId, email: null } : null;
  }
  if (!hasSupabaseEnv()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? null };
});

export interface Viewer {
  session: Session;
  profile: Profile;
  organization: Organization;
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getSession();
  if (!session) return null;
  if (isDemoMode()) await ensureDemoReady();
  const result = await withUser(session.userId, async (tx) => {
    const [profile] = await tx<Profile[]>`select * from profiles where id = ${session.userId}`;
    if (!profile) return null;
    const [organization] = await tx<Organization[]>`select id, name, invite_code, claim_limit from organizations where id = ${profile.organization_id}`;
    return { profile, organization };
  });
  if (!result) return null;
  return { session, ...result };
});

/** Redirects to /login (no session) or /onboarding (no profile yet). */
export async function requireViewer(): Promise<Viewer> {
  const session = await getSession();
  if (!session) redirect("/login");
  const viewer = await getViewer();
  if (!viewer) redirect("/onboarding");
  return viewer;
}

export function isManager(v: Viewer) {
  return v.profile.role === "OWNER" || v.profile.role === "MANAGER";
}
export function canCreateLead(v: Viewer) {
  return isManager(v) || v.profile.role === "CALLER";
}
export function canClaim(v: Viewer) {
  return v.profile.role === "CONSULTANT" || v.profile.role === "LEADER";
}
export function canTeach(v: Viewer) {
  return isManager(v) || v.profile.role === "LEADER";
}
