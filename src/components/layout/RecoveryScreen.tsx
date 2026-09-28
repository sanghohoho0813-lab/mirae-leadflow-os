"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";

/** Clears per-device view state that could keep re-triggering an error. */
function resetViewState() {
  try {
    localStorage.removeItem("lf_device_mode");
  } catch {}
}

export function RecoveryScreen({ error, reset }: { error: Error & { digest?: string }; reset?: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f3f5f8] px-6 text-center" data-testid="recovery-screen">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#2563eb] shadow">
        <RefreshCw size={30} />
      </span>
      <h1 className="text-[24px] font-extrabold text-[#111827]">화면을 다시 불러와 주세요</h1>
      <p className="max-w-sm text-[16px] leading-relaxed text-[#4b5563]">
        잠깐 연결이 불안정했습니다. 입력하신 내용은 저장된 상태 그대로입니다.
        아래 버튼을 누르면 처음 보던 화면으로 돌아갑니다.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => { resetViewState(); if (reset) reset(); window.location.reload(); }}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-[17px] font-semibold text-white"
          data-testid="recovery-reload"
        >
          <RefreshCw size={18} /> 다시 불러오기
        </button>
        <button
          type="button"
          onClick={() => { resetViewState(); window.location.href = "/"; }}
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#c9d0d8] bg-white px-5 text-[17px] font-semibold text-[#111827]"
        >
          <Home size={18} /> 홈으로
        </button>
      </div>
      {error.digest && <p className="text-[13px] text-[#6b7280]">오류 코드 {error.digest}</p>}
    </div>
  );
}
