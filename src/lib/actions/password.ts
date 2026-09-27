"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { ActionState } from "./auth";

async function appOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) return { error: "인증 서버가 설정되지 않았습니다." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "이메일을 입력해 주세요." };
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await appOrigin()}/auth/callback?next=/reset-password` });
  // Always the same message: don't reveal whether the email exists.
  return { ok: true, message: "가입된 이메일이라면 비밀번호 재설정 링크를 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요." };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) return { error: "인증 서버가 설정되지 않았습니다." };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };
  if (password !== confirm) return { error: "두 비밀번호가 서로 다릅니다." };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "링크가 만료되었습니다. 비밀번호 찾기를 다시 진행해 주세요." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "비밀번호를 바꾸지 못했습니다: " + error.message };
  redirect("/?password_changed=1");
}
