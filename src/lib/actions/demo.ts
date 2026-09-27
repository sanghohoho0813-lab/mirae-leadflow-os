"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { withService } from "@/lib/db";
import { isDemoMode, LOCAL_COOKIE, LOCAL_COOKIE_OPTIONS, signLocalSession } from "@/lib/auth/local";
import { ensureDemoReady, resetDemoData } from "@/lib/demo/setup";
import { ROLE_LABEL } from "@/lib/labels";
import type { MemberRole } from "@/lib/types";

export interface DemoResult { ok: boolean; message: string }

export async function switchPersona(profileId: string): Promise<DemoResult> {
  if (!isDemoMode()) return { ok: false, message: "체험 모드가 아닙니다." };
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) return { ok: false, message: "잘못된 사용자입니다." };
  await ensureDemoReady();
  const [p] = await withService((tx) => tx<{ full_name: string; role: MemberRole }[]>`
    select full_name, role from profiles where id = ${profileId} and is_active`);
  if (!p) return { ok: false, message: "해당 사용자를 찾을 수 없습니다. 데이터 초기화를 눌러 주세요." };
  (await cookies()).set(LOCAL_COOKIE, signLocalSession(profileId), LOCAL_COOKIE_OPTIONS);
  return { ok: true, message: `${ROLE_LABEL[p.role]} ${p.full_name} 화면으로 전환했습니다.` };
}

export async function resetDemo(): Promise<DemoResult> {
  if (!isDemoMode()) return { ok: false, message: "체험 모드가 아닙니다." };
  await resetDemoData();
  revalidatePath("/", "layout");
  return { ok: true, message: "체험 데이터를 처음 상태로 되돌렸습니다." };
}
