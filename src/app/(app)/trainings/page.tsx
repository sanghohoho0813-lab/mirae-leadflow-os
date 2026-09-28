import { GraduationCap, PlusCircle, Search, CalendarClock, BookOpen } from "lucide-react";
import { canTeach, requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listTrainings } from "@/lib/trainings";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { TrainingCard } from "@/components/trainings/TrainingCard";

export const dynamic = "force-dynamic";

export default async function TrainingsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireViewer();
  const { q = "" } = await searchParams;
  const { upcoming, past } = await withUser(viewer.session.userId, (tx) => listTrainings(tx, viewer.session.userId, { q }));
  const teacher = canTeach(viewer);
  const unread = past.filter((t) => !t.read_by_me && t.summary).length;

  return (
    <div className="fade-up">
      <PageHeader
        title="교육 자료실"
        sub="월요일 단장 교육 · 수요일 본부장 교육. 자료와 핵심 요약을 한 곳에 모아 둡니다."
        action={teacher ? <LinkButton href="/trainings/new" size="lg"><PlusCircle size={20} /> 교육 자료 올리기</LinkButton> : undefined}
      />

      <form className="mb-5 flex gap-2" role="search">
        <label className="relative flex-1">
          <Search size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input name="q" defaultValue={q} placeholder="지난 교육 찾기 (예: 연구소, 고용지원금, 화법)" className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-3 text-[1rem] outline-none focus:border-primary" data-testid="training-search" />
        </label>
        <button type="submit" className="press h-12 shrink-0 rounded-xl bg-ink px-5 text-[1rem] font-semibold text-white">찾기</button>
      </form>

      {q && <p className="mb-3 text-[0.9375rem] text-ink-2">‘{q}’ 검색 결과 {upcoming.length + past.length}건</p>}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 flex items-center gap-2 text-[1.1875rem] font-bold text-ink"><CalendarClock size={20} className="text-primary" /> 다가오는 교육</h2>
          <div className="stagger grid gap-2.5 @4xl:grid-cols-2">
            {upcoming.map((t) => <TrainingCard key={t.id} t={t} upcoming />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2.5 flex items-center gap-2 text-[1.1875rem] font-bold text-ink">
          <BookOpen size={20} className="text-primary" /> 지난 교육
          {unread > 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-[0.8125rem] font-bold text-white">안 본 요약 {unread}</span>}
        </h2>
        {past.length ? (
          <div className="stagger grid gap-2.5 @4xl:grid-cols-2">
            {past.map((t) => <TrainingCard key={t.id} t={t} />)}
          </div>
        ) : (
          <Empty tone="neutral" icon={<GraduationCap size={28} />} title={q ? "찾는 교육이 없습니다" : "아직 올라온 교육이 없습니다"}
            desc={teacher ? "교육이 끝나면 자료와 녹취·메모를 올려 주세요. AI가 핵심을 정리합니다." : "교육 자료가 올라오면 여기에서 볼 수 있습니다."} />
        )}
      </section>
    </div>
  );
}
