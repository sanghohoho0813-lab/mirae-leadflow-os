import { GraduationCap, PlusCircle, Search, CalendarClock, BookOpen, Sparkles, ChevronRight } from "lucide-react";
import { canTeach, requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listAllFiles, listTrainings } from "@/lib/trainings";
import Link from "next/link";
import { FileRow } from "@/components/trainings/TrainingClient";
import { fmtShortDate, fmtTime } from "@/lib/time";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { KindBadge, TrainingCard } from "@/components/trainings/TrainingCard";
import { EducationTabs } from "@/components/trainings/EducationTabs";
import type { TrainingListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Show = "all" | "real" | "sample";

export default async function TrainingsPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string; show?: string }> }) {
  const viewer = await requireViewer();
  const { q = "", view, show: showParam } = await searchParams;
  const filesView = view === "files";
  const show: Show = showParam === "real" || showParam === "sample" ? showParam : "all";
  const [{ upcoming: allUpcoming, past: allPast }, files] = await withUser(viewer.session.userId, (tx) => Promise.all([
    filesView ? Promise.resolve({ upcoming: [], past: [] }) : listTrainings(tx, viewer.session.userId, { q }),
    filesView ? listAllFiles(tx, q) : Promise.resolve([]),
  ]));
  const teacher = canTeach(viewer);
  // 예시(체험용 샘플)가 섞여 있을 때만 예시/실제 표시와 거르기를 보여 준다.
  const hasSamples = [...allUpcoming, ...allPast].some((t) => t.is_sample) || files.some((f) => f.is_sample);
  const keep = (t: TrainingListItem) => show === "all" || (show === "real" ? !t.is_sample : t.is_sample);
  const upcoming = allUpcoming.filter(keep);
  const pastAll = allPast.filter(keep);
  // 맨 위 '복습할 교육': 이미 진행했고 요약이 있는 가장 최근 교육 (실제 교육 먼저).
  const now = Date.now();
  const held = pastAll.filter((t) => t.summary && new Date(t.held_at).getTime() <= now);
  const review = q ? null : held.find((t) => !t.is_sample) ?? held[0] ?? null;
  const past = review ? pastAll.filter((t) => t.id !== review.id) : pastAll;
  const unread = allPast.filter((t) => !t.read_by_me && t.summary).length;
  const qs = (next: Partial<{ q: string; show: Show }>) => {
    const p = new URLSearchParams();
    const nq = next.q ?? q; const ns = next.show ?? show;
    if (nq) p.set("q", nq);
    if (ns !== "all") p.set("show", ns);
    const s = p.toString();
    return s ? `/trainings?${s}` : "/trainings";
  };

  return (
    <div className="fade-up">
      <PageHeader
        title="교육 자료실"
        sub="들은 교육을 3분 만에 다시 봅니다. 월요일 단장 교육 · 수요일 본부장 교육."
        action={teacher ? <LinkButton href="/trainings/new" size="lg"><PlusCircle size={20} /> 교육 자료 올리기</LinkButton> : undefined}
      />

      <EducationTabs active={filesView ? "files" : "sessions"} />

      <form className="mb-4 flex gap-2" role="search">
        {filesView && <input type="hidden" name="view" value="files" />}
        {!filesView && show !== "all" && <input type="hidden" name="show" value={show} />}
        <label className="relative flex-1">
          <Search size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input name="q" defaultValue={q} placeholder={filesView ? "자료 이름으로 찾기 (예: 체크리스트)" : "교육 찾기 (예: 벤처인증, 고용지원금)"} className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-3 text-[1rem] outline-none focus:border-primary" data-testid="training-search" />
        </label>
        <button type="submit" className="press h-12 shrink-0 rounded-xl bg-ink px-5 text-[1rem] font-semibold text-white">찾기</button>
      </form>

      {!filesView && hasSamples && (
        <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="training-filter">
          {([["all", "전체"], ["real", "실제 교육만"], ["sample", "예시만"]] as const).map(([v, l]) => (
            <Link prefetch={false} key={v} href={qs({ show: v })} data-testid={`training-filter-${v}`} aria-pressed={show === v}
              className={`press flex h-11 items-center rounded-full border-2 px-4 text-[0.9688rem] font-bold ${show === v ? "border-primary bg-primary text-white" : "border-line bg-white text-ink-2 hover:border-primary/40"}`}>{l}</Link>
          ))}
          <span className="text-[0.875rem] text-ink-3">점선 카드 = 체험용 예시</span>
        </div>
      )}

      {q && <p className="mb-3 text-[0.9375rem] text-ink-2">‘{q}’ 검색 결과 {filesView ? files.length : upcoming.length + pastAll.length}건</p>}

      {filesView ? (
        files.length ? (
          <ul className="grid gap-2" data-testid="file-library">
            {files.map((f) => (
              <FileRow key={f.id} f={f} trainingId={f.training_id} canDelete={false}
                sub={<Link prefetch={false} href={`/trainings/${f.training_id}`} className="hover:text-primary hover:underline">{f.is_sample && hasSamples ? <b className="mr-1 text-warning">예시</b> : null}{fmtShortDate(f.held_at)} · {f.instructor_name ?? ""} · {f.training_title}</Link>} />
            ))}
          </ul>
        ) : (
          <Empty tone="neutral" icon={<GraduationCap size={28} />} title={q ? "찾는 자료가 없습니다" : "아직 올라온 자료가 없습니다"} desc="교육마다 올린 PPT·PDF·녹음 파일이 여기에 한꺼번에 모입니다." />
        )
      ) : (<>

      {review && (
        <section className="mb-6" data-testid="training-review">
          <h2 className="mb-2.5 flex items-center gap-2 text-[1.1875rem] font-bold text-ink"><Sparkles size={20} className="text-gold" /> 복습할 교육</h2>
          <Link prefetch={false} href={`/trainings/${review.id}`} data-testid="training-card" className={`lift press group block rounded-2xl p-5 ${hasSamples && review.is_sample ? "border-2 border-dashed border-line-strong bg-canvas/70" : "border-2 border-primary/30 bg-white shadow-card"}`}>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[0.9062rem] font-semibold text-ink-3">
              {hasSamples && <KindBadge sample={review.is_sample} />}
              <span>{fmtShortDate(review.held_at)} {fmtTime(review.held_at)} · {review.instructor_name}</span>
              {!review.read_by_me && !review.is_mine && <span className="rounded-md bg-danger px-1.5 py-0.5 text-[0.8125rem] text-white" data-testid="training-new">아직 안 봄</span>}
            </div>
            <h3 className="text-[1.25rem] font-extrabold leading-snug text-ink group-hover:text-primary">{review.title}</h3>
            <p className="mt-2 rounded-xl bg-soft px-4 py-3 text-[1.0625rem] font-bold leading-snug text-ink">{review.summary!.one_line}</p>
            <ol className="mt-3 grid gap-1.5">
              {review.summary!.key_points.slice(0, 3).map((p, i) => (
                <li key={i} className="flex gap-2.5 text-[1rem] leading-snug text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[0.8125rem] font-bold text-white">{i + 1}</span>
                  <span className="line-clamp-2">{p}</span>
                </li>
              ))}
            </ol>
            <span className="mt-4 flex h-12 items-center justify-center gap-1 rounded-xl bg-primary text-[1.0625rem] font-bold text-white">핵심 정리 전체 보기 <ChevronRight size={19} /></span>
          </Link>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 flex items-center gap-2 text-[1.1875rem] font-bold text-ink"><CalendarClock size={20} className="text-primary" /> 다가오는 교육</h2>
          <div className="stagger grid gap-2.5 @4xl:grid-cols-2">
            {upcoming.map((t) => <TrainingCard key={t.id} t={t} upcoming showKind={hasSamples} />)}
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
            {past.map((t) => <TrainingCard key={t.id} t={t} showKind={hasSamples} />)}
          </div>
        ) : !review ? (
          <Empty tone="neutral" icon={<GraduationCap size={28} />} title={q ? "찾는 교육이 없습니다" : "아직 올라온 교육이 없습니다"}
            desc={teacher ? "교육이 끝나면 자료와 녹취·메모를 올려 주세요. AI가 핵심을 정리합니다." : "교육 자료가 올라오면 여기에서 볼 수 있습니다."} />
        ) : null}
      </section>
      </>)}
    </div>
  );
}
