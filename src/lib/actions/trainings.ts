"use server";

import { revalidatePath } from "next/cache";
import { canTeach, requireViewer } from "@/lib/auth/session";
import { toActionError, withUser } from "@/lib/db";
import { kstToDate } from "@/lib/time";
import { FILE_CHUNK, FILE_MAX, FILE_MAX_COUNT } from "@/lib/trainings";
import { summarizeTrainingMaterial } from "@/lib/ai/summarize";
import { extractText } from "@/lib/ai/extract";
import type { ActionResult } from "./leads";

export interface TrainingInput {
  title: string;
  date: string;
  time: string;
  instructor_id: string | null;
  content: string;
  links: { label: string; url: string }[];
  notice?: string;
  location?: string;
}

function validate(input: TrainingInput): string | null {
  if (!input.title.trim()) return "교육 제목을 입력해 주세요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) return "교육 날짜와 시간을 선택해 주세요.";
  if ((input.location ?? "").length > 40) return "장소는 40자 이하로 입력해 주세요.";
  if ((input.notice ?? "").length > 2000) return "교육 공지는 2,000자 이하로 입력해 주세요.";
  if (input.content.length > 400_000) return "강의 내용이 너무 깁니다. 40만 자 이하로 나눠 올려 주세요.";
  for (const l of input.links) if (l.url && !/^https?:\/\//i.test(l.url)) return "링크는 http:// 또는 https:// 로 시작해야 합니다.";
  return null;
}

const cleanLinks = (links: TrainingInput["links"]) =>
  links.map((l) => ({ label: l.label.trim().slice(0, 60), url: l.url.trim() })).filter((l) => l.url).slice(0, 10);

function revalidateTrainings(id?: string) {
  revalidatePath("/trainings");
  revalidatePath("/trainings/schedule");
  revalidatePath("/");
  if (id) revalidatePath(`/trainings/${id}`);
}

function fail(e: unknown): ActionResult {
  const code = toActionError(e).code;
  const rls = e instanceof Error && /row-level security/.test(e.message);
  return { ok: false, code, message: rls ? "권한이 없습니다." : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
}

export async function createTraining(input: TrainingInput): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!canTeach(viewer)) return { ok: false, code: "FORBIDDEN", message: "교육 자료는 단장·본부장만 올릴 수 있습니다." };
  const err = validate(input);
  if (err) return { ok: false, code: "VALIDATION", message: err };
  try {
    const id = await withUser(viewer.session.userId, async (tx) => (await tx<{ id: string }[]>`
      insert into trainings(organization_id, title, held_at, instructor_id, content, links, notice, location, created_by)
      values (${viewer.profile.organization_id}, ${input.title.trim()}, ${kstToDate(input.date, input.time)}, ${input.instructor_id || viewer.session.userId},
        ${input.content.trim() || null}, ${tx.json(cleanLinks(input.links))}, ${input.notice?.trim() || null}, ${input.location?.trim() || null}, ${viewer.session.userId})
      returning id`)[0].id);
    revalidateTrainings(id);
    return { ok: true, id };
  } catch (e) { return fail(e); }
}

export async function updateTraining(id: string, input: TrainingInput): Promise<ActionResult> {
  const viewer = await requireViewer();
  const err = validate(input);
  if (err) return { ok: false, code: "VALIDATION", message: err };
  try {
    const rows = await withUser(viewer.session.userId, (tx) => tx`
      update trainings set title = ${input.title.trim()}, held_at = ${kstToDate(input.date, input.time)},
        instructor_id = ${input.instructor_id || null}, content = ${input.content.trim() || null}, links = ${tx.json(cleanLinks(input.links))},
        notice = ${input.notice?.trim() || null}, location = ${input.location?.trim() || null}
      where id = ${id} returning id`);
    if (!rows.length) return { ok: false, code: "FORBIDDEN", message: "이 교육을 수정할 권한이 없습니다." };
    revalidateTrainings(id);
    return { ok: true, id };
  } catch (e) { return fail(e); }
}

