"use client";

import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { applyTheme, DEFAULT_THEME, THEME_STORAGE_KEY, THEMES } from "@/lib/themes";

function readTheme(): string {
  try { return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}

/** Keeps every open document (incl. the Device View iframe) on the same theme. */
export function ThemeSync() {
  useEffect(() => {
    applyTheme(readTheme());
    const onStorage = (e: StorageEvent) => { if (e.key === THEME_STORAGE_KEY) applyTheme(e.newValue || DEFAULT_THEME, true); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}

export function ThemePicker({ variant = "icon", onPicked }: { variant?: "icon" | "row"; onPicked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(DEFAULT_THEME);
  const toast = useToast();
  useEffect(() => setCurrent(readTheme()), [open]);

  const pick = (key: string, name: string) => {
    setCurrent(key);
    applyTheme(key, true);
    try { localStorage.setItem(THEME_STORAGE_KEY, key); } catch {}
    toast("success", `${name} 색상으로 바꿨습니다`);
    setOpen(false);
    onPicked?.();
  };

  return (
    <>
      {variant === "icon" ? (
        <button type="button" onClick={() => setOpen(true)} aria-label="화면 색상 바꾸기" title="화면 색상 바꾸기" data-testid="theme-button"
          className="press hidden h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[14.5px] font-semibold text-ink-2 hover:border-primary/40 hover:text-primary lg:inline-flex">
          <Palette size={18} /> <span className="hidden 2xl:inline">색상</span>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} data-testid="theme-button-mobile"
          className="press flex w-full items-center gap-3 rounded-xl px-3 text-[16px] font-semibold text-ink hover:bg-neutral-bg" style={{ height: 52 }}>
          <span className="nav-icon-light"><Palette size={20} /></span> 화면 색상 바꾸기
        </button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title="화면 색상" testId="theme-dialog">
        <p className="mb-3 text-[15px] text-ink-2">누르면 바로 바뀝니다. 이 기기에만 저장됩니다.</p>
        <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {THEMES.map((t) => {
            const active = t.key === current;
            return (
              <button key={t.key} type="button" onClick={() => pick(t.key, t.name)} data-testid={`theme-${t.key}`} aria-pressed={active}
                className={`press lift flex flex-col gap-2 rounded-xl border-2 bg-white p-3 text-left ${active ? "border-primary" : "border-line"}`}>
                <span className="flex items-center justify-between text-[15.5px] font-bold text-ink">
                  {t.name}
                  {active && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"><Check size={15} /></span>}
                </span>
                <span className="flex overflow-hidden rounded-lg border border-line" aria-hidden>
                  {[...t.colors, "#ffffff"].map((c, i) => <span key={i} className="h-7 flex-1" style={{ background: c }} />)}
                </span>
              </button>
            );
          })}
        </div>
      </Dialog>
    </>
  );
}
