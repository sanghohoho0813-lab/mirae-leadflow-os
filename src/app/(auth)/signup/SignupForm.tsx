"use client";

import { useActionState } from "react";
import { signUp } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function SignupForm({ needsPassword }: { needsPassword: boolean }) {
  const [state, action, pending] = useActionState(signUp, {});
  if (state.ok && state.message) {
    return <div className="rounded-2xl border border-success/30 bg-success-bg px-4 py-4 text-[16px] font-medium text-success">{state.message}</div>;
  }
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
      <Field label="이름" htmlFor="full_name" required hint="실명을 입력해 주세요. 단장님과 동료에게 표시됩니다.">
        <Input id="full_name" name="full_name" autoComplete="name" placeholder="홍길동" required />
      </Field>
      <Field label="이메일" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@company.com" required />
      </Field>
      {needsPassword && (
        <Field label="비밀번호" htmlFor="password" required hint="8자 이상">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      )}
      {state.error && <p className="rounded-xl bg-danger-bg px-3 py-2 text-[15px] font-medium text-danger">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "처리 중…" : "다음"}</Button>
    </form>
  );
}
