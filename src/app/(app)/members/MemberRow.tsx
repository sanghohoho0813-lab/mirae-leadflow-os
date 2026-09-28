"use client";

import { useSafeTransition, useSafeRefresh } from "@/components/providers/SafeActions";
import { setMemberActive, setMemberRole } from "@/lib/actions/leads";
import { useToast } from "@/components/ui/Toast";
import { ROLE_LABEL } from "@/lib/labels";
import type { MemberRole, Profile } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

export function MemberRow({ member, isSelf }: { member: Profile & { active_leads: number }; isSelf: boolean }) {
  const [pending, start] = useSafeTransition();
  const toast = useToast();
  const refresh = useSafeRefresh();
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 ${member.is_active ? "" : "opacity-60"}`} data-testid={`member-${member.id}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-[17px] font-bold text-primary">{member.full_name.slice(0, 1)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[17px] font-bold text-ink">{member.full_name} {isSelf && <Badge tone="info">나</Badge>} {!member.is_active && <Badge tone="neutral">비활성</Badge>}</div>
        <div className="text-[14.5px] text-ink-2">{member.phone ?? "연락처 없음"} · 진행 중 {member.active_leads}건</div>
      </div>
      {isSelf ? (
        <span className="text-[15px] font-semibold text-ink-2">{ROLE_LABEL[member.role]}</span>
      ) : (
        <div className="flex items-center gap-2">
          <select
            aria-label={`${member.full_name} 역할`}
            defaultValue={member.role}
            disabled={pending}
            className="h-11 rounded-xl border border-line-strong bg-white px-3 text-[15.5px] font-semibold"
            onChange={(e) => start(async () => {
              const r = await setMemberRole(member.id, e.target.value as MemberRole);
              if (r.ok) { toast("success", `${member.full_name} 역할을 변경했습니다.`); refresh(); } else toast("error", r.message ?? "실패했습니다.");
            })}
          >
            {(Object.keys(ROLE_LABEL) as MemberRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <button
            type="button"
            disabled={pending}
            className="h-11 rounded-xl border border-line-strong bg-white px-3 text-[15px] font-semibold text-ink-2 hover:bg-neutral-bg"
            onClick={() => start(async () => {
              const r = await setMemberActive(member.id, !member.is_active);
              if (r.ok) { toast("success", member.is_active ? "비활성화했습니다." : "다시 활성화했습니다."); refresh(); } else toast("error", r.message ?? "실패했습니다.");
            })}
          >
            {member.is_active ? "비활성화" : "활성화"}
          </button>
        </div>
      )}
    </div>
  );
}
