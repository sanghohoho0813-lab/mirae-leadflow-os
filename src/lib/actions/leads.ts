"use server";

import { revalidatePath } from "next/cache";
import { requireViewer, canCreateLead, isManager } from "@/lib/auth/session";
import { withUser, toActionError } from "@/lib/db";
import { messageFor } from "@/lib/errors";
import { kstToDate } from "@/lib/time";
import { regionFromAddress } from "@/lib/geo";
import type { MeetingMethod, MeetingOutcome, MeetingResult, NextAction, ReactionLevel } from "@/lib/types";

export interface ActionResult { ok: boolean; code?: string; message?: string; id?: string }
/**
 * `redirectTo` is followed by the client (router.push). A server-side redirect()
 * from these form actions intermittently left the page stuck on "저장 중…" when the
 * target sits under the (app) loading boundary (see DECISIONS D-16).
 */
export interface FormState { error?: string; redirectTo?: string }

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function tags(fd: FormData, k: string): string[] {
  return fd.getAll(k).map(String).map((s) => s.trim()).filter(Boolean);
}

function revalidateLead(id?: string) {
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/follow-ups");
  revalidatePath("/activity");
  if (id) revalidatePath(`/leads/${id}`);
}

// ---------------------------------------------------------------- create / update
export async function createLead(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  if (!canCreateLead(viewer)) return { error: "DB를 등록할 권한이 없습니다." };

  const company = str(fd, "company_name");
  const address = str(fd, "address");
  const region = str(fd, "region") || (address && regionFromAddress(address)) || "";
  const date = str(fd, "meeting_date");
  const time = str(fd, "meeting_time");
  const method = str(fd, "meeting_method") as MeetingMethod;
  if (!company || !region || !date || !time) return { error: "업체명, 지역(또는 주소), 미팅 날짜와 시간은 꼭 입력해 주세요." };
  if (!["VISIT", "PHONE", "ONLINE"].includes(method)) return { error: "미팅 방식을 선택해 주세요." };

  let id = "";
  try {
    id = await withUser(viewer.session.userId, async (tx) => {
      const [lead] = await tx<{ id: string }[]>`
        insert into leads(organization_id, company_name, region, industry, meeting_at, meeting_method, public_summary, status, created_by, caller_id)
        values (${viewer.profile.organization_id}, ${company}, ${region}, ${str(fd, "industry") || null}, ${kstToDate(date, time)}, ${method},
          ${str(fd, "public_summary") || null}, 'DRAFT', ${viewer.session.userId}, ${viewer.session.userId})
        returning id`;
      await tx`
        insert into lead_private_details(lead_id, organization_id, contact_name, contact_title, contact_phone, address, call_topic, interest_tags, concern_tags, contact_traits, meeting_reason, must_know, caution, extra_note)
        values (${lead.id}, ${viewer.profile.organization_id}, ${str(fd, "contact_name") || null}, ${str(fd, "contact_title") || null}, ${str(fd, "contact_phone") || null}, ${address || null},
          ${str(fd, "call_topic") || null}, ${tags(fd, "interest_tags")}, ${tags(fd, "concern_tags")}, ${str(fd, "contact_traits") || null},
          ${str(fd, "meeting_reason") || null}, ${str(fd, "must_know") || null}, ${str(fd, "caution") || null}, ${str(fd, "extra_note") || null})`;
      await tx`select lf_log(${lead.id}, 'CREATE', null, 'DRAFT', ${JSON.stringify({ company_name: company })}::jsonb)`;
      if (isManager(viewer) && fd.get("publish_now") === "on") {
        await tx`select publish_lead(${lead.id})`;
      }
      return lead.id;
    });
  } catch (e) {
    return { error: messageFor(toActionError(e).code) };
  }
  revalidateLead(id);
  return { redirectTo: `/leads/${id}?created=1` };
}

