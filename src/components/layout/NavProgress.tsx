"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top bar shown from the moment an in-app link is tapped until the new
 * page is on screen, so every tap gets immediate visible feedback.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  // How long the current load has been running: a calm note appears if it is slow.
  const [slow, setSlow] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setState("running");
    };
    const onBusy = () => setState("running");
    const onRender = () => setState((s) => (s === "running" ? "done" : s));
    document.addEventListener("click", onClick, true);
    window.addEventListener("lf:busy", onBusy);
    window.addEventListener("lf:render", onRender);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("lf:busy", onBusy);
      window.removeEventListener("lf:render", onRender);
    };
  }, []);

  // New page committed → finish the bar.
  useEffect(() => {
    setState((s) => (s === "running" ? "done" : s));
  }, [pathname, search]);

  useEffect(() => {
    if (state === "done") {
      const t = setTimeout(() => setState("idle"), 260);
      return () => clearTimeout(t);
    }
    if (state === "running") {
      const a = setTimeout(() => setSlow(1), 1500);
      const b = setTimeout(() => setSlow(2), 5000);
      const t = setTimeout(() => setState("idle"), 15000); // never stay stuck
      return () => { clearTimeout(a); clearTimeout(b); clearTimeout(t); setSlow(0); };
    }
  }, [state]);

  if (state === "idle") return null;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]" aria-hidden data-testid="nav-progress">
        <div className={`h-full bg-primary shadow-[0_0_8px_var(--theme-primary)] ${state === "running" ? "nav-progress-run" : "nav-progress-done"}`} />
      </div>
      {state === "running" && slow > 0 && (
        <div className="toast-in pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-4" role="status" data-testid="slow-notice">
          <span className="flex items-center gap-2 rounded-full bg-ink/85 px-4 py-2 text-[0.9375rem] font-semibold text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-highlight" />
            {slow === 1 ? "불러오는 중입니다…" : "서버가 깨어나는 중이라 조금 걸립니다. 잠시만 기다려 주세요."}
          </span>
        </div>
      )}
    </>
  );
}
