// Demo / QA seed shared by `scripts/seed.mjs` (Node type stripping) and the
// app's demo mode. Fictional companies and people only. Keep this file free of
// "@/" imports and TS-only runtime syntax so plain Node can load it.
import type { TransactionSql } from "postgres";

export const ORG_ID = "00000000-0000-4000-8000-000000000001";
export const ORG2_ID = "00000000-0000-4000-8000-000000000002";

interface SeedUser { id: string; email: string; name: string; role: string; phone: string; org?: string }

export const USERS = {
  owner:       { id: "10000000-0000-4000-8000-000000000001", email: "owner@leadflow.local",    name: "김상호", role: "OWNER",      phone: "010-1000-0001" },
  manager:     { id: "10000000-0000-4000-8000-000000000002", email: "manager@leadflow.local",  name: "박서연", role: "MANAGER",    phone: "010-1000-0002" },
  caller:      { id: "10000000-0000-4000-8000-000000000003", email: "caller@leadflow.local",   name: "이정숙", role: "CALLER",     phone: "010-1000-0003" },
  consultant1: { id: "10000000-0000-4000-8000-000000000004", email: "minsu@leadflow.local",    name: "최민수", role: "CONSULTANT", phone: "010-1000-0004" },
  consultant2: { id: "10000000-0000-4000-8000-000000000005", email: "jiyoung@leadflow.local",  name: "한지영", role: "CONSULTANT", phone: "010-1000-0005" },
  consultant3: { id: "10000000-0000-4000-8000-000000000006", email: "sehun@leadflow.local",    name: "오세훈", role: "CONSULTANT", phone: "010-1000-0006" },
  leader:      { id: "10000000-0000-4000-8000-000000000007", email: "leader@leadflow.local",   name: "정미경", role: "LEADER",     phone: "010-1000-0007" },
  otherOwner:  { id: "20000000-0000-4000-8000-000000000001", email: "other@leadflow.local",    name: "다른단장", role: "OWNER",     phone: "010-2000-0001", org: ORG2_ID },
} satisfies Record<string, SeedUser>;

export const DEMO_DEFAULT_USER_ID = USERS.owner.id;

interface ReportSeed { outcome: string; reaction: string; result: string; next: string; due?: number; memo: string }
interface LeadSeed {
  id: string; company: string; region: string; industry: string; at: Date; method: string; status: string;
  assignee?: SeedUser; summary: string; contact: string[]; topic: string; interest: string[]; concern: string[];
  traits: string; reason: string; mustKnow: string; caution: string; report?: ReportSeed; cancelReason?: string;
}

const KST = 9 * 60;
/** A time `dayOffset` days from today (KST), relative to when the seed runs. */
function kst(dayOffset: number, hour: number, minute = 0): Date {
  const local = new Date(Date.now() + KST * 60000);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dayOffset, hour, minute));
  return new Date(d.getTime() - KST * 60000);
}
function kstDay(dayOffset: number): string {
  return new Date(kst(dayOffset, 12).getTime() + KST * 60000).toISOString().slice(0, 10);
}

const U = USERS;
const L = (id: number) => `30000000-0000-4000-8000-0000000000${String(id).padStart(2, "0")}`;

