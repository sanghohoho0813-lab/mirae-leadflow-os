import type { Tx } from "@/lib/db";
import type { ActivityLog, Assignment, FollowUp, Lead, LeadListItem, LeadPrivateDetails, MeetingReport, Profile } from "@/lib/types";

export type LeadTab = "open" | "mine" | "today" | "needs_report" | "draft" | "follow_up" | "all" | "closed";

const LIST_SELECT = `
  select l.*, a.full_name as assignee_name, c.full_name as creator_name,
    (l.status = 'ASSIGNED' and l.meeting_at < now()) as needs_report,
    fu.due_date::text as pending_follow_up_date, fu.action as pending_follow_up_action
  from leads l
  left join profiles a on a.id = l.assigned_to
  left join profiles c on c.id = l.created_by
  left join lateral (
    select due_date, action from follow_ups f where f.lead_id = l.id and f.status = 'PENDING' order by due_date asc limit 1
  ) fu on true`;

function kstToday(tx: Tx) {
  return tx`(now() at time zone 'Asia/Seoul')::date`;
}

export async function listLeads(tx: Tx, opts: { tab: LeadTab; userId: string; q?: string; limit?: number }): Promise<LeadListItem[]> {
  const { tab, userId, q, limit = 200 } = opts;
  const search = q?.trim() ? `%${q.trim()}%` : null;
  const where: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

  switch (tab) {
    case "open": where.push(`l.status = 'OPEN'`); break;
    case "mine": where.push(`l.assigned_to = ${p(userId)} and l.status in ('ASSIGNED','FOLLOW_UP')`); break;
    case "today": where.push(`(l.meeting_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date and l.status in ('ASSIGNED','FOLLOW_UP','OPEN')`); break;
    case "needs_report": where.push(`l.status = 'ASSIGNED' and l.meeting_at < now()`); break;
    case "draft": where.push(`l.status = 'DRAFT'`); break;
    case "follow_up": where.push(`l.status = 'FOLLOW_UP'`); break;
    case "closed": where.push(`l.status in ('CLOSED','CANCELLED')`); break;
    case "all": where.push(`l.status <> 'CANCELLED'`); break;
  }
  if (search) where.push(`(l.company_name ilike ${p(search)} or l.region ilike ${p(search)} or coalesce(l.industry,'') ilike ${p(search)} or coalesce(a.full_name,'') ilike ${p(search)})`);

  const order = tab === "needs_report" ? "l.meeting_at asc" : tab === "closed" || tab === "all" ? "l.meeting_at desc" : "l.meeting_at asc";
  const rows = await tx.unsafe(`${LIST_SELECT} where ${where.join(" and ")} order by ${order} limit ${limit}`, params as never[]);
  return rows as unknown as LeadListItem[];
}

export async function getLead(tx: Tx, id: string): Promise<LeadListItem | null> {
  const rows = await tx.unsafe(`${LIST_SELECT} where l.id = $1`, [id]);
  return (rows[0] as unknown as LeadListItem) ?? null;
}

export async function getLeadPrivate(tx: Tx, id: string): Promise<LeadPrivateDetails | null> {
  const [row] = await tx<LeadPrivateDetails[]>`select * from lead_private_details where lead_id = ${id}`;
  return row ?? null;
}

export async function getLeadReports(tx: Tx, id: string): Promise<MeetingReport[]> {
  return tx<MeetingReport[]>`
    select r.*, r.next_action_date::text as next_action_date, p.full_name as reporter_name
    from meeting_reports r join profiles p on p.id = r.reporter_id
    where r.lead_id = ${id} order by r.created_at desc`;
}

export async function getLeadFollowUps(tx: Tx, id: string): Promise<FollowUp[]> {
  return tx<FollowUp[]>`
    select f.*, f.due_date::text as due_date, p.full_name as assignee_name
    from follow_ups f join profiles p on p.id = f.assignee_id
    where f.lead_id = ${id} order by (f.status = 'PENDING') desc, f.due_date asc, f.created_at desc`;
}

export async function getLeadAssignments(tx: Tx, id: string): Promise<Assignment[]> {
  return tx<Assignment[]>`
    select a.id, a.consultant_id, c.full_name as consultant_name, b.full_name as assigned_by_name, a.method, a.status, a.released_reason, a.created_at, a.released_at
    from lead_assignments a join profiles c on c.id = a.consultant_id join profiles b on b.id = a.assigned_by
    where a.lead_id = ${id} order by a.created_at desc`;
}

