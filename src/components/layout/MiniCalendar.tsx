import Link from "next/link";

export interface TrainingDays { month: string; today: string; days: Record<string, "OWNER" | "LEADER" | "OTHER"> }

const DOT = { OWNER: "bg-gold", LEADER: "bg-sky-300", OTHER: "bg-white/60" } as const;
const DOT_LIGHT = { OWNER: "bg-primary", LEADER: "bg-blue-600", OTHER: "bg-gold" } as const;

/** 메뉴 속 작은 교육 달력: 이번 달, 교육 있는 날에 점. 누르면 교육 일정으로. */
export function MiniCalendar({ data, dark }: { data: TrainingDays; dark?: boolean }) {
  const [y, m] = data.month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const nextDay = Object.keys(data.days).sort().find((d) => d >= data.today);
  return (
    <Link prefetch={false} href="/trainings/schedule" data-testid="mini-calendar"
      className={`block rounded-xl p-2.5 transition-base ${dark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "border border-line bg-white hover:border-primary/40"}`}>
      <div className={`mb-1 flex items-baseline justify-between px-0.5 text-[0.8125rem] font-bold ${dark ? "text-white/85" : "text-ink"}`}>
        <span>{m}월 교육</span>
        {nextDay && <span className={`font-semibold ${dark ? "text-white/60" : "text-ink-3"}`}>{nextDay === data.today ? "오늘 교육" : `다음 ${Number(nextDay.slice(5, 7))}/${Number(nextDay.slice(8))}`}</span>}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {["일", "월", "화", "수", "목", "금", "토"].map((w) => <span key={w} className={`text-[0.6875rem] font-semibold ${dark ? "text-white/45" : "text-ink-3"}`}>{w}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`p${i}`} />;
          const key = `${data.month}-${String(d).padStart(2, "0")}`;
          const kind = data.days[key];
          const today = key === data.today;
          return (
            <span key={key} className={`relative mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] font-semibold ${today ? (dark ? "bg-white text-shell" : "bg-primary text-white") : dark ? "text-white/80" : "text-ink-2"}`}>
              {d}
              {kind && <span className={`absolute -bottom-0.5 h-1.5 w-1.5 rounded-full ${(dark ? DOT : DOT_LIGHT)[kind]}`} />}
            </span>
          );
        })}
      </div>
    </Link>
  );
}
