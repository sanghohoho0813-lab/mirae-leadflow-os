import type { Tx } from "@/lib/db";
import { kstDateString } from "@/lib/time";
import type { MemberRole, Training, TrainingFile, TrainingListItem } from "@/lib/types";

/** Chunk size for file upload/download: well under Vercel's 4.5MB body limit. */
export const FILE_CHUNK = 2 * 1024 * 1024;
export const FILE_MAX = 30 * 1024 * 1024;
export const FILE_MAX_COUNT = 10;

const LIST = (uid: string) => `
  select t.id, t.title, t.held_at, t.instructor_id, coalesce(p.full_name, t.instructor_name) as instructor_name, p.role as instructor_role, p.division as instructor_division,
    t.summary, t.summary_source,
    (select count(*)::int from training_files f where f.training_id = t.id and f.complete) as file_count,
    (select count(*)::int from training_reads r where r.training_id = t.id) as read_count,
    (t.instructor_id = '${uid}' or t.created_by = '${uid}'
      or exists (select 1 from training_reads r where r.training_id = t.id and r.profile_id = '${uid}')) as read_by_me,
    (t.instructor_id = '${uid}' or t.created_by = '${uid}') as is_mine
  from trainings t left join profiles p on p.id = t.instructor_id`;

function safeUid(uid: string) {
  if (!/^[0-9a-f-]{36}$/i.test(uid)) throw new Error("invalid user id");
  return uid;
}

export async function listTrainings(tx: Tx, uid: string, opts: { q?: string; limit?: number } = {}): Promise<{ upcoming: TrainingListItem[]; past: TrainingListItem[] }> {
  const q = opts.q?.trim();
  const like = q ? `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%` : null;
  const rows = await tx.unsafe<TrainingListItem[]>(
    `${LIST(safeUid(uid))}
     where ($1::text is null or t.title ilike $1 or coalesce(t.content, '') ilike $1 or coalesce(t.summary::text, '') ilike $1 or coalesce(p.full_name, t.instructor_name, '') ilike $1)
     order by t.held_at desc limit $2`,
    [like, opts.limit ?? 100],
  );
  // A session stays "upcoming" until the end of its day (Korea time) unless it is already summarised.
  const today = kstDateString();
  const isUpcoming = (t: TrainingListItem) => kstDateString(t.held_at) >= today && !t.summary;
  return { upcoming: rows.filter(isUpcoming).reverse(), past: rows.filter((t) => !isUpcoming(t)) };
}

export async function getTraining(tx: Tx, id: string, uid: string): Promise<Training | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [t] = await tx.unsafe<Training[]>(
    `${LIST(safeUid(uid)).replace("select t.id,", "select t.content, t.links, t.summarized_at, t.created_by, t.updated_at, t.id,")} where t.id = $1`,
    [id],
  );
  return t ?? null;
}

export async function getTrainingFiles(tx: Tx, id: string): Promise<TrainingFile[]> {
  return tx<TrainingFile[]>`select id, name, mime, size, chunk_count, created_by, created_at from training_files where training_id = ${id} and complete order by created_at`;
}

export interface ReadStatus { id: string; full_name: string; role: MemberRole; read_at: Date | null }

/** Everyone in the organization and whether they have opened this training. */
export async function getReadStatus(tx: Tx, id: string): Promise<ReadStatus[]> {
  return tx<ReadStatus[]>`
    select p.id, p.full_name, p.role, r.read_at
    from profiles p left join training_reads r on r.profile_id = p.id and r.training_id = ${id}
    where p.is_active and p.organization_id = (select organization_id from trainings where id = ${id})
    order by r.read_at is null desc, p.full_name`;
}

export async function listInstructors(tx: Tx): Promise<{ id: string; full_name: string; role: MemberRole; division: string | null }[]> {
  return tx`select id, full_name, role, division from profiles where is_active and role in ('OWNER', 'MANAGER', 'LEADER')
    order by case role when 'OWNER' then 0 when 'MANAGER' then 1 else 2 end, full_name`;
}

/** Home screens: the next session and the newest summary this person hasn't opened. */
export async function getTrainingHighlights(tx: Tx, uid: string) {
  const { upcoming, past } = await listTrainings(tx, uid, { limit: 12 });
  const [{ members }] = await tx<{ members: number }[]>`select count(*)::int as members from profiles where is_active`;
  return { next: upcoming[0] ?? null, latest: past[0] ?? null, unread: past.filter((t) => !t.read_by_me && t.summary).length, members };
}

export type TrainingHighlights = Awaited<ReturnType<typeof getTrainingHighlights>>;
