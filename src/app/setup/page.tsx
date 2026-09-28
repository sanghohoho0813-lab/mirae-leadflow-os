import Link from "next/link";
import { Database, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const hasDb = Boolean(process.env.DATABASE_URL);
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="mx-auto w-full max-w-lg px-5 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={44} />
          <h1 className="text-[1.5rem] font-extrabold text-ink">리드플로우 준비</h1>
        </div>

        {!hasDb ? (
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card" data-testid="setup-no-db">
            <div className="mb-3 flex items-center gap-2 text-[1.1875rem] font-bold text-ink"><Database size={22} className="text-primary" /> 데이터베이스가 아직 연결되지 않았습니다</div>
            <p className="mb-4 text-[1rem] text-ink-2">DB를 연결하면 첫 접속 때 테이블과 체험용 데이터가 자동으로 만들어집니다. SQL을 직접 실행할 필요는 없습니다.</p>
            <ol className="grid gap-3 text-[1rem] text-ink">
              <li><b>1.</b> Vercel 프로젝트 → <b>Storage</b> 탭 → <b>Create Database</b> → <b>Neon (Postgres)</b> 선택 → 무료 플랜으로 생성</li>
              <li><b>2.</b> 이 프로젝트에 <b>Connect</b> (환경변수 <code className="rounded bg-neutral-bg px-1">DATABASE_URL</code>이 자동 등록됩니다)</li>
              <li><b>3.</b> <b>Deployments</b> → 최신 배포 <b>Redeploy</b></li>
              <li><b>4.</b> 이 주소를 다시 열면 바로 시작됩니다</li>
            </ol>
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-danger/30 bg-white p-5 shadow-card" data-testid="setup-error">
            <div className="mb-3 flex items-center gap-2 text-[1.1875rem] font-bold text-danger"><AlertTriangle size={22} /> 데이터베이스 준비 중 문제가 생겼습니다</div>
            <p className="mb-4 text-[1rem] text-ink-2">DB 주소(<code className="rounded bg-neutral-bg px-1">DATABASE_URL</code>)가 올바른지, DB가 켜져 있는지 확인해 주세요. Vercel의 <b>Logs</b>에 자세한 원인이 남아 있습니다.</p>
            <Link prefetch={false} href="/" className="inline-flex h-12 items-center rounded-xl bg-primary px-5 text-[1.0625rem] font-semibold text-white">다시 시도</Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <p className="mb-4 text-[1rem] text-ink-2">데이터베이스가 연결되어 있습니다.</p>
            <Link prefetch={false} href="/" className="inline-flex h-12 items-center rounded-xl bg-primary px-5 text-[1.0625rem] font-semibold text-white">시작하기</Link>
          </section>
        )}
      </div>
    </div>
  );
}
