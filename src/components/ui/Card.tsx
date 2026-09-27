import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function Card({ children, className = "", tone = "white", testId }: { children: ReactNode; className?: string; tone?: "white" | "soft" | "danger" | "warning"; testId?: string }) {
  const bg = tone === "white" ? "bg-white" : tone === "soft" ? "bg-soft" : tone === "danger" ? "bg-danger-bg/60" : "bg-warning-bg/60";
  return <section className={`min-w-0 rounded-2xl border border-line ${bg} shadow-card ${className}`} data-testid={testId}>{children}</section>;
}

export function CardHeader({ icon, title, count, href, hrefLabel = "전체보기", right }: { icon?: ReactNode; title: string; count?: number; href?: string; hrefLabel?: string; right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <h2 className="flex items-center gap-2 text-[19px] font-bold text-ink">
        {icon && <span className="text-primary">{icon}</span>}
        {title}
        {typeof count === "number" && <span className="ml-1 text-[17px] font-semibold text-ink-3">{count}건</span>}
      </h2>
      {right}
      {href && (
        <Link href={href} className="flex items-center gap-0.5 text-[15px] font-medium text-primary hover:underline">
          {hrefLabel} <ChevronRight size={16} />
        </Link>
      )}
    </header>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}
