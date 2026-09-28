"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useSafeNavigate } from "@/components/providers/SafeActions";
import { Save } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { ChoiceGroup, TagPicker } from "@/components/ui/Choice";
import { Button, LinkButton } from "@/components/ui/Button";
import { INTEREST_TAG_OPTIONS, CONCERN_TAG_OPTIONS } from "@/lib/labels";
import type { FormState } from "@/lib/actions/leads";
import type { LeadPrivateDetails, Lead, MeetingMethod } from "@/lib/types";
import { kstDateString, kstTimeString } from "@/lib/time";
import { regionFromAddress } from "@/lib/geo";

interface Props {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  lead?: Lead | null;
  priv?: LeadPrivateDetails | null;
  canPublishNow?: boolean;
  cancelHref: string;
  submitLabel: string;
}

export function LeadForm({ action, lead, priv, canPublishNow, cancelHref, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const navigate = useSafeNavigate();
  useEffect(() => { if (state.redirectTo) navigate(state.redirectTo); }, [state, navigate]);
  const busy = pending || Boolean(state.redirectTo);
  const [method, setMethod] = useState<MeetingMethod>(lead?.meeting_method ?? "VISIT");
  const [interest, setInterest] = useState<string[]>(priv?.interest_tags ?? []);
  const [concern, setConcern] = useState<string[]>(priv?.concern_tags ?? []);
  const [region, setRegion] = useState(lead?.region ?? "");
  // Region follows the pasted address until the user edits it by hand.
  const regionTouched = useRef(Boolean(lead?.region));
  const onAddress = (value: string) => {
    if (regionTouched.current) return;
    const r = regionFromAddress(value);
    if (r) setRegion(r);
  };

  return (
    <form action={formAction} className="grid gap-5">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-1 text-[19px] font-bold text-ink">1. 미팅 기본 정보</h2>
        <p className="mb-4 text-[15px] text-ink-2">컨설턴트에게 <b>신청 전에도 공개</b>되는 정보입니다.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="업체명" required htmlFor="company_name"><Input id="company_name" name="company_name" defaultValue={lead?.company_name} placeholder="예: 성진테크(주)" required autoFocus /></Field>
          <Field label="지역" required htmlFor="region" hint="아래 ‘미팅 장소 주소’를 붙여넣으면 자동으로 채워집니다.">
            <Input id="region" name="region" value={region} onChange={(e) => { regionTouched.current = true; setRegion(e.target.value); }} placeholder="예: 서울 강남구" required />
          </Field>
          <Field label="업종" htmlFor="industry"><Input id="industry" name="industry" defaultValue={lead?.industry ?? ""} placeholder="예: 자동차 부품 제조" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="미팅 날짜" required htmlFor="meeting_date"><Input id="meeting_date" name="meeting_date" type="date" defaultValue={lead ? kstDateString(lead.meeting_at) : ""} required /></Field>
            <Field label="시간" required htmlFor="meeting_time"><Input id="meeting_time" name="meeting_time" type="time" step={600} defaultValue={lead ? kstTimeString(lead.meeting_at) : "10:00"} required /></Field>
          </div>
        </div>
        <div className="mt-4">
          <Field label="미팅 방식" required>
            <ChoiceGroup name="meeting_method" columns={3} value={method} onChange={setMethod} options={[{ value: "VISIT", label: "방문" }, { value: "PHONE", label: "전화" }, { value: "ONLINE", label: "온라인" }]} testId="method-choice" />
            <input type="hidden" name="meeting_method" value={method} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="공개용 한줄 정보" htmlFor="public_summary" hint="신청 전 컨설턴트가 보는 한 줄. 예: 직원 30명, 정책자금 관심">
            <Input id="public_summary" name="public_summary" defaultValue={lead?.public_summary ?? ""} placeholder="예: 금속 가공업, 직원 30명, 고용지원금 관심" maxLength={120} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-1 text-[19px] font-bold text-ink">2. 미팅 장소 · 상대방</h2>
        <p className="mb-4 text-[15px] text-ink-2"><b>배정된 담당자와 운영진에게만</b> 공개됩니다. 담당자는 주소를 한 번에 복사하거나 지도앱으로 바로 열 수 있습니다.</p>
        <div className="mb-4">
          <Field label="미팅 장소 주소" htmlFor="address" hint="네이버·카카오 지도에서 복사한 주소를 그대로 붙여넣어도 됩니다.">
            <Input id="address" name="address" defaultValue={priv?.address ?? ""} onChange={(e) => onAddress(e.target.value)} placeholder="예: 서울 강남구 테헤란로 123, 5층" autoComplete="street-address" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="이름" htmlFor="contact_name"><Input id="contact_name" name="contact_name" defaultValue={priv?.contact_name ?? ""} placeholder="예: 이명수" /></Field>
          <Field label="직책" htmlFor="contact_title"><Input id="contact_title" name="contact_title" defaultValue={priv?.contact_title ?? ""} placeholder="예: 대표" /></Field>
          <Field label="연락처" htmlFor="contact_phone"><Input id="contact_phone" name="contact_phone" type="tel" inputMode="tel" defaultValue={priv?.contact_phone ?? ""} placeholder="010-0000-0000" /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-1 text-[19px] font-bold text-ink">3. 상세 콜 메모</h2>
        <p className="mb-4 text-[15px] text-ink-2">통화하면서 느낀 것을 태그로 고르고, 필요한 것만 짧게 적어 주세요. 담당자가 미팅을 준비하는 데 가장 큰 도움이 됩니다.</p>
        <div className="grid gap-5">
          <Field label="어떤 주제로 통화했나요?" htmlFor="call_topic"><Input id="call_topic" name="call_topic" defaultValue={priv?.call_topic ?? ""} placeholder="예: 신규 생산라인 자금" /></Field>
          <Field label="관심을 보인 부분"><TagPicker name="interest_tags" options={INTEREST_TAG_OPTIONS} value={interest} onChange={setInterest} /></Field>
          <Field label="부정적으로 반응한 부분"><TagPicker name="concern_tags" options={CONCERN_TAG_OPTIONS} value={concern} onChange={setConcern} /></Field>
          <Field label="미팅이 잡힌 이유" htmlFor="meeting_reason"><Textarea id="meeting_reason" name="meeting_reason" defaultValue={priv?.meeting_reason ?? ""} placeholder="예: 신규 생산라인 도입 검토 중, 자금 조달 방법 상담 요청" /></Field>
          <Field label="미팅 시 꼭 알아야 할 것" htmlFor="must_know"><Textarea id="must_know" name="must_know" defaultValue={priv?.must_know ?? ""} placeholder="예: 매출 80억, 기존 연구소 없음, 신용보증 이용 이력 있음" /></Field>
          <Field label="상대방 특징" htmlFor="contact_traits"><Input id="contact_traits" name="contact_traits" defaultValue={priv?.contact_traits ?? ""} placeholder="예: 결정이 빠름, 숫자에 민감" /></Field>
          <Field label="주의사항" htmlFor="caution" hint="담당자 화면에 눈에 띄게 표시됩니다."><Input id="caution" name="caution" defaultValue={priv?.caution ?? ""} placeholder="예: 오전 10시 이후 통화 선호, 세무사 비판 금지" /></Field>
          <Field label="기타 코멘트" htmlFor="extra_note"><Textarea id="extra_note" name="extra_note" defaultValue={priv?.extra_note ?? ""} /></Field>
        </div>
      </section>

      {canPublishNow && (
        <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4 text-[17px] font-semibold text-ink shadow-card">
          <input type="checkbox" name="publish_now" className="h-6 w-6 accent-[var(--theme-primary)]" /> 저장하면서 바로 공개하기 (컨설턴트 신청 가능)
        </label>
      )}

      {state.error && <p className="rounded-xl bg-danger-bg px-4 py-3 text-[16px] font-medium text-danger" role="alert">{state.error}</p>}

      <div className="sticky bottom-[72px] z-10 flex gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-card backdrop-blur lg:bottom-4">
        <LinkButton href={cancelHref} variant="secondary" size="lg" className="flex-1">취소</LinkButton>
        <Button type="submit" size="lg" className="flex-[2]" disabled={busy} data-testid="lead-submit"><Save size={20} /> {busy ? "저장 중…" : submitLabel}</Button>
      </div>
    </form>
  );
}
