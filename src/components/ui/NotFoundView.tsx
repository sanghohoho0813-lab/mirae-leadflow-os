import Link from "next/link";
import { SearchX } from "lucide-react";

/**
 * 없는 주소·볼 권한이 없는 DB. 페이지 안에서 바로 그린다: notFound()를 던지면
 * 첫 접속 화면(loading)으로 이미 흘려보낸 뒤라 React가 오류(#419)를 내고 화면을 다시 그린다.
 */
export function NotFoundView({ full = false }: { full?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 text-center ${full ? "min-h-dvh bg-canvas" : "py-20"}`} data-testid="not-found">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-bg text-ink-2"><SearchX size={32} /></span>
      <h1 className="text-[1.5rem] font-extrabold text-ink">페이지를 찾을 수 없습니다</h1>
      <p className="text-[1rem] text-ink-2">주소가 잘못되었거나, 볼 수 있는 권한이 없는 DB입니다.</p>
      <Link prefetch={false} href="/" className="mt-2 inline-flex h-12 items-center rounded-xl bg-primary px-5 text-[1.0625rem] font-semibold text-white">홈으로</Link>
    </div>
  );
}