export async function updateLead(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const company = str(fd, "company_name");
  const address = str(fd, "address");
  const region = str(fd, "region") || (address && regionFromAddress(address)) || "";
  const date = str(fd, "meeting_date");
  const time = str(fd, "meeting_time");
  const method = str(fd, "meeting_method") as MeetingMethod;
  if (!company || !region || !date || !time) return { error: "업체명, 지역(또는 주소), 미팅 날짜와 시간은 꼭 입력해 주세요." };

  try {
    await withUser(viewer.session.userId, async (tx) => {
      const [before] = await tx<{ meeting_at: Date; status: string }[]>`select meeting_at, status from leads where id = ${id}`;
      if (!before) throw new Error("NOT_FOUND");
      const newAt = kstToDate(date, time);
      const rows = await tx`
        update leads set company_name = ${company}, region = ${region}, industry = ${str(fd, "industry") || null},
          meeting_at = ${newAt}, meeting_method = ${method}, public_summary = ${str(fd, "public_summary") || null}
        where id = ${id} returning id`;
      if (rows.length === 0) throw new Error("FORBIDDEN");
      await tx`
        update lead_private_details set contact_name = ${str(fd, "contact_name") || null}, contact_title = ${str(fd, "contact_title") || null},
          contact_phone = ${str(fd, "contact_phone") || null}, address = ${address || null}, call_topic = ${str(fd, "call_topic") || null},
          interest_tags = ${tags(fd, "interest_tags")}, concern_tags = ${tags(fd, "concern_tags")}, contact_traits = ${str(fd, "contact_traits") || null},
          meeting_reason = ${str(fd, "meeting_reason") || null}, must_know = ${str(fd, "must_know") || null}, caution = ${str(fd, "caution") || null},
          extra_note = ${str(fd, "extra_note") || null}
        where lead_id = ${id}`;
      const rescheduled = before.meeting_at.getTime() !== newAt.getTime();
      await tx`select lf_log(${id}, ${rescheduled ? "RESCHEDULE" : "UPDATE"}, ${before.status}::lead_status, ${before.status}::lead_status,
        ${JSON.stringify(rescheduled ? { from: before.meeting_at, to: newAt, reason: "정보 수정" } : { company_name: company })}::jsonb)`;
    });
  } catch (e) {
    return { error: messageFor(toActionError(e).code) };
  }
  revalidateLead(id);
  return { redirectTo: `/leads/${id}?updated=1` };
}

// ---------------------------------------------------------------- transitions
async function rpc(fn: (uid: string) => Promise<unknown>, id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    await fn(viewer.session.userId);
  } catch (e) {
    const code = toActionError(e).code;
    return { ok: false, code, message: messageFor(code) };
  }
  revalidateLead(id);
  return { ok: true };
}

export async function publishLead(id: string): Promise<ActionResult> {
  return rpc((uid) => withUser(uid, (tx) => tx`select publish_lead(${id})`), id);
}
export async function unpublishLead(id: string): Promise<ActionResult> {
  return rpc((uid) => withUser(uid, (tx) => tx`select unpublish_lead(${id})`), id);
}

export async function claimLead(id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    const r = await withUser(viewer.session.userId, async (tx) => (await tx<{ r: { ok: boolean; code: string; active_lead_id?: string } }[]>`select claim_lead(${id}) as r`)[0].r);
    revalidateLead(id);
    // LIMIT_REACHED: `id` carries the meeting whose result is still missing.
    return r.ok ? { ok: true, code: r.code } : { ok: false, code: r.code, message: messageFor(r.code), id: r.active_lead_id };
  } catch (e) {
    const code = toActionError(e).code;
    return { ok: false, code, message: messageFor(code) };
  }
}

