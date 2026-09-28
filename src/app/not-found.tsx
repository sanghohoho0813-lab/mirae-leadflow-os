import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-bg text-ink-2"><SearchX size={32} /></span>
      <h1 className="text-[24px] font-extrabold text-ink">페이지를 찾을 수 없습니다</h1>
      <p className="text-[16px] text-ink-2">주소가 잘못되었거나, 볼 수 있는 권한이 없는 DB입니다.</p>
      <Link prefetch={false} href="/" className="mt-2 inline-flex h-12 items-center rounded-xl bg-primary px-5 text-[17px] font-semibold text-white">홈으로</Link>
    </div>
  );
}
