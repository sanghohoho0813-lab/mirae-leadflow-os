import { requireViewer, isManager, isLeader, usesDb } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/auth/mode";
import { DB_INSTANCE_ID, isEphemeralDb, withService, withUser } from "@/lib/db";
import { getNavCounts } from "@/lib/queries";
import { listTrainingDays } from "@/lib/trainings";
import { AppShell } from "@/components/layout/AppShell";
import { DeviceViewProvider } from "@/components/layout/DeviceView";
import { DemoBar, type Persona } from "@/components/layout/DemoBar";
import { ServerRenderProvider } from "@/components/providers/SafeActions";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
// A cold start on the temporary DB can take ~15s; don't let the platform cut it off.
export const maxDuration = 60;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const user = { name: viewer.profile.full_name, role: viewer.profile.role, title: viewer.profile.title, division: viewer.profile.division, orgName: viewer.organization.name, leader: isLeader(viewer), usesDb: usesDb(viewer) };
  const demo = isDemoMode();
  const [counts, trainingDays] = await withUser(viewer.session.userId, (tx) => Promise.all([getNavCounts(tx, viewer.session.userId, isManager(viewer)), listTrainingDays(tx)]));
  // 체험 도구: everyone in the 사업단 (사용자 변경하기) + how many DBs exist (샘플 DB 추가·삭제).
  const [people, leadCount] = demo
    ? await withService((tx) => Promise.all([
        tx<Persona[]>`select id, full_name as name, role, title, division from profiles
          where organization_id = ${viewer.profile.organization_id} and is_active order by full_name`,
        tx<{ n: number }[]>`select count(*)::int as n from leads where organization_id = ${viewer.profile.organization_id}`.then((r) => r[0].n),
      ]))
    : [[], 0];
  const tools = demo ? { people, currentId: viewer.session.userId, leadCount, ephemeral: isEphemeralDb() } : undefined;
  return (
    <ServerRenderProvider renderId={randomUUID()}>
    <DeviceViewProvider>
      <AppShell user={user} counts={counts} trainingDays={trainingDays} demo={demo} tools={tools} topBar={tools ? <DemoBar tools={tools} instanceId={DB_INSTANCE_ID} /> : null}>
        {children}
      </AppShell>
    </DeviceViewProvider>
    </ServerRenderProvider>
  );
}
