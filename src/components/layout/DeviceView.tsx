"use client";

import { Component, createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSafeRefresh } from "@/components/providers/SafeActions";
import { Monitor, Smartphone, Columns2 } from "lucide-react";

export type DeviceMode = "pc" | "mobile" | "dual";
const STORAGE_KEY = "lf_device_mode";

interface Ctx { mode: DeviceMode; setMode: (m: DeviceMode) => void; inFrame: boolean; ready: boolean }
const DeviceCtx = createContext<Ctx>({ mode: "pc", setMode: () => {}, inFrame: false, ready: false });
export const useDeviceView = () => useContext(DeviceCtx);

/** True when this document is rendered inside the mobile preview iframe. */
function detectInFrame(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.self !== window.top; } catch { return true; }
}

export function DeviceViewProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DeviceMode>("pc");
  const [inFrame, setInFrame] = useState(false);
  const [ready, setReady] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    setInFrame(detectInFrame());
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as DeviceMode | null;
      if (saved === "pc" || saved === "mobile" || saved === "dual") setModeState(saved);
    } catch {}
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    setReady(true);
    return () => mq.removeEventListener("change", update);
  }, []);

  const setMode = useCallback((m: DeviceMode) => {
    setModeState(m);
    window.scrollTo(0, 0);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
  }, []);

  const effective: DeviceMode = ready && wide && !inFrame ? mode : "pc";

  // The app itself is ALWAYS rendered in the same place and never unmounted when the
  // view changes — only its wrapper's layout changes. Tearing down and rebuilding the
  // whole app on every switch was fragile (browser extensions that edit the page, e.g.
  // translators, make React's DOM removal throw). The preview parts sit in their own
  // error boundary: if anything goes wrong there, we quietly fall back to PC view.
  const dual = effective === "dual";
  const mobile = effective === "mobile";
  const fallBack = useCallback(() => setMode("pc"), [setMode]);

  return (
    <DeviceCtx.Provider value={{ mode: effective, setMode, inFrame, ready }}>
      {inFrame && <FrameChildSync />}
      <div className={dual ? "flex min-h-dvh w-full" : "contents"} data-testid={dual ? "dual-view" : undefined}>
        <div className={dual ? "min-w-0 flex-[0_0_67%] overflow-x-clip border-r border-line" : mobile ? "hidden" : "contents"} aria-hidden={mobile || undefined}>
          {children}
        </div>
        {dual && (
          <PreviewBoundary onError={fallBack}>
            <div className="min-w-0 flex-[0_0_33%] bg-neutral-bg/60">
              <div className="sticky top-0 flex h-dvh flex-col items-center justify-center gap-3 p-4">
                <p className="text-[0.875rem] font-semibold text-ink-3">모바일 미리보기 · 390px · 같은 화면·같은 데이터</p>
                <MobileFrame />
              </div>
            </div>
          </PreviewBoundary>
        )}
      </div>
      {mobile && (
        <PreviewBoundary onError={fallBack}>
          <MobileStage />
        </PreviewBoundary>
      )}
    </DeviceCtx.Provider>
  );
}

/** Catches errors in the preview only; the app keeps running in PC view. */
class PreviewBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.error("[device-view] preview failed, back to PC view", error);
    this.props.onError();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

function MobileStage() {
  return (
    <div className="min-h-dvh bg-neutral-bg/60">
      <div className="flex min-h-dvh flex-col items-center gap-4 p-6">
        <div className="flex w-full max-w-5xl items-center justify-between">
          <span className="text-[1.0625rem] font-bold text-ink">모바일 미리보기 · 390px</span>
          <DeviceSwitch />
        </div>
        <MobileFrame />
      </div>
    </div>
  );
}

function MobileFrame() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const ref = useRef<HTMLIFrameElement>(null);
  const initialSrc = useRef<string>("");
  if (!initialSrc.current) {
    const qs = new URLSearchParams(search.toString());
    qs.set("frame", "mobile");
    initialSrc.current = `${pathname}?${qs.toString()}`;
  }

  // Parent -> frame: follow the desktop route.
  useEffect(() => {
    const win = ref.current?.contentWindow;
    if (!win) return;
    const qs = search.toString();
    win.postMessage({ type: "lf:navigate", path: pathname + (qs ? `?${qs}` : "") }, window.location.origin);
  }, [pathname, search]);

  // Frame -> parent: follow the mobile route.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== ref.current?.contentWindow) return;
      const data = e.data as { type?: string; path?: string };
      if (data?.type !== "lf:route" || typeof data.path !== "string") return;
      const current = pathname + (search.toString() ? `?${search.toString()}` : "");
      if (stripFrame(data.path) !== stripFrame(current)) router.push(stripFrame(data.path));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pathname, search, router]);

  return (
    <div className="device-frame" data-testid="device-frame">
      <iframe ref={ref} src={initialSrc.current} title="모바일 미리보기" />
    </div>
  );
}

function stripFrame(path: string): string {
  const [p, q] = path.split("?");
  if (!q) return p;
  const qs = new URLSearchParams(q);
  qs.delete("frame");
  const s = qs.toString();
  return s ? `${p}?${s}` : p;
}

/** Runs inside the iframe: reports route changes up, follows parent navigation. */
function FrameChildSync() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const refresh = useSafeRefresh();
  const lastSent = useRef<string>("");

  useEffect(() => {
    const qs = search.toString();
    const path = stripFrame(pathname + (qs ? `?${qs}` : ""));
    if (path === lastSent.current) return;
    lastSent.current = path;
    window.parent?.postMessage({ type: "lf:route", path }, window.location.origin);
  }, [pathname, search]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const data = e.data as { type?: string; path?: string };
      if (data?.type === "lf:refresh") { refresh(); return; }
      if (data?.type !== "lf:navigate" || typeof data.path !== "string") return;
      const current = stripFrame(pathname + (search.toString() ? `?${search.toString()}` : ""));
      const target = stripFrame(data.path);
      if (target !== current) { lastSent.current = target; router.push(target); }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pathname, search, router]);
  return null;
}

export function DeviceSwitch({ compact = false }: { compact?: boolean }) {
  const { mode, setMode, inFrame, ready } = useDeviceView();
  if (!ready || inFrame) return null;
  const items: { m: DeviceMode; label: string; icon: ReactNode }[] = [
    { m: "pc", label: "PC", icon: <Monitor size={17} /> },
    { m: "mobile", label: "Mobile", icon: <Smartphone size={17} /> },
    { m: "dual", label: "PC+Mobile", icon: <Columns2 size={17} /> },
  ];
  return (
    <div className="hidden items-center rounded-xl border border-line bg-white p-1 lg:inline-flex" data-testid={compact ? "device-switch-compact" : "device-switch"} role="tablist" aria-label="화면 보기 방식">
      {items.map((it) => (
        <button
          key={it.m}
          type="button"
          role="tab"
          aria-selected={mode === it.m}
          onClick={() => setMode(it.m)}
          title={it.label}
          aria-label={it.label}
          className={`flex h-9 items-center gap-1.5 rounded-lg ${compact ? "px-2.5" : "px-3"} text-[0.875rem] font-semibold transition-base ${mode === it.m ? "bg-primary text-white" : "text-ink-2 hover:bg-neutral-bg"}`}
        >
          {it.icon}{compact ? null : it.label}
        </button>
      ))}
    </div>
  );
}
