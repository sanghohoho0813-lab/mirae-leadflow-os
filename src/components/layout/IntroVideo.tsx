"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const HIDE_UNTIL = "lf:intro-hide-until";
const NEVER = "lf:intro-never";
const DAY = 24 * 60 * 60 * 1000;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: just close */ }
}

/**
 * Should the intro open by itself on this page load? Yes, unless the person
 * chose 하루 동안 안 보기 (within 24h) or 다시 보지 않기. Automated browsers
 * (tests, screenshot scripts) never get it on their own; `?intro=1` forces it.
 */
export function shouldAutoOpenIntro(): boolean {
  if (new URLSearchParams(window.location.search).get("intro") === "1") return true;
  if (window.self !== window.top) return false; // 모바일 미리보기 틀 안에서는 띄우지 않는다
  if (navigator.webdriver) return false;
  if (read(NEVER) === "1") return false;
  const until = Number(read(HIDE_UNTIL) ?? 0);
  return !(until && Date.now() < until);
}

/** 서비스 소개 영상 (44초, 자막형) — 화면 가운데에 띄운다. */
export function IntroVideo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnded(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  const hideForDay = () => { write(HIDE_UNTIL, String(Date.now() + DAY)); onClose(); };
  const hideForever = () => { write(NEVER, "1"); onClose(); };
  const replay = () => { const v = ref.current; if (v) { v.currentTime = 0; void v.play(); setEnded(false); } };
  const btn = "press flex min-h-[3rem] items-center justify-center rounded-xl px-4 text-[1rem] font-bold";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-3 backdrop-blur-sm sm:p-6" onClick={onClose} data-testid="intro-video" role="dialog" aria-modal="true" aria-label="서비스 소개 영상">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="text-[1.0625rem] font-extrabold text-ink">리드플로우 소개 영상</div>
            <div className="text-[0.875rem] text-ink-3">44초 · 소리 없이 자막으로 보는 영상</div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 hover:bg-neutral-bg" data-testid="intro-close-x"><X size={24} /></button>
        </div>
        <div className="relative bg-black">
          {/* MP4(H.264)가 먼저: 아이폰·카카오톡 브라우저. 못 트는 브라우저는 WebM으로. */}
          <video ref={ref} poster="/intro/poster.jpg" autoPlay muted playsInline controls preload="auto"
            onEnded={() => setEnded(true)} className="block aspect-video w-full" data-testid="intro-video-player">
            <source src="/intro/leadflow-intro.mp4" type="video/mp4" />
            <source src="/intro/leadflow-intro.webm" type="video/webm" />
          </video>
          {ended && (
            <button type="button" onClick={replay} className="absolute inset-0 m-auto flex h-14 w-44 items-center justify-center rounded-2xl bg-white/95 text-[1.0625rem] font-bold text-ink shadow-lg">
              다시 보기
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:p-4">
          <button type="button" onClick={hideForDay} className={`${btn} border border-line-strong bg-white text-ink-2 hover:bg-neutral-bg`} data-testid="intro-hide-day">하루 동안 안 보기</button>
          <button type="button" onClick={hideForever} className={`${btn} border border-line-strong bg-white text-ink-2 hover:bg-neutral-bg`} data-testid="intro-hide-forever">다시 보지 않기</button>
          <button type="button" onClick={onClose} className={`${btn} col-span-2 bg-primary text-white hover:bg-primary-strong sm:col-span-1`} data-testid="intro-close">닫기</button>
        </div>
      </div>
    </div>
  );
}
