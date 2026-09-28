"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Dialog({ open, onClose, title, children, testId, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; testId?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Portal to <body>: blurred/transformed ancestors (e.g. the sticky header) would
  // otherwise trap `position: fixed` and clip the dialog.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4" onClick={onClose} data-testid={testId}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fade-up w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-[21px] font-bold text-ink">{title}</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink-3 hover:bg-neutral-bg">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
