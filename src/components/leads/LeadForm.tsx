"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useSafeNavigate } from "@/components/providers/SafeActions";
import { Plus, Save, X } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Field";
import { TagPicker } from "@/components/ui/Choice";
import { Button, LinkButton } from "@/components/ui/Button";
import { CONTACT_TITLE_OPTIONS, INDUSTRY_TREE, INTEREST_TAG_OPTIONS } from "@/lib/labels";
import type { FormState } from "@/lib/actions/leads";
import type { LeadPrivateDetails, Lead } from "@/lib/types";
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

const TIMES = ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

function addDays(n: number) {
  return kstDateString(new Date(Date.now() + n * 86400000));
}

/** Older DBs kept these in separate boxes; editing folds them into one comment. */
function legacyComment(p?: LeadPrivateDetails | null): string {
  if (!p) return "";
  return [p.call_topic && `통화 주제: ${p.call_topic}`, p.meeting_reason, p.must_know, p.contact_traits, p.caution && `주의: ${p.caution}`, p.extra_note]
    .filter(Boolean).join("\n");
}

function Row({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[1.0625rem] font-bold text-ink">{label}{required && <span className="text-danger"> *</span>}</span>
        {hint && <span className="text-[0.875rem] text-ink-3">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} data-testid={testId}
      className={`press min-h-[2.75rem] rounded-xl border-2 px-3.5 text-[0.9375rem] font-semibold transition-base ${active ? "border-primary bg-soft text-primary" : "border-line bg-white text-ink-2 hover:border-primary/40"}`}>
      {children}
    </button>
  );
}

/**
 * 신규 DB 등록 — 한 장짜리. 핵심만: 업체 · 업종 · 장소 · 일시 · 만나는 분 · 관심 분야 · 코멘트.
 * 미팅은 모두 방문. 신청 전 공개 한 줄은 업종·관심 분야로 자동으로 만든다.
 */
