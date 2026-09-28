import Link from "next/link";
import { BookOpen, CalendarDays, FolderOpen } from "lucide-react";

/** 교육 세 화면을 한 줄 탭으로: 교육 요약 · 교육 일정 · 자료 모음. */
export function EducationTabs({ active }: { active: "sessions" | "schedule" | "files" }) {
  const tabs = [
    { key: "sessions", href: "/trainings", label: "교육 요약", icon: <BookOpen size={19} /> },
    { key: "schedule", href: "/trainings/schedule", label: "교육 일정", icon: <CalendarDays size={19} /> },
    { key: "files", href: "/trainings?view=files", label: "자료 모음", icon: <FolderOpen size={19} /> },
  ] as const;
  return (
    <nav className="mb-4 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-white p-1 shadow-card" aria-label="교육 화면" role="tablist">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link prefetch={false} key={t.key} href={t.href} role="tab" aria-selected={on} data-testid={`trainings-view-${t.key}`}
            className={`press flex h-12 items-center justify-center gap-1.5 rounded-xl text-[1rem] font-bold ${on ? "bg-primary text-white" : "text-ink-2 hover:bg-neutral-bg"}`}>
            <span className="hidden sm:inline">{t.icon}</span>{t.label}
          </Link>
        );
      })}
    </nav>
  );
}
