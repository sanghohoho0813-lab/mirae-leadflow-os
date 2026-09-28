"use client";

import { useSafeTransition, useSafeRefresh, useSafeNavigate } from "@/components/providers/SafeActions";
import { useState, type ReactNode } from "react";
import { Hand, Megaphone, Undo2, UserCog, CalendarClock, Ban, XCircle, Pencil, ClipboardEdit, Phone, EyeOff, Lock, CalendarPlus, StickyNote } from "lucide-react";
import { TimePicker } from "@/components/ui/TimePicker";
import { Button, LinkButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { addLeadNote, cancelClaim, cancelLead, claimLead, publishLead, reassignLead, releaseLead, rescheduleLead, scheduleNextMeeting, unpublishLead } from "@/lib/actions/leads";
import type { LeadListItem, MemberRole } from "@/lib/types";
import { fmtDateTime, kstDateString, kstTimeString } from "@/lib/time";

type Size = "sm" | "md" | "lg";

// ----------------------------------------------------------------- publish
export function PublishButton({ id, size = "md" }: { id: string; size?: Size }) {
  const [pending, start] = useSafeTransition();
  const toast = useToast();
  const refresh = useSafeRefresh();
  return (
    <Button size={size} disabled={pending} data-testid="publish-button" onClick={() => start(async () => {
      const r = await publishLead(id);
      if (r.ok) { toast("success", "공개했습니다. 이제 컨설턴트가 신청할 수 있습니다."); refresh(); }
      else toast("error", r.message ?? "실패했습니다.");
    })}>
      <Megaphone size={18} /> {pending ? "공개 중…" : "공개하기"}
    </Button>
  );
}

// ----------------------------------------------------------------- claim
export interface ActiveMeeting { id: string; company_name: string; passed: boolean }

/** Shown instead of the claim button while this person still has a meeting without a result. */
export function ClaimLimitPanel({ active, limit }: { active: ActiveMeeting; limit: number }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas px-4 py-4" data-testid="claim-limit">
      <div className="flex gap-2.5 text-[1rem] text-ink-2">
        <Lock size={20} className="mt-0.5 shrink-0 text-ink-3" />
        <span>
          진행 중인 미팅 <b className="text-ink">{active.company_name}</b>이(가) 있어 지금은 신청할 수 없습니다.
          {" "}{limit === 1 ? "한 사람당 한 건씩" : `한 사람당 ${limit}건까지`} 진행하며,
          {active.passed ? " 결과를 입력하면 바로 신청할 수 있습니다." : " 미팅 후 결과를 입력하면 신청할 수 있습니다."}
        </span>
      </div>
      <div className="mt-3">
        <LinkButton href={active.passed ? `/leads/${active.id}/report` : `/leads/${active.id}`} size="md" variant={active.passed ? "primary" : "secondary"} className="w-full">
          {active.passed ? <><ClipboardEdit size={19} /> 그 미팅 결과 입력하기</> : "진행 중인 미팅 보기"}
        </LinkButton>
      </div>
    </div>
  );
}

export function ClaimButton({ id }: { id: string }) {
  const [pending, start] = useSafeTransition();
  const [lost, setLost] = useState<string | null>(null);
  const [limited, setLimited] = useState<string | null>(null);
  const toast = useToast();
  const refresh = useSafeRefresh();
  const navigate = useSafeNavigate();
  if (limited) return <ClaimLimitPanel active={{ id: limited, company_name: "결과 입력 전 미팅", passed: true }} limit={1} />;
  if (lost) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning-bg px-4 py-4 text-[1rem] font-semibold text-warning" data-testid="claim-lost">
        {lost}
        <div className="mt-2"><LinkButton href="/leads?tab=open" variant="secondary" size="sm">다른 DB 보기</LinkButton></div>
      </div>
    );
  }
  return (
    <Button size="lg" className="w-full text-[1.1875rem]" disabled={pending} data-testid="claim-button" onClick={() => start(async () => {
      const r = await claimLead(id);
      // replace() alone refetches (the action revalidated this path); adding refresh()
      // races with it under the loading boundary and can leave the page stuck.
      if (r.ok) { navigate(`/leads/${id}?claimed=1`, "replace"); }
      else if (r.code === "ALREADY_ASSIGNED" || r.code === "NOT_OPEN") { setLost(r.message ?? "이미 배정되었습니다."); navigate(`/leads/${id}?lost=1`, "replace"); }
      else if (r.code === "LIMIT_REACHED" && r.id) { setLimited(r.id); toast("error", r.message ?? "진행 중인 미팅이 있습니다."); }
      else toast("error", r.message ?? "실패했습니다.");
    })}>
      <Hand size={22} /> {pending ? "신청 중…" : "이 미팅 신청하기"}
    </Button>
  );
}

