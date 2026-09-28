import type { MemberRole } from "@/lib/types";

/**
 * One color per 강사 group so the month reads at a glance: 단장 · 2본부 · 3본부 · 그 외.
 * 본부 colors are fixed hues (not theme tokens): in some themes info/purple collapse into the primary color.
 */
export function scheduleTone(t: { instructor_role: MemberRole | null; instructor_division: string | null }): { chip: string; dot: string; label: string } {
  if (t.instructor_role === "OWNER") return { chip: "bg-primary text-white", dot: "bg-primary", label: "단장 교육" };
  if (t.instructor_role === "LEADER") {
    const d = t.instructor_division ?? "";
    if (d.startsWith("2")) return { chip: "bg-blue-50 text-blue-700", dot: "bg-blue-600", label: `${d} 본부장 교육` };
    if (d.startsWith("3")) return { chip: "bg-violet-50 text-violet-700", dot: "bg-violet-600", label: `${d} 본부장 교육` };
    return { chip: "bg-amber-50 text-amber-800", dot: "bg-amber-600", label: `${d ? `${d} ` : ""}본부장 교육` };
  }
  return { chip: "bg-neutral-bg text-ink-2", dot: "bg-gold", label: "특별 교육" };
}

/** "YYYY-MM" ± n months. */
export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Calendar cells for a month, Sunday first; null = padding. */
export function monthCells(ym: string): (string | null)[] {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${ym}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
