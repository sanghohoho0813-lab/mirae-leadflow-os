"use client";

import { useSafeTransition, useSafeRefresh } from "@/components/providers/SafeActions";
import { useEffect, useRef, useState} from "react";
import { RotateCcw } from "lucide-react";
import { switchPersona, resetDemo } from "@/lib/actions/demo";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useDeviceView, DeviceSwitch } from "./DeviceView";
import { titleOf } from "@/lib/labels";
import type { MemberRole } from "@/lib/types";

export interface Persona { id: string; name: string; role: MemberRole; title: string | null }


/** Tells a mobile preview iframe (Device View) to reload with the new persona. */
function refreshFrames() {
  document.querySelectorAll("iframe").forEach((f) => f.contentWindow?.postMessage({ type: "lf:refresh" }, window.location.origin));
}

export function DemoBar({ personas, currentId, ephemeral = false, instanceId }: { personas: Persona[]; currentId: string; ephemeral?: boolean; instanceId?: string }) {
  const { inFrame } = useDeviceView();
  const [pending, start] = useSafeTransition();
  const [target, setTarget] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const refresh = useSafeRefresh();
  const toast = useToast();
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rowRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentId]);
  // The chosen chip turns active at once and stays so until the new screen arrives.
  useEffect(() => setTarget(null), [currentId]);
  // Hooks above; nothing to show inside the mobile preview frame.
  if (inFrame) return null;

  const pick = (id: string) => {
    if (id === currentId || id === target) return;
    setTarget(id);
    window.dispatchEvent(new Event("lf:busy"));
    start(async () => {
      const r = await switchPersona(id).catch(() => null);
      if (r?.ok) { refresh(); refreshFrames(); toast("success", r.message); }
      else { setTarget(null); window.dispatchEvent(new Event("lf:render")); toast("error", r?.message ?? "연결이 잠시 불안정합니다. 다시 눌러 주세요."); }
    });
  };

  const reset = (mode: "sample" | "empty") => start(async () => {
    const r = await resetDemo(mode).catch(() => null);
    setConfirmReset(false);
    if (!r) toast("error", "연결이 잠시 불안정합니다. 다시 눌러 주세요.");
    else if (r.ok) { refresh(); refreshFrames(); toast("success", r.message); }
    else toast("error", r.message);
  });

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
          aria-label="체험 데이터 초기화"
          data-testid="demo-reset"
        >
          <RotateCcw size={17} /> <span className="hidden sm:inline">초기화</span>
        </button>
      </div>
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="체험 데이터">
        <div className="grid gap-3">
          <button type="button" onClick={() => reset("sample")} disabled={pending} data-testid="demo-reset-confirm"
            className="press rounded-2xl border-2 border-line bg-white p-4 text-left hover:border-primary">
            <div className="text-[1.0625rem] font-bold text-ink">샘플로 되돌리기</div>
            <div className="text-[0.9375rem] text-ink-2">등록·신청·결과 입력한 내용을 지우고 샘플 DB 20건으로 다시 시작합니다. 날짜도 오늘 기준으로 맞춰집니다.</div>
          </button>
          <button type="button" onClick={() => reset("empty")} disabled={pending} data-testid="demo-reset-empty"
            className="press rounded-2xl border-2 border-line bg-white p-4 text-left hover:border-primary">
            <div className="text-[1.0625rem] font-bold text-ink">샘플 DB 모두 지우기</div>
            <div className="text-[0.9375rem] text-ink-2">DB를 하나도 없이 비웁니다(사람·교육 자료는 그대로). 직접 등록부터 해 보고 싶을 때 쓰세요.</div>
          </button>
          {ephemeral && <p className="rounded-xl bg-neutral-bg px-3 py-2 text-[0.9375rem] text-ink-2">지금은 DB가 연결되지 않은 <b>임시 체험</b>이라, 한동안 접속이 없으면 자동으로 샘플 상태로 돌아갑니다.</p>}
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>닫기</Button>
        </div>
      </Dialog>
    </div>
  );
}
