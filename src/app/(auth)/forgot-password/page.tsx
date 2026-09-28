import Link from "next/link";
import { isDemoMode } from "@/lib/auth/mode";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="fade-up">
      <h2 className="mb-1 text-[1.375rem] font-bold text-ink">비밀번호 찾기</h2>
      <p className="mb-4 text-[0.9375rem] text-ink-2">가입한 이메일을 입력하면 비밀번호를 새로 정할 수 있는 링크를 보내드립니다.</p>
      {isDemoMode() ? (
        <p className="rounded-2xl border border-warning/30 bg-warning-bg/70 px-4 py-3 text-[0.9375rem] text-warning">체험 모드에서는 비밀번호가 없습니다.</p>
      ) : (
        <ForgotPasswordForm />
      )}
      <p className="mt-6 text-center text-[0.9375rem] text-ink-3">
        <Link prefetch={false} href="/login" className="font-semibold text-primary hover:underline">로그인으로 돌아가기</Link>
      </p>
    </div>
  );
}
