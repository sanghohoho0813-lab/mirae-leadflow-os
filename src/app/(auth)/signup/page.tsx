import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/auth/mode";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getSession()) redirect("/onboarding");
  return (
    <div className="fade-up">
      <h2 className="mb-1 text-[22px] font-bold text-ink">계정 만들기</h2>
      <p className="mb-4 text-[15px] text-ink-2">가입 후 사업단장에게 받은 초대코드를 입력하면 바로 사용할 수 있습니다.</p>
      <SignupForm needsPassword={!isDemoMode()} />
      <p className="mt-6 text-center text-[15px] text-ink-3">
        이미 계정이 있나요? <Link prefetch={false} href="/login" className="font-semibold text-primary hover:underline">로그인</Link>
      </p>
    </div>
  );
}
