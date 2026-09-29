"use client";

import { useEffect, useState } from "react";
import { Check, Info } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  applyFont, applyMotion, applyTheme, DEFAULT_THEME, FONT_SIZES, FONT_STORAGE_KEY, isFontSize, isThemeKey,
  MOTION_STORAGE_KEY, THEME_STORAGE_KEY, THEMES, type FontSize,
} from "@/lib/themes";
import { DeviceSwitch, useDeviceView } from "./DeviceView";

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
const readTheme = () => { const t = read(THEME_STORAGE_KEY); return isThemeKey(t) ? t : DEFAULT_THEME; };
const readMotion = () => read(MOTION_STORAGE_KEY) === "reduce";
const readFont = (): FontSize => { const f = read(FONT_STORAGE_KEY); return isFontSize(f) ? f : "normal"; };

/** Keeps every open document (incl. the Device View iframe) on the same theme, motion and font size. */
export function ThemeSync() {
  useEffect(() => {
    applyTheme(readTheme());
    applyMotion(readMotion());
    applyFont(readFont());
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) applyTheme(e.newValue || DEFAULT_THEME, true);
      if (e.key === MOTION_STORAGE_KEY) applyMotion(e.newValue === "reduce");
      if (e.key === FONT_STORAGE_KEY) applyFont(e.newValue || "normal");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}

function Section({ title, desc, children, testId }: { title: string; desc?: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" data-testid={testId}>
      <h2 className="text-[1.1875rem] font-bold text-ink">{title}</h2>
      {desc && <p className="mb-3 mt-0.5 text-[0.9375rem] text-ink-2">{desc}</p>}
      {!desc && <div className="mb-3" />}
      {children}
    </section>
  );
}

/** 설정 화면 본문: 글자 크기 · 화면 색 · 움직임 · 보기 방식. Saved on this device. */
export function DisplaySettings() {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [font, setFont] = useState<FontSize>("normal");
  const [reduce, setReduce] = useState(false);
  const { inFrame } = useDeviceView();
  const toast = useToast();
  useEffect(() => { setTheme(readTheme()); setFont(readFont()); setReduce(readMotion()); }, []);

  return (
    <div className="grid gap-4">
      <Section title="글자 크기" desc="화면 전체의 글자와 버튼이 함께 커집니다. 바로 적용되고 이 기기에 저장됩니다." testId="font-settings">
        <div className="grid gap-2 @2xl:grid-cols-3" role="radiogroup" aria-label="글자 크기">
          {FONT_SIZES.map((f, i) => {
            const active = font === f.key;
            return (
              <button key={f.key} type="button" role="radio" aria-checked={active} data-testid={`font-${f.key}`}
                onClick={() => { setFont(f.key); applyFont(f.key); write(FONT_STORAGE_KEY, f.key); toast("success", `글자 크기: ${f.label}`); }}
                className={`press flex items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left ${active ? "border-primary bg-soft" : "border-line hover:border-primary/40"}`}>
                <span className="font-extrabold text-ink" style={{ fontSize: `${[18, 21, 24][i]}px` }} aria-hidden>가</span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className={`block text-[1.0625rem] font-bold ${active ? "text-primary" : "text-ink"}`}>{f.label}</span>
                  <span className="block text-[0.8125rem] text-ink-3">{f.desc}</span>
                </span>
                {active && <Check size={20} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="화면 색" testId="theme-settings">
        <p className="mb-3 flex gap-2 rounded-xl border border-line bg-canvas px-3.5 py-3 text-[0.9375rem] text-ink-2">
          <Info size={18} className="mt-0.5 shrink-0" />
          전체 화면의 색을 9가지 중에서 고릅니다. 고르면 바로 바뀌고 다음 접속에도 유지됩니다. 글자·표의 읽기 편한 색은 그대로입니다.
        </p>
        <div className="grid gap-2 @xl:grid-cols-2 @4xl:grid-cols-3">
          {THEMES.map((t) => {
            const active = t.key === theme;
            return (
              <button key={t.key} type="button" data-testid={`theme-${t.key}`} aria-pressed={active}
                onClick={() => { setTheme(t.key); applyTheme(t.key, true); write(THEME_STORAGE_KEY, t.key); toast("success", `${t.name}(으)로 바꿨습니다`); }}
                className={`press flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition-base ${active ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong"}`}>
                <span className="flex h-7 w-20 shrink-0 overflow-hidden rounded-md" aria-hidden>
                  {t.colors.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[0.96875rem] font-bold leading-snug text-ink">{t.name}</span>
                  <span className="block text-[0.84375rem] leading-snug text-ink-3">{t.desc}</span>
                </span>
                {active && <Check size={18} className="shrink-0 text-ink" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="화면 움직임">
        <label className="flex min-h-[3.5rem] cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3">
          <span className="flex-1 leading-tight">
            <span className="block text-[1rem] font-bold text-ink">화면 움직임 줄이기</span>
            <span className="block text-[0.875rem] text-ink-3">메뉴·팝업이 부드럽게 나타납니다. 어지러우면 켜 주세요.</span>
          </span>
          <input type="checkbox" checked={reduce} className="h-6 w-6 accent-[var(--theme-primary)]" data-testid="motion-toggle"
            onChange={() => { const next = !reduce; setReduce(next); applyMotion(next); write(MOTION_STORAGE_KEY, next ? "reduce" : "normal"); }} />
        </label>
      </Section>

      {!inFrame && (
        <div className="hidden lg:block">
          <Section title="보기 방식" desc="휴대폰에서 어떻게 보이는지 PC에서 바로 확인할 수 있습니다. 문제가 생기면 자동으로 PC 화면으로 돌아옵니다.">
            <DeviceSwitch />
          </Section>
        </div>
      )}
    </div>
  );
}
