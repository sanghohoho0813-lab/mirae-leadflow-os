import { LogOut, UserRound } from "lucide-react";
import { requireViewer } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/auth/mode";
import { logout } from "@/lib/actions/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { DisplaySettings } from "@/components/layout/ThemePicker";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const p = viewer.profile;
  return (
    <div className="fade-up mx-auto max-w-4xl">
      <PageHeader title="설정" sub="글자 크기와 화면 색은 이 기기(휴대폰·PC)마다 따로 저장됩니다." />
      <section className="mb-4 flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-card" data-testid="my-info">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-soft text-primary"><UserRound size={28} /></span>
        <div className="min-w-0 flex-1 leading-snug">
          <div className="text-[1.25rem] font-extrabold text-ink">{p.full_name}</div>
          <div className="text-[1rem] text-ink-2">{[p.division, p.title ?? ROLE_LABEL[p.role]].filter(Boolean).join(" ")} · {viewer.organization.name}</div>
          {p.phone && <div className="text-[0.9375rem] text-ink-3">{p.phone}</div>}
        </div>
        {!isDemoMode() && (
          <form action={logout}>
            <button type="submit" className="press flex h-11 items-center gap-1.5 rounded-xl border border-line px-3.5 text-[0.9375rem] font-semibold text-ink-2 hover:bg-neutral-bg"><LogOut size={17} /> 로그아웃</button>
          </form>
        )}
      </section>
      <DisplaySettings />
    </div>
  );
}
