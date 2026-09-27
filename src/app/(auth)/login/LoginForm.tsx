"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginWithPassword } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginWithPassword, {});
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
      <Field label="이메일" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@company.com" required />
      </Field>
      <Field label="비밀번호" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state.error && <p className="rounded-xl bg-danger-bg px-3 py-2 text-[15px] font-medium text-danger">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "로그인 중…" : "로그인"}</Button>
      <Link href="/forgot-password" className="min-h-[44px] text-center text-[15px] font-semibold leading-[44px] text-primary hover:underline">비밀번호를 잊으셨나요?</Link>
    </form>
  );
}
