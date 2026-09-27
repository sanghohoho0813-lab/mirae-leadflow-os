import { notFound, redirect } from "next/navigation";
import { requireViewer, isManager } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { getLead, getLeadPrivate } from "@/lib/queries";
import { updateLead } from "@/lib/actions/leads";
import { LeadForm } from "@/components/leads/LeadForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const data = await withUser(viewer.session.userId, async (tx) => ({ lead: await getLead(tx, id), priv: await getLeadPrivate(tx, id) }));
  if (!data.lead) notFound();
  const editable = isManager(viewer) || (viewer.profile.role === "CALLER" && data.lead.created_by === viewer.session.userId);
  if (!editable || ["CLOSED", "CANCELLED"].includes(data.lead.status)) redirect(`/leads/${id}`);
  const action = updateLead.bind(null, id);
  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader back={`/leads/${id}`} backLabel="상세로" title={`정보 수정 — ${data.lead.company_name}`} sub="잘못 입력한 정보를 고칠 수 있습니다. 미팅 일시를 바꾸면 이력에 남습니다." />
      <LeadForm action={action} lead={data.lead} priv={data.priv} cancelHref={`/leads/${id}`} submitLabel="수정 저장" />
    </div>
  );
}
