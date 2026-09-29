import Link from "next/link";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Paperclip, Sparkles, Megaphone } from "lucide-react";
import { canTeach, requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listTrainingMonth } from "@/lib/trainings";
import { fmtTime, kstDateString } from "@/lib/time";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { monthCells, scheduleTone, shiftMonth, WEEKDAYS } from "@/components/trainings/schedule";
import { EducationTabs } from "@/components/trainings/EducationTabs";
import { KindBadge } from "@/components/trainings/TrainingCard";

export const dynamic = "force-dynamic";

export default async function TrainingSchedulePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const viewer = await requireViewer();
  const today = kstDateString();
  const { m } = await searchParams;
  const ym = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : today.slice(0, 7);
  const items = await withUser(viewer.session.userId, (tx) => listTrainingMonth(tx, ym));
  const teacher = canTeach(viewer);
  const byDay = new Map<string, typeof items>();
  for (const t of items) {
    const d = kstDateString(t.held_at);
    byDay.set(d, [...(byDay.get(d) ?? []), t]);
  }
  const [y, mo] = ym.split("-").map(Number);
  const hasSamples = items.some((t) => t.is_sample);
  const legend = Array.from(new Map(items.map((t) => { const tone = scheduleTone(t); return [tone.label, tone]; })).values());

  return (
    <div className="fade-up">
      <PageHeader
        title="교육 일정"
        sub="월요일 단장 교육 · 수요일 본부장 교육. 날짜를 누르면 그날 교육이 보입니다."
        action={teacher ? (
          <LinkButton href={`/trainings/schedule/bulk?m=${ym}`} size="lg"><CalendarPlus size={20} /> 한 달 일정 등록</LinkButton>
        ) : undefined}
      />

      <EducationTabs active="schedule" />

      <div className="mb-3 flex items-center justify-between gap-2">
        <Link prefetch={false} href={`/trainings/schedule?m=${shiftMonth(ym, -1)}`} aria-label="이전 달" className="press flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white text-ink-2 hover:text-primary"><ChevronLeft size={22} /></Link>
        <div className="text-center">
          <h2 className="text-[1.375rem] font-extrabold text-ink" data-testid="schedule-month">{y}년 {mo}월</h2>
          {ym !== today.slice(0, 7) && <Link prefetch={false} href="/trainings/schedule" className="text-[0.9375rem] font-semibold text-primary">이번 달로</Link>}
        </div>
        <Link prefetch={false} href={`/trainings/schedule?m=${shiftMonth(ym, 1)}`} aria-label="다음 달" className="press flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white text-ink-2 hover:text-primary"><ChevronRight size={22} /></Link>
      </div>

      <div className="mb-3 overflow-hidden rounded-2xl border border-line bg-white shadow-card" data-testid="schedule-calendar">
        <div className="grid grid-cols-7 border-b border-line bg-canvas">
          {WEEKDAYS.map((w, i) => <div key={w} className={`py-2 text-center text-[0.875rem] font-bold ${i === 0 ? "text-danger" : i === 6 ? "text-info" : "text-ink-2"}`}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {monthCells(ym).map((d, i) => {
            if (!d) return <div key={`p${i}`} className="min-h-[3.75rem] border-b border-r border-line/60 bg-canvas/50 @2xl:min-h-[6rem]" />;
            const list = byDay.get(d) ?? [];
            const isToday = d === today;
            const dow = i % 7;
            const cell = (
              <>
                <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[0.9375rem] font-bold ${isToday ? "bg-primary text-white" : dow === 0 ? "text-danger" : dow === 6 ? "text-info" : "text-ink"}`}>{Number(d.slice(8))}</span>
                <div className="mt-1 hidden flex-col gap-1 @2xl:flex">
                  {list.map((t) => (
                    <span key={t.id} className={`truncate rounded-md px-1.5 py-0.5 text-[0.8125rem] font-semibold ${scheduleTone(t).chip} ${hasSamples && t.is_sample ? "opacity-60 outline-dashed outline-1 -outline-offset-1" : ""}`}>{fmtTime(t.held_at).replace(":00", "시")} {t.instructor_name}</span>
                  ))}
                </div>
                <div className="mt-1 flex justify-center gap-1 @2xl:hidden">
                  {list.map((t) => <span key={t.id} className={`h-2 w-2 rounded-full ${scheduleTone(t).dot}`} />)}
                </div>
              </>
            );
            const base = `min-h-[3.75rem] border-b border-r border-line/60 p-1 text-center @2xl:min-h-[6rem] @2xl:p-1.5 @2xl:text-left ${isToday ? "bg-soft/70" : ""}`;
            return list.length ? (
              <a key={d} href={`#d-${d}`} className={`${base} block hover:bg-soft`} data-testid={`cal-${d}`}>{cell}</a>
            ) : (
              <div key={d} className={base} data-testid={`cal-${d}`}>{cell}</div>
            );
          })}
        </div>
      </div>

      {legend.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1.5 px-1" aria-label="색 구분">
          {legend.map((l) => <span key={l.label} className="inline-flex items-center gap-1.5 text-[0.9062rem] font-semibold text-ink-2"><span className={`h-3 w-3 rounded-full ${l.dot}`} /> {l.label}</span>)}
          {hasSamples && <span className="inline-flex items-center gap-1.5 text-[0.9062rem] font-semibold text-ink-3"><span className="h-3 w-5 rounded-sm border border-dashed border-ink-3" /> 흐린 점선 = 예시</span>}
        </div>
      )}

      <h2 className="mb-2.5 flex items-center gap-2 text-[1.1875rem] font-bold text-ink"><CalendarDays size={20} className="text-primary" /> {mo}월 교육 {items.length}건</h2>
      {items.length ? (
        <ol className="grid gap-2.5" data-testid="schedule-list">
          {[...byDay.entries()].map(([d, list]) => (
            <li key={d} id={`d-${d}`} className="scroll-mt-24">
              {list.map((t) => {
                const tone = scheduleTone(t);
                const past = d < today;
                return (
                  <Link prefetch={false} key={t.id} href={`/trainings/${t.id}`} className={`lift press mb-2 flex gap-3.5 rounded-2xl p-4 ${hasSamples && t.is_sample ? "border-2 border-dashed border-line-strong bg-canvas/70" : `border bg-white shadow-card ${d === today ? "border-primary" : hasSamples ? "border-2 border-success/40" : "border-line"}`} ${past ? "opacity-85" : ""}`} data-testid="schedule-item" data-sample={t.is_sample ? "1" : undefined}>
                    <div className={`flex w-[64px] shrink-0 flex-col items-center justify-center self-start rounded-xl py-2 leading-tight ${tone.chip}`}>
                      <span className="text-[0.8125rem] font-semibold opacity-85">{Number(d.slice(5, 7))}월</span>
                      <span className="text-[1.5rem] font-extrabold">{Number(d.slice(8))}</span>
                      <span className="text-[0.8125rem] font-semibold opacity-85">{WEEKDAYS[new Date(`${d}T12:00:00Z`).getUTCDay()]}요일</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[0.8438rem] font-semibold text-ink-3">
                        {hasSamples && <KindBadge sample={t.is_sample} />}
                        {tone.label}
                        {d === today && <span className="rounded-md bg-primary px-1.5 py-0.5 text-white">오늘</span>}
                      </div>
                      <h3 className="text-[1.125rem] font-bold leading-snug text-ink">{t.title}</h3>
                      <p className="mt-0.5 text-[0.9375rem] text-ink-2">{t.instructor_name ?? "강사 미정"} · {fmtTime(t.held_at)}{t.location ? ` · ${t.location}` : ""}</p>
                      {t.notice && !past && <p className="mt-2 line-clamp-2 flex gap-1.5 rounded-xl bg-canvas px-3 py-2 text-[0.9375rem] text-ink"><Megaphone size={16} className="mt-0.5 shrink-0 text-primary" /> {t.notice.split("\n")[0]}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-3 text-[0.875rem] font-semibold text-ink-3">
                        {t.has_summary && <span className="inline-flex items-center gap-1 text-success"><Sparkles size={14} /> 핵심 요약</span>}
                        {t.file_count > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={14} /> 자료 {t.file_count}개</span>}
                      </div>
                    </div>
                    <ChevronRight size={20} className="mt-1 shrink-0 self-center text-ink-3" />
                  </Link>
                );
              })}
            </li>
          ))}
        </ol>
      ) : (
        <Empty tone="neutral" icon={<CalendarDays size={28} />} title={`${mo}월 교육 일정이 아직 없습니다`}
          desc={teacher ? "‘한 달 일정 등록’을 누르면 월·수 교육을 한 번에 넣을 수 있습니다." : "일정이 등록되면 여기에서 볼 수 있습니다."} />
      )}
    </div>
  );
}
