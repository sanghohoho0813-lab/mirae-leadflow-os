"use client";

/**
 * 시간 고르기 — 시계 바늘 대신 버튼: [9시]…[17시] + [정각 | 30분].
 * 드물게 다른 시간은 아래 목록(30분 단위)에서 고른다. Value is "HH:MM".
 */
export function TimePicker({ value, onChange, name, hours = [9, 10, 11, 12, 13, 14, 15, 16, 17], testId, id }: {
  value: string;
  onChange: (v: string) => void;
  name?: string;
  hours?: number[];
  testId?: string;
  id?: string;
}) {
  const [h, m] = value.split(":").map(Number);
  const half = m >= 30;
  const set = (hour: number, isHalf: boolean) => onChange(`${String(hour).padStart(2, "0")}:${isHalf ? "30" : "00"}`);
  const others: string[] = [];
  for (let x = 6; x <= 22; x++) for (const mm of ["00", "30"]) others.push(`${String(x).padStart(2, "0")}:${mm}`);
  const label = Number.isFinite(h) ? `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}시${half ? " 30분" : ""}` : "";
  const chip = (active: boolean) =>
    `press min-h-[2.75rem] min-w-[3.5rem] rounded-xl border-2 px-3 text-[0.9375rem] font-semibold transition-base ${active ? "border-primary bg-soft text-primary" : "border-line bg-white text-ink-2 hover:border-primary/40"}`;

  return (
    <div className="grid gap-2" data-testid={testId}>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="시">
        {hours.map((x) => (
          <button key={x} type="button" role="radio" aria-checked={h === x} className={chip(h === x)} onClick={() => set(x, half)} data-testid={testId ? `${testId}-h${x}` : undefined}>
            {x}시
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-line bg-white p-1" role="radiogroup" aria-label="분">
          {[{ v: false, l: "정각" }, { v: true, l: "30분" }].map((o) => (
            <button key={o.l} type="button" role="radio" aria-checked={half === o.v} onClick={() => set(Number.isFinite(h) ? h : 10, o.v)}
              className={`h-10 rounded-lg px-4 text-[0.9375rem] font-semibold ${half === o.v ? "bg-primary text-white" : "text-ink-2 hover:bg-neutral-bg"}`}
              data-testid={testId ? `${testId}-${o.v ? "half" : "zero"}` : undefined}>
              {o.l}
            </button>
          ))}
        </div>
        <select id={id} aria-label="다른 시간" value={others.includes(value) ? value : ""} onChange={(e) => e.target.value && onChange(e.target.value)}
          className="h-11 rounded-xl border border-line-strong bg-white px-3 text-[0.9375rem] font-semibold text-ink-2">
          <option value="">다른 시간…</option>
          {others.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {label && <span className="text-[0.9375rem] font-bold text-primary" aria-live="polite">{label}</span>}
      </div>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
