"use client";

import { useSafeTransition, useSafeRefresh } from "@/components/providers/SafeActions";
import { useEffect, useRef, useState} from "react";
import { Database, Plus, RotateCcw, Trash2 } from "lucide-react";
import { switchPersona, resetDemo, addSampleLeads } from "@/lib/actions/demo";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useDeviceView, DeviceSwitch } from "./DeviceView";
import { titleOf } from "@/lib/labels";
import type { MemberRole } from "@/lib/types";

export interface Persona { id: string; name: string; role: MemberRole; title: string | null; division?: string | null }


/** Tells a mobile preview iframe (Device View) to reload with the new persona. */
function refreshFrames() {
  document.querySelectorAll("iframe").forEach((f) => f.contentWindow?.postMessage({ type: "lf:refresh" }, window.location.origin));
}

/**
 * One-click role switch, shared by the top bar and the sidebar name menu. The
 * chosen person shows as active at once and stays so until the new screen arrives.
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

export function DemoBar({ personas, currentId, ephemeral = false, instanceId, leadCount }: { personas: Persona[]; currentId: string; ephemeral?: boolean; instanceId?: string; leadCount?: number }) {
  const { inFrame } = useDeviceView();
  const { pick, target, pending: switching } = usePersonaSwitch(currentId);
  const [working, start] = useSafeTransition();
  const [confirmReset, setConfirmReset] = useState(false);
  const refresh = useSafeRefresh();
  const toast = useToast();
  const rowRef = useRef<HTMLDivElement>(null);
  const pending = switching || working;
  useEffect(() => {
    rowRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentId]);
  // Hooks above; nothing to show inside the mobile preview frame.
  if (inFrame) return null;

  const done = (r: { ok: boolean; message: string } | null) => {
    setConfirmReset(false);
    if (!r) toast("error", "연결이 잠시 불안정합니다. 다시 눌러 주세요.");
    else if (r.ok) { refresh(); refreshFrames(); toast("success", r.message); }
    else toast("error", r.message);
  };
  const reset = (mode: "sample" | "empty") => start(async () => done(await resetDemo(mode).catch(() => null)));
  const add = (n: number) => start(async () => done(await addSampleLeads(n).catch(() => null)));

  return (
    <div className="@container/demobar border-b border-warning/25 bg-warning-bg/50" data-testid="demo-bar" data-instance={instanceId} data-ephemeral={ephemeral ? "1" : undefined}>
      <div className="flex items-center gap-2 px-4 py-2 lg:px-8">
        <span className="shrink-0 rounded-lg bg-warning px-2 py-1 text-[0.8125rem] font-bold text-white" title={ephemeral ? "임시 데이터: 한동안 접속이 없으면 처음 상태로 돌아갑니다" : undefined}>{ephemeral ? "임시 체험" : "체험"}</span>
        <span className="hidden shrink-0 text-[0.9062rem] font-semibold text-ink-2 @7xl/demobar:inline">누구 화면으로 볼까요?</span>
        <div ref={rowRef} className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto" role="radiogroup" aria-label="체험할 역할">
          {personas.map((p) => {
            const active = p.id === (target ?? currentId);
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pick(p.id)}
                className={`flex h-10 shrink-0 items-center gap-1 rounded-xl border px-3 text-[0.9062rem] transition-base ${
                  active ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:border-primary/50"
                } ${pending && target === p.id ? "cursor-wait" : ""}`}
                data-testid={`persona-${p.id}`}
              >
                {p.name.startsWith(titleOf(p.role, p.title)) ? <b>{p.name}</b> : (<>
                  <b>{titleOf(p.role, p.title)}</b>
                  <span className={active ? "text-white/90" : "text-ink-2"}>{p.name}</span>
                </>)}
              </button>
            );
          })}
        </div>
        <div className="shrink-0"><DeviceSwitch compact /></div>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          disabled={pending}
          className="flex h-10 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[0.875rem] font-semibold text-ink-2 hover:bg-white"
          aria-label="샘플 DB 관리"
          data-testid="demo-reset"
        >
          <Database size={17} /> <span className="hidden sm:inline">샘플 DB</span>
        </button>
      </div>
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="샘플 DB">
        <div className="grid gap-3">
          {leadCount !== undefined && <p className="text-[1rem] text-ink-2" data-testid="demo-lead-count">지금 DB <b className="text-ink">{leadCount}건</b></p>}
          <div>
            <div className="mb-2 text-[1rem] font-bold text-ink">샘플 더하기</div>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 20].map((n) => (
                <button key={n} type="button" onClick={() => add(n)} disabled={pending} data-testid={`demo-add-${n}`}
                  className="press flex h-14 items-center justify-center gap-1 rounded-2xl border-2 border-primary/30 bg-soft text-[1.125rem] font-bold text-primary hover:border-primary disabled:opacity-60">
                  <Plus size={19} /> {n}개
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[0.875rem] text-ink-3">업체·지역·관심 분야가 골고루 섞인 DB가 지금 있는 DB 위에 더해집니다(평일 9~17시, 일부는 본부 전용·공개 대기).</p>
          </div>
          <button type="button" onClick={() => reset("empty")} disabled={pending} data-testid="demo-reset-empty"
            className="press flex items-center gap-3 rounded-2xl border-2 border-danger/30 bg-white p-4 text-left hover:border-danger">
            <Trash2 size={22} className="shrink-0 text-danger" />
            <span><span className="block text-[1.0625rem] font-bold text-danger">전체 삭제</span>
            <span className="block text-[0.9375rem] text-ink-2">DB를 모두 지웁니다(사람·교육 자료는 그대로). 직접 등록부터 해 볼 때.</span></span>
          </button>
          <button type="button" onClick={() => reset("sample")} disabled={pending} data-testid="demo-reset-confirm"
            className="press flex items-center gap-3 rounded-2xl border-2 border-line bg-white p-4 text-left hover:border-primary">
            <RotateCcw size={22} className="shrink-0 text-ink-2" />
            <span><span className="block text-[1.0625rem] font-bold text-ink">처음 샘플로 되돌리기</span>
            <span className="block text-[0.9375rem] text-ink-2">입력한 내용을 지우고 기본 샘플 DB 20건으로 다시 시작합니다. 날짜도 오늘 기준으로.</span></span>
          </button>
          {ephemeral && <p className="rounded-xl bg-neutral-bg px-3 py-2 text-[0.9375rem] text-ink-2">지금은 DB가 연결되지 않은 <b>임시 체험</b>이라, 한동안 접속이 없으면 자동으로 샘플 상태로 돌아갑니다.</p>}
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>닫기</Button>
        </div>
      </Dialog>
    </div>
  );
}
