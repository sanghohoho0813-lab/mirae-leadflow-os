"use client";

import { useState } from "react";
import { useSafeTransition, useSafeRefresh } from "@/components/providers/SafeActions";
import { setMemberActive, setMemberProfile } from "@/lib/actions/leads";
import { useToast } from "@/components/ui/Toast";
import { ROLE_LABEL } from "@/lib/labels";
import type { MemberRole, Profile } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

const TITLES = ["", "팀장", "지점장", "상무"];

/**
 * mode "owner": 역할·본부·직함 모두 · "leader": 자기 본부원의 직함과 활성 · "view": 보기만 (비서 등).
 */
export function MemberRow({ member, isSelf, mode, divisions }: {
  member: Profile & { active_leads: number };
  isSelf: boolean;
  mode: "owner" | "leader" | "view";
  divisions: { id: string; name: string }[];
}) {
  const [pending, start] = useSafeTransition();
  const [title, setTitle] = useState(member.title ?? "");
  const toast = useToast();
  const refresh = useSafeRefresh();
  const save = (role: string, division: string | null, t: string, msg: string) => start(async () => {
    const r = await setMemberProfile(member.id, role, division, t);
    if (r.ok) { toast("success", msg); refresh(); } else toast("error", r.message ?? "바꾸지 못했습니다.");
  });
  const editable = !isSelf && (mode === "owner" || (mode === "leader" && member.role === "CONSULTANT"));
  const sel = "h-11 rounded-xl border border-line-strong bg-white px-3 text-[0.9375rem] font-semibold disabled:opacity-60";

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 ${member.is_active ? "" : "opacity-60"}`} data-testid={`member-${member.id}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-[1.0625rem] font-bold text-primary">{member.full_name.slice(0, 1)}</span>
      <div className="min-w-0 flex-1 basis-44">
        <div className="flex flex-wrap items-center gap-1.5 text-[1.0625rem] font-bold text-ink">
          {member.full_name}
          <span className="text-[0.9375rem] font-semibold text-ink-3">{[member.division, member.title ?? ROLE_LABEL[member.role]].filter(Boolean).join(" · ")}</span>
          {isSelf && <Badge tone="info">나</Badge>} {!member.is_active && <Badge tone="neutral">비활성</Badge>}
        </div>
        <div className="text-[0.9062rem] text-ink-2">{member.phone ?? "연락처 없음"} · 진행 중 {member.active_leads}건</div>
      </div>
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          {mode === "owner" && (
            <>
              <select aria-label={`${member.full_name} 역할`} defaultValue={member.role} disabled={pending} className={sel} data-testid={`member-role-${member.id}`}
                onChange={(e) => save(e.target.value, member.division_id, title, `${member.full_name} 역할을 바꿨습니다.`)}>
                {(Object.keys(ROLE_LABEL) as MemberRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
              <select aria-label={`${member.full_name} 본부`} defaultValue={member.division_id ?? ""} disabled={pending} className={sel} data-testid={`member-division-${member.id}`}
                onChange={(e) => save(member.role, e.target.value || null, title, `${member.full_name}님을 ${e.target.selectedOptions[0].text}(으)로 옮겼습니다.`)}>
                <option value="">본부 없음</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </>
          )}
          {member.role === "CONSULTANT" && (
            <select aria-label={`${member.full_name} 직함`} value={TITLES.includes(title) ? title : "__other"} disabled={pending} className={sel} data-testid={`member-title-${member.id}`}
              onChange={(e) => { if (e.target.value === "__other") return; setTitle(e.target.value); save(member.role, member.division_id, e.target.value, `${member.full_name}님 직함을 ${e.target.value || "컨설턴트"}(으)로 바꿨습니다.`); }}>
              <option value="">컨설턴트</option>
              <option value="팀장">팀장</option>
              <option value="지점장">지점장</option>
              <option value="상무">상무</option>
              {!TITLES.includes(title) && <option value="__other">{title}</option>}
            </select>
          )}
          <button type="button" disabled={pending}
            className="h-11 rounded-xl border border-line-strong bg-white px-3 text-[0.9375rem] font-semibold text-ink-2 hover:bg-neutral-bg"
            onClick={() => start(async () => {
              const r = await setMemberActive(member.id, !member.is_active);
              if (r.ok) { toast("success", member.is_active ? "비활성화했습니다." : "다시 활성화했습니다."); refresh(); } else toast("error", r.message ?? "실패했습니다.");
            })}>
            {member.is_active ? "비활성화" : "활성화"}
          </button>
        </div>
      )}
    </div>
  );
}
