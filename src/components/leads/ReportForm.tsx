"use client";

import { useSafeTransition } from "@/components/providers/SafeActions";
import { useState} from "react";
import { CheckCircle2, Home, FileText } from "lucide-react";
import { ChoiceGroup, TagPicker } from "@/components/ui/Choice";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { submitReport } from "@/lib/actions/leads";
import { MATERIAL_OPTIONS, NEXT_ACTION_LABEL, OUTCOME_LABEL, REACTION_LABEL, RESULT_LABEL, TOPIC_OPTIONS } from "@/lib/labels";
import type { MeetingOutcome, MeetingResult, NextAction, ReactionLevel } from "@/lib/types";
import { fmtDate, kstDateString } from "@/lib/time";

function addDays(n: number): string {
  return kstDateString(new Date(Date.now() + n * 86400000));
}

// Lead interest tags → the report's 상담 분야 chips (preselected).
const TOPIC_FROM_INTEREST: Record<string, string> = {
  정책자금: "정책자금", 고용지원금: "고용지원금", 기업부설연구소: "기업부설연구소", 세액공제: "기업부설연구소",
  벤처기업확인: "벤처·이노비즈", 기업인증: "기업인증", 법인컨설팅: "절세·법인", 가지급금: "절세·법인", 절세: "절세·법인", 정부지원사업: "정부지원사업",
};
const NEXT_NOTE_HINT: Partial<Record<NextAction, string>> = {
  CALL: "예: 재무제표 보내 주셨는지 확인 전화",
  SEND_MATERIAL: "예: 정책자금 안내자료와 필요 서류 목록 보내기",
  REVISIT: "예: 한도 검토 결과 들고 재방문",
  OWNER_CHECK: "예: 기존 대출 많은데 진행 여부 단장님 판단 필요",
};
const MEMO_TEMPLATE = "· 대표님 핵심 고민:\n· 회사 현황 (매출·직원·업종):\n· 제안한 내용:\n· 다음 약속·조건:\n";

