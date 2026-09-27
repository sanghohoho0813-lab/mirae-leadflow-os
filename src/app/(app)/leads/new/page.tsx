import { redirect } from "next/navigation";
import { requireViewer, canCreateLead, isManager } from "@/lib/auth/session";
import { createLead } from "@/lib/actions/leads";
import { LeadForm } from "@/components/leads/LeadForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const viewer = await requireViewer();
  if (!canCreateLead(viewer)) redirect("/");
  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader back="/leads" backLabel="DB 목록" title="신규 DB 등록" sub={isManager(viewer) ? "등록 후 공개하면 컨설턴트가 선착순으로 신청할 수 있습니다." : "등록하면 사업단장이 확인 후 컨설턴트에게 공개합니다."} />
      <LeadForm action={createLead} canPublishNow={isManager(viewer)} cancelHref="/leads" submitLabel="DB 등록하기" />
    </div>
  );
}