const leads = (): LeadSeed[] => [
  // DRAFT — registered today by caller, waiting for owner to publish
  { id: L(1), company: "한솔이엔지(주)", region: "경기 화성시", industry: "건설·설비", at: kst(3, 10), method: "VISIT", status: "DRAFT",
    summary: "설비 공사업, 직원 12명, 정책자금 관심", contact: ["김영호", "대표", "010-3333-0001"],
    topic: "운전자금 정책자금", interest: ["정책자금", "고용지원금"], concern: ["기존 대출 부담"],
    traits: "말이 빠르고 숫자에 민감. 결론부터 듣기를 원함", reason: "올해 설비 증설 계획이 있어 자금 조달 방법 상담 요청", mustKnow: "작년 매출 18억, 신용보증 이용 이력 있음", caution: "오전 10시 이후 통화 선호" },
  { id: L(2), company: "(주)미래푸드", region: "경기 성남시", industry: "식품 제조", at: kst(4, 14), method: "VISIT", status: "DRAFT",
    summary: "HACCP 식품제조, 직원 25명, 연구소 설립 관심", contact: ["박지현", "이사", "010-3333-0002"],
    topic: "기업부설연구소 설립", interest: ["기업부설연구소", "세액공제"], concern: [],
    traits: "꼼꼼함. 자료를 미리 받아보길 원함", reason: "연구소 설립으로 세액공제를 받고 싶어함", mustKnow: "연구 전담 인력 2명 확보 가능", caution: "" },

  // OPEN — published, waiting for a consultant
  { id: L(3), company: "태양금속(주)", region: "인천 남동구", industry: "금속 가공", at: kst(2, 11), method: "VISIT", status: "OPEN",
    summary: "금속 가공업, 직원 30명, 고용지원금 관심", contact: ["정태양", "대표", "010-3333-0003"],
    topic: "청년 고용지원금", interest: ["고용지원금"], concern: ["서류 부담"],
    traits: "실무는 총무팀장이 담당. 대표는 큰 그림만", reason: "올해 청년 5명 채용 예정", mustKnow: "4대보험 명부 요청하면 바로 줄 수 있다고 함", caution: "총무팀장 동석 요청" },
  { id: L(4), company: "(주)클린케어", region: "서울 금천구", industry: "위생·환경", at: kst(3, 15), method: "PHONE", status: "OPEN",
    summary: "위생 서비스, 직원 8명, 벤처인증 관심", contact: ["오하나", "대표", "010-3333-0004"],
    topic: "벤처기업확인", interest: ["벤처기업확인", "정책자금"], concern: ["비용"],
    traits: "친절하지만 결정이 느림", reason: "벤처인증 후 정책자금 연계 원함", mustKnow: "기술 특허 1건 보유", caution: "" },
  { id: L(5), company: "제일하이텍(주)", region: "경기 안산시", industry: "전자 부품", at: kst(5, 10, 30), method: "ONLINE", status: "OPEN",
    summary: "전자부품 제조, 직원 45명, 이노비즈 관심", contact: ["최은정", "관리이사", "010-3333-0005"],
    topic: "이노비즈·메인비즈 인증", interest: ["기업인증", "정책자금"], concern: [],
    traits: "온라인 미팅 선호", reason: "인증으로 금리 우대를 받고 싶어함", mustKnow: "작년 R&D 투자 3억", caution: "줌 링크 하루 전 발송 요청" },

  // ASSIGNED — meetings today
  { id: L(6), company: "성진테크(주)", region: "서울 강남구", industry: "자동차 부품", at: kst(0, 10), method: "VISIT", status: "ASSIGNED", assignee: U.consultant1,
    summary: "자동차 부품 제조, 직원 60명, 정책자금·연구소 관심", contact: ["이명수", "대표", "010-3333-0006"],
    topic: "신규 생산라인 자금", interest: ["정책자금", "기업부설연구소"], concern: ["담보 부족"],
    traits: "결정이 빠름. 실행 계획을 구체적으로 원함", reason: "신규 생산라인 도입 검토 중, 자금 조달 상담 요청", mustKnow: "매출 80억, 기존 연구소 없음", caution: "제품 소개 자료 지참 요청" },
  { id: L(7), company: "(주)한빛솔루션", region: "경기 성남시", industry: "소프트웨어", at: kst(0, 14), method: "ONLINE", status: "ASSIGNED", assignee: U.consultant1,
    summary: "SW 개발, 직원 15명, 고용지원금 관심", contact: ["박민지", "이사", "010-3333-0007"],
    topic: "청년 채용 지원금", interest: ["고용지원금", "벤처기업확인"], concern: [],
    traits: "IT 용어에 익숙. 빠른 진행 선호", reason: "하반기 개발자 4명 채용 예정", mustKnow: "벤처인증 만료 임박", caution: "" },
  { id: L(8), company: "우림식품(주)", region: "인천 부평구", industry: "식품 유통", at: kst(0, 16), method: "VISIT", status: "ASSIGNED", assignee: U.consultant2,
    summary: "식품 유통, 직원 20명, 절세 관심", contact: ["김태호", "대표", "010-3333-0008"],
    topic: "법인 절세", interest: ["법인컨설팅", "가지급금"], concern: ["세무사 교체 부담"],
    traits: "보수적. 기존 세무사와 관계 중시", reason: "가지급금 정리 방법 문의", mustKnow: "가지급금 약 3억", caution: "세무사 비판 금지" },

  // ASSIGNED — tomorrow
  { id: L(9), company: "대성산업(주)", region: "경기 안산시", industry: "기계 부품", at: kst(1, 11), method: "VISIT", status: "ASSIGNED", assignee: U.consultant2,
    summary: "기계부품 제조, 직원 35명, 연구소 관심", contact: ["정은주", "이사", "010-3333-0009"],
    topic: "연구소 설립·세액공제", interest: ["기업부설연구소"], concern: [], traits: "", reason: "연구소 설립으로 세액공제 원함", mustKnow: "", caution: "" },

  // ASSIGNED — meeting passed, NO REPORT (the core owner pain)
  { id: L(10), company: "(주)그린바이오", region: "충북 청주시", industry: "바이오", at: kst(-2, 14), method: "VISIT", status: "ASSIGNED", assignee: U.consultant3,
    summary: "바이오 소재, 직원 18명, 정책자금 관심", contact: ["윤재석", "대표", "010-3333-0010"],
    topic: "R&D 자금", interest: ["정책자금", "정부지원사업"], concern: [], traits: "", reason: "R&D 과제 신청 준비", mustKnow: "", caution: "" },
  { id: L(11), company: "하나정밀(주)", region: "경기 시흥시", industry: "정밀 가공", at: kst(-5, 10), method: "VISIT", status: "ASSIGNED", assignee: U.consultant1,
    summary: "정밀가공, 직원 22명, 고용지원금 관심", contact: ["송하나", "대표", "010-3333-0011"],
    topic: "고용지원금", interest: ["고용지원금"], concern: [], traits: "", reason: "직원 채용 계획", mustKnow: "", caution: "" },

  // FOLLOW_UP — report submitted, follow-ups pending
  { id: L(12), company: "대명플라스틱(주)", region: "경기 김포시", industry: "플라스틱 사출", at: kst(-3, 10), method: "VISIT", status: "FOLLOW_UP", assignee: U.consultant2,
    summary: "사출 제조, 직원 40명, 정책자금 관심", contact: ["김민수", "대표", "010-3333-0012"],
    topic: "시설자금", interest: ["정책자금"], concern: [], traits: "", reason: "설비 교체", mustKnow: "", caution: "",
    report: { outcome: "DONE", reaction: "HIGH", result: "MATERIAL_REQUEST", next: "SEND_MATERIAL", due: 0, memo: "정책자금 안내자료 요청. 다음 주 재방문 가능" } },
  { id: L(13), company: "(주)블루오션", region: "부산 사상구", industry: "조선 기자재", at: kst(-10, 15), method: "VISIT", status: "FOLLOW_UP", assignee: U.consultant3,
    summary: "조선기자재, 직원 55명, 인증 관심", contact: ["강동원", "이사", "010-3333-0013"],
    topic: "메인비즈 인증", interest: ["기업인증"], concern: ["시간 부족"], traits: "", reason: "인증 갱신", mustKnow: "", caution: "",
    report: { outcome: "DONE", reaction: "MID", result: "REVIEW_THEN_CONTACT", next: "CALL", due: -8, memo: "내부 검토 후 연락 주기로 함" } },

  // CLOSED
  { id: L(14), company: "동아섬유(주)", region: "대구 서구", industry: "섬유", at: kst(-7, 11), method: "VISIT", status: "CLOSED", assignee: U.consultant1,
    summary: "섬유 제조, 직원 28명", contact: ["이동아", "대표", "010-3333-0014"],
    topic: "정책자금", interest: ["정책자금"], concern: ["시기 부적절"], traits: "", reason: "", mustKnow: "", caution: "",
    report: { outcome: "DONE", reaction: "LOW", result: "HARD", next: "NONE", memo: "내년 상반기에 다시 검토 예정" } },

  // CANCELLED
  { id: L(15), company: "(주)서울테크", region: "서울 구로구", industry: "IT 서비스", at: kst(2, 13), method: "PHONE", status: "CANCELLED",
    summary: "IT 서비스, 직원 10명", contact: ["박서울", "대표", "010-3333-0015"], topic: "", interest: [], concern: [], traits: "", reason: "", mustKnow: "", caution: "",
    cancelReason: "업체 요청으로 미팅 취소" },
];

