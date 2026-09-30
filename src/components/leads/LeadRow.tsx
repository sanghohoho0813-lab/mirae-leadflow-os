import Link from "next/link";
import { ChevronRight, MapPin, Clock, User, Building2 } from "lucide-react";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { NEXT_ACTION_LABEL } from "@/lib/labels";
import { fmtShortDate, fmtTime, relativeDay, daysSince } from "@/lib/time";
import type { LeadListItem } from "@/lib/types";
import { QuickClaim } from "./LeadActions";
import { SampleTag } from "@/components/ui/SampleTag";

/** One lead as a large tappable card row (works in table-like lists and mobile). */
export function LeadRow({ lead, showAssignee = true, emphasizeTime = false, now = new Date() }: { lead: LeadListItem; showAssignee?: boolean; emphasizeTime?: boolean; now?: Date }) {
  const rel = relativeDay(lead.meeting_at, now);
  const overdueDays = lead.needs_report ? daysSince(lead.meeting_at, now) : 0;
  const isCancelled = lead.status === "CANCELLED";
  return (
    <Link prefetch={false}
      href={`/leads/${lead.id}`}
      className={`lift press group flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 ${lead.needs_report ? "border-danger/30" : "border-line"} ${isCancelled ? "opacity-60" : ""}`}
      data-testid={`lead-row-${lead.id}`}
    >
      <div className={`hidden w-[76px] shrink-0 flex-col items-center rounded-xl py-2 sm:flex ${rel.diff === 0 ? "bg-soft text-primary" : lead.needs_report ? "bg-danger-bg text-danger" : "bg-neutral-bg text-ink-2"}`}>
        <span className="text-[0.8125rem] font-semibold">{rel.label}</span>
        <span className="text-[1.1875rem] font-extrabold tabular-nums leading-tight">{fmtTime(lead.meeting_at)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {lead.is_sample && <SampleTag />}
          <span className="break-keep text-[1.125rem] font-bold leading-snug text-ink group-hover:text-primary">{lead.company_name}</span>
          <StatusBadge status={lead.status} needsReport={lead.needs_report} />
          {lead.division_name && <Badge tone="purple">{lead.division_name} DB</Badge>}
          {lead.meeting_round > 1 && <Badge tone="info">{lead.meeting_round}차 미팅</Badge>}
          {lead.needs_report && overdueDays >= 3 && <Badge tone="danger">{overdueDays}일 경과</Badge>}
          {lead.status === "FOLLOW_UP" && lead.pending_follow_up_action && (
            <Badge tone="purple">{NEXT_ACTION_LABEL[lead.pending_follow_up_action]} · {lead.pending_follow_up_date ? relativeDay(lead.pending_follow_up_date, now).label : ""}</Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.9375rem] text-ink-2">
          <span className={`inline-flex items-center gap-1 sm:hidden ${emphasizeTime ? "font-semibold text-ink" : ""}`}><Clock size={14} /> {fmtShortDate(lead.meeting_at)} {fmtTime(lead.meeting_at)}</span>
          <span className="hidden items-center gap-1 sm:inline-flex"><Clock size={14} /> {fmtShortDate(lead.meeting_at)}</span>
          <span className="inline-flex items-center gap-1"><MapPin size={14} /> {lead.region}</span>
          {lead.industry && <span className="inline-flex min-w-0 items-center gap-1"><Building2 size={14} /> <span className="truncate">{lead.industry}</span></span>}
          {showAssignee && lead.assignee_name && <span className="inline-flex items-center gap-1 font-medium text-ink"><User size={14} /> {lead.assignee_name}</span>}
        </div>
        {lead.public_summary && <p className="mt-1 truncate text-[0.9375rem] text-ink-3">{lead.public_summary}</p>}
      </div>
      <ChevronRight size={20} className="shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

/** `claimable`: consultants get a 신청 button right on each open DB. */
export function LeadList({ leads, emptyText, showAssignee, now, claimable = false }: { leads: LeadListItem[]; emptyText: string; showAssignee?: boolean; now?: Date; claimable?: boolean }) {
  if (leads.length === 0) return <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[1rem] text-ink-3">{emptyText}</p>;
  return (
    <div className="stagger grid gap-2">
      {leads.map((l) => claimable && l.status === "OPEN" ? (
        <div key={l.id} className="flex gap-2">
          <div className="min-w-0 flex-1"><LeadRow lead={l} showAssignee={showAssignee} now={now} /></div>
          <QuickClaim lead={{ id: l.id, company_name: l.company_name, region: l.region, meeting_at: l.meeting_at }} />
        </div>
      ) : <LeadRow key={l.id} lead={l} showAssignee={showAssignee} now={now} />)}
    </div>
  );
}