export async function getLeadLogs(tx: Tx, id: string): Promise<ActivityLog[]> {
  return tx<ActivityLog[]>`
    select g.*, p.full_name as actor_name from activity_logs g left join profiles p on p.id = g.actor_id
    where g.lead_id = ${id} order by g.created_at desc, g.id desc`;
}

export async function listOrgLogs(tx: Tx, limit = 100): Promise<ActivityLog[]> {
  return tx<ActivityLog[]>`
    select g.*, p.full_name as actor_name, l.company_name
    from activity_logs g left join profiles p on p.id = g.actor_id left join leads l on l.id = g.lead_id
    order by g.created_at desc, g.id desc limit ${limit}`;
}

export async function listConsultants(tx: Tx): Promise<Profile[]> {
  return tx<Profile[]>`select * from profiles where role in ('CONSULTANT','LEADER') and is_active order by full_name`;
}

export async function listMembers(tx: Tx): Promise<(Profile & { active_leads: number })[]> {
  return tx<(Profile & { active_leads: number })[]>`
    select p.*, (select count(*)::int from leads l where l.assigned_to = p.id and l.status in ('ASSIGNED','FOLLOW_UP')) as active_leads
    from profiles p order by
      case p.role when 'OWNER' then 0 when 'MANAGER' then 1 when 'CALLER' then 2 when 'LEADER' then 3 else 4 end, p.is_active desc, p.full_name`;
}

export async function listFollowUps(tx: Tx, opts: { scope: "mine" | "all"; userId: string; status: "PENDING" | "DONE" }): Promise<FollowUp[]> {
  const mine = opts.scope === "mine";
  return tx<FollowUp[]>`
    select f.*, f.due_date::text as due_date, p.full_name as assignee_name, l.company_name, l.region, l.status as lead_status
    from follow_ups f join profiles p on p.id = f.assignee_id join leads l on l.id = f.lead_id
    where f.status = ${opts.status} ${mine ? tx`and f.assignee_id = ${opts.userId}` : tx``}
    order by ${opts.status === "PENDING" ? tx`f.due_date asc` : tx`f.done_at desc`} limit 200`;
}

export interface ManagerDashboard {
  counts: {
    new_today: number; draft: number; open: number; assigned: number; today_meetings: number;
    needs_report: number; follow_ups_due: number; long_overdue: number;
  };
  needsReport: LeadListItem[];
  todayMeetings: LeadListItem[];
  drafts: LeadListItem[];
  followUpsDue: FollowUp[];
}

export async function getManagerDashboard(tx: Tx, userId: string): Promise<ManagerDashboard> {
  const [counts] = await tx<ManagerDashboard["counts"][]>`
    select
      (select count(*)::int from leads where (created_at at time zone 'Asia/Seoul')::date = ${kstToday(tx)} and status <> 'CANCELLED') as new_today,
      (select count(*)::int from leads where status = 'DRAFT') as draft,
      (select count(*)::int from leads where status = 'OPEN') as open,
      (select count(*)::int from leads where status = 'ASSIGNED') as assigned,
      (select count(*)::int from leads where (meeting_at at time zone 'Asia/Seoul')::date = ${kstToday(tx)} and status in ('ASSIGNED','FOLLOW_UP','OPEN')) as today_meetings,
      (select count(*)::int from leads where status = 'ASSIGNED' and meeting_at < now()) as needs_report,
      (select count(*)::int from follow_ups where status = 'PENDING' and due_date <= ${kstToday(tx)}) as follow_ups_due,
      (
        (select count(*)::int from leads where status = 'ASSIGNED' and meeting_at < now() - interval '3 days')
        + (select count(*)::int from follow_ups where status = 'PENDING' and due_date < ${kstToday(tx)} - 7)
      ) as long_overdue`;
  const [needsReport, todayMeetings, drafts, followUpsDue] = await Promise.all([
    listLeads(tx, { tab: "needs_report", userId, limit: 20 }),
    listLeads(tx, { tab: "today", userId, limit: 20 }),
    listLeads(tx, { tab: "draft", userId, limit: 10 }),
    tx<FollowUp[]>`
      select f.*, f.due_date::text as due_date, p.full_name as assignee_name, l.company_name, l.region, l.status as lead_status
      from follow_ups f join profiles p on p.id = f.assignee_id join leads l on l.id = f.lead_id
      where f.status = 'PENDING' and f.due_date <= ${kstToday(tx)} order by f.due_date asc limit 20`,
  ]);
  return { counts, needsReport, todayMeetings, drafts, followUpsDue };
}

