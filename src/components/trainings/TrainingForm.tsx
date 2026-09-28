"use client";

import { useRef, useState } from "react";
import { Upload, X, Plus, Sparkles, Loader2, CheckCircle2, Lightbulb } from "lucide-react";
import { useSafeNavigate } from "@/components/providers/SafeActions";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createTraining, finishTrainingFile, startTrainingFile, summarizeTraining, updateTraining, uploadTrainingChunk, type TrainingInput } from "@/lib/actions/trainings";
import { kstDateString } from "@/lib/time";
import { TimePicker } from "@/components/ui/TimePicker";
import { fmtSize } from "./TrainingClient";

const MAX = 30 * 1024 * 1024;
const ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx,.hwp,.hwpx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.aac,.ogg";

/** Next Monday / Wednesday (or today, if it is one), in Korea time. */
function nextWeekday(target: 1 | 3): string {
  const today = new Date(`${kstDateString()}T12:00:00+09:00`);
  const diff = (target - today.getUTCDay() + 7) % 7;
  return kstDateString(new Date(today.getTime() + diff * 86400000));
}

interface Person { id: string; full_name: string; role: string; division?: string | null }
const ROLE_NAME: Record<string, string> = { OWNER: "단장", MANAGER: "운영", LEADER: "본부장" };

