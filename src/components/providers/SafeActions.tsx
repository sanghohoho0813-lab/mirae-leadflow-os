"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useTransition, type ReactNode, type TransitionStartFunction } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

/**
 * Every server render of the app layout carries a fresh id. When it changes we
 * know a refresh actually reached the screen. Next 15.5's router has hung
 * refreshes in some cache states; this lets us detect that and recover.
 */
const RenderIdCtx = createContext<{ current: string } | null>(null);

export function ServerRenderProvider({ renderId, children }: { renderId: string; children: ReactNode }) {
  const ref = useRef(renderId);
  useEffect(() => {
    ref.current = renderId;
    window.dispatchEvent(new Event("lf:render")); // ends the top progress bar
  }, [renderId]);
  return <RenderIdCtx.Provider value={ref}>{children}</RenderIdCtx.Provider>;
}

const REFRESH_WATCHDOG_MS = 4000;

/** router.refresh() that falls back to a full reload if nothing new arrives. */
export function useSafeRefresh() {
  const router = useRouter();
  const ref = useContext(RenderIdCtx);
  return useCallback(() => {
    const before = ref?.current;
    window.dispatchEvent(new Event("lf:busy"));
    router.refresh();
    if (!ref) return;
    window.setTimeout(() => {
      if (ref.current === before) window.location.reload();
    }, REFRESH_WATCHDOG_MS);
  }, [router, ref]);
}

// One-shot notice flags that QueryToast strips from the URL after landing.
const NOTICE_PARAMS = ["created", "updated", "claimed", "reported"];
function normalize(u: URL): string {
  const q = new URLSearchParams(u.search);
  NOTICE_PARAMS.forEach((k) => q.delete(k));
  const s = q.toString();
  return u.pathname + (s ? `?${s}` : "");
}

/** router.push/replace that falls back to a normal page load if it stalls. */
export function useSafeNavigate() {
  const router = useRouter();
  return useCallback((url: string, mode: "push" | "replace" = "push") => {
    const target = normalize(new URL(url, window.location.href));
    if (mode === "replace") router.replace(url); else router.push(url);
    window.setTimeout(() => {
      if (normalize(new URL(window.location.href)) !== target) window.location.assign(url);
    }, REFRESH_WATCHDOG_MS);
  }, [router]);
}

/**
 * useTransition for server actions: a network failure or server timeout shows
 * a toast instead of escaping to the error screen.
 */
export function useSafeTransition(): [boolean, TransitionStartFunction] {
  const [pending, start] = useTransition();
  const toast = useToast();
  const safeStart = useCallback<TransitionStartFunction>((fn) => {
    start(async () => {
      try {
        await fn();
      } catch (e) {
        console.error(e);
        toast("error", "연결이 잠시 불안정합니다. 잠시 후 다시 눌러 주세요.");
      }
    });
  }, [start, toast]);
  return [pending, safeStart];
}
