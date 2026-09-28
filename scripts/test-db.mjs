// Database-level verification: first-come-first-served race, RLS isolation,
// state transitions. Runs against the seeded local database.
// Usage: npm run db:reset && npm run test:db
import { sql, asUser } from "./db.mjs";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const U = {
  owner: "10000000-0000-4000-8000-000000000001",
  manager: "70000000-0000-4000-8000-000000000001", // test fixture (seed has no 운영담당)
  leaderB: "10000000-0000-4000-8000-000000000002",
  caller: "10000000-0000-4000-8000-000000000003",
  c1: "10000000-0000-4000-8000-000000000004",
  c2: "10000000-0000-4000-8000-000000000005",
  c3: "10000000-0000-4000-8000-000000000006",
  leader: "10000000-0000-4000-8000-000000000007",
  c4: "10000000-0000-4000-8000-000000000009",
  c5: "10000000-0000-4000-8000-000000000010",
  otherOwner: "20000000-0000-4000-8000-000000000001",
};
const OPEN_LEAD = "30000000-0000-4000-8000-000000000003"; // 태양금속
const OPEN_LEAD_2 = "30000000-0000-4000-8000-000000000004"; // 클린케어
const DRAFT_LEAD = "30000000-0000-4000-8000-000000000001"; // 한솔이엔지
const ASSIGNED_TODAY = "30000000-0000-4000-8000-000000000006"; // 성진테크, 컨설턴트 D (c4)
const OPEN_LEAD_3 = "30000000-0000-4000-8000-000000000005"; // 제일하이텍
const C2_ACTIVE = "30000000-0000-4000-8000-000000000008"; // 우림식품, 컨설턴트 B (c2)
const OTHER_ORG_LEAD = "40000000-0000-4000-8000-000000000001";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
}
async function expectError(fn, needle) {
  try { await fn(); return false; } catch (e) { return String(e.message).includes(needle); }
}

// Fixture: an 운영담당 (MANAGER) to cover that role.
await sql`insert into auth.users(id, email) values (${U.manager}, 'manager-fixture@leadflow.local') on conflict do nothing`;
await sql`insert into profiles(id, organization_id, role, full_name) values (${U.manager}, ${ORG_ID}, 'MANAGER', '운영 테스트') on conflict (id) do update set role = 'MANAGER', is_active = true`;

console.log("\n[1] Race condition: 10 consultants claim the same OPEN lead simultaneously");
{
  // Create 10 extra consultants for the race.
  const racers = [];
  for (let i = 0; i < 10; i++) {
    const id = `50000000-0000-4000-8000-0000000000${String(i).padStart(2, "0")}`;
    await sql`insert into auth.users(id, email) values (${id}, ${`racer${i}@leadflow.local`}) on conflict do nothing`;
    await sql`insert into profiles(id, organization_id, role, full_name) values (${id}, ${ORG_ID}, 'CONSULTANT', ${`레이서${i}`}) on conflict (id) do nothing`;
    racers.push(id);
  }
  const results = await Promise.all(racers.map((id) => asUser(id, async (tx) => (await tx`select claim_lead(${OPEN_LEAD}) as r`)[0].r)));
  const winners = results.filter((r) => r.ok);
  const losers = results.filter((r) => !r.ok);
  check("exactly one winner", winners.length === 1, JSON.stringify(results));
  check("all others get ALREADY_ASSIGNED", losers.length === 9 && losers.every((r) => r.code === "ALREADY_ASSIGNED"));
  const [lead] = await sql`select status, assigned_to from leads where id = ${OPEN_LEAD}`;
  check("lead is ASSIGNED", lead.status === "ASSIGNED");
  const active = await sql`select count(*)::int as n from lead_assignments where lead_id = ${OPEN_LEAD} and status = 'ACTIVE'`;
  check("exactly one ACTIVE assignment row", active[0].n === 1);
  const logs = await sql`select count(*)::int as n from activity_logs where lead_id = ${OPEN_LEAD} and action = 'CLAIM'`;
  check("exactly one CLAIM log", logs[0].n === 1);

  // Winner cancels, then re-claim works; a losing racer re-claims after.
  const winner = winners[0];
  const [{ assigned_to }] = await sql`select assigned_to from leads where id = ${OPEN_LEAD}`;
  await asUser(assigned_to, (tx) => tx`select cancel_claim(${OPEN_LEAD})`);
  const [after] = await sql`select status, assigned_to from leads where id = ${OPEN_LEAD}`;
  check("cancel_claim reopens lead", after.status === "OPEN" && after.assigned_to === null);
  const again = await asUser(U.c5, async (tx) => (await tx`select claim_lead(${OPEN_LEAD}) as r`)[0].r);
  check("re-claim after cancel works", again.ok === true, JSON.stringify(winner));
  const dup = await asUser(U.c5, async (tx) => (await tx`select claim_lead(${OPEN_LEAD}) as r`)[0].r);
  check("claiming own lead again -> ALREADY_MINE", dup.code === "ALREADY_MINE", dup.code);
  await asUser(U.c5, (tx) => tx`select cancel_claim(${OPEN_LEAD})`);

  // Racer profiles stay (referenced by assignment history); deactivate them.
  await sql`update profiles set is_active = false where id in ${sql(racers)}`;
}