export function TrainingForm({ mode, trainingId, initial, instructors, me }: {
  mode: "create" | "edit";
  trainingId?: string;
  initial?: Partial<TrainingInput>;
  instructors: Person[];
  me: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? nextWeekday(1));
  const [time, setTime] = useState(initial?.time ?? "19:00");
  const [notice, setNotice] = useState(initial?.notice ?? "");
  const [instructor, setInstructor] = useState(initial?.instructor_id ?? me);
  const [content, setContent] = useState(initial?.content ?? "");
  const [links, setLinks] = useState(initial?.links?.length ? initial.links : []);
  const [files, setFiles] = useState<File[]>([]);
  const [autoSummary, setAutoSummary] = useState(mode === "create");
  const [phase, setPhase] = useState<null | { label: string; progress?: number }>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useSafeNavigate();
  const toast = useToast();
  const busy = phase !== null;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (f.size > MAX) { toast("error", `${f.name}: 30MB 이하 파일만 올릴 수 있습니다.`); continue; }
      if (next.length >= 10) { toast("error", "자료는 한 번에 10개까지 올릴 수 있습니다."); break; }
      next.push(f);
    }
    setFiles(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const upload = async (id: string, f: File, i: number, n: number) => {
    const start = await startTrainingFile(id, { name: f.name, mime: f.type, size: f.size });
    if (!start.ok || !start.id) throw new Error(start.message ?? `${f.name}을(를) 올리지 못했습니다.`);
    const size = start.chunkSize!;
    for (let c = 0; c < start.chunkCount!; c++) {
      const body = f.slice(c * size, (c + 1) * size);
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        const form = new FormData();
        form.append("data", body);
        ok = !!(await uploadTrainingChunk(start.id, c, form).catch(() => null))?.ok;
      }
      if (!ok) throw new Error(`${f.name}을(를) 올리는 중 연결이 끊겼습니다. 다시 시도해 주세요.`);
      setPhase({ label: `자료 올리는 중 (${i + 1}/${n}) ${f.name}`, progress: (c + 1) / start.chunkCount! });
    }
    const done = await finishTrainingFile(start.id, id);
    if (!done.ok) throw new Error(done.message ?? `${f.name}을(를) 올리지 못했습니다.`);
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) { setError("교육 제목을 입력해 주세요."); return; }
    const input: TrainingInput = { title, date, time, instructor_id: instructor || null, content, links: links.filter((l) => l.url.trim()), notice };
    setPhase({ label: "저장하는 중" });
    try {
      const r = mode === "create" ? await createTraining(input) : await updateTraining(trainingId!, input);
      if (!r.ok || !r.id) throw new Error(r.message ?? "저장하지 못했습니다.");
      const id = r.id;
      for (let i = 0; i < files.length; i++) await upload(id, files[i], i, files.length);
      const hasMaterial = content.trim().length > 0 || files.length > 0;
      if (autoSummary && hasMaterial) {
        setPhase({ label: "AI가 핵심을 정리하는 중 (최대 1분)" });
        const s = await summarizeTraining(id);
        if (!s.ok) toast("error", s.message ?? "요약은 나중에 다시 눌러 주세요.");
        else s.notes?.forEach((n) => toast("error", n));
      }
      toast("success", mode === "create" ? "교육 자료를 올렸습니다." : "수정했습니다.");
      navigate(`/trainings/${id}`, "replace");
    } catch (e) {
      setPhase(null);
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    }
  };

  const quick = [
    { label: "이번 월요일", v: nextWeekday(1) },
    { label: "이번 수요일", v: nextWeekday(3) },
    { label: "오늘", v: kstDateString() },
  ];

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="grid gap-4">
          <Field label="교육 제목" required htmlFor="t-title">
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 4분기 정책자금 상담 전략" data-testid="training-title" />
          </Field>
          <Field label="교육 날짜" required>
            <div className="mb-2 flex flex-wrap gap-2">
              {quick.map((q) => (
                <button key={q.label} type="button" onClick={() => setDate(q.v)} className={`press min-h-[44px] rounded-xl border-2 px-3.5 text-[0.9375rem] font-semibold ${date === q.v ? "border-primary bg-soft text-primary" : "border-line bg-white text-ink-2"}`}>{q.label}</button>
              ))}
            </div>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="교육 날짜" data-testid="training-date" />
          </Field>
          <Field label="교육 시간" required>
            <TimePicker value={time} onChange={setTime} hours={[10, 14, 18, 19, 20]} testId="training-time" />
          </Field>
          <Field label="강사" htmlFor="t-inst">
            <Select id="t-inst" value={instructor} onChange={(e) => setInstructor(e.target.value)}>
              {instructors.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({[p.division, ROLE_NAME[p.role] ?? ""].filter(Boolean).join(" ")})</option>)}
            </Select>
          </Field>
          <Field label="교육 공지 (선택)" htmlFor="t-notice" hint="교육 전 ‘다가오는 교육’에 그대로 보입니다. 카톡 공지를 붙여넣어도 됩니다.">
            <Textarea id="t-notice" value={notice} onChange={(e) => setNotice(e.target.value)} rows={4} placeholder="예: 오늘 저녁 7시, 법인영업의 판을 바꿀 실전 교육이 시작됩니다!" data-testid="training-notice-input" />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-1 text-[1.125rem] font-bold text-ink">교육 자료</h2>
        <p className="mb-3 text-[0.9375rem] text-ink-2">PPT · PDF · 한글/워드 · 사진 · 녹음 파일 (파일당 30MB, 최대 10개)</p>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          className="press flex min-h-[96px] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line-strong bg-canvas text-[1rem] font-semibold text-ink-2 hover:border-primary hover:text-primary" data-testid="training-file-pick">
          <Upload size={24} /> 눌러서 파일 고르기 <span className="text-[0.875rem] font-normal text-ink-3">PC에서는 끌어다 놓아도 됩니다</span>
        </button>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} data-testid="training-file-input" />
        {files.length > 0 && (
          <ul className="mt-3 grid gap-1.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[0.9688rem] font-semibold text-ink">{f.name}</span>
                <span className="text-[0.875rem] text-ink-3">{fmtSize(f.size)}</span>
                <button type="button" aria-label={`${f.name} 빼기`} disabled={busy} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-3 hover:bg-neutral-bg"><X size={18} /></button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <div className="mb-1.5 text-[0.9688rem] font-semibold text-ink">링크 (선택) — 유튜브, 구글드라이브, 클로바노트 공유 링크 등</div>
          <div className="grid gap-2">
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input className="w-[34%]" value={l.label} placeholder="이름" onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="링크 이름" />
                <Input className="flex-1" value={l.url} placeholder="https://" onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} aria-label="링크 주소" />
                <button type="button" aria-label="링크 빼기" onClick={() => setLinks(links.filter((_, j) => j !== i))} className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xl text-ink-3 hover:bg-neutral-bg"><X size={18} /></button>
              </div>
            ))}
            {links.length < 10 && (
              <button type="button" onClick={() => setLinks([...links, { label: "", url: "" }])} className="flex min-h-[44px] items-center gap-1 self-start text-[0.9375rem] font-semibold text-primary"><Plus size={17} /> 링크 추가</button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-1 text-[1.125rem] font-bold text-ink">강의 내용 (AI 정리 재료)</h2>
        <p className="mb-2 flex gap-1.5 rounded-xl bg-soft px-3 py-2.5 text-[0.9375rem] text-ink-2">
          <Lightbulb size={18} className="mt-0.5 shrink-0 text-primary" />
          녹음은 <b className="mx-0.5">클로바노트</b> 같은 앱으로 글로 바꾼 뒤 그대로 붙여넣으면 가장 정확합니다. 강의 메모나 PPT 내용도 좋습니다.
        </p>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[200px]" placeholder="녹취 글, 강의 메모, 중요한 말씀을 붙여넣어 주세요." data-testid="training-content" />
        <p className="mt-1 text-right text-[0.8438rem] text-ink-3">{content.length.toLocaleString()}자</p>
        <label className="mt-2 flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-line px-4">
          <input type="checkbox" checked={autoSummary} onChange={(e) => setAutoSummary(e.target.checked)} className="h-5 w-5 accent-[var(--theme-primary)]" data-testid="training-auto-summary" />
          <span className="flex items-center gap-1.5 text-[1rem] font-semibold text-ink"><Sparkles size={18} className="text-gold" /> 저장하면서 AI로 핵심 정리하기</span>
        </label>
      </section>

      {error && <p className="rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-[1rem] font-semibold text-danger" role="alert">{error}</p>}

      {phase && (
        <div className="rounded-xl border border-line bg-white px-4 py-3" role="status" data-testid="training-progress">
          <div className="flex items-center gap-2 text-[1rem] font-semibold text-ink"><Loader2 size={18} className="animate-spin text-primary" /> {phase.label}</div>
          {phase.progress !== undefined && <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-bg"><div className="h-full bg-primary transition-all" style={{ width: `${Math.round(phase.progress * 100)}%` }} /></div>}
        </div>
      )}

      <div className="sticky bottom-[72px] z-10 flex gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-card backdrop-blur lg:bottom-4">
        <LinkButton href={trainingId ? `/trainings/${trainingId}` : "/trainings"} variant="secondary" size="lg" className="flex-1">취소</LinkButton>
        <Button size="lg" className="flex-[2]" disabled={busy} onClick={submit} data-testid="training-submit">
          {busy ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />} {mode === "create" ? "올리기" : "저장"}
        </Button>
      </div>
    </div>
  );
}
