const TZ = "Asia/Seoul";
const KST_OFFSET_MIN = 9 * 60;

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function parts(d: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour;
  return { y: p.year, m: p.month, d: p.day, h: hour, min: p.minute, wd: p.weekday };
}

/** "YYYY-MM-DD" in KST */
export function kstDateString(d: Date = new Date()): string {
  const p = parts(d);
  return `${p.y}-${p.m}-${p.d}`;
}

/** "HH:MM" in KST */
export function kstTimeString(d: Date): string {
  const p = parts(d);
  return `${p.h}:${p.min}`;
}

export function weekdayKo(d: Date): string {
  const kst = new Date(d.getTime() + KST_OFFSET_MIN * 60000);
  return WEEKDAY[kst.getUTCDay()];
}

/** "2025.04.21 (월) 10:00" */
export function fmtDateTime(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const p = parts(dt);
  return `${p.y}.${p.m}.${p.d} (${weekdayKo(dt)}) ${p.h}:${p.min}`;
}

/** "04.21 (월)" */
export function fmtShortDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const p = parts(dt);
  return `${p.m}.${p.d} (${weekdayKo(dt)})`;
}

/** "2025.04.21" from a Date or YYYY-MM-DD */
export function fmtDate(d: Date | string): string {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d.replaceAll("-", ".");
  const dt = typeof d === "string" ? new Date(d) : d;
  const p = parts(dt);
  return `${p.y}.${p.m}.${p.d}`;
}

export function fmtTime(d: Date | string): string {
  return kstTimeString(typeof d === "string" ? new Date(d) : d);
}

/** Relative day label for a date, e.g. 오늘 / 내일 / 어제 / 3일 전 / 5일 후 */
export function relativeDay(target: Date | string, now: Date = new Date()): { label: string; diff: number } {
  const t = typeof target === "string" && /^\d{4}-\d{2}-\d{2}$/.test(target) ? target : kstDateString(typeof target === "string" ? new Date(target) : target);
  const n = kstDateString(now);
  const diff = Math.round((Date.parse(t) - Date.parse(n)) / 86400000);
  if (diff === 0) return { label: "오늘", diff };
  if (diff === 1) return { label: "내일", diff };
  if (diff === -1) return { label: "어제", diff };
  if (diff < 0) return { label: `${-diff}일 지남`, diff };
  return { label: `${diff}일 후`, diff };
}

/** Combines a KST date (YYYY-MM-DD) and time (HH:MM) into a UTC Date. */
export function kstToDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, min) - KST_OFFSET_MIN * 60000);
}

export function isPast(d: Date | string, now: Date = new Date()): boolean {
  return (typeof d === "string" ? new Date(d) : d).getTime() < now.getTime();
}

export function daysSince(d: Date | string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - (typeof d === "string" ? new Date(d) : d).getTime()) / 86400000);
}

export function fmtRelativeTime(d: Date | string, now: Date = new Date()): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const mins = Math.round((now.getTime() - dt.getTime()) / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}일 전`;
  return fmtDate(dt);
}
