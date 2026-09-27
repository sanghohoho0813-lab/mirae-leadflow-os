"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Tone } from "@/lib/labels";

const toneStyle: Record<Tone, { bg: string; text: string; icon: string }> = {
  info: { bg: "bg-info-bg/70 border-info/15", text: "text-info", icon: "bg-info text-white" },
  success: { bg: "bg-success-bg/70 border-success/15", text: "text-success", icon: "bg-success text-white" },
  warning: { bg: "bg-warning-bg/70 border-warning/15", text: "text-warning", icon: "bg-warning text-white" },
  danger: { bg: "bg-danger-bg/70 border-danger/15", text: "text-danger", icon: "bg-danger text-white" },
  purple: { bg: "bg-purple-bg/70 border-purple/15", text: "text-purple", icon: "bg-purple text-white" },
  neutral: { bg: "bg-neutral-bg/70 border-neutral/15", text: "text-neutral", icon: "bg-neutral text-white" },
};

function useCountUp(target: number, duration = 550) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) { setValue(target); return; }
    started.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setValue(target); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function KpiTile({ label, value, tone = "info", icon, href, sub, emphasis, testId }: {
  label: string; value: number; tone?: Tone; icon: ReactNode; href?: string; sub?: string; emphasis?: boolean; testId?: string;
}) {
  const shown = useCountUp(value);
  const s = toneStyle[tone];
  const inner = (
    <div className={`flex h-full flex-col gap-2 rounded-2xl border p-4 transition-base ${s.bg} ${href ? "hover:-translate-y-0.5 hover:shadow-card" : ""} ${emphasis && value > 0 ? "ring-2 ring-danger/50" : ""}`} data-testid={testId}>
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${s.icon}`}>{icon}</span>
        <span className={`text-[16px] font-semibold ${s.text}`}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[34px] font-extrabold leading-none tracking-tight text-ink tabular-nums">{shown}</span>
        <span className="text-[17px] font-semibold text-ink-2">건</span>
      </div>
      {sub && <span className="text-[14px] text-ink-3">{sub}</span>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}
