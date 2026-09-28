"use client";

import { useState } from "react";
import { useSafeRefresh, useSafeTransition } from "@/components/providers/SafeActions";
import { useToast } from "@/components/ui/Toast";
import { setClaimLimit } from "@/lib/actions/leads";

const OPTIONS = [
  { v: 1, label: "1건", desc: "추천 · 결과 입력 후 다음 신청" },
  { v: 2, label: "2건", desc: "" },
  { v: 3, label: "3건", desc: "" },
  { v: 0, label: "제한 없음", desc: "" },
];

/** 한 사람이 동시에 가질 수 있는 '결과 입력 전' 미팅 수. */
export function ClaimLimit({ value }: { value: number }) {
  const [current, setCurrent] = useState(value);
  const [pending, start] = useSafeTransition();
  const refresh = useSafeRefresh();
  const toast = useToast();
  return (
    <div>
      <p className="mb-3 text-[0.9688rem] text-ink-2">
        한 컨설턴트가 결과를 입력하기 전까지 가질 수 있는 미팅 수입니다. 1건으로 두면 DB가 골고루 돌아가고, 결과 입력도 빨라집니다.
        단장님이 직접 배정할 때는 이 제한이 적용되지 않습니다.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="1인 동시 진행 한도">
        {OPTIONS.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={current === o.v} disabled={pending} data-testid={`claim-limit-${o.v}`}
            onClick={() => {
              if (o.v === current) return;
              const prev = current;
              setCurrent(o.v);
              start(async () => {
                const r = await setClaimLimit(o.v);
                if (!r.ok) { setCurrent(prev); toast("error", r.message ?? "바꾸지 못했습니다."); return; }
                toast("success", o.v ? `한 사람당 ${o.v}건으로 바꿨습니다.` : "제한 없이 신청할 수 있게 바꿨습니다.");
                refresh();
              });
            }}
            className={`press flex min-h-[60px] flex-col items-center justify-center rounded-xl border-2 px-2 text-center ${current === o.v ? "border-primary bg-soft text-primary" : "border-line bg-white text-ink-2 hover:border-primary/40"}`}>
            <span className="text-[1.0625rem] font-bold">{o.label}</span>
            {o.desc && <span className="text-[0.7812rem] font-medium">{o.desc}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
