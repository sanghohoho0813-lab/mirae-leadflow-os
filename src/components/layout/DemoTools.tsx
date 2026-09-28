"use client";

import { useEffect, useState } from "react";
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useSafeRefresh, useSafeTransition } from "@/components/providers/SafeActions";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { addSampleLeads, resetDemo, switchPersona } from "@/lib/actions/demo";
import { titleOf } from "@/lib/labels";
import type { MemberRole } from "@/lib/types";

export interface Persona { id: string; name: string; role: MemberRole; title: string | null; division?: string | null }

/** 체험 도구 (사용자 변경 · 샘플 DB). Everything the demo bar and the ☰ menu share. */
export interface DemoTools { people: Persona[]; currentId: string; leadCount: number; ephemeral: boolean }

/** Tells a mobile preview iframe (Device View) to reload with the new persona. */
export function refreshFrames() {
  document.querySelectorAll("iframe").forEach((f) => f.contentWindow?.postMessage({ type: "lf:refresh" }, window.location.origin));
}

/** "단장 송하균", "2본부 지점장 B" — who you are looking as. */
export function personaLabel(p: Persona | undefined): string {
  if (!p) return "";
  const t = titleOf(p.role, p.title);
  const name = p.name.startsWith(t) ? p.name.slice(t.length).trim() || p.name : p.name;
  return [p.role === "LEADER" || p.role === "CONSULTANT" ? p.division : null, t, name].filter(Boolean).join(" ");
}

/**
 * One-click role switch. The chosen person shows as active at once and stays so
 * until the new screen arrives.
 */
export function usePersonaSwitch(currentId: string) {
  const [pending, start] = useSafeTransition();
  const [target, setTarget] = useState<string | null>(null);
  const refresh = useSafeRefresh();
  const toast = useToast();
  useEffect(() => setTarget(null), [currentId]);
  const pick = (id: string, after?: () => void) => {
    if (id === currentId || id === target) { after?.(); return; }
    setTarget(id);
    window.dispatchEvent(new Event("lf:busy"));
    start(async () => {
      const r = await switchPersona(id).catch(() => null);
      if (r?.ok) { after?.(); refresh(); refreshFrames(); toast("success", r.message); }
      else { setTarget(null); window.dispatchEvent(new Event("lf:render")); toast("error", r?.message ?? "연결이 잠시 불안정합니다. 다시 눌러 주세요."); }
    });
  };
  return { pick, target, pending };
}

const DIVISION_ORDER = ["직할본부", "2본부", "3본부", "광주 상무본부"];
const TITLE_RANK: Record<string, number> = { 본부장: 0, 지점장: 1, 팀장: 2 };

/** 운영진 first, then each 본부: 본부장 › 지점장 › 팀장 › 컨설턴트. */
function groups(people: Persona[]): { title: string; people: Persona[] }[] {
  const staffOrder = ["OWNER", "MANAGER", "CALLER"];
  const staff = people.filter((p) => staffOrder.includes(p.role)).sort((a, b) => staffOrder.indexOf(a.role) - staffOrder.indexOf(b.role));
  const out = [{ title: "사업단 운영", people: staff }];
  const rank = (d: string) => { const i = DIVISION_ORDER.indexOf(d); return i < 0 ? 99 : i; };
  const divs = [...new Set(people.map((p) => p.division).filter(Boolean) as string[])].sort((a, b) => rank(a) - rank(b));
  for (const d of divs) {
    const list = people.filter((p) => p.division === d && (p.role === "LEADER" || p.role === "CONSULTANT"))
      .sort((a, b) => (TITLE_RANK[titleOf(a.role, a.title)] ?? 3) - (TITLE_RANK[titleOf(b.role, b.title)] ?? 3) || a.name.localeCompare(b.name, "ko"));
    if (list.length) out.push({ title: d, people: list });
  }
  return out.filter((g) => g.people.length);
}

