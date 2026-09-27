import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  if (!(await getSession())) redirect("/forgot-password");
  return (
    <div className="fade-up">
      <h2 className="mb-1 text-[22px] font-bold text-ink">새 비밀번호 정하기</h2>
      <p className="mb-4 text-[15px] text-ink-2">앞으로 사용할 비밀번호를 두 번 입력해 주세요. (8자 이상)</p>
      <ResetPasswordForm />
    </div>
  );
}
