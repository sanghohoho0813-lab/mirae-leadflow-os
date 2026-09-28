import { GraduationCap, PlusCircle, Search, CalendarClock, BookOpen } from "lucide-react";
import { canTeach, requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listAllFiles, listTrainings } from "@/lib/trainings";
import Link from "next/link";
import { FileRow } from "@/components/trainings/TrainingClient";
import { fmtShortDate } from "@/lib/time";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { TrainingCard } from "@/components/trainings/TrainingCard";

export const dynamic = "force-dynamic";

export default async function TrainingsPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const viewer = await requireViewer();
  const { q = "", view } = await searchParams;
  const filesView = view === "files";
  const [{ upcoming, past }, files] = await withUser(viewer.session.userId, (tx) => Promise.all([
    filesView ? Promise.resolve({ upcoming: [], past: [] }) : listTrainings(tx, viewer.session.userId, { q }),
    filesView ? listAllFiles(tx, q) : Promise.resolve([]),
  ]));
  const teacher = canTeach(viewer);
  const unread = past.filter((t) => !t.read_by_me && t.summary).length;

  return (
    <div className="fade-up">
      <PageHeader
        title="교육 자료실"
        sub="월요일 단장 교육 · 수요일 본부장 교육. 자료와 핵심 요약을 한 곳에 모아 둡니다."
        action={teacher ? <LinkButton href="/trainings/new" size="lg"><PlusCircle size={20} /> 교육 자료 올리기</LinkButton> : undefined}
      />

      <div className="mb-3 inline-flex rounded-xl border border-line bg-white p-1" role="tablist" aria-label="보기">
        {[{ v: "", l: "교육별로 보기" }, { v: "files", l: "자료 모아보기" }].map((t) => (
          <Link prefetch={false} key={t.v} href={t.v ? `/trainings?view=${t.v}` : "/trainings"} role="tab" aria-selected={(t.v === "files") === filesView} data-testid={`trainings-view-${t.v || "sessions"}`}
            className={`press flex h-11 items-center rounded-lg px-4 text-[0.9688rem] font-semibold ${(t.v === "files") === filesView ? "bg-primary text-white" : "text-ink-2 hover:bg-neutral-bg"}`}>{t.l}</Link>
        ))}
      </div>

      <form className="mb-5 flex gap-2" role="search">
        {filesView && <input type="hidden" name="view" value="files" />}
        <label className="relative flex-1">
          <Search size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input name="q" defaultValue={q} placeholder={filesView ? "자료 이름으로 찾기 (예: 체크리스트, 정책자금)" : "지난 교육 찾기 (예: 연구소, 고용지원금, 화법)"} className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-3 text-[1rem] outline-none focus:border-primary" data-testid="training-search" />
        </label>
        <button type="submit" className="press h-12 shrink-0 rounded-xl bg-ink px-5 text-[1rem] font-semibold text-white">찾기</button>
      </form>

      {q && <p className="mb-3 text-[0.9375rem] text-ink-2">‘{q}’ 검색 결과 {filesView ? files.length : upcoming.length + past.length}건</p>}

      {filesView ? (
        files.length ? (
          <ul className="grid gap-2" data-testid="file-library">
            {files.map((f) => (
              <FileRow key={f.id} f={f} trainingId={f.training_id} canDelete={false}
                sub={<Link prefetch={false} href={`/trainings/${f.training_id}`} className="hover:text-primary hover:underline">{fmtShortDate(f.held_at)} · {f.instructor_name ?? ""} · {f.training_title}</Link>} />
            ))}
          </ul>
        ) : (
          <Empty tone="neutral" icon={<GraduationCap size={28} />} title={q ? "찾는 자료가 없습니다" : "아직 올라온 자료가 없습니다"} desc="교육마다 올린 PPT·PDF·녹음 파일이 여기에 한꺼번에 모입니다." />
        )
      ) : (<>

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
      </>)}
    </div>
  );
}