console.log("\n[1b] One active meeting per person (claim limit)");
{
  const [{ claim_limit }] = await sql`select claim_limit from organizations where id = ${ORG_ID}`;
  check("default limit is 1", claim_limit === 1);
  const busy = await asUser(U.c2, async (tx) => (await tx`select claim_lead(${OPEN_LEAD_2}) as r`)[0].r);
  check("person with an unreported meeting -> LIMIT_REACHED", busy.code === "LIMIT_REACHED" && busy.active_lead_id === C2_ACTIVE, JSON.stringify(busy));
  // Same person taps two different DBs at the same moment: only one may succeed.
  const both = await Promise.all([OPEN_LEAD_2, OPEN_LEAD_3].map((id) => asUser(U.c5, async (tx) => (await tx`select claim_lead(${id}) as r`)[0].r)));
  check("simultaneous claims by one person -> exactly one wins", both.filter((r) => r.ok).length === 1 && both.filter((r) => r.code === "LIMIT_REACHED").length === 1, JSON.stringify(both));
  const won = both[0].ok ? OPEN_LEAD_2 : OPEN_LEAD_3;
  await asUser(U.c5, (tx) => tx`select cancel_claim(${won})`);
  check("consultant cannot change the limit", await expectError(() => asUser(U.c1, (tx) => tx`select set_claim_limit(3)`), "FORBIDDEN"));
  await asUser(U.owner, (tx) => tx`select set_claim_limit(2)`);
  const two = await asUser(U.c2, async (tx) => (await tx`select claim_lead(${OPEN_LEAD_2}) as r`)[0].r);
  check("OWNER raises limit to 2 -> second claim allowed", two.ok === true, JSON.stringify(two));
  await asUser(U.c2, (tx) => tx`select cancel_claim(${OPEN_LEAD_2})`);
  await asUser(U.owner, (tx) => tx`select set_claim_limit(1)`);
  const reported = await sql`select count(*)::int as n from leads where assigned_to = ${U.c2} and status = 'ASSIGNED'`;
  check("cleanup: c2 back to one active meeting", reported[0].n === 1);
}

console.log("\n[2] Role gates");
{
  await asUser(U.owner, (tx) => tx`select set_claim_limit(0)`); // 0 = no limit, so role checks are isolated
  const r = await asUser(U.caller, async (tx) => (await tx`select claim_lead(${OPEN_LEAD_2}) as r`)[0].r);
  check("CALLER cannot claim", r.code === "ROLE_NOT_ALLOWED");
  const r2 = await asUser(U.owner, async (tx) => (await tx`select claim_lead(${OPEN_LEAD_2}) as r`)[0].r);
  check("OWNER cannot claim", r2.code === "ROLE_NOT_ALLOWED");
  check("CONSULTANT cannot publish", await expectError(() => asUser(U.c1, (tx) => tx`select publish_lead(${DRAFT_LEAD})`), "FORBIDDEN"));
  check("CALLER cannot publish", await expectError(() => asUser(U.caller, (tx) => tx`select publish_lead(${DRAFT_LEAD})`), "FORBIDDEN"));
  const draftClaim = await asUser(U.c1, async (tx) => (await tx`select claim_lead(${DRAFT_LEAD}) as r`)[0].r);
  check("DRAFT lead is invisible to consultant (NOT_FOUND)", draftClaim.code === "NOT_FOUND", draftClaim.code);
  await asUser(U.owner, (tx) => tx`select publish_lead(${DRAFT_LEAD})`);
  const [d] = await sql`select status from leads where id = ${DRAFT_LEAD}`;
  check("OWNER publishes DRAFT -> OPEN", d.status === "OPEN");
  check("LEADER can claim (same as consultant)", (await asUser(U.leader, async (tx) => (await tx`select claim_lead(${DRAFT_LEAD}) as r`)[0].r)).ok === true);
  check("MANAGER can release", !(await expectError(() => asUser(U.manager, (tx) => tx`select release_lead(${DRAFT_LEAD}, '테스트 회수')`), "")));
  const [rel] = await sql`select status, assigned_to from leads where id = ${DRAFT_LEAD}`;
  check("released lead is OPEN and unassigned", rel.status === "OPEN" && rel.assigned_to === null);
  check("MANAGER reassigns OPEN lead to c3", !(await expectError(() => asUser(U.manager, (tx) => tx`select reassign_lead(${DRAFT_LEAD}, ${U.c3}, '수동 배정')`), "")));
  const [re] = await sql`select status, assigned_to from leads where id = ${DRAFT_LEAD}`;
  check("reassigned to c3", re.status === "ASSIGNED" && re.assigned_to === U.c3);
  check("reassign to a CALLER rejected", await expectError(() => asUser(U.manager, (tx) => tx`select reassign_lead(${DRAFT_LEAD}, ${U.caller})`), "INVALID_CONSULTANT"));
  check("consultant cannot release", await expectError(() => asUser(U.c1, (tx) => tx`select release_lead(${DRAFT_LEAD})`), "FORBIDDEN"));
  check("cancel_lead requires reason", await expectError(() => asUser(U.owner, (tx) => tx`select cancel_lead(${DRAFT_LEAD}, '')`), "REASON_REQUIRED"));
  await asUser(U.owner, (tx) => tx`select set_claim_limit(1)`);
}

