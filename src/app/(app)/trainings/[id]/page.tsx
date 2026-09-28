import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, ListChecks, MessageSquareQuote, Paperclip, Link2, NotebookText, Users, Pencil, Info, ExternalLink } from "lucide-react";
import { canTeach, isManager, requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { getReadStatus, getTraining, getTrainingFiles } from "@/lib/trainings";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { DeleteTrainingButton, FileRow, ReadButton, SummarizeButton } from "@/components/trainings/TrainingClient";
import { DateBlock, sessionKind } from "@/components/trainings/TrainingCard";
import { fmtDateTime, fmtRelativeTime } from "@/lib/time";
import type { Training } from "@/lib/types";

export const dynamic = "force-dynamic";
// AI summaries can take up to ~50s.
export const maxDuration = 60;

function summaryText(t: Training): string {
  const s = t.summary!;
  const lines = [`[교육 핵심 정리] ${t.title}`, `${fmtDateTime(t.held_at)} · ${t.instructor_name ?? ""}`, "", `한 줄 요약: ${s.one_line}`, "", "■ 핵심 내용", ...s.key_points.map((p, i) => `${i + 1}. ${p}`)];
  if (s.action_items.length) lines.push("", "■ 현장에서 바로 할 일", ...s.action_items.map((a) => `□ ${a}`));
  if (s.talk_tracks.length) lines.push("", "■ 상담에 쓰는 말", ...s.talk_tracks.map((a) => `- ${a}`));
  return lines.join("\n");
}

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const uid = viewer.session.userId;
  const data = await withUser(uid, async (tx) => {
    const t = await getTraining(tx, id, uid);
    if (!t) return null;
    const [files, reads] = await Promise.all([getTrainingFiles(tx, id), isManager(viewer) || t.instructor_id === uid || t.created_by === uid ? getReadStatus(tx, id) : Promise.resolve(null)]);
    return { t, files, reads };
  });
  if (!data) notFound();
  const { t, files, reads } = data;
  const teacher = canTeach(viewer);
  const canEdit = teacher && (isManager(viewer) || t.created_by === uid || t.instructor_id === uid);
  const s = t.summary;
  const readers = reads?.filter((r) => r.read_at) ?? [];
  const notYet = reads?.filter((r) => !r.read_at && r.id !== t.instructor_id) ?? [];

  return (
    <div className="fade-up mx-auto max-w-4xl">
      <PageHeader back="/trainings" backLabel="교육 자료실" title={t.title}
        eyebrow={<span className="text-[0.9375rem] font-semibold text-ink-3">{sessionKind(t)}</span>}
        action={canEdit ? <><LinkButton href={`/trainings/${t.id}/edit`} variant="secondary"><Pencil size={18} /> 수정</LinkButton><DeleteTrainingButton id={t.id} /></> : undefined} />

      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
        <DateBlock d={t.held_at} />
        <div className="leading-snug">
          <div className="text-[1.0625rem] font-bold text-ink">{fmtDateTime(t.held_at)}</div>
          <div className="text-[1rem] text-ink-2">강사 {t.instructor_name ?? "미정"}</div>
          {t.summarized_at && <div className="text-[0.875rem] text-ink-3">요약 {fmtRelativeTime(t.summarized_at)} · {t.summary_source === "AI" ? "AI 정리" : "기본 요약"}</div>}
        </div>
      </div>

      {/* 자료 */}
      <section className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-[1.1875rem] font-bold text-ink"><Paperclip size={20} className="text-primary" /> 교육 자료 <span className="text-[1rem] font-semibold text-ink-3">{files.length + t.links.length}개</span></h2>
        {files.length + t.links.length === 0 ? (
          <p className="text-[1rem] text-ink-3">올라온 자료가 없습니다.{canEdit ? " [수정]에서 PPT·PDF·녹음 파일을 올릴 수 있습니다." : ""}</p>
        ) : (
          <ul className="grid gap-2">
            {files.map((f) => <FileRow key={f.id} f={f} trainingId={t.id} canDelete={canEdit} />)}
            {t.links.map((l, i) => (
              <li key={i}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="lift flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-primary"><Link2 size={20} /></span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[1rem] font-semibold text-ink">{l.label || "링크"}</span>
                    <span className="block truncate text-[0.875rem] text-ink-3">{l.url}</span>
                  </span>
                  <ExternalLink size={18} className="shrink-0 text-ink-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 핵심 정리 */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-line bg-white shadow-card" data-testid="training-summary">
        <header className="flex flex-wrap items-center justify-between gap-2 bg-shell px-5 py-4 text-white">
          <h2 className="flex items-center gap-2 text-[1.1875rem] font-bold"><Sparkles size={20} className="text-highlight" /> 핵심 정리</h2>
          {s && <span className="rounded-md bg-white/12 px-2 py-0.5 text-[0.8125rem] font-semibold text-white/80">{t.summary_source === "AI" ? "AI 정리" : "기본 요약 · AI 연결 시 더 정확"}</span>}
        </header>
        {s ? (
          <div className="grid gap-5 p-5">
            <p className="rounded-xl bg-soft px-4 py-3.5 text-[1.1562rem] font-bold leading-snug text-ink" data-testid="summary-one-line">{s.one_line}</p>
            <div>
              <h3 className="mb-2 text-[1.0625rem] font-bold text-ink">핵심 내용</h3>
              <ol className="grid gap-2">
                {s.key_points.map((p, i) => (
                  <li key={i} className="flex gap-3 text-[1.0312rem] leading-snug text-ink">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[0.875rem] font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5">{p}</span>
                  </li>
                ))}
              </ol>
            </div>
            {s.action_items.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[1.0625rem] font-bold text-ink"><ListChecks size={19} className="text-primary" /> 현장에서 바로 할 일</h3>
                <ul className="grid gap-1.5">
                  {s.action_items.map((a, i) => (
                    <li key={i} className="flex gap-2.5 rounded-xl border border-line px-3.5 py-2.5 text-[1rem] text-ink">
                      <span className="mt-1 h-4 w-4 shrink-0 rounded border-2 border-primary/60" aria-hidden /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.talk_tracks.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[1.0625rem] font-bold text-ink"><MessageSquareQuote size={19} className="text-primary" /> 대표님께 이렇게 말해 보세요</h3>
                <div className="grid gap-2">
                  {s.talk_tracks.map((a, i) => (
                    <blockquote key={i} className="rounded-xl border-l-4 border-gold bg-canvas px-4 py-3 text-[1rem] leading-relaxed text-ink">{a}</blockquote>
                  ))}
                </div>
              </div>
            )}
            {s.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {s.keywords.map((k) => <Link prefetch={false} key={k} href={`/trainings?q=${encodeURIComponent(k)}`} className="rounded-lg bg-neutral-bg px-2.5 py-1 text-[0.875rem] font-semibold text-ink-2 hover:bg-soft hover:text-primary">#{k}</Link>)}
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <CopyButton text={summaryText(t)} label="요약 복사 (카톡 공유용)" done="요약을 복사했습니다. 카톡에 붙여넣으세요." testId="summary-copy" />
              {canEdit && <SummarizeButton id={t.id} hasSummary />}
            </div>
          </div>
        ) : (
          <div className="p-5">
            {canEdit ? (
              <>
                <p className="mb-3 flex gap-2 text-[1rem] text-ink-2"><Info size={19} className="mt-0.5 shrink-0 text-primary" />
                  강의 메모·녹취 글을 붙여넣거나 PPT·PDF 자료를 올린 뒤 눌러 주세요. 한 줄 요약, 핵심 내용, 현장에서 바로 할 일, 상담 멘트로 정리합니다.</p>
                <SummarizeButton id={t.id} hasSummary={false} />
              </>
            ) : (
              <p className="text-[1rem] text-ink-2">아직 요약이 없습니다. 교육이 끝나면 단장·본부장님이 자료와 함께 올려 드립니다.</p>
            )}
          </div>
        )}
      </section>

      {t.content && (
        <details className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-card">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[1.1875rem] font-bold text-ink"><NotebookText size={20} className="text-primary" /> 강의 원문 (메모·녹취) <span className="ml-auto text-[0.9375rem] font-semibold text-primary">펼치기</span></summary>
          <div className="mt-3 max-h-[480px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-canvas p-4 text-[1rem] leading-relaxed text-ink">{t.content}</div>
        </details>
      )}

      {reads && (
        <section className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-card" data-testid="read-status">
          <h2 className="mb-2 flex items-center gap-2 text-[1.1875rem] font-bold text-ink"><Users size={20} className="text-primary" /> 확인 현황
            <span className="text-[1rem] font-semibold text-ink-3">{reads.length}명 중 {readers.length}명 확인</span></h2>
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-neutral-bg"><div className="h-full rounded-full bg-primary" style={{ width: `${reads.length ? Math.round((readers.length / reads.length) * 100) : 0}%` }} /></div>
          {notYet.length > 0 && (
            <p className="text-[0.9688rem] text-ink-2"><b className="text-ink">아직 안 본 사람</b> · {notYet.map((r) => r.full_name).join(", ")}</p>
          )}
        </section>
      )}

      {!t.is_mine && (
        <div className="sticky bottom-[76px] z-10 lg:bottom-4">
          <ReadButton id={t.id} read={t.read_by_me} />
        </div>
      )}
    </div>
  );
}
