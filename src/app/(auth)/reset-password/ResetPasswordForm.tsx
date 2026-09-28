"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/password";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {});
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
      <Field label="새 비밀번호" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="새 비밀번호 확인" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {state.error && <p className="rounded-xl bg-danger-bg px-3 py-2 text-[0.9375rem] font-medium text-danger">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "저장 중…" : "비밀번호 저장"}</Button>
    </form>
  );
}
