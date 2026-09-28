"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, Music, Play, Sparkles, Trash2, Image as ImageIcon, Presentation } from "lucide-react";
import { useSafeNavigate, useSafeRefresh, useSafeTransition } from "@/components/providers/SafeActions";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { deleteTraining, deleteTrainingFile, downloadTrainingChunk, markTrainingRead, summarizeTraining } from "@/lib/actions/trainings";
import type { TrainingFile } from "@/lib/types";

/** "다 읽었어요" — the 단장 sees who has (and hasn't) gone through the material. */
export function ReadButton({ id, read }: { id: string; read: boolean }) {
  const [pending, start] = useSafeTransition();
  const [done, setDone] = useState(read);
  const refresh = useSafeRefresh();
  const toast = useToast();
  if (done) {
    return (
      <div className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success-bg text-[17px] font-bold text-success" data-testid="training-read-done">
        <CheckCircle2 size={21} /> 확인 완료
      </div>
    );
  }
  return (
    <Button size="lg" className="h-14 w-full text-[18px]" disabled={pending} data-testid="training-read"
      onClick={() => start(async () => {
        setDone(true);
        const r = await markTrainingRead(id);
        if (!r.ok) { setDone(false); toast("error", r.message ?? "저장하지 못했습니다."); return; }
        toast("success", "확인했습니다. 단장님 화면에 반영됩니다.");
        refresh();
      })}>
      <CheckCircle2 size={21} /> 다 읽었어요
    </Button>
  );
}

export function SummarizeButton({ id, hasSummary }: { id: string; hasSummary: boolean }) {
  const [pending, start] = useSafeTransition();
  const refresh = useSafeRefresh();
  const toast = useToast();
  const [notes, setNotes] = useState<string[]>([]);
  return (
    <div>
      <Button variant={hasSummary ? "secondary" : "primary"} size={hasSummary ? "md" : "lg"} disabled={pending} data-testid="training-summarize" className="whitespace-normal"
        onClick={() => start(async () => {
          setNotes([]);
          const r = await summarizeTraining(id);
          if (!r.ok) { toast("error", r.message ?? "정리하지 못했습니다."); return; }
          setNotes(r.notes ?? []);
          toast("success", r.source === "AI" ? "AI가 핵심을 정리했습니다." : "기본 요약으로 정리했습니다.");
          refresh();
        })}>
        {pending ? <Loader2 size={19} className="animate-spin" /> : <Sparkles size={19} />}
        {pending ? "핵심을 정리하는 중… (최대 1분)" : hasSummary ? "다시 정리" : "AI로 핵심 정리하기"}
      </Button>
      {notes.length > 0 && (
        <ul className="mt-2 grid gap-1 text-[14.5px] text-warning">
          {notes.map((n, i) => <li key={i}>· {n}</li>)}
        </ul>
      )}
    </div>
  );
}

export function DeleteTrainingButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useSafeTransition();
  const navigate = useSafeNavigate();
  const toast = useToast();
  return (
    <>
      <Button variant="ghost" size="md" onClick={() => setOpen(true)} className="text-danger" data-testid="training-delete"><Trash2 size={18} /> 삭제</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="이 교육을 삭제할까요?">
        <p className="mb-4 text-[16px] text-ink-2">올린 자료와 요약, 확인 기록이 모두 지워집니다. 되돌릴 수 없습니다.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>돌아가기</Button>
          <Button variant="danger" className="flex-1" disabled={pending} data-testid="training-delete-confirm"
            onClick={() => start(async () => {
              const r = await deleteTraining(id);
              if (!r.ok) { toast("error", r.message ?? "삭제하지 못했습니다."); return; }
              toast("success", "삭제했습니다.");
              navigate("/trainings", "replace");
            })}>삭제하기</Button>
        </div>
      </Dialog>
    </>
  );
}

// ------------------------------------------------------------------ files
function iconFor(f: { name: string; mime: string }) {
  const n = f.name.toLowerCase();
  if (f.mime.startsWith("audio/") || /\.(mp3|m4a|wav|aac|ogg)$/.test(n)) return <Music size={20} />;
  if (f.mime.startsWith("image/")) return <ImageIcon size={20} />;
  if (/\.(pptx?|key)$/.test(n)) return <Presentation size={20} />;
  return <FileText size={20} />;
}
export function fmtSize(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function fetchFile(f: TrainingFile, onProgress: (p: number) => void): Promise<Blob> {
  const parts: Uint8Array<ArrayBuffer>[] = [];
  for (let i = 0; i < f.chunk_count; i++) {
    let data: string | undefined;
    for (let attempt = 0; attempt < 3 && !data; attempt++) data = (await downloadTrainingChunk(f.id, i).catch(() => null))?.data;
    if (!data) throw new Error("download failed");
    parts.push(fromBase64(data));
    onProgress((i + 1) / f.chunk_count);
  }
  return new Blob(parts, { type: f.mime || "application/octet-stream" });
}

export function FileRow({ f, trainingId, canDelete }: { f: TrainingFile; trainingId: string; canDelete: boolean }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pending, start] = useSafeTransition();
  const refresh = useSafeRefresh();
  const toast = useToast();
  const isAudio = f.mime.startsWith("audio/") || /\.(mp3|m4a|wav|aac|ogg)$/i.test(f.name);

  const load = async (): Promise<Blob | null> => {
    try {
      setProgress(0);
      return await fetchFile(f, setProgress);
    } catch {
      toast("error", "자료를 받지 못했습니다. 잠시 후 다시 눌러 주세요.");
      return null;
    } finally {
      setProgress(null);
    }
  };
  const download = async () => {
    const blob = await load();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = f.name; a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a); a.click();
    // Keep the link alive briefly: some browsers read the file name after the click returns.
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60_000);
  };
  const play = async () => {
    const blob = await load();
    if (blob) setAudioUrl(URL.createObjectURL(blob));
  };

  return (
    <li className="rounded-xl border border-line bg-white p-3" data-testid="training-file">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-primary">{iconFor(f)}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[16px] font-semibold text-ink">{f.name}</div>
          <div className="text-[14px] text-ink-3">{fmtSize(f.size)}{progress !== null ? ` · 받는 중 ${Math.round(progress * 100)}%` : ""}</div>
        </div>
        {isAudio && !audioUrl && (
          <button type="button" onClick={play} disabled={progress !== null} className="press flex h-11 items-center gap-1 rounded-xl border border-line px-3 text-[15px] font-semibold text-ink hover:border-primary/50" data-testid="file-play">
            <Play size={17} /> 듣기
          </button>
        )}
        <button type="button" onClick={download} disabled={progress !== null} className="press flex h-11 items-center gap-1 rounded-xl bg-ink px-3.5 text-[15px] font-semibold text-white disabled:opacity-60" data-testid="file-download">
          {progress !== null ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />} 받기
        </button>
        {canDelete && (
          <button type="button" aria-label={`${f.name} 삭제`} disabled={pending} className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-3 hover:bg-danger-bg hover:text-danger"
            onClick={() => { if (confirm(`${f.name}을(를) 지울까요?`)) start(async () => { const r = await deleteTrainingFile(f.id, trainingId); if (!r.ok) toast("error", r.message ?? "지우지 못했습니다."); else refresh(); }); }}>
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {audioUrl && <audio controls autoPlay src={audioUrl} className="mt-3 w-full" />}
    </li>
  );
}
