import { getSession } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { FILE_CHUNK } from "@/lib/trainings";

// One piece of a training file. Files move in FILE_CHUNK pieces so every request
// stays under the hosting body-size limit. Access is checked by the database (RLS).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID = /^[0-9a-f-]{36}$/i;

function bad(status: number, message: string) {
  return Response.json({ ok: false, message }, { status });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; idx: string }> }) {
  const { id, idx } = await params;
  const session = await getSession();
  if (!session) return bad(401, "로그인이 필요합니다.");
  if (!UUID.test(id) || !/^\d{1,3}$/.test(idx)) return bad(400, "잘못된 요청입니다.");
  const row = await withUser(session.userId, async (tx) => (await tx<{ data: Buffer; mime: string; name: string; chunk_count: number }[]>`
    select c.data, f.mime, f.name, f.chunk_count from training_file_chunks c join training_files f on f.id = c.file_id
    where c.file_id = ${id} and c.idx = ${Number(idx)} and f.complete`)[0]);
  if (!row) return bad(404, "자료를 찾을 수 없습니다.");
  return new Response(new Uint8Array(row.data), {
    headers: {
      "content-type": row.chunk_count === 1 ? row.mime : "application/octet-stream",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "cache-control": "private, max-age=3600",
      "x-chunk-count": String(row.chunk_count),
    },
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; idx: string }> }) {
  const { id, idx } = await params;
  const session = await getSession();
  if (!session) return bad(401, "로그인이 필요합니다.");
  if (!UUID.test(id) || !/^\d{1,3}$/.test(idx)) return bad(400, "잘못된 요청입니다.");
  const body = Buffer.from(await req.arrayBuffer());
  if (!body.length || body.length > FILE_CHUNK) return bad(413, "조각 크기가 올바르지 않습니다.");
  try {
    await withUser(session.userId, (tx) => tx`
      insert into training_file_chunks(file_id, organization_id, idx, data)
      select f.id, f.organization_id, ${Number(idx)}, ${body} from training_files f where f.id = ${id}
      on conflict (file_id, idx) do nothing`);
  } catch (e) {
    const rls = e instanceof Error && /row-level security/.test(e.message);
    return bad(rls ? 403 : 500, rls ? "이 자료를 올릴 권한이 없습니다." : "저장하지 못했습니다.");
  }
  return Response.json({ ok: true });
}
