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
  const personas = demo
    // One of each role (컨설턴트 3명) keeps the bar short; the current user is always included.
    ? await withService((tx) => tx<Persona[]>`
        select id, name, role, title from (
          select id, full_name as name, role, title, division,
            -- one 컨설턴트 per 본부 (plain 컨설턴트 first), both 본부장, 단장·비서·콜팀
            row_number() over (partition by role, case when role = 'CONSULTANT' then division end order by title nulls first, full_name) as rn
          from profiles where organization_id = ${viewer.profile.organization_id} and is_active
        ) p
        where rn <= case role when 'LEADER' then 2 else 1 end or id = ${viewer.session.userId}
        order by case role when 'OWNER' then 0 when 'MANAGER' then 1 when 'CALLER' then 2 when 'LEADER' then 3 else 4 end, (select sort from divisions d where d.name = p.division) nulls last, name
        limit 12`)
    : [];
  return (
    <ServerRenderProvider renderId={randomUUID()}>
    <DeviceViewProvider>
      <AppShell user={user} counts={counts} trainingDays={trainingDays} demo={demo} topBar={demo ? <DemoBar personas={personas} currentId={viewer.session.userId} ephemeral={isEphemeralDb()} instanceId={DB_INSTANCE_ID} /> : null}>
        {children}
      </AppShell>
    </DeviceViewProvider>
    </ServerRenderProvider>
  );
}
