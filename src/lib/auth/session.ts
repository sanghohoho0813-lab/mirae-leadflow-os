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
  /** 본부 (null = 단장·비서·콜팀 or not placed yet). */
  division: { id: string; name: string; claims_org_leads: boolean } | null;
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getSession();
  if (!session) return null;
  if (isDemoMode()) await ensureDemoReady();
  const result = await withUser(session.userId, async (tx) => {
    const [profile] = await tx<Profile[]>`select * from profiles where id = ${session.userId}`;
    if (!profile) return null;
    const [organization] = await tx<Organization[]>`select id, name, invite_code, claim_limit from organizations where id = ${profile.organization_id}`;
    const [division] = profile.division_id
      ? await tx<{ id: string; name: string; claims_org_leads: boolean }[]>`select id, name, claims_org_leads from divisions where id = ${profile.division_id}`
      : [];
    return { profile, organization, division: division ?? null };
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
  return isManager(v) || v.profile.role === "CALLER" || (v.profile.role === "LEADER" && Boolean(v.profile.division_id));
}
/** 본부장 of a 본부: runs that 본부's DBs and people. */
export function isLeader(v: Viewer) {
  return v.profile.role === "LEADER" && Boolean(v.profile.division_id);
}
/** May run this DB (publish, assign, report for it). Mirrors lf_can_manage() in the database. */
export function canManageLead(v: Viewer, lead: { division_id: string | null }) {
  return isManager(v) || (isLeader(v) && lead.division_id === v.profile.division_id);
}
/** 광주 상무본부 etc.: education only, no shared Seoul/Gyeonggi DBs. */
export function usesDb(v: Viewer) {
  if (v.profile.role === "CONSULTANT" || v.profile.role === "LEADER") return v.division?.claims_org_leads ?? true;
  return true;
}
export function canClaim(v: Viewer) {
  return v.profile.role === "CONSULTANT" || v.profile.role === "LEADER";
}
export function canTeach(v: Viewer) {
  return isManager(v) || v.profile.role === "LEADER";
}