console.log("\n[3] RLS visibility: private details");
{
  const c4Private = await asUser(U.c4, (tx) => tx`select contact_phone from lead_private_details where lead_id = ${ASSIGNED_TODAY}`);
  check("assignee sees own lead's private details", c4Private.length === 1 && c4Private[0].contact_phone === "010-3333-0006");
  const c2Private = await asUser(U.c2, (tx) => tx`select contact_phone from lead_private_details where lead_id = ${ASSIGNED_TODAY}`);
  check("other consultant cannot see private details", c2Private.length === 0);
  const c2Public = await asUser(U.c2, (tx) => tx`select company_name from leads where id = ${ASSIGNED_TODAY}`);
  check("other consultant still sees public row", c2Public.length === 1);
  const openPrivate = await asUser(U.c2, (tx) => tx`select contact_phone from lead_private_details where lead_id = ${OPEN_LEAD_2}`);
  check("OPEN lead private details hidden before claim", openPrivate.length === 0);
  const ownerPrivate = await asUser(U.owner, (tx) => tx`select contact_phone from lead_private_details where lead_id = ${ASSIGNED_TODAY}`);
  check("OWNER sees private details", ownerPrivate.length === 1);
  const callerPrivate = await asUser(U.caller, (tx) => tx`select contact_phone from lead_private_details where lead_id = ${ASSIGNED_TODAY}`);
  check("CALLER (creator) sees private details", callerPrivate.length === 1);
  const drafts = await asUser(U.c1, (tx) => tx`select id from leads where status = 'DRAFT'`);
  check("consultant sees no DRAFT leads", drafts.length === 0);
  const callerDrafts = await asUser(U.caller, (tx) => tx`select id from leads where status = 'DRAFT'`);
  check("caller sees DRAFT leads", callerDrafts.length >= 1);
}

console.log("\n[4] RLS isolation across organizations");
{
  const cross = await asUser(U.owner, (tx) => tx`select id from leads where id = ${OTHER_ORG_LEAD}`);
  check("owner of org1 cannot see org2 lead", cross.length === 0);
  const crossPriv = await asUser(U.owner, (tx) => tx`select * from lead_private_details where lead_id = ${OTHER_ORG_LEAD}`);
  check("org1 cannot see org2 private details", crossPriv.length === 0);
  const otherSees = await asUser(U.otherOwner, (tx) => tx`select id from leads`);
  check("org2 owner sees only their 1 lead", otherSees.length === 1);
  const profiles = await asUser(U.otherOwner, (tx) => tx`select id from profiles`);
  check("org2 owner sees only own profiles", profiles.length === 1);
  check("org2 owner cannot publish org1 lead", await expectError(() => asUser(U.otherOwner, (tx) => tx`select publish_lead(${"30000000-0000-4000-8000-000000000002"})`), "INVALID_STATE"));
  const crossClaim = await asUser(U.c1, async (tx) => (await tx`select claim_lead(${OTHER_ORG_LEAD}) as r`)[0].r);
  check("consultant cannot claim other org lead", crossClaim.code === "NOT_FOUND");
  const anon = await sql.begin(async (tx) => { await tx.unsafe("set local role authenticated"); return tx`select count(*)::int as n from leads`; });
  check("no JWT -> zero rows", anon[0].n === 0);
}

