import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

export function Empty({ title, desc, icon, action, tone = "ok" }: { title: string; desc?: string; icon?: ReactNode; action?: ReactNode; tone?: "ok" | "neutral" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
      <span className={tone === "ok" ? "text-success" : "text-ink-3"}>{icon ?? <CheckCircle2 size={30} />}</span>
      <p className="text-[17px] font-semibold text-ink">{title}</p>
      {desc && <p className="text-[15px] text-ink-3">{desc}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
