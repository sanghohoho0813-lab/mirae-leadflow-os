import { requireViewer } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { DeviceViewProvider } from "@/components/layout/DeviceView";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const user = { name: viewer.profile.full_name, role: viewer.profile.role, orgName: viewer.organization.name };
  return (
    <DeviceViewProvider>
      <AppShell user={user}>{children}</AppShell>
    </DeviceViewProvider>
  );
}
