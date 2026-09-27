import type { ReactNode } from "react";
import { STATUS_LABEL, STATUS_TONE, type Tone } from "@/lib/labels";
import type { LeadStatus } from "@/lib/types";

const toneClass: Record<Tone, string> = {
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  purple: "bg-purple-bg text-purple",
  neutral: "bg-neutral-bg text-neutral",
};

export function Badge({ tone = "neutral", children, className = "", size = "md" }: { tone?: Tone; children: ReactNode; className?: string; size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg font-semibold whitespace-nowrap ${size === "lg" ? "px-3 py-1.5 text-[15px]" : "px-2.5 py-1 text-[14px]"} ${toneClass[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, needsReport, size = "md" }: { status: LeadStatus; needsReport?: boolean; size?: "md" | "lg" }) {
  if (needsReport) return <Badge tone="danger" size={size}>결과 미입력</Badge>;
  return <Badge tone={STATUS_TONE[status]} size={size}>{STATUS_LABEL[status]}</Badge>;
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[14px] font-medium ${toneClass[tone]}`}>{children}</span>;
}