export interface ConsultantDashboard {
  counts: { today: number; upcoming: number; needs_report: number; follow_ups_due: number; open: number };
  today: LeadListItem[];
  needsReport: LeadListItem[];
  upcoming: LeadListItem[];
  followUpsDue: FollowUp[];
  open: LeadListItem[];
}

export async function getConsultantDashboard(tx: Tx, userId: string): Promise<ConsultantDashboard> {
  const [counts] = await tx<ConsultantDashboard["counts"][]>`
    select
      (select count(*)::int from leads where assigned_to = ${userId} and status in ('ASSIGNED','FOLLOW_UP') and (meeting_at at time zone 'Asia/Seoul')::date = ${kstToday(tx)}) as today,
      (select count(*)::int from leads where assigned_to = ${userId} and status = 'ASSIGNED' and meeting_at >= now()) as upcoming,
      (select count(*)::int from leads where assigned_to = ${userId} and status = 'ASSIGNED' and meeting_at < now()) as needs_report,
      (select count(*)::int from follow_ups where assignee_id = ${userId} and status = 'PENDING' and due_date <= ${kstToday(tx)}) as follow_ups_due,
      (select count(*)::int from leads where status = 'OPEN') as open`;
  const mine = await listLeads(tx, { tab: "mine", userId, limit: 100 });
  const todayStr = (await tx<{ d: string }[]>`select (now() at time zone 'Asia/Seoul')::date::text as d`)[0].d;
  const now = Date.now();
  const today = mine.filter((l) => l.status === "ASSIGNED" && kstDate(l.meeting_at) === todayStr);
  const needsReport = mine.filter((l) => l.needs_report && kstDate(l.meeting_at) !== todayStr);
  const upcoming = mine.filter((l) => l.status === "ASSIGNED" && l.meeting_at.getTime() >= now && kstDate(l.meeting_at) !== todayStr).slice(0, 10);
  const [followUpsDue, open] = await Promise.all([
    tx<FollowUp[]>`
      select f.*, f.due_date::text as due_date, p.full_name as assignee_name, l.company_name, l.region, l.status as lead_status
      from follow_ups f join profiles p on p.id = f.assignee_id join leads l on l.id = f.lead_id
      where f.status = 'PENDING' and f.assignee_id = ${userId} and f.due_date <= ${kstToday(tx)} order by f.due_date asc limit 20`,
    listLeads(tx, { tab: "open", userId, limit: 5 }),
  ]);
  return { counts, today, needsReport, upcoming, followUpsDue, open };
}

export interface CallerDashboard {
  counts: { registered_today: number; draft: number; open: number; upcoming: number };
  myDrafts: LeadListItem[];
  registeredToday: LeadListItem[];
  upcoming: LeadListItem[];
}

export async function getCallerDashboard(tx: Tx, userId: string): Promise<CallerDashboard> {
  const [counts] = await tx<CallerDashboard["counts"][]>`
    select
      (select count(*)::int from leads where created_by = ${userId} and (created_at at time zone 'Asia/Seoul')::date = ${kstToday(tx)} and status <> 'CANCELLED') as registered_today,
      (select count(*)::int from leads where status = 'DRAFT') as draft,
      (select count(*)::int from leads where status = 'OPEN') as open,
      (select count(*)::int from leads where created_by = ${userId} and status in ('OPEN','ASSIGNED') and meeting_at >= now()) as upcoming`;
  const rowsDraft = await tx.unsafe(`${LIST_SELECT} where l.status = 'DRAFT' order by l.created_at desc limit 20`);
  const rowsToday = await tx.unsafe(`${LIST_SELECT} where l.created_by = $1 and (l.created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date and l.status <> 'CANCELLED' order by l.created_at desc limit 20`, [userId]);
  const rowsUpcoming = await tx.unsafe(`${LIST_SELECT} where l.created_by = $1 and l.status in ('OPEN','ASSIGNED') and l.meeting_at >= now() order by l.meeting_at asc limit 20`, [userId]);
  return {
    counts,
    myDrafts: rowsDraft as unknown as LeadListItem[],
    registeredToday: rowsToday as unknown as LeadListItem[],
    upcoming: rowsUpcoming as unknown as LeadListItem[],
  };
}

function kstDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export type { Lead };
