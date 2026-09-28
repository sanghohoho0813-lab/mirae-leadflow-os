import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function Card({ children, className = "", tone = "white", testId }: { children: ReactNode; className?: string; tone?: "white" | "soft" | "danger" | "warning"; testId?: string }) {
  const bg = tone === "white" ? "bg-white" : tone === "soft" ? "bg-soft" : tone === "danger" ? "bg-danger-bg/60" : "bg-warning-bg/60";
  return <section className={`min-w-0 rounded-2xl border border-line ${bg} shadow-card ${className}`} data-testid={testId}>{children}</section>;
}

export function CardHeader({ icon, title, count, href, hrefLabel = "전체보기", right }: { icon?: ReactNode; title: string; count?: number; href?: string; hrefLabel?: string; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pb-3 pt-5">
      <h2 className="flex min-w-0 items-center gap-2 text-[1.1875rem] font-bold leading-snug text-ink">
        {icon && <span className="shrink-0 text-primary">{icon}</span>}
        <span className="min-w-0">
          {title}
          {typeof count === "number" && <span className="ml-1.5 whitespace-nowrap text-[1.0625rem] font-semibold text-ink-3">{count}건</span>}
        </span>
      </h2>
      {(right || href) && (
        <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
          {right}
          {href && (
            <Link prefetch={false} href={href} className="flex min-h-[40px] items-center gap-0.5 text-[0.9375rem] font-medium text-primary hover:underline">
              {hrefLabel} <ChevronRight size={16} />
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}
