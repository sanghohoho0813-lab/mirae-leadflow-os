"use client";

import { useState } from "react";
import { Database, UserRound } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useDeviceView, DeviceSwitch } from "./DeviceView";
import { PersonaDialog, SampleDbPanel, personaLabel, type DemoTools } from "./DemoTools";

export type { Persona } from "./DemoTools";

/**
 * 막대 폭(PC+Mobile 미리보기에서는 67%)에 맞춰 글자를 줄인다 — 넘치면 PC/Mobile 전환이 가려진다.
 * 체험 모드 막대: 지금 누구 화면인지 + [사용자 변경하기] + [샘플 DB 추가·삭제].
 * 버튼마다 글자가 보인다 (아이콘만 있는 버튼은 50·60대가 알아보기 어렵다).
 */
export function DemoBar({ tools, instanceId }: { tools: DemoTools; instanceId?: string }) {
  const { inFrame } = useDeviceView();
  const [who, setWho] = useState(false);
  const [samples, setSamples] = useState(false);
  // Hooks above; nothing to show inside the mobile preview frame.
  if (inFrame) return null;
  const me = tools.people.find((p) => p.id === tools.currentId);
  const btn = "press flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[0.9375rem] font-bold";

  return (
    <div className="@container/demobar border-b border-warning/25 bg-warning-bg/50" data-testid="demo-bar" data-instance={instanceId} data-ephemeral={tools.ephemeral ? "1" : undefined}>
      <div className="flex items-center gap-2 px-3 py-2 lg:px-8">
        <span className="shrink-0 rounded-lg bg-warning px-2 py-1 text-[0.8125rem] font-bold text-white" title={tools.ephemeral ? "임시 데이터: 한동안 접속이 없으면 처음 상태로 돌아갑니다" : undefined}>체험</span>
        <span className="hidden min-w-0 truncate text-[0.9375rem] text-ink-2 @5xl/demobar:inline" data-testid="demo-current">
          지금 <b className="text-ink">{personaLabel(me)}</b> 화면
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setWho(true)} data-testid="demo-switch-user" className={`${btn} border-primary bg-primary text-white hover:bg-primary-strong`}>
            <UserRound size={17} /> <span>사용자 변경<span className="hidden @4xl/demobar:inline">하기</span></span>
          </button>
          <button type="button" onClick={() => setSamples(true)} data-testid="demo-reset" className={`${btn} border-line-strong bg-white text-ink hover:border-primary/50`}>
            <Database size={17} /> <span>샘플 DB<span className="hidden @4xl/demobar:inline"> 추가·삭제</span></span>
          </button>
          <div className="hidden shrink-0 lg:block"><DeviceSwitch compact /></div>
        </div>
      </div>
      <PersonaDialog people={tools.people} currentId={tools.currentId} open={who} onClose={() => setWho(false)} />
      <Dialog open={samples} onClose={() => setSamples(false)} title="샘플 DB 추가·삭제">
        <div className="grid gap-4">
          <SampleDbPanel leadCount={tools.leadCount} ephemeral={tools.ephemeral} onDone={() => setSamples(false)} />
          <Button variant="secondary" onClick={() => setSamples(false)}>닫기</Button>
        </div>
      </Dialog>
    </div>
  );
}