/** 사용자 변경하기: 단장·비서·콜팀장, 본부별 본부장·지점장·팀장·컨설턴트. */
export function PersonaDialog({ people, currentId, open, onClose, onSwitched }: {
  people: Persona[]; currentId: string; open: boolean; onClose: () => void; onSwitched?: () => void;
}) {
  const { pick, target, pending } = usePersonaSwitch(currentId);
  return (
    <Dialog open={open} onClose={onClose} title="사용자 변경하기" testId="persona-menu" wide>
      <p className="mb-3 text-[1rem] text-ink-2">누구의 화면으로 볼지 고르세요.</p>
      <div className="grid max-h-[62vh] gap-4 overflow-y-auto pr-1">
        {groups(people).map((g) => (
          <section key={g.title}>
            <h3 className="mb-1.5 text-[0.9375rem] font-bold text-ink-3">{g.title}</h3>
            <div className="grid grid-cols-2 gap-2">
              {g.people.map((p) => {
                const active = p.id === (target ?? currentId);
                const t = titleOf(p.role, p.title);
                return (
                  <button key={p.id} type="button" disabled={pending && target === p.id} onClick={() => pick(p.id, () => { onClose(); onSwitched?.(); })}
                    data-testid={`persona-menu-${p.id}`} aria-pressed={active}
                    className={`press flex min-h-[3.5rem] items-center gap-2 rounded-xl border-2 px-3 text-left ${active ? "border-primary bg-soft" : "border-line bg-white hover:border-primary/40"}`}>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className={`block text-[0.875rem] font-semibold ${active ? "text-primary" : "text-ink-3"}`}>{t}</span>
                      <span className="block truncate text-[1.0625rem] font-bold text-ink">{p.name.startsWith(t) ? p.name.slice(t.length).trim() || p.name : p.name}</span>
                    </span>
                    {active && <Check size={18} className="shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  );
}

/**
 * 샘플 DB 추가·삭제 — every button says what it does (no icon-only controls).
 * 전체 삭제 asks once more so a stray tap on a phone doesn't wipe the demo.
 */
export function SampleDbPanel({ leadCount, ephemeral, onDone }: { leadCount: number; ephemeral?: boolean; onDone?: () => void }) {
  const [pending, start] = useSafeTransition();
  const [confirmClear, setConfirmClear] = useState(false);
  const refresh = useSafeRefresh();
  const toast = useToast();
  const done = (r: { ok: boolean; message: string } | null) => {
    setConfirmClear(false);
    if (!r) toast("error", "연결이 잠시 불안정합니다. 다시 눌러 주세요.");
    else if (r.ok) { refresh(); refreshFrames(); toast("success", r.message); onDone?.(); }
    else toast("error", r.message);
  };
  const add = (n: number) => start(async () => done(await addSampleLeads(n).catch(() => null)));
  const reset = (mode: "sample" | "empty") => start(async () => done(await resetDemo(mode).catch(() => null)));
  const btn = "press flex min-h-[3.25rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-1.5 text-[0.9688rem] font-bold disabled:opacity-60";

  return (
    <div className="@container grid gap-2.5" data-testid="sample-db-panel">
      <div className="flex items-baseline justify-between">
        <span className="text-[1.0625rem] font-bold text-ink">샘플 DB</span>
        <span className="text-[0.9688rem] text-ink-2" data-testid="demo-lead-count">지금 DB {leadCount}건</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[5, 10, 20].map((n) => (
          <button key={n} type="button" onClick={() => add(n)} disabled={pending} data-testid={`demo-add-${n}`}
            className={`${btn} border-primary/30 bg-soft text-primary hover:border-primary`}>
            <Plus size={16} className="hidden shrink-0 @[22rem]:block" /> {n}개 추가
          </button>
        ))}
      </div>
      {confirmClear ? (
        <div className="grid gap-2 rounded-xl border-2 border-danger/40 bg-danger-bg/60 p-3">
          <p className="text-[0.9688rem] font-semibold text-danger">DB {leadCount}건을 모두 지울까요? (사람·교육 자료는 그대로)</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmClear(false)} className={`${btn} border-line bg-white text-ink-2`}>그만두기</button>
            <button type="button" onClick={() => reset("empty")} disabled={pending} data-testid="demo-clear-confirm" className={`${btn} border-danger bg-danger text-white`}>
              <Trash2 size={17} /> 네, 전체 삭제
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setConfirmClear(true)} disabled={pending} data-testid="demo-reset-empty"
            className={`${btn} border-danger/30 bg-white text-danger hover:border-danger`}>
            <Trash2 size={17} className="shrink-0" /> 전체 삭제
          </button>
          <button type="button" onClick={() => reset("sample")} disabled={pending} data-testid="demo-reset-confirm"
            className={`${btn} border-line bg-white text-ink-2 hover:border-primary/40`}>
            <RotateCcw size={17} className="shrink-0" /> 처음 샘플로
          </button>
        </div>
      )}
      <p className="text-[0.875rem] leading-snug text-ink-3">
        추가되는 DB는 업체·지역·관심 분야가 골고루 섞입니다(평일 9~17시, 일부는 본부 전용·공개 대기).
        {ephemeral && " 임시 체험이라 한동안 접속이 없으면 처음 샘플로 돌아갑니다."}
      </p>
    </div>
  );
}
