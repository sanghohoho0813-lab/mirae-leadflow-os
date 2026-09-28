"use client";

import { useEffect, useState } from "react";
import { Check, Info, Settings2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { applyMotion, applyTheme, DEFAULT_THEME, isThemeKey, MOTION_STORAGE_KEY, THEME_STORAGE_KEY, THEMES } from "@/lib/themes";
import { DeviceSwitch, useDeviceView } from "./DeviceView";

function readTheme(): string {
  try { const t = localStorage.getItem(THEME_STORAGE_KEY); return isThemeKey(t) ? t : DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}
function readMotion(): boolean {
  try { return localStorage.getItem(MOTION_STORAGE_KEY) === "reduce"; } catch { return false; }
}

/** Keeps every open document (incl. the Device View iframe) on the same theme. */
export function ThemeSync() {
  useEffect(() => {
    applyTheme(readTheme());
    applyMotion(readMotion());
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) applyTheme(e.newValue || DEFAULT_THEME, true);
      if (e.key === MOTION_STORAGE_KEY) applyMotion(e.newValue === "reduce");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}

/** "화면 설정": 화면 색 (9 themes) · 보기 방식 · 움직임 줄이기. */
export function ThemePicker({ variant = "icon", onPicked }: { variant?: "icon" | "row"; onPicked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(DEFAULT_THEME);
  const [reduce, setReduce] = useState(false);
  const { inFrame } = useDeviceView();
  const toast = useToast();
  useEffect(() => { setCurrent(readTheme()); setReduce(readMotion()); }, [open]);

  const pick = (key: string, name: string) => {
    setCurrent(key);
    applyTheme(key, true);
    try { localStorage.setItem(THEME_STORAGE_KEY, key); } catch {}
    toast("success", `${name}(으)로 바꿨습니다`);
  };
  const toggleMotion = () => {
    const next = !reduce;
    setReduce(next);
    applyMotion(next);
    try { localStorage.setItem(MOTION_STORAGE_KEY, next ? "reduce" : "normal"); } catch {}
  };
  const close = () => { setOpen(false); onPicked?.(); };

  return (
    <>
      {variant === "icon" ? (
        <button type="button" onClick={() => setOpen(true)} aria-label="화면 설정" title="화면 설정" data-testid="theme-button"
          className="press hidden h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-[15px] font-semibold text-ink-2 hover:border-primary/40 hover:text-primary lg:inline-flex">
          <Settings2 size={18} /> 화면 설정
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} data-testid="theme-button-mobile"
          className="press flex w-full items-center gap-3 rounded-xl px-3 text-[16px] font-semibold text-ink hover:bg-neutral-bg" style={{ height: 52 }}>
          <span className="nav-icon-light"><Settings2 size={20} /></span> 화면 설정 (색 · 움직임)
        </button>
      )}
      <Dialog open={open} onClose={close} title="화면 설정" testId="theme-dialog" wide>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <h3 className="mb-2 text-[17px] font-bold text-ink">화면 색</h3>
          <p className="mb-3 flex gap-2 rounded-xl border border-line bg-canvas px-3.5 py-3 text-[15px] text-ink-2">
            <Info size={18} className="mt-0.5 shrink-0" />
            전체 화면의 색을 9가지 중에서 고릅니다. 고르면 바로 바뀌고 다음 접속에도 유지됩니다. 글자·표의 읽기 편한 색은 그대로입니다.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((t) => {
              const active = t.key === current;
              return (
                <button key={t.key} type="button" onClick={() => pick(t.key, t.name)} data-testid={`theme-${t.key}`} aria-pressed={active}
                  className={`press flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition-base ${active ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong"}`}>
                  <span className="flex h-7 w-[124px] shrink-0 overflow-hidden rounded-md" aria-hidden>
                    {t.colors.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[15.5px] font-bold text-ink">{t.name}</span>
                    <span className="block truncate text-[13.5px] text-ink-3">{t.desc}</span>
                  </span>
                  {active && <Check size={18} className="shrink-0 text-ink" />}
                </button>
              );
            })}
          </div>

          <label className="mt-4 flex min-h-[64px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <span className="flex-1 leading-tight">
              <span className="block text-[16px] font-bold text-ink">화면 움직임 줄이기</span>
              <span className="block text-[14px] text-ink-3">메뉴·팝업이 부드럽게 나타납니다. 어지러우면 켜 주세요.</span>
            </span>
            <input type="checkbox" checked={reduce} onChange={toggleMotion} className="h-6 w-6 accent-[var(--theme-primary)]" data-testid="motion-toggle" />
          </label>

          {!inFrame && (
            <div className="mt-4 hidden lg:block">
              <h3 className="mb-2 text-[17px] font-bold text-ink">보기 방식</h3>
              <p className="mb-2 text-[14.5px] text-ink-3">휴대폰에서 어떻게 보이는지 PC에서 바로 확인할 수 있습니다.</p>
              <DeviceSwitch />
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
