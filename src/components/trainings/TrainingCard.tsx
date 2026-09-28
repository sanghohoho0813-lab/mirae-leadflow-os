import Link from "next/link";
import { ChevronRight, Paperclip, Sparkles, CheckCircle2, Megaphone } from "lucide-react";
import type { TrainingListItem } from "@/lib/types";
import { fmtTime, kstDateString, weekdayKo } from "@/lib/time";

/** 월요일 = 단장 교육, 수요일 = 본부장 교육 (other days: 특별 교육). */
export function sessionKind(t: { held_at: Date; instructor_role: string | null; instructor_division?: string | null }): string {
  const w = weekdayKo(t.held_at);
  if (w === "월") return "월요일 · 단장 교육";
  if (w === "수") return `수요일 · ${t.instructor_division ? `${t.instructor_division} ` : ""}본부장 교육`;
  return `${w}요일 · 특별 교육`;
}

export function DateBlock({ d, highlight }: { d: Date; highlight?: boolean }) {
  const [, m, day] = kstDateString(d).split("-");
  return (
    <div className={`flex w-[64px] shrink-0 flex-col items-center justify-center self-start rounded-xl py-2 leading-tight ${highlight ? "bg-primary text-white" : "bg-soft text-primary"}`}>
      <span className="text-[0.8125rem] font-semibold opacity-85">{Number(m)}월</span>
      <span className="text-[1.5rem] font-extrabold">{Number(day)}</span>
      <span className="text-[0.8125rem] font-semibold opacity-85">{weekdayKo(d)}요일</span>
    </div>
  );
}

export function TrainingCard({ t, upcoming }: { t: TrainingListItem; upcoming?: boolean }) {
  const isToday = kstDateString(t.held_at) === kstDateString();
  const isNew = !upcoming && !t.read_by_me && !!t.summary;
  return (
    <Link prefetch={false} href={`/trainings/${t.id}`} className="lift press group flex gap-3.5 rounded-2xl border border-line bg-white p-4 shadow-card" data-testid="training-card">
      <DateBlock d={t.held_at} highlight={isToday} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[0.8438rem] font-semibold">
          <span className="text-ink-3">{sessionKind(t)}</span>
          {isToday && <span className="rounded-md bg-primary px-1.5 py-0.5 text-white">오늘</span>}
          {isNew && <span className="rounded-md bg-danger px-1.5 py-0.5 text-white" data-testid="training-new">새 요약</span>}
          {!upcoming && t.read_by_me && !t.is_mine && <span className="inline-flex items-center gap-0.5 text-success"><CheckCircle2 size={14} /> 확인함</span>}
          {t.is_mine && <span className="text-ink-3">· 내가 진행</span>}
        </div>
        <h3 className="text-[1.125rem] font-bold leading-snug text-ink group-hover:text-primary">{t.title}</h3>
        <p className="mt-0.5 text-[0.9375rem] text-ink-2">{t.instructor_name ?? "강사 미정"} · {fmtTime(t.held_at)}</p>
        {t.summary ? (
          <p className="mt-2 flex gap-1.5 rounded-xl bg-canvas px-3 py-2 text-[0.9688rem] leading-snug text-ink">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-gold" />
            <span className="line-clamp-2">{t.summary.one_line}</span>
          </p>
        ) : upcoming && t.notice ? (
          <div className={`mt-2 flex gap-1.5 rounded-xl px-3 py-2.5 text-[0.9688rem] leading-relaxed ${isToday ? "bg-soft text-ink" : "bg-canvas text-ink"}`} data-testid="training-notice">
            <Megaphone size={17} className="mt-1 shrink-0 text-primary" />
            <span className={`whitespace-pre-line ${isToday ? "" : "line-clamp-3"}`}>{t.notice}</span>
          </div>
        ) : upcoming ? (
          <p className="mt-2 text-[0.9375rem] text-ink-3">교육이 끝나면 자료와 핵심 요약이 여기에 올라옵니다.</p>
        ) : null}
        {t.file_count > 0 && <p className="mt-2 inline-flex items-center gap-1 text-[0.875rem] font-semibold text-ink-3"><Paperclip size={14} /> 자료 {t.file_count}개</p>}
      </div>
      <ChevronRight size={20} className="mt-1 shrink-0 self-center text-ink-3" />
    </Link>
  );
}
