import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, getViewer } from "@/lib/auth/session";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (await getViewer()) redirect("/");
  const pendingName = (await cookies()).get("lf_pending_name")?.value ?? "";
  return (
    <div className="fade-up">
      <h2 className="mb-1 text-[22px] font-bold text-ink">사업단에 참여하기</h2>
      <p className="mb-4 text-[15px] text-ink-2">단톡방이나 문자로 받은 초대코드를 입력해 주세요.</p>
      <OnboardingForm defaultName={pendingName} />
    </div>
  );
}
