import { requireViewer } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/auth/mode";
import { withService } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { DeviceViewProvider } from "@/components/layout/DeviceView";
import { DemoBar, type Persona } from "@/components/layout/DemoBar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const user = { name: viewer.profile.full_name, role: viewer.profile.role, orgName: viewer.organization.name };
  const demo = isDemoMode();
  const personas = demo
    ? await withService((tx) => tx<Persona[]>`
        select id, full_name as name, role from profiles
        where organization_id = ${viewer.profile.organization_id} and is_active
        order by case role when 'OWNER' then 0 when 'MANAGER' then 1 when 'CALLER' then 2 when 'CONSULTANT' then 3 else 4 end, created_at, full_name
        limit 10`)
    : [];
  return (
    <DeviceViewProvider>
      <AppShell user={user} demo={demo} topBar={demo ? <DemoBar personas={personas} currentId={viewer.session.userId} /> : null}>
        {children}
      </AppShell>
    </DeviceViewProvider>
  );
}