export async function cancelClaim(id: string, reason?: string): Promise<ActionResult> {
  return rpc((uid) => withUser(uid, (tx) => tx`select cancel_claim(${id}, ${reason ?? null})`), id);
}
export async function releaseLead(id: string, reason?: string): Promise<ActionResult> {
  return rpc((uid) => withUser(uid, (tx) => tx`select release_lead(${id}, ${reason ?? null})`), id);
}
export async function reassignLead(id: string, consultantId: string, reason?: string): Promise<ActionResult> {
  if (!consultantId) return { ok: false, code: "INVALID_CONSULTANT", message: messageFor("INVALID_CONSULTANT") };
  return rpc((uid) => withUser(uid, (tx) => tx`select reassign_lead(${id}, ${consultantId}, ${reason ?? null})`), id);
}
export async function rescheduleLead(id: string, date: string, time: string, reason?: string): Promise<ActionResult> {
  if (!date || !time) return { ok: false, code: "VALIDATION", message: "날짜와 시간을 선택해 주세요." };
  return rpc((uid) => withUser(uid, (tx) => tx`select reschedule_lead(${id}, ${kstToDate(date, time)}, ${reason ?? null})`), id);
}
export async function cancelLead(id: string, reason: string): Promise<ActionResult> {
  if (!reason?.trim()) return { ok: false, code: "REASON_REQUIRED", message: messageFor("REASON_REQUIRED") };
  return rpc((uid) => withUser(uid, (tx) => tx`select cancel_lead(${id}, ${reason.trim()})`), id);
}

// ---------------------------------------------------------------- meeting report
export interface ReportInput {
  outcome: MeetingOutcome;
  reaction?: ReactionLevel | null;
  result?: MeetingResult | null;
  next_action: NextAction;
  next_action_date?: string | null;
  memo?: string;
  detail_memo?: string;
  new_meeting_date?: string;
  new_meeting_time?: string;
  topics?: string[];
  materials?: string[];
  next_note?: string;
}

const clean = (a?: string[]) => (a ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 20);

export async function submitReport(id: string, input: ReportInput): Promise<ActionResult> {
  const viewer = await requireViewer();
  const newMeetingAt = input.outcome === "POSTPONED" && input.new_meeting_date && input.new_meeting_time
    ? kstToDate(input.new_meeting_date, input.new_meeting_time) : null;
  try {
    await withUser(viewer.session.userId, (tx) => tx`
      select submit_meeting_report(${id}, ${input.outcome}, ${input.reaction ?? null}, ${input.result ?? null}, ${input.next_action},
        ${input.next_action_date || null}, ${input.memo ?? null}, ${input.detail_memo ?? null}, ${newMeetingAt},
        ${clean(input.topics)}::text[], ${clean(input.materials)}::text[], ${input.next_note ?? null})`);
  } catch (e) {
    const code = toActionError(e).code;
    return { ok: false, code, message: messageFor(code) };
  }
  revalidateLead(id);
  return { ok: true };
}

export async function completeFollowUp(followUpId: string, leadId: string, note: string, nextAction: NextAction, nextDate?: string | null): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    await withUser(viewer.session.userId, (tx) => tx`
      select complete_follow_up(${followUpId}, ${note || null}, ${nextAction}, ${nextDate || null})`);
  } catch (e) {
    const code = toActionError(e).code;
    return { ok: false, code, message: messageFor(code) };
  }
  revalidateLead(leadId);
  return { ok: true };
}

// ---------------------------------------------------------------- members
export async function setMemberRole(profileId: string, role: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    await withUser(viewer.session.userId, (tx) => tx`select set_member_role(${profileId}, ${role}::member_role)`);
  } catch (e) {
    const code = toActionError(e).code;
    return { ok: false, code, message: messageFor(code) };
  }
  revalidatePath("/members");
  return { ok: true };
}

export async function setMemberActive(profileId: string, active: boolean): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    await withUser(viewer.session.userId, (tx) => tx`select set_member_active(${profileId}, ${active})`);
  } catch (e) {
    const code = toActionError(e).code;
    return { ok: false, code, message: messageFor(code) };
  }
  revalidatePath("/members");
  return { ok: true };
}

export async function setClaimLimit(limit: number): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!isManager(viewer)) return { ok: false, code: "FORBIDDEN", message: messageFor("FORBIDDEN") };
  try {
    await withUser(viewer.session.userId, (tx) => tx`select set_claim_limit(${Math.round(limit)})`);
  } catch (e) {
    const code = toActionError(e).code;
    return { ok: false, code, message: messageFor(code) };
  }
  revalidatePath("/members");
  revalidatePath("/leads");
  return { ok: true };
}
