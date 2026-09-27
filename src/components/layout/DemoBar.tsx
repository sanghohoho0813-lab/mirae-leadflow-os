"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { switchPersona, resetDemo } from "@/lib/actions/demo";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useDeviceView } from "./DeviceView";
import type { MemberRole } from "@/lib/types";

export interface Persona { id: string; name: string; role: MemberRole }

const ROLE_SHORT: Record<MemberRole, string> = { OWNER: "단장", MANAGER: "운영", CALLER: "콜", LEADER: "본부장", CONSULTANT: "컨설턴트" };

/** Tells a mobile preview iframe (Device View) to reload with the new persona. */
function refreshFrames() {
  document.querySelectorAll("iframe").forEach((f) => f.contentWindow?.postMessage({ type: "lf:refresh" }, window.location.origin));
}

export function DemoBar({ personas, currentId, ephemeral = false, instanceId }: { personas: Persona[]; currentId: string; ephemeral?: boolean; instanceId?: string }) {
  const { inFrame } = useDeviceView();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rowRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentId]);
  if (inFrame) return null;

  const pick = (id: string) => {
    if (id === currentId || pending) return;
    setTarget(id);
    start(async () => {
      const r = await switchPersona(id);
      if (r.ok) { router.refresh(); refreshFrames(); toast("success", r.message); }
      else toast("error", r.message);
      setTarget(null);
    });
  };

  const reset = () => start(async () => {
    const r = await resetDemo();
    setConfirmReset(false);
    if (r.ok) { router.refresh(); refreshFrames(); toast("success", r.message); }
    else toast("error", r.message);
  });

  return (
    <div className="border-b border-warning/25 bg-warning-bg/50" data-testid="demo-bar" data-instance={instanceId} data-ephemeral={ephemeral ? "1" : undefined}>
      <div className="flex items-center gap-2 px-4 py-2 lg:px-8">
        <span className="shrink-0 rounded-lg bg-warning px-2 py-1 text-[13px] font-bold text-white" title={ephemeral ? "임시 데이터: 한동안 접속이 없으면 처음 상태로 돌아갑니다" : undefined}>{ephemeral ? "임시 체험" : "체험"}</span>
        <span className="hidden shrink-0 text-[14.5px] font-semibold text-ink-2 md:inline">누구 화면으로 볼까요?</span>
        <div ref={rowRef} className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto lg:flex-wrap lg:overflow-visible" role="radiogroup" aria-label="체험할 역할">
          {personas.map((p) => {
            const active = p.id === currentId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => pick(p.id)}
                className={`flex h-10 shrink-0 items-center gap-1 rounded-xl border px-3 text-[14.5px] transition-base ${
                  active ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:border-primary/50"
                } ${pending && target === p.id ? "opacity-60" : ""}`}
                data-testid={`persona-${p.id}`}
              >
                <b>{ROLE_SHORT[p.role]}</b>
                <span className={active ? "text-white/90" : "text-ink-2"}>{p.name}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          disabled={pending}
          className="flex h-10 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[14px] font-semibold text-ink-2 hover:bg-white"
          aria-label="체험 데이터 초기화"
          data-testid="demo-reset"
        >
          <RotateCcw size={17} /> <span className="hidden sm:inline">초기화</span>
        </button>
      </div>
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="체험 데이터 초기화">
        <p className="mb-4 text-[16px] text-ink-2">등록·신청·결과 입력한 내용을 모두 지우고 처음 샘플 데이터로 되돌립니다. 미팅 날짜도 오늘 기준으로 다시 맞춰집니다.</p>
        {ephemeral && <p className="mb-4 rounded-xl bg-neutral-bg px-3 py-2 text-[15px] text-ink-2">지금은 DB가 연결되지 않은 <b>임시 체험</b>이라, 한동안 접속이 없으면 자동으로도 처음 상태로 돌아갑니다.</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>돌아가기</Button>
          <Button className="flex-1" onClick={reset} disabled={pending} data-testid="demo-reset-confirm">{pending ? "초기화 중…" : "초기화하기"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