console.log("\n[5] Meeting report -> follow-up -> close loop");
{
  check("other consultant cannot report", await expectError(() => asUser(U.c2, (tx) => tx`select submit_meeting_report(${ASSIGNED_TODAY}, 'DONE', 'HIGH', 'FOLLOW_UP_NEEDED', 'CALL', current_date + 3)`), "FORBIDDEN"));
  check("DONE requires reaction/result", await expectError(() => asUser(U.c4, (tx) => tx`select submit_meeting_report(${ASSIGNED_TODAY}, 'DONE')`), "REACTION_RESULT_REQUIRED"));
  check("next action requires date", await expectError(() => asUser(U.c4, (tx) => tx`select submit_meeting_report(${ASSIGNED_TODAY}, 'DONE', 'HIGH', 'FOLLOW_UP_NEEDED', 'CALL')`), "NEXT_DATE_REQUIRED"));
  const r = await asUser(U.c4, async (tx) => (await tx`select submit_meeting_report(${ASSIGNED_TODAY}, 'DONE', 'HIGH', 'FOLLOW_UP_NEEDED', 'CALL', current_date + 3, '다음 주 통화', null, null,
    array['정책자금', '기업부설연구소'], array['재무제표'], '재무제표 받아서 한도 검토') as r`)[0].r);
  check("report accepted -> FOLLOW_UP", r.ok && r.status === "FOLLOW_UP" && r.follow_up_id);
  const fus = await asUser(U.c4, (tx) => tx`select * from follow_ups where lead_id = ${ASSIGNED_TODAY} and status = 'PENDING'`);
  check("follow-up created for assignee", fus.length === 1 && fus[0].assignee_id === U.c4 && fus[0].action === "CALL");
  check("follow-up memo is the next-step note", fus[0].memo === "재무제표 받아서 한도 검토", fus[0].memo);
  const [rep] = await asUser(U.c4, (tx) => tx`select topics, materials, next_note from meeting_reports where lead_id = ${ASSIGNED_TODAY}`);
  check("report stores topics / materials / next note", rep.topics.length === 2 && rep.materials[0] === "재무제표" && rep.next_note);
  check("other consultant cannot complete", await expectError(() => asUser(U.c2, (tx) => tx`select complete_follow_up(${fus[0].id}, 'x')`), "FORBIDDEN"));
  const done = await asUser(U.c4, async (tx) => (await tx`select complete_follow_up(${fus[0].id}, '통화 완료', 'SEND_MATERIAL', current_date + 5) as r`)[0].r);
  check("complete with next action chains a new follow-up", done.ok && done.next_follow_up_id && done.status === "FOLLOW_UP");
  const done2 = await asUser(U.c4, async (tx) => (await tx`select complete_follow_up(${done.next_follow_up_id}, '자료 전달 완료') as r`)[0].r);
  check("complete without next action closes lead", done2.status === "CLOSED");
  const [lead] = await sql`select status from leads where id = ${ASSIGNED_TODAY}`;
  check("lead is CLOSED", lead.status === "CLOSED");
  const logCount = await sql`select count(*)::int as n from activity_logs where lead_id = ${ASSIGNED_TODAY}`;
  check("history recorded (>=6 entries)", logCount[0].n >= 6, String(logCount[0].n));

  // Postpone path
  const c2Lead = "30000000-0000-4000-8000-000000000009"; // 대성산업 tomorrow, 본부장 B
  check("POSTPONED requires new meeting time", await expectError(() => asUser(U.leaderB, (tx) => tx`select submit_meeting_report(${c2Lead}, 'POSTPONED')`), "NEW_MEETING_REQUIRED"));
  const p = await asUser(U.leaderB, async (tx) => (await tx`select submit_meeting_report(${c2Lead}, 'POSTPONED', null, null, 'NONE', null, '대표 출장', null, now() + interval '7 days') as r`)[0].r);
  check("postponed stays ASSIGNED with new date", p.status === "ASSIGNED");
}