export function LeadForm({ action, lead, priv, canPublishNow, cancelHref, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const navigate = useSafeNavigate();
  useEffect(() => { if (state.redirectTo) navigate(state.redirectTo); }, [state, navigate]);
  const busy = pending || Boolean(state.redirectTo);

  const initialIndustry = lead?.industry ?? "";
  const [group, setGroup] = useState<string | null>(() => INDUSTRY_TREE.find((g) => initialIndustry.startsWith(g.group))?.group ?? null);
  const [industry, setIndustry] = useState(initialIndustry);
  const [region, setRegion] = useState(lead?.region ?? "");
  const regionTouched = useRef(Boolean(lead?.region));
  const [date, setDate] = useState(lead ? kstDateString(lead.meeting_at) : "");
  const [time, setTime] = useState(lead ? kstTimeString(lead.meeting_at) : "10:00");
  const [title, setTitle] = useState(priv?.contact_title ?? "");
  const known = new Set(INTEREST_TAG_OPTIONS);
  const [interest, setInterest] = useState<string[]>(priv?.interest_tags ?? []);
  const [extraOptions, setExtraOptions] = useState<string[]>(() => (priv?.interest_tags ?? []).filter((t) => !known.has(t)));
  const [custom, setCustom] = useState("");

  const onAddress = (value: string) => {
    if (regionTouched.current) return;
    const r = regionFromAddress(value);
    if (r) setRegion(r);
  };
  const addCustom = () => {
    const t = custom.trim().slice(0, 20);
    if (!t) return;
    if (!extraOptions.includes(t) && !known.has(t)) setExtraOptions([...extraOptions, t]);
    if (!interest.includes(t)) setInterest([...interest, t]);
    setCustom("");
  };
  const quickDays = [{ l: "오늘", v: addDays(0) }, { l: "내일", v: addDays(1) }, { l: "모레", v: addDays(2) }];

  return (
    <form action={formAction} className="grid gap-4">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" data-testid="lead-form">
        <p className="mb-4 rounded-xl bg-soft px-4 py-2.5 text-[0.9375rem] text-ink-2">
          별표(*)만 채우면 등록됩니다. 연락처·주소·코멘트는 <b>배정된 담당자와 단장님만</b> 봅니다. 미팅은 모두 <b>방문</b>으로 등록됩니다.
        </p>

        <Row label="업체명" required>
          <Input id="company_name" name="company_name" defaultValue={lead?.company_name} placeholder="예: 성진테크(주)" required autoFocus />
        </Row>

        <Row label="업종" hint="큰 분류 → 세부를 눌러 고르세요">
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_TREE.map((g) => (
              <Chip key={g.group} active={group === g.group} testId={`industry-group-${g.group}`}
                onClick={() => { setGroup(g.group); if (!industry.startsWith(g.group)) setIndustry(g.group); }}>{g.group}</Chip>
            ))}
            <Chip active={group === "직접"} onClick={() => { setGroup("직접"); setIndustry(""); }}>직접 입력</Chip>
          </div>
          {group && group !== "직접" && (
            <div className="flex flex-wrap gap-2 rounded-xl bg-canvas p-2.5">
              {INDUSTRY_TREE.find((g) => g.group === group)!.items.map((it) => {
                const v = `${group} · ${it}`;
                return <Chip key={it} active={industry === v} onClick={() => setIndustry(v)} testId={`industry-${it}`}>{it}</Chip>;
              })}
            </div>
          )}
          {(group === "직접" || (industry && !group)) ? (
            <Input id="industry" name="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="예: 반도체 장비 부품" />
          ) : (
            <input type="hidden" name="industry" value={industry} />
          )}
        </Row>

        <Row label="미팅 장소" required hint="지도앱 주소를 붙여넣으면 지역이 자동으로 채워집니다">
          <Input id="address" name="address" defaultValue={priv?.address ?? ""} onChange={(e) => onAddress(e.target.value)} placeholder="주소 (예: 서울 강남구 테헤란로 123, 5층)" autoComplete="street-address" />
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[0.9375rem] font-semibold text-ink-2">지역</span>
            <Input id="region" name="region" value={region} onChange={(e) => { regionTouched.current = true; setRegion(e.target.value); }} placeholder="예: 서울 강남구" required />
          </div>
        </Row>

        <Row label="미팅 일시" required>
          <div className="flex flex-wrap gap-2">
            {quickDays.map((q) => <Chip key={q.l} active={date === q.v} onClick={() => setDate(q.v)}>{q.l}</Chip>)}
            <div className="min-w-[10rem] flex-1"><Input id="meeting_date" name="meeting_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t) => <Chip key={t} active={time === t} onClick={() => setTime(t)}>{t}</Chip>)}
            <div className="min-w-[8rem] flex-1"><Input id="meeting_time" name="meeting_time" type="time" step={600} value={time} onChange={(e) => setTime(e.target.value)} required /></div>
          </div>
        </Row>

        <Row label="만나는 분" hint="대표가 아니면 직책을 눌러 바꾸세요">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input id="contact_name" name="contact_name" defaultValue={priv?.contact_name ?? ""} placeholder="이름 (예: 이명수)" />
            <Input id="contact_phone" name="contact_phone" type="tel" inputMode="tel" defaultValue={priv?.contact_phone ?? ""} placeholder="연락처 010-0000-0000" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CONTACT_TITLE_OPTIONS.map((t) => <Chip key={t} active={title === t} onClick={() => setTitle(t)} testId={`title-${t}`}>{t}</Chip>)}
            <div className="min-w-[9rem] flex-1"><Input id="contact_title" name="contact_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="직책 직접 입력" /></div>
          </div>
        </Row>

        <Row label="관심을 보인 분야" hint="여러 개 고를 수 있습니다">
          <TagPicker name="interest_tags" options={[...INTEREST_TAG_OPTIONS, ...extraOptions]} value={interest} onChange={setInterest} />
          <div className="flex gap-2">
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} placeholder="기타 (직접 입력 후 추가)" aria-label="관심 분야 직접 입력" data-testid="interest-custom" />
            <button type="button" onClick={addCustom} className="press flex h-12 shrink-0 items-center gap-1 rounded-xl border border-line-strong bg-white px-4 text-[0.9375rem] font-semibold text-ink hover:bg-soft" data-testid="interest-add"><Plus size={17} /> 추가</button>
          </div>
        </Row>

        <Row label="특이사항 · 코멘트" hint="담당자가 꼭 알아야 할 것만">
          <Textarea id="extra_note" name="extra_note" defaultValue={legacyComment(priv)} className="min-h-[7rem]"
            placeholder={"예: 매출 약 80억, 신규 설비 자금 필요\n결정이 빠른 편, 숫자로 설명하면 좋아함\n주의: 오전 10시 이후 통화 선호"} />
        </Row>
      </section>

      {canPublishNow && (
        <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4 text-[1.0625rem] font-semibold text-ink shadow-card">
          <input type="checkbox" name="publish_now" className="h-6 w-6 accent-[var(--theme-primary)]" /> 저장하면서 바로 공개하기 (컨설턴트 신청 가능)
        </label>
      )}

      {state.error && <p className="flex items-center gap-2 rounded-xl bg-danger-bg px-4 py-3 text-[1rem] font-medium text-danger" role="alert"><X size={18} /> {state.error}</p>}

      <div className="sticky bottom-[72px] z-10 flex gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-card backdrop-blur lg:bottom-4">
        <LinkButton href={cancelHref} variant="secondary" size="lg" className="flex-1">취소</LinkButton>
        <Button type="submit" size="lg" className="flex-[2]" disabled={busy} data-testid="lead-submit"><Save size={20} /> {busy ? "저장 중…" : submitLabel}</Button>
      </div>
    </form>
  );
}
