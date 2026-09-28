import { requireViewer, isManager } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/auth/mode";
import { DB_INSTANCE_ID, isEphemeralDb, withService, withUser } from "@/lib/db";
import { getNavCounts } from "@/lib/queries";
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
  const user = { name: viewer.profile.full_name, role: viewer.profile.role, title: viewer.profile.title, orgName: viewer.organization.name };
  const demo = isDemoMode();
  const counts = await withUser(viewer.session.userId, (tx) => getNavCounts(tx, viewer.session.userId, isManager(viewer)));
  const personas = demo
    // One of each role (컨설턴트 3명) keeps the bar short; the current user is always included.
    ? await withService((tx) => tx<Persona[]>`
        select id, name, role, title from (
          select id, full_name as name, role, title,
            row_number() over (partition by role order by full_name) as rn
          from profiles where organization_id = ${viewer.profile.organization_id} and is_active
        ) p
        where rn <= case role when 'CONSULTANT' then 3 else 1 end or id = ${viewer.session.userId}
        order by case role when 'OWNER' then 0 when 'MANAGER' then 1 when 'CALLER' then 2 when 'LEADER' then 3 else 4 end, name
        limit 10`)
    : [];
  return (
    <ServerRenderProvider renderId={randomUUID()}>
    <DeviceViewProvider>
      <AppShell user={user} counts={counts} demo={demo} topBar={demo ? <DemoBar personas={personas} currentId={viewer.session.userId} ephemeral={isEphemeralDb()} instanceId={DB_INSTANCE_ID} /> : null}>
        {children}
      </AppShell>
    </DeviceViewProvider>
    </ServerRenderProvider>
  );
}
