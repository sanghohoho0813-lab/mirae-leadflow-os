import Link from "next/link";
import { GraduationCap, ChevronRight, Sparkles, CalendarClock } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { TrainingHighlights } from "@/lib/trainings";
import { fmtShortDate, fmtTime } from "@/lib/time";

/** 홈의 교육 카드: 다음 교육 + 가장 최근 요약 (안 봤으면 강조). */
export function TrainingHomeCard({ h, showReads, className = "" }: { h: TrainingHighlights; showReads?: boolean; className?: string }) {
  const { next, latest } = h;
  return (
    <Card className={className} testId="home-training">
      <CardHeader icon={<GraduationCap size={20} />} title="교육" href="/trainings" hrefLabel="교육 자료실" />
      <CardBody className="grid gap-2.5">
        {latest?.summary && (
          <Link prefetch={false} href={`/trainings/${latest.id}`} className="lift press group block rounded-xl border border-line p-4">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[14px] font-semibold text-ink-3">
              <Sparkles size={15} className="text-gold" /> 지난 교육 핵심 · {fmtShortDate(latest.held_at)} {latest.instructor_name}
              {!latest.read_by_me && <span className="rounded-md bg-danger px-1.5 py-0.5 text-[12.5px] text-white">새 요약</span>}
            </div>
            <div className="text-[17px] font-bold text-ink group-hover:text-primary">{latest.title}</div>
            <p className="mt-1 line-clamp-2 text-[15.5px] text-ink-2">{latest.summary.one_line}</p>
            <div className="mt-2 flex items-center justify-between text-[14.5px]">
              {showReads ? <span className="font-semibold text-ink-3">{Math.max(h.members - 1, 0)}명 중 {latest.read_count}명 확인</span> : <span />}
              <span className="inline-flex items-center font-semibold text-primary">요약 보기 <ChevronRight size={16} /></span>
            </div>
          </Link>
        )}
        {next && (
          <Link prefetch={false} href={`/trainings/${next.id}`} className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3 hover:bg-soft">
            <CalendarClock size={20} className="shrink-0 text-primary" />
            <div className="min-w-0 flex-1 leading-snug">
              <div className="text-[14px] font-semibold text-ink-3">다음 교육 · {fmtShortDate(next.held_at)} {fmtTime(next.held_at)} · {next.instructor_name}</div>
              <div className="truncate text-[16px] font-bold text-ink">{next.title}</div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-3" />
          </Link>
        )}
        {!latest?.summary && !next && <p className="text-[15.5px] text-ink-3">올라온 교육이 없습니다.</p>}
      </CardBody>
    </Card>
  );
}
