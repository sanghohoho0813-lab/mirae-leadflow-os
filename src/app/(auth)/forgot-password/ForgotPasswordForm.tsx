"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/password";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  if (state.ok && state.message) {
    return <div className="rounded-2xl border border-success/30 bg-success-bg px-4 py-4 text-[1rem] font-medium text-success">{state.message}</div>;
  }
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
      <Field label="이메일" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@company.com" required />
      </Field>
      {state.error && <p className="rounded-xl bg-danger-bg px-3 py-2 text-[0.9375rem] font-medium text-danger">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "보내는 중…" : "재설정 링크 보내기"}</Button>
    </form>
  );
}
