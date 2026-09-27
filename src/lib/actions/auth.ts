"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withService, withUser, toActionError } from "@/lib/db";
import { isLocalAuth, LOCAL_COOKIE, signLocalSession } from "@/lib/auth/local";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { messageFor } from "@/lib/errors";

export interface ActionState { error?: string; ok?: boolean; message?: string }

export async function localLogin(userId: string) {
  if (!isLocalAuth()) throw new Error("local auth disabled");
  const store = await cookies();
  store.set(LOCAL_COOKIE, signLocalSession(userId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/");
}

export async function logout() {
  const store = await cookies();
  if (isLocalAuth()) {
    store.delete(LOCAL_COOKIE);
  } else if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function loginWithPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) return { error: "인증 서버가 설정되지 않았습니다." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력해 주세요." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  redirect("/");
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !fullName) return { error: "이름과 이메일을 입력해 주세요." };

  if (isLocalAuth()) {
    const userId = await withService(async (tx) => {
      const [existing] = await tx<{ id: string }[]>`select id from auth.users where email = ${email}`;
      if (existing) return existing.id;
      const [row] = await tx<{ id: string }[]>`insert into auth.users(id, email) values (gen_random_uuid(), ${email}) returning id`;
      return row.id;
    });
    const store = await cookies();
    store.set(LOCAL_COOKIE, signLocalSession(userId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    store.set("lf_pending_name", fullName, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
    redirect("/onboarding");
  }

  if (!hasSupabaseEnv()) return { error: "인증 서버가 설정되지 않았습니다." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) return { error: error.message.includes("already") ? "이미 가입된 이메일입니다." : "가입 중 문제가 생겼습니다: " + error.message };
  const store = await cookies();
  store.set("lf_pending_name", fullName, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
  if (!data.session) {
    return { ok: true, message: "가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 다시 로그인해 주세요." };
  }
  redirect("/onboarding");
}

export async function joinOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const code = String(formData.get("invite_code") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!code || !fullName) return { error: "이름과 초대코드를 입력해 주세요." };
  try {
    await withUser(session.userId, (tx) => tx`select join_organization(${code}, ${fullName}, ${phone})`);
  } catch (e) {
    return { error: messageFor(toActionError(e).code) };
  }
  redirect("/");
}

export async function createOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const name = String(formData.get("org_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!name || !fullName) return { error: "사업단 이름과 이름을 입력해 주세요." };
  try {
    await withUser(session.userId, (tx) => tx`select create_organization(${name}, ${fullName}, ${phone})`);
  } catch (e) {
    return { error: messageFor(toActionError(e).code) };
  }
  redirect("/");
}
