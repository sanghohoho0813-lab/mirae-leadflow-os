"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";
import { reportClientError } from "@/lib/actions/client-log";

/** Clears per-device view state that could keep re-triggering an error. */
function resetViewState() {
  try {
    localStorage.removeItem("lf_device_mode");
  } catch {}
}

// A new version was deployed while this tab was open: old screen code can no longer
// be loaded. One automatic reload fixes it, so don't bother the person with it.
const STALE_BUILD = /ChunkLoadError|Loading chunk|dynamically imported module|Failed to find Server Action|was not found on the server|Failed to fetch RSC/i;

export function RecoveryScreen({ error, reset }: { error: Error & { digest?: string }; reset?: () => void }) {
  useEffect(() => {
    console.error(error);
    reportClientError({ message: error.message || String(error), stack: error.stack, url: window.location.href, where: reset ? "error.tsx" : "global-error" }).catch(() => {});
    if (STALE_BUILD.test(error.message || "")) {
      try {
        if (!sessionStorage.getItem("lf_autoreload")) {
          sessionStorage.setItem("lf_autoreload", "1");
          resetViewState();
          window.location.reload();
          return;
        }
      } catch {}
    }
    try { sessionStorage.removeItem("lf_autoreload"); } catch {}
  }, [error, reset]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f3f5f8] px-6 text-center" data-testid="recovery-screen">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#087a83] shadow">
        <RefreshCw size={30} />
      </span>
      <h1 className="text-[1.5rem] font-extrabold text-[#111827]">화면을 다시 불러와 주세요</h1>
      <p className="max-w-sm text-[1rem] leading-relaxed text-[#4b5563]">
        잠깐 문제가 생겼습니다. 입력하신 내용은 저장된 상태 그대로입니다.
        아래 버튼을 누르면 PC 화면으로 다시 열립니다.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => { resetViewState(); if (reset) reset(); window.location.reload(); }}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#087a83] px-5 text-[1.0625rem] font-semibold text-white"
          data-testid="recovery-reload"
        >
          <RefreshCw size={18} /> 다시 불러오기
        </button>
        <button
          type="button"
          onClick={() => { resetViewState(); window.location.href = "/"; }}
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#c9d0d8] bg-white px-5 text-[1.0625rem] font-semibold text-[#111827]"
        >
          <Home size={18} /> 홈으로
        </button>
      </div>
      <details className="max-w-md text-left text-[0.8125rem] text-[#6b7280]">
        <summary className="cursor-pointer text-center">문제 내용 보기 (계속 뜨면 이 화면을 캡처해 보내 주세요)</summary>
        <p className="mt-2 break-all rounded-lg bg-white p-3 font-mono">{error.message || "알 수 없는 오류"}{error.digest ? ` · 코드 ${error.digest}` : ""}</p>
      </details>
    </div>
  );
}
