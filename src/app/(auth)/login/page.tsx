import Link from "next/link";
import { redirect } from "next/navigation";
import { isLocalAuth } from "@/lib/auth/local";
import { getSession } from "@/lib/auth/session";
import { withService } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { localLogin } from "@/lib/actions/auth";
import { LoginForm } from "./LoginForm";
import type { MemberRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  if (isLocalAuth()) {
    const users = await withService((tx) => tx<{ id: string; full_name: string; role: MemberRole; org: string }[]>`
      select p.id, p.full_name, p.role, o.name as org from profiles p join organizations o on o.id = p.organization_id
      where p.is_active order by o.id, case p.role when 'OWNER' then 0 when 'MANAGER' then 1 when 'CALLER' then 2 when 'LEADER' then 3 else 4 end, p.full_name limit 30`);
    return (
      <div className="fade-up">
        <div className="mb-4 rounded-2xl border border-warning/30 bg-warning-bg/70 px-4 py-3 text-[15px] text-warning">
          <b>개발용 로그인</b> — 운영 환경에서는 이메일·비밀번호 로그인(Supabase Auth)이 사용됩니다.
        </div>
        <div className="grid gap-2" data-testid="local-users">
          {users.map((u) => (
            <form key={u.id} action={localLogin.bind(null, u.id)}>
              <button type="submit" className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-3.5 text-left shadow-card transition-base hover:border-primary hover:bg-soft" data-testid={`login-${u.id}`}>
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-[17px] font-bold text-primary">{u.full_name.slice(0, 1)}</span>
                  <span className="leading-tight">
                    <span className="block text-[17px] font-bold text-ink">{u.full_name}</span>
                    <span className="block text-[14px] text-ink-3">{ROLE_LABEL[u.role]} · {u.org}</span>
                  </span>
                </span>
                <span className="text-[15px] font-semibold text-primary">로그인</span>
              </button>
            </form>
          ))}
        </div>
        <p className="mt-6 text-center text-[15px] text-ink-3">
          처음이신가요? <Link href="/signup" className="font-semibold text-primary hover:underline">초대코드로 가입</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <LoginForm />
      <p className="mt-6 text-center text-[15px] text-ink-3">
        처음이신가요? <Link href="/signup" className="font-semibold text-primary hover:underline">초대코드로 가입</Link>
      </p>
    </div>
  );
}