export async function deleteTraining(id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    const rows = await withUser(viewer.session.userId, (tx) => tx`delete from trainings where id = ${id} returning id`);
    if (!rows.length) return { ok: false, code: "FORBIDDEN", message: "이 교육을 삭제할 권한이 없습니다." };
    revalidateTrainings();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export interface ScheduleRow { date: string; time: string; title: string; instructor_id: string | null; location?: string }

/**
 * 한 달 교육 일정 한꺼번에 등록 (비서·단장). Days that already have a session
 * with the same 강사 are skipped, so pressing 저장 twice never duplicates.
 */
export async function createTrainingSchedule(rows: ScheduleRow[]): Promise<ActionResult & { created?: number; skipped?: number }> {
  const viewer = await requireViewer();
  if (!canTeach(viewer)) return { ok: false, code: "FORBIDDEN", message: "교육 일정은 단장·비서·본부장만 등록할 수 있습니다." };
  const valid = rows.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && /^\d{2}:\d{2}$/.test(r.time)).slice(0, 31);
  if (!valid.length) return { ok: false, code: "VALIDATION", message: "등록할 날짜를 한 개 이상 골라 주세요." };
  try {
    let created = 0;
    await withUser(viewer.session.userId, async (tx) => {
      for (const r of valid) {
        const at = kstToDate(r.date, r.time);
        const inst = r.instructor_id || viewer.session.userId;
        const [dup] = await tx`select 1 from trainings where instructor_id = ${inst}
          and (held_at at time zone 'Asia/Seoul')::date = ${r.date}::date limit 1`;
        if (dup) continue;
        const title = r.title.trim() || "정기 교육";
        await tx`insert into trainings(organization_id, title, held_at, instructor_id, location, created_by)
          values (${viewer.profile.organization_id}, ${title.slice(0, 120)}, ${at}, ${inst}, ${r.location?.trim().slice(0, 40) || null}, ${viewer.session.userId})`;
        created++;
      }
    });
    revalidateTrainings();
    return { ok: true, created, skipped: valid.length - created };
  } catch (e) { return fail(e); }
}

