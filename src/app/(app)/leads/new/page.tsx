import { redirect } from "next/navigation";
import { requireViewer, canCreateLead, isManager, isLeader } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listDivisions } from "@/lib/queries";
import { createLead } from "@/lib/actions/leads";
import { LeadForm } from "@/components/leads/LeadForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const viewer = await requireViewer();
  if (!canCreateLead(viewer)) redirect("/");
  const manager = isManager(viewer);
  const leader = isLeader(viewer);
  const divisions = manager ? (await withUser(viewer.session.userId, (tx) => listDivisions(tx))).filter((d) => d.claims_org_leads) : [];
  const sub = leader
    ? `${viewer.division?.name ?? "우리 본부"} 전용 DB로 등록됩니다. 단장·비서와 우리 본부 사람만 보고, 콜팀에게는 보이지 않습니다.`
    : manager ? "등록 후 공개하면 컨설턴트가 선착순으로 신청할 수 있습니다." : "등록하면 사업단장이 확인 후 컨설턴트에게 공개합니다.";
  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader back="/leads" backLabel="DB 목록" title={leader ? "본부 DB 등록" : "신규 DB 등록"} sub={sub} />
      <LeadForm action={createLead} canPublishNow={manager || leader} cancelHref="/leads" submitLabel="DB 등록하기"
        scopeOptions={manager ? divisions.map((d) => ({ id: d.id, name: d.name })) : undefined}
        fixedScope={leader ? viewer.division?.name ?? null : null} />
    </div>
  );
}