console.log("\n[6] Membership RPCs");
{
  const newUser = "60000000-0000-4000-8000-000000000001";
  await sql`insert into auth.users(id, email) values (${newUser}, 'new@leadflow.local') on conflict do nothing`;
  await sql`delete from profiles where id = ${newUser}`;
  check("bad invite code rejected", await expectError(() => asUser(newUser, (tx) => tx`select join_organization('NOPE', '신입')`), "INVALID_INVITE_CODE"));
  const p = await asUser(newUser, async (tx) => (await tx`select * from join_organization('smart2026', '신입 컨설턴트')`)[0]);
  check("join with invite code -> CONSULTANT in org", p.role === "CONSULTANT" && p.organization_id === ORG_ID);
  check("MANAGER cannot change roles", await expectError(() => asUser(U.manager, (tx) => tx`select set_member_role(${newUser}, 'CALLER')`), "FORBIDDEN"));
  await asUser(U.owner, (tx) => tx`select set_member_role(${newUser}, 'CALLER')`);
  const [np] = await sql`select role from profiles where id = ${newUser}`;
  check("OWNER changes role", np.role === "CALLER");
  await sql`delete from profiles where id = ${newUser}`;
  await sql`delete from auth.users where id = ${newUser}`;
}

console.log("\n[7] 교육 자료실 RLS");
{
  const tid = await asUser(U.leader, async (tx) => (await tx`insert into trainings(organization_id, title, held_at, instructor_id, created_by)
    values (${ORG_ID}, '테스트 교육', now(), ${U.leader}, ${U.leader}) returning id`)[0].id);
  check("본부장 can publish a training", !!tid);
  check("consultant cannot publish a training", await expectError(() => asUser(U.c1, (tx) => tx`insert into trainings(organization_id, title, held_at, created_by)
    values (${ORG_ID}, 'x', now(), ${U.c1})`), "row-level security"));
  check("caller cannot publish a training", await expectError(() => asUser(U.caller, (tx) => tx`insert into trainings(organization_id, title, held_at, created_by)
    values (${ORG_ID}, 'x', now(), ${U.caller})`), "row-level security"));
  const fid = await asUser(U.leader, async (tx) => (await tx`insert into training_files(organization_id, training_id, name, mime, size, chunk_count, created_by)
    values (${ORG_ID}, ${tid}, 'a.txt', 'text/plain', 5, 1, ${U.leader}) returning id`)[0].id);
  await asUser(U.leader, (tx) => tx`insert into training_file_chunks(file_id, organization_id, idx, data) values (${fid}, ${ORG_ID}, 0, ${Buffer.from("hello")})`);
  check("chunk index beyond count rejected", await expectError(() => asUser(U.leader, (tx) => tx`insert into training_file_chunks(file_id, organization_id, idx, data) values (${fid}, ${ORG_ID}, 1, ${Buffer.from("x")})`), "row-level security"));
  check("others cannot add chunks to someone's file", await expectError(() => asUser(U.owner, (tx) => tx`insert into training_file_chunks(file_id, organization_id, idx, data) values (${fid}, ${ORG_ID}, 0, ${Buffer.from("x")})`), "row-level security"));
  const seen = await asUser(U.c1, (tx) => tx`select c.data from training_file_chunks c where c.file_id = ${fid}`);
  check("consultant can read the file", seen.length === 1 && Buffer.from(seen[0].data).toString() === "hello");
  const other = await asUser(U.otherOwner, (tx) => tx`select id from trainings`);
  check("other org sees no trainings", other.length === 0);
  const otherChunks = await asUser(U.otherOwner, (tx) => tx`select file_id from training_file_chunks`);
  check("other org sees no files", otherChunks.length === 0);
  await asUser(U.c1, (tx) => tx`insert into training_reads(training_id, profile_id, organization_id) values (${tid}, ${U.c1}, ${ORG_ID})`);
  check("cannot mark read for someone else", await expectError(() => asUser(U.c1, (tx) => tx`insert into training_reads(training_id, profile_id, organization_id) values (${tid}, ${U.c2}, ${ORG_ID})`), "row-level security"));
  const reads = await asUser(U.owner, (tx) => tx`select profile_id from training_reads where training_id = ${tid}`);
  check("단장 sees who read it", reads.length === 1 && reads[0].profile_id === U.c1);
  const upd = await asUser(U.leaderB, (tx) => tx`update trainings set title = 'hacked' where id = ${tid} returning id`);
  check("another 본부장 cannot edit it", upd.length === 0);
  const del = await asUser(U.c1, (tx) => tx`delete from trainings where id = ${tid} returning id`);
  check("consultant cannot delete it", del.length === 0);
  const own = await asUser(U.owner, (tx) => tx`delete from trainings where id = ${tid} returning id`);
  check("단장 can delete it (files cascade)", own.length === 1 && (await sql`select count(*)::int as n from training_file_chunks where file_id = ${fid}`)[0].n === 0);
}

await sql`update profiles set is_active = false where id = ${U.manager}`;

console.log(`\n${pass} passed, ${fail} failed`);
await sql.end();
process.exit(fail ? 1 : 0);
