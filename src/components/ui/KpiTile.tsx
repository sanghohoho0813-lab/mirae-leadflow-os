"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Tone } from "@/lib/labels";

// Calm tiles: white card, one small tinted icon. Color is a hint, not a fill.
const toneStyle: Record<Tone, { icon: string }> = {
  info: { icon: "bg-soft text-primary" },
  success: { icon: "bg-success-bg text-success" },
  warning: { icon: "bg-warning-bg text-warning" },
  danger: { icon: "bg-danger-bg text-danger" },
  purple: { icon: "bg-purple-bg text-purple" },
  neutral: { icon: "bg-neutral-bg text-neutral" },
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
    <div className={`group flex h-full flex-col gap-2 rounded-2xl border bg-white p-4 shadow-card ${href ? "lift press" : ""} ${emphasis && value > 0 ? "border-danger/45" : "border-line"}`} data-testid={testId}>
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${s.icon}`}>{icon}</span>
        <span className={`text-[16px] font-semibold ${emphasis && value > 0 ? "text-danger" : "text-ink-2"}`}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-[34px] font-extrabold leading-none tracking-tight tabular-nums ${emphasis && value > 0 ? "text-danger" : "text-ink"}`}>{shown}</span>
        <span className="text-[17px] font-semibold text-ink-2">건</span>
      </div>
      {sub && <span className="text-[14px] text-ink-3">{sub}</span>}
    </div>
  );
  return href ? <Link prefetch={false} href={href} className="block h-full">{inner}</Link> : inner;
}
