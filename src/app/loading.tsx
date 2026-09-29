/**
 * 첫 접속 화면: 서버가 깨어나는 동안(콜드 스타트) 흰 화면 대신 바로 보인다.
 * 루트에 두어 (app) 레이아웃이 DB를 기다리는 동안에도 먼저 흘려보낸다.
 */
export default function RootLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-canvas px-6 text-center" data-testid="app-loading">
      <svg width="64" height="64" viewBox="0 0 40 40" fill="none" aria-hidden className="boot-logo">
        <rect width="40" height="40" rx="11" style={{ fill: "var(--theme-primary)" }} />
        <path d="M9 28 L16 12 L20.5 21 L24 14 L31 28" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="31" cy="28" r="3" fill="#E7C873" />
      </svg>
      <div>
        <div className="text-[1.375rem] font-extrabold text-ink">리드플로우</div>
        <div className="mt-1 text-[1rem] text-ink-2">화면을 여는 중입니다…</div>
      </div>
      <div className="h-1.5 w-44 overflow-hidden rounded-full bg-line"><div className="boot-bar h-full w-1/3 rounded-full bg-primary" /></div>
      <p className="boot-late max-w-xs text-[0.9375rem] text-ink-3">한동안 아무도 접속하지 않으면 서버가 쉬고 있어서, 첫 접속은 10초 정도 걸릴 수 있습니다.</p>
    </div>
  );
}
