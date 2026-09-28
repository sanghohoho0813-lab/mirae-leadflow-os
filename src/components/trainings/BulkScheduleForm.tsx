"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useSafeNavigate } from "@/components/providers/SafeActions";
import { Button, LinkButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { TimePicker } from "@/components/ui/TimePicker";
import { useToast } from "@/components/ui/Toast";
import { createTrainingSchedule } from "@/lib/actions/trainings";
import { shiftMonth, WEEKDAYS } from "./schedule";

interface Person { id: string; full_name: string; role: string; division: string | null }
interface Row { key: string; date: string; on: boolean; instructor_id: string; time: string; title: string }

const TIMES: string[] = [];
for (let h = 7; h <= 21; h++) for (const m of ["00", "30"]) TIMES.push(`${String(h).padStart(2, "0")}:${m}`);

function dow(d: string) { return new Date(`${d}T12:00:00Z`).getUTCDay(); }

/** 월요일 = 단장 교육, 수요일 = 본부장 교육 (본부장이 번갈아 가며). */
function defaultRows(ym: string, today: string, instructors: Person[], me: string, taken: Set<string>): Row[] {
  const owner = instructors.find((p) => p.role === "OWNER")?.id ?? me;
  const leaders = instructors.filter((p) => p.role === "LEADER");
  const [y, m] = ym.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const rows: Row[] = [];
  let wed = 0;
  for (let d = 1; d <= days; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    const w = dow(date);
    if (w !== 1 && w !== 3) continue;
    const leader = w === 3 ? leaders[wed++ % Math.max(leaders.length, 1)] : undefined;
    rows.push({
      key: date, date, on: date >= today && !taken.has(date),
      instructor_id: w === 1 ? owner : leader?.id ?? owner,
      time: "19:00",
      title: w === 1 ? "월요일 단장 교육" : `수요일 ${leader?.division ? `${leader.division} ` : ""}본부장 교육`,
    });
  }
  return rows;
}

export function BulkScheduleForm({ ym, today, me, instructors, existing }: {
  ym: string; today: string; me: string; instructors: Person[];
  existing: { date: string; title: string; name: string | null }[];
}) {
  const taken = useMemo(() => new Map(existing.map((e) => [e.date, e])), [existing]);
  const [rows, setRows] = useState<Row[]>(() => defaultRows(ym, today, instructors, me, new Set(taken.keys())));
  const [allTime, setAllTime] = useState("19:00");
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useSafeNavigate();
  const [y, m] = ym.split("-").map(Number);
  const picked = rows.filter((r) => r.on);
  const set = (key: string, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const name = (id: string) => instructors.find((p) => p.id === id);

  const save = async () => {
    setBusy(true);
    const r = await createTrainingSchedule(picked.map((x) => ({ date: x.date, time: x.time, title: x.title, instructor_id: x.instructor_id })));
    setBusy(false);
    if (!r.ok) { toast("error", r.message ?? "저장하지 못했습니다."); return; }
    toast("success", `교육 일정 ${r.created}건을 등록했습니다.${r.skipped ? ` (이미 있던 ${r.skipped}건은 건너뜀)` : ""}`);
    navigate(`/trainings/schedule?m=${ym}`, "replace");
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
        <Link prefetch={false} href={`/trainings/schedule/bulk?m=${shiftMonth(ym, -1)}`} className="press h-11 rounded-xl border border-line px-3 text-[0.9375rem] font-semibold leading-[2.6rem] text-ink-2">← 이전 달</Link>
        <b className="text-[1.25rem] text-ink" data-testid="bulk-month">{y}년 {m}월</b>
        <Link prefetch={false} href={`/trainings/schedule/bulk?m=${shiftMonth(ym, 1)}`} className="press h-11 rounded-xl border border-line px-3 text-[0.9375rem] font-semibold leading-[2.6rem] text-ink-2">다음 달 →</Link>
      </div>

      <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
        <div className="mb-2 text-[1rem] font-bold text-ink">시간 한 번에 바꾸기</div>
        <TimePicker value={allTime} onChange={(v) => { setAllTime(v); setRows(rows.map((r) => (r.on ? { ...r, time: v } : r))); }} hours={[10, 14, 18, 19, 20]} testId="bulk-all-time" />
      </section>

      <ul className="grid gap-2" data-testid="bulk-rows">
        {rows.map((r) => {
          const had = taken.get(r.date);
          const w = dow(r.date);
          return (
            <li key={r.key} className={`rounded-2xl border bg-white p-3 shadow-card ${r.on ? "border-primary/50" : "border-line opacity-75"}`} data-testid={`bulk-row-${r.date}`}>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={r.on} onChange={(e) => set(r.key, { on: e.target.checked })} className="h-6 w-6 accent-[var(--theme-primary)]" aria-label={`${r.date} 등록`} />
                  <span className={`text-[1.0625rem] font-bold ${w === 1 ? "text-primary" : "text-ink"}`}>{Number(r.date.slice(5, 7))}/{Number(r.date.slice(8))} ({WEEKDAYS[w]})</span>
                </label>
                {had && <span className="rounded-md bg-neutral-bg px-2 py-0.5 text-[0.8438rem] font-semibold text-ink-2">이미 있음: {had.name ?? ""} {had.title}</span>}
                {r.date < today && !had && <span className="text-[0.8438rem] font-semibold text-ink-3">지난 날</span>}
                <button type="button" aria-label="이 줄 빼기" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink-3 hover:bg-neutral-bg"><X size={18} /></button>
              </div>
              {r.on && (
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select value={r.instructor_id} aria-label="강사"
                    onChange={(e) => { const p = name(e.target.value); set(r.key, { instructor_id: e.target.value, title: p?.role === "OWNER" ? `${WEEKDAYS[w]}요일 단장 교육` : p?.role === "LEADER" ? `${WEEKDAYS[w]}요일 ${p.division ? `${p.division} ` : ""}본부장 교육` : r.title }); }}
                    className="h-12 rounded-xl border border-line-strong bg-white px-3 text-[1rem] font-semibold">
                    {instructors.map((p) => <option key={p.id} value={p.id}>{p.full_name} {p.role === "OWNER" ? "단장" : p.role === "LEADER" ? `${p.division ?? ""} 본부장` : "비서"}</option>)}
                  </select>
                  <select value={r.time} aria-label="시간" onChange={(e) => set(r.key, { time: e.target.value })} className="h-12 rounded-xl border border-line-strong bg-white px-3 text-[1rem] font-semibold">
                    {TIMES.map((t) => <option key={t} value={t}>{Number(t.slice(0, 2)) < 12 ? "오전" : "오후"} {Number(t.slice(0, 2)) % 12 || 12}시{t.endsWith("30") ? " 30분" : ""}</option>)}
                  </select>
                  <Input value={r.title} onChange={(e) => set(r.key, { title: e.target.value })} aria-label="교육 제목" className="sm:col-span-2" placeholder="교육 제목 (나중에 바꿔도 됩니다)" />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-white p-3">
        <span className="text-[0.9688rem] font-semibold text-ink-2">다른 요일 추가</span>
        <Input type="date" value={extra} onChange={(e) => setExtra(e.target.value)} min={`${ym}-01`} max={`${ym}-31`} className="w-auto" aria-label="추가할 날짜" />
        <Button variant="secondary" disabled={!extra || rows.some((r) => r.key === extra)} onClick={() => {
          const w = dow(extra);
          const owner = instructors.find((p) => p.role === "OWNER")?.id ?? me;
          setRows([...rows, { key: extra, date: extra, on: true, instructor_id: owner, time: allTime, title: `${WEEKDAYS[w]}요일 특별 교육` }].sort((a, b) => a.date.localeCompare(b.date)));
          setExtra("");
        }}><Plus size={17} /> 추가</Button>
      </div>

      <div className="sticky bottom-[72px] z-10 flex gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-card backdrop-blur lg:bottom-4">
        <LinkButton href={`/trainings/schedule?m=${ym}`} variant="secondary" size="lg" className="flex-1">취소</LinkButton>
        <Button size="lg" className="flex-[2]" disabled={busy || picked.length === 0} onClick={save} data-testid="bulk-save">
          {busy ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />} {picked.length}건 저장
        </Button>
      </div>
    </div>
  );
}
