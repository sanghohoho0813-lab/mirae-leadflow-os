import Link from "next/link";
import { ACTION_LABEL, NEXT_ACTION_LABEL, OUTCOME_LABEL, STATUS_LABEL } from "@/lib/labels";
import { fmtDateTime, fmtRelativeTime } from "@/lib/time";
import type { ActivityLog, LeadStatus, NextAction, MeetingOutcome } from "@/lib/types";

const DOT: Record<string, string> = {
  CREATE: "bg-info", PUBLISH: "bg-warning", CLAIM: "bg-success", ASSIGN: "bg-success", REASSIGN: "bg-success",
  RELEASE: "bg-danger", CANCEL_CLAIM: "bg-danger", CANCEL_LEAD: "bg-danger", REPORT: "bg-purple", FOLLOW_UP_DONE: "bg-purple",
  RESCHEDULE: "bg-warning", UPDATE: "bg-neutral", UNPUBLISH: "bg-neutral",
};

function describe(log: ActivityLog): string {
  const d = log.detail ?? {};
  switch (log.action) {
    case "RESCHEDULE": return d.to ? `→ ${fmtDateTime(String(d.to))}${d.reason ? ` (${d.reason})` : ""}` : "";
    case "REPORT": return [d.outcome ? OUTCOME_LABEL[d.outcome as MeetingOutcome] : null, d.next_action && d.next_action !== "NONE" ? `다음: ${NEXT_ACTION_LABEL[d.next_action as NextAction]}` : null].filter(Boolean).join(" · ");
    case "FOLLOW_UP_DONE": return [d.action ? `${NEXT_ACTION_LABEL[d.action as NextAction]} 완료` : null, d.next_action && d.next_action !== "NONE" ? `다음: ${NEXT_ACTION_LABEL[d.next_action as NextAction]}` : null].filter(Boolean).join(" · ");
    case "RELEASE": case "CANCEL_CLAIM": case "CANCEL_LEAD": case "REASSIGN": return d.reason ? String(d.reason) : "";
    default: return "";
  }
}

export function ActivityTimeline({ logs, showCompany }: { logs: ActivityLog[]; showCompany?: boolean }) {
  if (logs.length === 0) return <p className="text-[0.9375rem] text-ink-3">아직 이력이 없습니다.</p>;
  return (
    <ol className="relative grid gap-3 border-l-2 border-line pl-4" data-testid="activity-timeline">
      {logs.map((log) => (
        <li key={log.id} className="relative">
          <span className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${DOT[log.action] ?? "bg-neutral"}`} />
          <div className="flex flex-wrap items-baseline gap-x-2 text-[0.9688rem]">
            <b className="text-ink">{ACTION_LABEL[log.action] ?? log.action}</b>
            {showCompany && log.company_name && <Link prefetch={false} href={`/leads/${log.lead_id}`} className="font-semibold text-primary hover:underline">{log.company_name}</Link>}
            {log.to_status && log.from_status !== log.to_status && <span className="text-ink-2">{log.from_status ? `${STATUS_LABEL[log.from_status as LeadStatus]} → ` : ""}{STATUS_LABEL[log.to_status as LeadStatus]}</span>}
          </div>
          {describe(log) && <div className="text-[0.9062rem] text-ink-2">{describe(log)}</div>}
          <div className="text-[0.8438rem] text-ink-3">{log.actor_name ?? "시스템"} · <time title={fmtDateTime(log.created_at)}>{fmtRelativeTime(log.created_at)}</time></div>
        </li>
      ))}
    </ol>
  );
}
