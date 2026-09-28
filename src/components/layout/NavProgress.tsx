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
      const t = setTimeout(() => setState("idle"), 12000); // never stay stuck
      return () => clearTimeout(t);
    }
  }, [state]);

  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]" aria-hidden data-testid="nav-progress">
      <div className={`h-full bg-primary shadow-[0_0_8px_var(--theme-primary)] ${state === "running" ? "nav-progress-run" : "nav-progress-done"}`} />
    </div>
  );
}