/** Wipes and recreates both demo organizations. Runs inside the caller's transaction. */
export async function seedDemo(tx: TransactionSql): Promise<{ users: number; leads: number }> {
  const all = leads();
  const users: SeedUser[] = Object.values(U);
  const orgs = [ORG_ID, ORG2_ID];
  await tx`delete from activity_logs where organization_id in ${tx(orgs)}`;
  await tx`delete from follow_ups where organization_id in ${tx(orgs)}`;
  await tx`delete from meeting_reports where organization_id in ${tx(orgs)}`;
  await tx`delete from lead_assignments where organization_id in ${tx(orgs)}`;
  await tx`delete from lead_private_details where organization_id in ${tx(orgs)}`;
  await tx`delete from leads where organization_id in ${tx(orgs)}`;
  await tx`delete from profiles where organization_id in ${tx(orgs)}`;
  await tx`delete from organizations where id in ${tx(orgs)}`;
  await tx`delete from auth.users where id in ${tx(users.map((u) => u.id))}`;

  await tx`insert into organizations(id, name, invite_code) values (${ORG_ID}, '미래AI랩 사업단', 'MIRAE2026'), (${ORG2_ID}, '다른 사업단', 'OTHER0001')`;
  for (const u of users) {
    await tx`insert into auth.users(id, email) values (${u.id}, ${u.email})`;
    await tx`insert into profiles(id, organization_id, role, full_name, phone) values (${u.id}, ${u.org ?? ORG_ID}, ${u.role}, ${u.name}, ${u.phone})`;
  }

  for (const l of all) {
    const assigned = l.assignee?.id ?? null;
    const published = l.status === "DRAFT" ? null : new Date(l.at.getTime() - 3 * 86400000);
    const createdAt = published ?? kst(0, 17);
    const assignedAt = assigned && published ? new Date(published.getTime() + 3600000) : null;
    await tx`insert into leads(id, organization_id, company_name, region, industry, meeting_at, meeting_method, public_summary, status, created_by, caller_id, assigned_to, assigned_at, published_at, closed_at, cancel_reason, created_at)
      values (${l.id}, ${ORG_ID}, ${l.company}, ${l.region}, ${l.industry}, ${l.at}, ${l.method}, ${l.summary}, ${l.status}, ${U.caller.id}, ${U.caller.id},
        ${assigned}, ${assignedAt}, ${published},
        ${["CLOSED", "CANCELLED"].includes(l.status) ? new Date() : null}, ${l.cancelReason ?? null}, ${createdAt})`;
    await tx`insert into lead_private_details(lead_id, organization_id, contact_name, contact_title, contact_phone, call_topic, interest_tags, concern_tags, contact_traits, meeting_reason, must_know, caution)
      values (${l.id}, ${ORG_ID}, ${l.contact[0]}, ${l.contact[1]}, ${l.contact[2]}, ${l.topic}, ${l.interest}, ${l.concern}, ${l.traits}, ${l.reason}, ${l.mustKnow}, ${l.caution})`;
    await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, to_status, created_at) values (${ORG_ID}, ${l.id}, ${U.caller.id}, 'CREATE', 'DRAFT', ${createdAt})`;
    if (published) {
      await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, created_at) values (${ORG_ID}, ${l.id}, ${U.owner.id}, 'PUBLISH', 'DRAFT', 'OPEN', ${published})`;
    }
    if (assigned && assignedAt) {
      await tx`insert into lead_assignments(organization_id, lead_id, consultant_id, assigned_by, method, created_at) values (${ORG_ID}, ${l.id}, ${assigned}, ${assigned}, 'CLAIM', ${assignedAt})`;
      await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, detail, created_at) values (${ORG_ID}, ${l.id}, ${assigned}, 'CLAIM', 'OPEN', 'ASSIGNED', ${tx.json({ consultant_id: assigned })}, ${assignedAt})`;
    }
    if (l.report && assigned) {
      const r = l.report;
      const reportedAt = new Date(l.at.getTime() + 2 * 3600000);
      const due = r.due === undefined ? null : kstDay(r.due);
      const [{ id: reportId }] = await tx<{ id: string }[]>`insert into meeting_reports(organization_id, lead_id, reporter_id, outcome, reaction, result, next_action, next_action_date, memo, created_at)
        values (${ORG_ID}, ${l.id}, ${assigned}, ${r.outcome}, ${r.reaction}, ${r.result}, ${r.next}, ${due}, ${r.memo}, ${reportedAt}) returning id`;
      let followId: string | null = null;
      if (r.next !== "NONE") {
        const [{ id }] = await tx<{ id: string }[]>`insert into follow_ups(organization_id, lead_id, assignee_id, action, due_date, memo, created_by, created_at)
          values (${ORG_ID}, ${l.id}, ${assigned}, ${r.next}, ${due}, ${r.memo}, ${assigned}, ${reportedAt}) returning id`;
        followId = id;
      }
      await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, detail, created_at)
        values (${ORG_ID}, ${l.id}, ${assigned}, 'REPORT', 'ASSIGNED', ${l.status}, ${tx.json({ report_id: reportId, outcome: r.outcome, reaction: r.reaction, result: r.result, next_action: r.next, follow_up_id: followId })}, ${reportedAt})`;
    }
    if (l.status === "CANCELLED") {
      await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, detail) values (${ORG_ID}, ${l.id}, ${U.manager.id}, 'CANCEL_LEAD', 'OPEN', 'CANCELLED', ${tx.json({ reason: l.cancelReason ?? null })})`;
    }
  }

  // Second org: one lead, to prove isolation.
  await tx`insert into leads(id, organization_id, company_name, region, industry, meeting_at, meeting_method, public_summary, status, created_by, published_at)
    values ('40000000-0000-4000-8000-000000000001', ${ORG2_ID}, '타조직상사(주)', '광주 북구', '유통', ${kst(2, 10)}, 'VISIT', '다른 조직의 DB', 'OPEN', ${U.otherOwner.id}, now())`;
  await tx`insert into lead_private_details(lead_id, organization_id, contact_name, contact_phone) values ('40000000-0000-4000-8000-000000000001', ${ORG2_ID}, '비밀담당자', '010-9999-9999')`;

  return { users: users.length, leads: all.length };
}