/** Registers a file; the browser then sends it in FILE_CHUNK pieces with uploadTrainingChunk. */
export async function startTrainingFile(trainingId: string, file: { name: string; mime: string; size: number }): Promise<ActionResult & { chunkSize?: number; chunkCount?: number }> {
  const viewer = await requireViewer();
  if (!canTeach(viewer)) return { ok: false, code: "FORBIDDEN", message: "자료는 단장·본부장만 올릴 수 있습니다." };
  if (!file.size) return { ok: false, code: "VALIDATION", message: `${file.name}: 빈 파일입니다.` };
  if (file.size > FILE_MAX) return { ok: false, code: "VALIDATION", message: `${file.name}: 파일은 ${FILE_MAX / 1024 / 1024}MB까지 올릴 수 있습니다.` };
  const chunkCount = Math.ceil(file.size / FILE_CHUNK);
  try {
    const id = await withUser(viewer.session.userId, async (tx) => {
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from training_files where training_id = ${trainingId} and complete`;
      if (n >= FILE_MAX_COUNT) return null;
      return (await tx<{ id: string }[]>`
        insert into training_files(organization_id, training_id, name, mime, size, chunk_count, created_by)
        values (${viewer.profile.organization_id}, ${trainingId}, ${file.name.slice(0, 200)}, ${file.mime || "application/octet-stream"}, ${file.size}, ${chunkCount}, ${viewer.session.userId})
        returning id`)[0].id;
    });
    if (!id) return { ok: false, code: "VALIDATION", message: `자료는 교육당 ${FILE_MAX_COUNT}개까지 올릴 수 있습니다.` };
    return { ok: true, id, chunkSize: FILE_CHUNK, chunkCount };
  } catch (e) { return fail(e); }
}

export async function finishTrainingFile(fileId: string, trainingId: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    const ok = await withUser(viewer.session.userId, async (tx) => {
      const rows = await tx`
        update training_files f set complete = true
        where f.id = ${fileId} and f.chunk_count = (select count(*) from training_file_chunks c where c.file_id = f.id)
        returning id`;
      return rows.length === 1;
    });
    if (!ok) return { ok: false, code: "INCOMPLETE", message: "파일이 끝까지 올라가지 않았습니다. 다시 시도해 주세요." };
    revalidateTrainings(trainingId);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteTrainingFile(fileId: string, trainingId: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    const rows = await withUser(viewer.session.userId, (tx) => tx`delete from training_files where id = ${fileId} returning id`);
    if (!rows.length) return { ok: false, code: "FORBIDDEN", message: "이 자료를 지울 권한이 없습니다." };
    revalidateTrainings(trainingId);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function markTrainingRead(id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    await withUser(viewer.session.userId, (tx) => tx`
      insert into training_reads(training_id, profile_id, organization_id)
      values (${id}, ${viewer.session.userId}, ${viewer.profile.organization_id}) on conflict do nothing`);
    revalidateTrainings(id);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export interface SummarizeResponse extends ActionResult { source?: "AI" | "BASIC"; notes?: string[] }

/** Builds the 핵심 정리 from the pasted text and the uploaded files. */
export async function summarizeTraining(id: string): Promise<SummarizeResponse> {
  const viewer = await requireViewer();
  if (!canTeach(viewer)) return { ok: false, code: "FORBIDDEN", message: "핵심 정리는 단장·본부장만 만들 수 있습니다." };
  try {
    const material = await withUser(viewer.session.userId, async (tx) => {
      const [t] = await tx<{ title: string; held_at: Date; content: string | null; instructor: string | null }[]>`
        select t.title, t.held_at, t.content, coalesce(p.full_name, t.instructor_name) as instructor
        from trainings t left join profiles p on p.id = t.instructor_id where t.id = ${id}`;
      if (!t) return null;
      const files = await tx<{ id: string; name: string; mime: string; size: number }[]>`
        select id, name, mime, size from training_files where training_id = ${id} and complete order by created_at`;
      const withData = [];
      let budget = 60 * 1024 * 1024;
      for (const f of files) {
        if (f.size > budget) continue;
        budget -= f.size;
        const chunks = await tx<{ data: Buffer }[]>`select data from training_file_chunks where file_id = ${f.id} order by idx`;
        withData.push({ name: f.name, mime: f.mime, data: Buffer.concat(chunks.map((c) => Buffer.from(c.data))) });
      }
      return { ...t, files: withData };
    });
    if (!material) return { ok: false, code: "NOT_FOUND", message: "교육을 찾을 수 없습니다." };

    const r = await summarizeTrainingMaterial({ title: material.title, instructor: material.instructor, heldAt: material.held_at, content: material.content, files: material.files });
    if ("error" in r) return { ok: false, code: "VALIDATION", message: r.error };

    const saved = await withUser(viewer.session.userId, (tx) => tx`
      update trainings set summary = ${tx.json(r.summary as unknown as Parameters<typeof tx.json>[0])}, summary_source = ${r.source}, summarized_at = now()
      where id = ${id} returning id`);
    if (!saved.length) return { ok: false, code: "FORBIDDEN", message: "이 교육을 정리할 권한이 없습니다." };
    revalidateTrainings(id);
    return { ok: true, source: r.source, notes: r.notes };
  } catch (e) { return fail(e); }
}

// ------------------------------------------------------------------ file pieces
// Server actions (not a separate API route) so they run in the same server
// process as the pages — required for the temporary built-in DB on Vercel.

/** Stores one piece (≤ FILE_CHUNK) of a file registered with startTrainingFile. */
export async function uploadTrainingChunk(fileId: string, idx: number, form: FormData): Promise<ActionResult> {
  const viewer = await requireViewer();
  const blob = form.get("data");
  if (!(blob instanceof Blob) || !blob.size || blob.size > FILE_CHUNK || !Number.isInteger(idx) || idx < 0) {
    return { ok: false, code: "VALIDATION", message: "조각 크기가 올바르지 않습니다." };
  }
  const data = Buffer.from(await blob.arrayBuffer());
  try {
    await withUser(viewer.session.userId, (tx) => tx`
      insert into training_file_chunks(file_id, organization_id, idx, data)
      select f.id, f.organization_id, ${idx}, ${data} from training_files f where f.id = ${fileId}
      on conflict (file_id, idx) do nothing`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** One piece of a file, base64-encoded (≤ 2.7MB per response). */
export async function downloadTrainingChunk(fileId: string, idx: number): Promise<ActionResult & { data?: string }> {
  const viewer = await requireViewer();
  try {
    const row = await withUser(viewer.session.userId, async (tx) => (await tx<{ data: Buffer }[]>`
      select c.data from training_file_chunks c join training_files f on f.id = c.file_id
      where c.file_id = ${fileId} and c.idx = ${idx} and f.complete`)[0]);
    if (!row) return { ok: false, code: "NOT_FOUND", message: "자료를 찾을 수 없습니다." };
    return { ok: true, data: Buffer.from(row.data).toString("base64") };
  } catch (e) { return fail(e); }
}

/** Text inside a PowerPoint / Word file, for the in-app preview (no download needed). */
export async function previewTrainingFileText(fileId: string): Promise<ActionResult & { text?: string }> {
  const viewer = await requireViewer();
  try {
    const file = await withUser(viewer.session.userId, async (tx) => {
      const [f] = await tx<{ name: string; mime: string }[]>`select name, mime from training_files where id = ${fileId} and complete`;
      if (!f) return null;
      const chunks = await tx<{ data: Buffer }[]>`select data from training_file_chunks where file_id = ${fileId} order by idx`;
      return { ...f, data: Buffer.concat(chunks.map((c) => Buffer.from(c.data))) };
    });
    if (!file) return { ok: false, code: "NOT_FOUND", message: "자료를 찾을 수 없습니다." };
    const text = extractText(file)?.trim() ?? "";
    return { ok: true, text: text.length > 40_000 ? `${text.slice(0, 40_000)}\n…(이하 생략 — 전체는 [받기]로 확인)` : text };
  } catch (e) { return fail(e); }
}
