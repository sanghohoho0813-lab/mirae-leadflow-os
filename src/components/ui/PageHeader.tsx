import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, sub, back, backLabel = "뒤로", action, eyebrow }: { title: ReactNode; sub?: ReactNode; back?: string; backLabel?: string; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link prefetch={false} href={back} className="mb-1 inline-flex min-h-[40px] items-center gap-0.5 text-[0.9375rem] font-medium text-ink-2 hover:text-primary">
            <ChevronLeft size={18} /> {backLabel}
          </Link>
        )}
        {eyebrow && <div className="mb-1">{eyebrow}</div>}
        <h1 className="text-[1.6875rem] font-extrabold leading-tight tracking-tight text-ink sm:text-[2rem]">{title}</h1>
        {sub && <p className="mt-1 text-[1rem] text-ink-2">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}
