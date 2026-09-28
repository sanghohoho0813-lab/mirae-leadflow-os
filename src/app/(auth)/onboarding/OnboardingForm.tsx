"use client";

import { useActionState, useState } from "react";
import { createOrganization, joinOrganization } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [mode, setMode] = useState<"join" | "create">("join");
  const [joinState, joinAction, joinPending] = useActionState(joinOrganization, {});
  const [createState, createAction, createPending] = useActionState(createOrganization, {});

  return (
    <div className="grid gap-4">
      {mode === "join" ? (
        <form action={joinAction} className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
          <Field label="이름" htmlFor="full_name" required>
            <Input id="full_name" name="full_name" defaultValue={defaultName} autoComplete="name" required />
          </Field>
          <Field label="휴대폰 번호" htmlFor="phone" hint="단장님이 연락할 때 사용합니다.">
            <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="010-0000-0000" />
          </Field>
          <Field label="초대코드" htmlFor="invite_code" required>
            <Input id="invite_code" name="invite_code" placeholder="예: MIRAE2026" className="uppercase tracking-widest" autoCapitalize="characters" required />
          </Field>
          {joinState.error && <p className="rounded-xl bg-danger-bg px-3 py-2 text-[0.9375rem] font-medium text-danger">{joinState.error}</p>}
          <Button type="submit" size="lg" disabled={joinPending}>{joinPending ? "확인 중…" : "참여하기"}</Button>
        </form>
      ) : (
        <form action={createAction} className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
          <Field label="사업단 이름" htmlFor="org_name" required>
            <Input id="org_name" name="org_name" placeholder="예: 스마트 사업단" required />
          </Field>
          <Field label="이름(사업단장)" htmlFor="full_name2" required>
            <Input id="full_name2" name="full_name" defaultValue={defaultName} required />
          </Field>
          <Field label="휴대폰 번호" htmlFor="phone2">
            <Input id="phone2" name="phone" type="tel" inputMode="tel" placeholder="010-0000-0000" />
          </Field>
          {createState.error && <p className="rounded-xl bg-danger-bg px-3 py-2 text-[0.9375rem] font-medium text-danger">{createState.error}</p>}
          <Button type="submit" size="lg" disabled={createPending}>{createPending ? "만드는 중…" : "사업단 만들기"}</Button>
        </form>
      )}
      <button type="button" onClick={() => setMode(mode === "join" ? "create" : "join")} className="min-h-[44px] text-center text-[0.9375rem] font-semibold text-primary hover:underline">
        {mode === "join" ? "초대코드가 없어요 — 새 사업단을 직접 만들기" : "초대코드가 있어요 — 기존 사업단에 참여하기"}
      </button>
    </div>
  );
}
