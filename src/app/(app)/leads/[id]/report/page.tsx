import { notFound, redirect } from "next/navigation";
import { requireViewer, isManager } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { getLead, getLeadPrivate } from "@/lib/queries";
import { ReportForm } from "@/components/leads/ReportForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { fmtDateTime } from "@/lib/time";
import { StatusBadge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const data = await withUser(viewer.session.userId, async (tx) => ({ lead: await getLead(tx, id), priv: await getLeadPrivate(tx, id) }));
  if (!data.lead) notFound();
  const lead = data.lead;
  const allowed = (isManager(viewer) || lead.assigned_to === viewer.session.userId) && ["ASSIGNED", "FOLLOW_UP"].includes(lead.status) && lead.assigned_to;
  if (!allowed) redirect(`/leads/${id}`);
  return (
    <div className="fade-up mx-auto max-w-2xl">
      <PageHeader
        back={`/leads/${id}`}
        backLabel="상세로"
        eyebrow={<StatusBadge status={lead.status} needsReport={lead.needs_report} />}
        title={`${lead.company_name} 미팅 결과`}
        sub={`${fmtDateTime(lead.meeting_at)} · ${lead.region}${data.priv?.contact_name ? ` · ${data.priv.contact_name} ${data.priv.contact_title ?? ""}` : ""}`}
      />
      <ReportForm leadId={id} companyName={lead.company_name} isFollowUp={lead.status === "FOLLOW_UP"} interest={data.priv?.interest_tags ?? []} />
    </div>
  );
}
