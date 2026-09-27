import { redirect } from "next/navigation";
import { requireViewer, isManager } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listOrgLogs } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { Card, CardBody } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const viewer = await requireViewer();
  if (!isManager(viewer)) redirect("/");
  const logs = await withUser(viewer.session.userId, (tx) => listOrgLogs(tx, 150));
  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader title="전체 이력" sub="누가 언제 무엇을 했는지 최근 150건입니다. 회사명을 누르면 상세로 이동합니다." />
      <Card><CardBody className="pt-5"><ActivityTimeline logs={logs} showCompany /></CardBody></Card>
    </div>
  );
}