export function ReportForm({ leadId, companyName, isFollowUp, interest = [] }: { leadId: string; companyName: string; isFollowUp: boolean; interest?: string[] }) {
  const [outcome, setOutcome] = useState<MeetingOutcome | null>(null);
  const [reaction, setReaction] = useState<ReactionLevel | null>(null);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [next, setNext] = useState<NextAction | null>(null);
  const [nextDate, setNextDate] = useState("");
  const [memo, setMemo] = useState("");
  const [detail, setDetail] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [topics, setTopics] = useState<string[]>(() => [...new Set(interest.map((t) => TOPIC_FROM_INTEREST[t]).filter(Boolean))]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [nextNote, setNextNote] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [pending, start] = useSafeTransition();
  const [done, setDone] = useState<{ status: string } | null>(null);
  const toast = useToast();

  const needsReactionResult = outcome === "DONE";
  const needsNext = outcome !== null && outcome !== "POSTPONED";
  const needsNewMeeting = outcome === "POSTPONED";
  let step = 1;
  const n = () => ++step;
  const canSubmit = outcome !== null
    && (!needsReactionResult || (reaction && result))
    && (!needsNext || (next && (next === "NONE" || nextDate)))
    && (!needsNewMeeting || (newDate && newTime));

  const submit = () => start(async () => {
    if (!outcome) return;
    const r = await submitReport(leadId, {
      outcome, reaction, result, next_action: needsNext ? (next ?? "NONE") : "NONE", next_action_date: next && next !== "NONE" ? nextDate : null,
      memo, detail_memo: showDetail ? detail : "", new_meeting_date: newDate, new_meeting_time: newTime,
      topics: outcome === "DONE" ? topics : [], materials: outcome === "DONE" ? materials : [], next_note: next && next !== "NONE" ? nextNote : "",
    });
    if (r.ok) {
      const status = outcome === "POSTPONED" ? "ASSIGNED" : next && next !== "NONE" ? "FOLLOW_UP" : "CLOSED";
      setDone({ status });
    } else toast("error", r.message ?? "저장하지 못했습니다.");
  });

  if (done) {
    return (
      <div className="fade-up rounded-2xl border border-success/30 bg-white p-6 text-center shadow-card" data-testid="report-done">
        <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success"><CheckCircle2 size={36} /></span>
        <h2 className="text-[1.5rem] font-extrabold text-ink">결과가 저장되었습니다</h2>
        <p className="mt-1 text-[1rem] text-ink-2">{companyName} · {OUTCOME_LABEL[outcome!]}{reaction ? ` · ${REACTION_LABEL[reaction]}` : ""}{result ? ` · ${RESULT_LABEL[result]}` : ""}</p>
        <div className="mx-auto mt-4 max-w-sm rounded-xl bg-neutral-bg px-4 py-3 text-left text-[1rem]">
          <div className="font-semibold text-ink-2">다음 단계</div>
          <div className="mt-0.5 font-bold text-ink">
            {done.status === "ASSIGNED" && `미팅이 ${fmtDate(newDate)} ${newTime}로 변경되었습니다.`}
            {done.status === "FOLLOW_UP" && next && `${NEXT_ACTION_LABEL[next]} · ${fmtDate(nextDate)}${nextNote.trim() ? ` · ${nextNote.trim()}` : ""} — 후속조치에 등록되었습니다.`}
            {done.status === "CLOSED" && "이 DB는 종료 처리되었습니다. 단장님 화면에도 반영되었습니다."}
          </div>
          {done.status !== "ASSIGNED" && <div className="mt-2 text-[0.9375rem] text-ink-2">이제 다음 DB를 신청할 수 있습니다.</div>}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <LinkButton href="/" size="lg" variant="secondary"><Home size={19} /> 홈으로</LinkButton>
          <LinkButton href={`/leads/${leadId}`} size="lg"><FileText size={19} /> DB 상세 보기</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Step n={1} title={isFollowUp ? "후속 진행은 어떻게 되었나요?" : "미팅은 진행되었나요?"} required>
        <ChoiceGroup name="outcome" columns={4} value={outcome} onChange={(v) => { setOutcome(v); if (v !== "DONE") { setReaction(null); setResult(null); } if (v === "NO_SHOW" && !next) setNext("CALL"); }} testId="outcome-choice"
          options={[{ value: "DONE", label: "완료" }, { value: "POSTPONED", label: "연기" }, { value: "CANCELLED", label: "취소" }, { value: "NO_SHOW", label: "부재" }]} />
      </Step>

      {needsNewMeeting && (
        <Step n={n()} title="새 미팅 일시" required>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={kstDateString()} data-testid="new-meeting-date" aria-label="새 미팅 날짜" />
            <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} step={600} aria-label="새 미팅 시간" />
          </div>
        </Step>
      )}

      {needsReactionResult && (
        <>
          <Step n={n()} title="상대 반응은 어땠나요?" required>
            <ChoiceGroup name="reaction" columns={3} value={reaction} onChange={setReaction} testId="reaction-choice"
              options={[{ value: "HIGH", label: "관심 높음" }, { value: "MID", label: "보통" }, { value: "LOW", label: "낮음" }]} />
          </Step>
          <Step n={n()} title="결과" required>
            <ChoiceGroup name="result" columns={3} value={result} onChange={(v) => { setResult(v); if (v === "HARD" && !next) setNext("NONE"); if (v === "MATERIAL_REQUEST" && !next) setNext("SEND_MATERIAL"); if (v === "REVISIT" && !next) setNext("REVISIT"); if ((v === "FOLLOW_UP_NEEDED" || v === "REVIEW_THEN_CONTACT") && !next) setNext("CALL"); }} testId="result-choice"
              options={(Object.keys(RESULT_LABEL) as MeetingResult[]).map((k) => ({ value: k, label: RESULT_LABEL[k] }))} />
          </Step>
          <Step n={n()} title="상담한 분야" hint="여러 개 고를 수 있습니다">
            <TagPicker name="topics" options={TOPIC_OPTIONS} value={topics} onChange={setTopics} />
          </Step>
          <Step n={n()} title="받을 자료 · 보낼 자료" hint="고르면 후속조치 때 빠뜨리지 않습니다">
            <TagPicker name="materials" options={MATERIAL_OPTIONS} value={materials} onChange={setMaterials} />
          </Step>
        </>
      )}

      {needsNext && (
        <Step n={n()} title="다음에 할 일" required>
          <ChoiceGroup name="next" columns={3} value={next} onChange={setNext} testId="next-choice"
            options={[{ value: "CALL", label: "전화" }, { value: "SEND_MATERIAL", label: "자료 전달" }, { value: "REVISIT", label: "재방문" }, { value: "OWNER_CHECK", label: "단장 확인 필요" }, { value: "NONE", label: "없음 (종료)" }]} />
          {next && next !== "NONE" && (
            <div className="mt-4 grid gap-4">
              <Field label="후속 예정일" required htmlFor="next-date">
                <div className="mb-2 flex flex-wrap gap-2">
                  {[{ l: "내일", d: 1 }, { l: "3일 후", d: 3 }, { l: "1주 후", d: 7 }, { l: "2주 후", d: 14 }].map((q) => (
                    <button key={q.d} type="button" onClick={() => setNextDate(addDays(q.d))} className={`min-h-[44px] rounded-xl border-2 px-3.5 text-[0.9375rem] font-semibold transition-base ${nextDate === addDays(q.d) ? "border-primary bg-soft text-primary" : "border-line bg-white text-ink-2 hover:border-primary/40"}`}>{q.l}</button>
                  ))}
                </div>
                <Input id="next-date" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} min={kstDateString()} data-testid="next-date" />
              </Field>
              <Field label="구체적으로 할 일 (선택)" htmlFor="next-note" hint="후속조치 목록에 그대로 보입니다">
                <Input id="next-note" value={nextNote} onChange={(e) => setNextNote(e.target.value)} placeholder={NEXT_NOTE_HINT[next] ?? ""} data-testid="next-note" />
              </Field>
            </div>
          )}
        </Step>
      )}

      {outcome && (
        <Step n={n()} title="미팅 요약 한 줄 (선택)">
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 신규 생산라인 도입 검토 중. 시설자금 관심 높음" data-testid="memo" />
          {!showDetail ? (
            <button type="button" onClick={() => { setShowDetail(true); if (!detail) setDetail(MEMO_TEMPLATE); }} className="mt-2 min-h-[44px] text-[0.9375rem] font-semibold text-primary hover:underline" data-testid="detail-memo-open">+ 상세 메모 (양식 넣기)</button>
          ) : (
            <div className="mt-3"><Field label="상세 메모" htmlFor="detail" hint="양식의 빈칸만 채우면 됩니다"><Textarea id="detail" value={detail} onChange={(e) => setDetail(e.target.value)} className="min-h-[160px]" data-testid="detail-memo" /></Field></div>
          )}
        </Step>
      )}

      <div className="sticky bottom-[72px] z-10 flex gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-card backdrop-blur lg:bottom-4">
        <LinkButton href={`/leads/${leadId}`} variant="secondary" size="lg" className="flex-1">취소</LinkButton>
        <Button size="lg" className="flex-[2] text-[1.125rem]" disabled={!canSubmit || pending} onClick={submit} data-testid="report-submit">
          <CheckCircle2 size={20} /> {pending ? "저장 중…" : "결과 저장"}
        </Button>
      </div>
    </div>
  );
}

function Step({ n, title, required, hint, children }: { n: number; title: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <section className="fade-up rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-[1.125rem] font-bold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[0.9375rem] font-bold text-white">{n}</span>
        {title} {required && <span className="text-danger">*</span>}
        {hint && <span className="text-[0.875rem] font-medium text-ink-3">{hint}</span>}
      </h2>
      {children}
    </section>
  );
}
