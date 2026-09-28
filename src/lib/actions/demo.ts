"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { withService } from "@/lib/db";
import { isDemoMode, LOCAL_COOKIE, LOCAL_COOKIE_OPTIONS, signLocalSession } from "@/lib/auth/local";
import { addDemoLeads, clearDemoData, ensureDemoReady, resetDemoData } from "@/lib/demo/setup";
import { personLabel } from "@/lib/labels";
import type { MemberRole } from "@/lib/types";

export interface DemoResult { ok: boolean; message: string }

export async function switchPersona(profileId: string): Promise<DemoResult> {
  if (!isDemoMode()) return { ok: false, message: "체험 모드가 아닙니다." };
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) return { ok: false, message: "잘못된 사용자입니다." };
  await ensureDemoReady();
  const [p] = await withService((tx) => tx<{ full_name: string; role: MemberRole; title: string | null; division: string | null }[]>`
    select full_name, role, title, division from profiles where id = ${profileId} and is_active`);
  if (!p) return { ok: false, message: "해당 사용자를 찾을 수 없습니다. 데이터 초기화를 눌러 주세요." };
  (await cookies()).set(LOCAL_COOKIE, signLocalSession(profileId), LOCAL_COOKIE_OPTIONS);
  return { ok: true, message: `${[p.division, personLabel(p.full_name, p.role, p.title)].filter(Boolean).join(" ")} 화면으로 전환했습니다.` };
}

export async function resetDemo(mode: "sample" | "empty" = "sample"): Promise<DemoResult> {
  if (!isDemoMode()) return { ok: false, message: "체험 모드가 아닙니다." };
  if (mode === "empty") {
    await clearDemoData();
    revalidatePath("/", "layout");
    return { ok: true, message: "샘플 DB를 모두 지웠습니다. 이제 직접 등록해 보세요." };
  }
  await resetDemoData();
  revalidatePath("/", "layout");
  return { ok: true, message: "체험 데이터를 처음 상태로 되돌렸습니다." };
}

/** 샘플 DB 5·10·20건 더하기 (지금 있는 DB는 그대로). */
export async function addSampleLeads(n: number): Promise<DemoResult> {
  if (!isDemoMode()) return { ok: false, message: "체험 모드가 아닙니다." };
  if (![5, 10, 20].includes(n)) return { ok: false, message: "5·10·20건 중에서 골라 주세요." };
  const [{ total }] = await withService((tx) => tx<{ total: number }[]>`select count(*)::int as total from leads where status not in ('CLOSED', 'CANCELLED')`);
  if (total + n > 200) return { ok: false, message: "샘플이 너무 많습니다(진행 중 200건까지). 먼저 전체 삭제해 주세요." };
  await addDemoLeads(n);
  revalidatePath("/", "layout");
  return { ok: true, message: `샘플 DB ${n}건을 추가했습니다.` };
}
