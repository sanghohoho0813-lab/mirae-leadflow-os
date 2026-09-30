"use client";

import { SampleTag } from "@/components/ui/SampleTag";
import { useSafeTransition, useSafeRefresh } from "@/components/providers/SafeActions";
import Link from "next/link";
import { useState} from "react";
import { CheckCircle2, Phone, FileText, Building2, ShieldAlert, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ChoiceGroup } from "@/components/ui/Choice";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { completeFollowUp } from "@/lib/actions/leads";
import { NEXT_ACTION_LABEL } from "@/lib/labels";
import { fmtDate, relativeDay } from "@/lib/time";
import type { FollowUp, NextAction } from "@/lib/types";

const ACTION_ICON: Record<NextAction, React.ReactNode> = {
  CALL: <Phone size={18} />, SEND_MATERIAL: <FileText size={18} />, REVISIT: <Building2 size={18} />, OWNER_CHECK: <ShieldAlert size={18} />, NONE: null,
};

export function FollowUpList({ items, emptyText, canComplete, showAssignee }: { items: FollowUp[]; emptyText: string; canComplete?: boolean; showAssignee?: boolean }) {
  if (items.length === 0) return <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[1rem] text-ink-3">{emptyText}</p>;
  return <div className="stagger grid gap-2">{items.map((f) => <FollowUpCard key={f.id} item={f} canComplete={canComplete} showAssignee={showAssignee} />)}</div>;
}

export function FollowUpCard({ item, canComplete, showAssignee }: { item: FollowUp; canComplete?: boolean; showAssignee?: boolean }) {
  const rel = relativeDay(item.due_date);
  const overdue = item.status === "PENDING" && rel.diff < 0;
  const done = item.status !== "PENDING";
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 ${overdue ? "border-danger/40" : "border-line"} ${done ? "opacity-70" : ""}`} data-testid={`follow-up-${item.id}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${done ? "bg-success-bg text-success" : overdue ? "bg-danger-bg text-danger" : "bg-purple-bg text-purple"}`}>
        {done ? <CheckCircle2 size={20} /> : ACTION_ICON[item.action]}
      </span>
      <div className="min-w-[200px] flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {item.is_sample && <SampleTag />}
          {item.company_name ? (
            <Link prefetch={false} href={`/leads/${item.lead_id}`} className="truncate text-[1.0625rem] font-bold text-ink hover:text-primary">{item.company_name}</Link>
          ) : null}
          <Badge tone={done ? "success" : "purple"}>{NEXT_ACTION_LABEL[item.action]}</Badge>
          {!done && <Badge tone={overdue ? "danger" : rel.diff === 0 ? "warning" : "neutral"}>{rel.label}</Badge>}
        </div>
        <div className="mt-0.5 text-[0.9375rem] text-ink-2">
          {done ? `완료 ${item.done_at ? fmtDate(item.done_at) : ""}` : `예정 ${fmtDate(item.due_date)}`}
          {showAssignee && ` · 담당 ${item.assignee_name}`}
          {item.memo && <span className="text-ink-3"> · {item.memo}</span>}
          {done && item.done_note && <span className="text-ink-3"> · {item.done_note}</span>}
        </div>
      </div>
      {!done && canComplete ? <CompleteFollowUpButton item={item} /> : (
        <Link prefetch={false} href={`/leads/${item.lead_id}`} aria-label="상세" className="text-ink-3"><ChevronRight size={20} /></Link>
      )}
    </div>
  );
}

export function CompleteFollowUpButton({ item, size = "sm" }: { item: FollowUp; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [next, setNext] = useState<NextAction>("NONE");
  const [date, setDate] = useState("");
  const [pending, start] = useSafeTransition();
  const toast = useToast();
  const refresh = useSafeRefresh();

  const submit = () => start(async () => {
    const r = await completeFollowUp(item.id, item.lead_id, note, next, next === "NONE" ? null : date);
    if (r.ok) {
      toast("success", next === "NONE" ? "후속조치를 완료했습니다. 이 DB는 종료됩니다." : "완료했습니다. 다음 후속조치를 등록했습니다.");
      setOpen(false);
      refresh();
    } else toast("error", r.message ?? "실패했습니다.");
  });

  return (
    <>
      <Button variant="success" size={size} className="w-full sm:w-auto" onClick={() => setOpen(true)} data-testid={`complete-follow-up-${item.id}`}>
        <CheckCircle2 size={18} /> 완료
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${NEXT_ACTION_LABEL[item.action]} 완료`} testId="complete-follow-up-dialog">
        <div className="grid gap-4">
          <Field label="처리 내용 (선택)" htmlFor={`note-${item.id}`}>
            <Textarea id={`note-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 통화 완료, 다음 주 재방문 약속" />
          </Field>
          <Field label="다음에 할 일" required>
            <ChoiceGroup name="next" columns={3} value={next} onChange={setNext} options={[
              { value: "NONE", label: "없음 (종료)" }, { value: "CALL", label: "전화" }, { value: "SEND_MATERIAL", label: "자료 전달" },
              { value: "REVISIT", label: "재방문" }, { value: "OWNER_CHECK", label: "단장 확인" },
            ]} />
          </Field>
          {next !== "NONE" && (
            <Field label="예정일" htmlFor={`date-${item.id}`} required>
              <Input id={`date-${item.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>취소</Button>
            <Button variant="success" className="flex-1" onClick={submit} disabled={pending || (next !== "NONE" && !date)} data-testid="confirm-complete-follow-up">{pending ? "저장 중…" : "완료 저장"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