// ----------------------------------------------------------------- generic confirm action
function ConfirmAction({ label, icon, title, desc, confirmLabel, variant = "secondary", size = "md", reasonLabel, reasonRequired, run, testId, danger }: {
  label: string; icon: ReactNode; title: string; desc: string; confirmLabel: string; variant?: "secondary" | "danger" | "primary"; size?: Size;
  reasonLabel?: string; reasonRequired?: boolean; run: (reason: string) => Promise<{ ok: boolean; message?: string }>; testId?: string; danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useSafeTransition();
  const toast = useToast();
  const refresh = useSafeRefresh();
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} data-testid={testId}>{icon} {label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <p className="mb-4 text-[1rem] text-ink-2">{desc}</p>
        {reasonLabel && (
          <Field label={reasonLabel} required={reasonRequired} htmlFor="reason">
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="간단히 적어 주세요" />
          </Field>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>돌아가기</Button>
          <Button variant={danger ? "danger" : "primary"} className="flex-1" disabled={pending || (reasonRequired && !reason.trim())} data-testid={testId ? `${testId}-confirm` : undefined} onClick={() => start(async () => {
            const r = await run(reason.trim());
            if (r.ok) { toast("success", `${title} 완료`); setOpen(false); refresh(); }
            else toast("error", r.message ?? "실패했습니다.");
          })}>{pending ? "처리 중…" : confirmLabel}</Button>
        </div>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------- reassign
function ReassignButton({ lead, consultants }: { lead: LeadListItem; consultants: { id: string; full_name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useSafeTransition();
  const toast = useToast();
  const refresh = useSafeRefresh();
  const label = lead.assigned_to ? "재배정" : "담당자 직접 배정";
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} data-testid="reassign-button"><UserCog size={18} /> {label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={label}>
        <div className="grid gap-4">
          {lead.assignee_name && <p className="text-[1rem] text-ink-2">현재 담당: <b className="text-ink">{lead.assignee_name}</b></p>}
          <Field label="새 담당 컨설턴트" required htmlFor="consultant">
            <Select id="consultant" value={target} onChange={(e) => setTarget(e.target.value)} data-testid="reassign-select">
              <option value="">선택하세요</option>
              {consultants.filter((c) => c.id !== lead.assigned_to).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </Field>
          <Field label="사유 (선택)" htmlFor="reassign-reason">
            <Input id="reassign-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 지역이 가까운 담당자로 변경" />
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>돌아가기</Button>
            <Button className="flex-1" disabled={pending || !target} data-testid="reassign-confirm" onClick={() => start(async () => {
              const r = await reassignLead(lead.id, target, reason);
              if (r.ok) { toast("success", "담당자를 변경했습니다."); setOpen(false); refresh(); }
              else toast("error", r.message ?? "실패했습니다.");
            })}>{pending ? "처리 중…" : "배정하기"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------- reschedule
function RescheduleButton({ lead }: { lead: LeadListItem }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(kstDateString(lead.meeting_at));
  const [time, setTime] = useState(kstTimeString(lead.meeting_at));
  const [reason, setReason] = useState("");
  const [pending, start] = useSafeTransition();
  const toast = useToast();
  const refresh = useSafeRefresh();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} data-testid="reschedule-button"><CalendarClock size={18} /> 일정 변경</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="미팅 일정 변경">
        <div className="grid gap-4">
          <p className="text-[1rem] text-ink-2">현재: <b className="text-ink">{fmtDateTime(lead.meeting_at)}</b></p>
          <Field label="새 날짜" required htmlFor="rs-date"><Input id="rs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="새 시간" required><TimePicker value={time} onChange={setTime} testId="rs-time" /></Field>
          <Field label="사유 (선택)" htmlFor="rs-reason"><Input id="rs-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 대표님 출장" /></Field>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>돌아가기</Button>
            <Button className="flex-1" disabled={pending || !date || !time} data-testid="reschedule-confirm" onClick={() => start(async () => {
              const r = await rescheduleLead(lead.id, date, time, reason);
              if (r.ok) { toast("success", "일정을 변경했습니다."); setOpen(false); refresh(); }
              else toast("error", r.message ?? "실패했습니다.");
            })}>{pending ? "처리 중…" : "변경하기"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------- next round
/** 후속 중이거나 종결된 DB에 2차·3차 미팅을 잡는다. */
function NextMeetingButton({ lead }: { lead: LeadListItem }) {
  const next = lead.meeting_round + 1;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [pending, start] = useSafeTransition();
  const toast = useToast();
  const refresh = useSafeRefresh();
  const days = Array.from({ length: 10 }, (_, i) => new Date(Date.now() + (i + 1) * 86_400_000))
    .filter((d) => { const w = new Date(d.getTime() + 9 * 3_600_000).getUTCDay(); return w !== 0 && w !== 6; }).slice(0, 5);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} data-testid="next-meeting-button"><CalendarPlus size={18} /> {next}차 미팅 잡기</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${next}차 미팅 잡기`}>
        <div className="grid gap-4">
          <p className="text-[1rem] text-ink-2">날짜와 시간을 고르면 {next}차 미팅이 바로 잡히고, 다녀온 뒤 {next}차 결과를 입력합니다.</p>
          <Field label="날짜" required htmlFor="nm-date">
            <div className="mb-2 flex flex-wrap gap-2">
              {days.map((d) => { const v = kstDateString(d); return (
                <button key={v} type="button" onClick={() => setDate(v)} className={`press h-11 rounded-xl border-2 px-3 text-[0.9375rem] font-semibold ${date === v ? "border-primary bg-soft text-primary" : "border-line bg-white text-ink-2"}`}>
                  {Number(v.slice(5, 7))}/{Number(v.slice(8))} ({"일월화수목금토"[new Date(d.getTime() + 9 * 3_600_000).getUTCDay()]})
                </button>); })}
            </div>
            <Input id="nm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={kstDateString()} data-testid="nm-date" />
          </Field>
          <Field label="시간" required><TimePicker value={time} onChange={setTime} testId="nm-time" /></Field>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>돌아가기</Button>
            <Button className="flex-1" disabled={pending || !date || !time} data-testid="next-meeting-confirm" onClick={() => start(async () => {
              const r = await scheduleNextMeeting(lead.id, date, time);
              if (r.ok) { toast("success", `${next}차 미팅을 잡았습니다.`); setOpen(false); refresh(); }
              else toast("error", r.message ?? "실패했습니다.");
            })}>{pending ? "처리 중…" : `${next}차 미팅 잡기`}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------- note
/** 진행 메모: 짧은 코멘트를 이력에 남긴다 (예: "2차 때 대표님이 세무사 동석 희망"). */
function NoteButton({ lead }: { lead: LeadListItem }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, start] = useSafeTransition();
  const toast = useToast();
  const refresh = useSafeRefresh();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} data-testid="note-button"><StickyNote size={18} /> 메모 남기기</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="진행 메모 남기기">
        <div className="grid gap-4">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="예: 대표님이 다음 미팅에 세무사 동석을 원하심" data-testid="note-text" aria-label="메모" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>돌아가기</Button>
            <Button className="flex-1" disabled={pending || !text.trim()} data-testid="note-confirm" onClick={() => start(async () => {
              const r = await addLeadNote(lead.id, text);
              if (r.ok) { toast("success", "메모를 남겼습니다."); setText(""); setOpen(false); refresh(); }
              else toast("error", r.message ?? "실패했습니다.");
            })}>{pending ? "저장 중…" : "남기기"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------- action bar
export function LeadActionBar({ lead, role, userId, consultants, phone, blockedBy = null, claimLimit = 1, canManage }: {
  lead: LeadListItem; role: MemberRole; userId: string; consultants: { id: string; full_name: string }[]; phone: string | null;
  blockedBy?: ActiveMeeting | null; claimLimit?: number;
  /** 단장·비서, or the 본부장 of this 본부 DB. */
  canManage?: boolean;
}) {
  const manager = canManage ?? (role === "OWNER" || role === "MANAGER");
  const consultant = role === "CONSULTANT" || role === "LEADER";
  const mine = lead.assigned_to === userId;
  const creator = lead.created_by === userId;
  const meetingPassed = lead.meeting_at.getTime() < Date.now();
  const active = !["CLOSED", "CANCELLED"].includes(lead.status);

  const primary: ReactNode[] = [];
  const secondary: ReactNode[] = [];

  if (consultant && lead.status === "OPEN") primary.push(blockedBy ? <ClaimLimitPanel key="limit" active={blockedBy} limit={claimLimit} /> : <ClaimButton key="claim" id={lead.id} />);

  if ((mine || manager) && (lead.status === "ASSIGNED" || lead.status === "FOLLOW_UP") && lead.assigned_to) {
    primary.push(
      <LinkButton key="report" href={`/leads/${lead.id}/report`} size="lg" variant={lead.status === "ASSIGNED" && meetingPassed ? "primary" : mine ? "primary" : "secondary"} className="w-full text-[1.125rem]">
        <ClipboardEdit size={21} /> {lead.status === "FOLLOW_UP" ? "후속 결과 입력" : mine ? "미팅 결과 입력" : "대신 결과 입력"}
      </LinkButton>,
    );
  }
  if (phone && (mine || manager || creator)) {
    primary.push(
      <a key="call" href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-white text-[1.125rem] font-semibold text-ink transition-base hover:bg-soft" data-testid="call-button">
        <Phone size={20} className="text-primary" /> 연락하기 <span className="text-ink-2">{phone}</span>
      </a>,
    );
  }

  if (manager && lead.status === "DRAFT") primary.unshift(<div key="publish" className="w-full [&>button]:w-full [&>button]:text-[1.125rem]"><PublishButton id={lead.id} size="lg" /></div>);

  if (mine && lead.status === "ASSIGNED" && !meetingPassed) {
    secondary.push(<ConfirmAction key="cancel-claim" label="신청 취소" icon={<Undo2 size={18} />} title="신청 취소" desc="이 미팅의 담당을 내려놓습니다. 다른 컨설턴트가 다시 신청할 수 있게 됩니다." confirmLabel="신청 취소하기" reasonLabel="사유 (선택)" run={(r) => cancelClaim(lead.id, r)} testId="cancel-claim-button" danger />);
  }
  if (manager && lead.status === "OPEN") {
    secondary.push(<ReassignButton key="assign" lead={lead} consultants={consultants} />);
    secondary.push(<ConfirmAction key="unpublish" label="공개 취소" icon={<EyeOff size={18} />} title="공개 취소" desc="컨설턴트에게 보이지 않게 되돌립니다." confirmLabel="공개 취소" run={() => unpublishLead(lead.id)} testId="unpublish-button" />);
  }
  if (manager && lead.status === "ASSIGNED") {
    secondary.push(<ReassignButton key="reassign" lead={lead} consultants={consultants} />);
    secondary.push(<ConfirmAction key="release" label="회수" icon={<Undo2 size={18} />} title="담당 회수" desc={`${lead.assignee_name ?? "담당자"}의 담당을 해제하고 다시 신청 가능 상태로 되돌립니다.`} confirmLabel="회수하기" reasonLabel="사유 (선택)" run={(r) => releaseLead(lead.id, r)} testId="release-button" danger />);
  }
  if ((manager || (creator && role === "CALLER") || mine) && ["DRAFT", "OPEN", "ASSIGNED"].includes(lead.status)) {
    secondary.push(<RescheduleButton key="reschedule" lead={lead} />);
  }
  if ((manager || (creator && role === "CALLER")) && active) {
    secondary.push(<LinkButton key="edit" href={`/leads/${lead.id}/edit`} variant="secondary"><Pencil size={18} /> 정보 수정</LinkButton>);
  }
  if ((mine || manager) && (lead.status === "FOLLOW_UP" || lead.status === "CLOSED") && lead.assigned_to) {
    secondary.unshift(<NextMeetingButton key="next-round" lead={lead} />);
  }
  if ((mine || manager || creator) && lead.status !== "CANCELLED" && lead.status !== "DRAFT") {
    secondary.push(<NoteButton key="note" lead={lead} />);
  }
  if (manager && active) {
    secondary.push(<ConfirmAction key="cancel-lead" label="DB 취소" icon={<Ban size={18} />} title="DB 취소" desc="이 DB를 취소합니다. 배정과 예정된 후속조치도 함께 취소됩니다. 되돌릴 수 없습니다." confirmLabel="DB 취소하기" reasonLabel="취소 사유" reasonRequired run={(r) => cancelLead(lead.id, r)} testId="cancel-lead-button" variant="danger" danger />);
  }

  if (primary.length === 0 && secondary.length === 0) return null;
  return (
    <div className="grid gap-3" data-testid="lead-actions">
      {primary.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{primary}</div>}
      {secondary.length > 0 && <div className="flex flex-wrap gap-2">{secondary}</div>}
      {lead.status === "CANCELLED" && <p className="flex items-center gap-1.5 text-[0.9375rem] text-danger"><XCircle size={16} /> 취소된 DB입니다{lead.cancel_reason ? ` — ${lead.cancel_reason}` : ""}</p>}
    </div>
  );
}

/**
 * 목록에서 바로 신청 (선착순은 몇 초 차이). Confirms first so a stray tap on a
 * phone never takes a meeting by accident.
 */
export function QuickClaim({ lead }: { lead: { id: string; company_name: string; region: string; meeting_at: Date } }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useSafeTransition();
  const toast = useToast();
  const refresh = useSafeRefresh();
  const navigate = useSafeNavigate();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid={`quick-claim-${lead.id}`}
        className="press flex w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-primary text-[0.9375rem] font-bold text-white hover:bg-primary-strong">
        <Hand size={20} /> 신청
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="이 미팅을 신청할까요?" testId="quick-claim-dialog">
        <div className="mb-4 rounded-xl bg-canvas px-4 py-3">
          <div className="text-[1.1875rem] font-bold text-ink">{lead.company_name}</div>
          <div className="text-[1rem] text-ink-2">{fmtDateTime(lead.meeting_at)} · {lead.region}</div>
        </div>
        <p className="mb-4 text-[1rem] text-ink-2">신청하면 선착순으로 바로 담당이 확정되고, 연락처와 상세 메모가 열립니다.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>돌아가기</Button>
          <Button className="flex-1" disabled={pending} data-testid="quick-claim-confirm" onClick={() => start(async () => {
            const r = await claimLead(lead.id);
            if (r.ok) { setOpen(false); toast("success", "신청되었습니다. 담당이 확정되었습니다."); navigate(`/leads/${lead.id}?claimed=1`); return; }
            setOpen(false);
            toast("error", r.message ?? "신청하지 못했습니다.");
            refresh();
          })}><Hand size={19} /> {pending ? "신청 중…" : "신청하기"}</Button>
        </div>
      </Dialog>
    </>
  );
}
