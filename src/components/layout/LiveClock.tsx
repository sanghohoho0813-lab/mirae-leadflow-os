"use client";

import { useEffect, useState } from "react";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** Korea time parts, independent of the device's own time zone. */
function kstParts(d: Date) {
  const k = new Date(d.getTime() + 9 * 3600000);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    y: k.getUTCFullYear(), m: p(k.getUTCMonth() + 1), d: p(k.getUTCDate()), w: DAYS[k.getUTCDay()],
    time: `${p(k.getUTCHours())}:${p(k.getUTCMinutes())}:${p(k.getUTCSeconds())}`,
  };
}

/**
 * 오늘 날짜 + 현재 시각(초 단위), 한국 시간. Rendered only after mount so the
 * server's clock never mismatches the browser's during hydration.
 */
export function LiveClock({ variant = "full" }: { variant?: "full" | "stacked" }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const t = now ? kstParts(now) : null;

  if (variant === "stacked") {
    return (
      <div className="clock flex min-w-[76px] flex-col items-end leading-tight" data-testid="live-clock" aria-label="현재 시각">
        <span className="text-[13px] font-semibold text-ink-3">{t ? `${t.m}.${t.d} (${t.w})` : " "}</span>
        <span className="text-[16px] font-bold text-ink">{t ? t.time : " "}</span>
      </div>
    );
  }
  return (
    <div className="clock flex items-baseline gap-2.5 whitespace-nowrap" data-testid="live-clock" aria-label="현재 시각">
      <span className="text-[16px] font-semibold text-ink-2">{t ? `${t.y}년 ${Number(t.m)}월 ${Number(t.d)}일 (${t.w})` : " "}</span>
      <span className="min-w-[82px] text-[20px] font-extrabold text-ink">{t ? t.time : ""}</span>
    </div>
  );
}
