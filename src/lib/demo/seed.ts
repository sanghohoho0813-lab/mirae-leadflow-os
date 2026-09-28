// Demo / QA seed shared by `scripts/seed.mjs` (Node type stripping) and the
// app's demo mode. Fictional companies and people only. Keep this file free of
// "@/" imports and TS-only runtime syntax so plain Node can load it.
import type { TransactionSql } from "postgres";

export const ORG_ID = "00000000-0000-4000-8000-000000000001";
export const ORG2_ID = "00000000-0000-4000-8000-000000000002";

interface SeedUser { id: string; email: string; name: string; role: string; phone: string; title?: string; division?: string; org?: string }

export const USERS = {
  owner:       { id: "10000000-0000-4000-8000-000000000001", email: "owner@leadflow.local",    name: "송하균",     role: "OWNER",      phone: "010-1000-0001" },
  leaderB:     { id: "10000000-0000-4000-8000-000000000002", email: "leader-3@leadflow.local", name: "정행래",     role: "LEADER",     phone: "010-1000-0002", division: "3본부" },
  caller:      { id: "10000000-0000-4000-8000-000000000003", email: "caller@leadflow.local",   name: "이제원",     role: "CALLER",     phone: "010-1000-0003", title: "콜팀장" },
  consultant1: { id: "10000000-0000-4000-8000-000000000004", email: "c-a@leadflow.local",      name: "컨설턴트 A", role: "CONSULTANT", phone: "010-1000-0004", division: "직할본부" },
  consultant2: { id: "10000000-0000-4000-8000-000000000005", email: "c-b@leadflow.local",      name: "컨설턴트 B", role: "CONSULTANT", phone: "010-1000-0005", division: "직할본부" },
  consultant3: { id: "10000000-0000-4000-8000-000000000006", email: "c-c@leadflow.local",      name: "컨설턴트 C", role: "CONSULTANT", phone: "010-1000-0006", division: "2본부" },
  leader:      { id: "10000000-0000-4000-8000-000000000007", email: "leader-2@leadflow.local", name: "서인수",     role: "LEADER",     phone: "010-1000-0007", division: "2본부" },
  consultant6: { id: "10000000-0000-4000-8000-000000000008", email: "c-f@leadflow.local",      name: "컨설턴트 F", role: "CONSULTANT", phone: "010-1000-0008", division: "3본부" },
  consultant4: { id: "10000000-0000-4000-8000-000000000009", email: "c-d@leadflow.local",      name: "컨설턴트 D", role: "CONSULTANT", phone: "010-1000-0009", division: "2본부" },
  consultant5: { id: "10000000-0000-4000-8000-000000000010", email: "c-e@leadflow.local",      name: "컨설턴트 E", role: "CONSULTANT", phone: "010-1000-0010", division: "3본부" },
  secretary:   { id: "10000000-0000-4000-8000-000000000018", email: "secretary@leadflow.local", name: "이미라",    role: "MANAGER",    phone: "010-1000-0018", title: "비서 팀장" },
  branchA:     { id: "10000000-0000-4000-8000-000000000011", email: "branch-a@leadflow.local", name: "지점장 A",   role: "CONSULTANT", phone: "010-1000-0011", title: "지점장", division: "직할본부" },
  teamA:       { id: "10000000-0000-4000-8000-000000000012", email: "team-a@leadflow.local",   name: "팀장 A",     role: "CONSULTANT", phone: "010-1000-0012", title: "팀장", division: "직할본부" },
  branchB:     { id: "10000000-0000-4000-8000-000000000013", email: "branch-b@leadflow.local", name: "지점장 B",   role: "CONSULTANT", phone: "010-1000-0013", title: "지점장", division: "2본부" },
  teamB:       { id: "10000000-0000-4000-8000-000000000014", email: "team-b@leadflow.local",   name: "팀장 B",     role: "CONSULTANT", phone: "010-1000-0014", title: "팀장", division: "2본부" },
  branchC:     { id: "10000000-0000-4000-8000-000000000015", email: "branch-c@leadflow.local", name: "지점장 C",   role: "CONSULTANT", phone: "010-1000-0015", title: "지점장", division: "3본부" },
  teamC:       { id: "10000000-0000-4000-8000-000000000016", email: "team-c@leadflow.local",   name: "팀장 C",     role: "CONSULTANT", phone: "010-1000-0016", title: "팀장", division: "3본부" },
  gwangju:     { id: "10000000-0000-4000-8000-000000000017", email: "gwangju@leadflow.local",  name: "컨설턴트 G", role: "CONSULTANT", phone: "010-1000-0017", division: "광주 상무본부" },
  otherOwner:  { id: "20000000-0000-4000-8000-000000000001", email: "other@leadflow.local",    name: "다른단장",   role: "OWNER",      phone: "010-2000-0001", org: ORG2_ID },
} satisfies Record<string, SeedUser>;

export const DEMO_DEFAULT_USER_ID = USERS.owner.id;

/** 본부. 광주 상무본부는 교육만 쓰고 서울·경기 공통 DB는 받지 않는다. */
export const DIVISIONS = [
  { id: "80000000-0000-4000-8000-000000000001", name: "직할본부", sort: 1, claims: true },
  { id: "80000000-0000-4000-8000-000000000002", name: "2본부", sort: 2, claims: true },
  { id: "80000000-0000-4000-8000-000000000003", name: "3본부", sort: 3, claims: true },
  { id: "80000000-0000-4000-8000-000000000004", name: "광주 상무본부", sort: 4, claims: false },
];
const DIV = (name?: string) => DIVISIONS.find((d) => d.name === name)?.id ?? null;

interface ReportSeed { outcome: string; reaction: string; result: string; next: string; due?: number; memo: string; topics?: string[]; materials?: string[]; nextNote?: string }
interface LeadSeed {
  id: string; company: string; region: string; industry: string; at: Date; method: string; status: string;
  assignee?: SeedUser; summary: string; contact: string[]; topic: string; interest: string[]; concern: string[];
  traits: string; reason: string; mustKnow: string; caution: string; report?: ReportSeed; cancelReason?: string;
  /** 본부 DB: created by that 본부장 and seen only by 단장·비서 and that 본부. */
  division?: string; createdBy?: SeedUser; round?: number;
}

const KST = 9 * 60;
/** A time `dayOffset` days from today (KST), relative to when the seed runs. */
function kst(dayOffset: number, hour: number, minute = 0): Date {
  const local = new Date(Date.now() + KST * 60000);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dayOffset, hour, minute));
  return new Date(d.getTime() - KST * 60000);
}
/** Like kst() but never on a weekend (미팅은 평일): past → Friday before, future → Monday after. */
function wd(dayOffset: number, hour: number, minute = 0): Date {
  const d = kst(dayOffset, hour, minute);
  const day = new Date(d.getTime() + KST * 60000).getUTCDay();
  if (dayOffset === 0 || (day !== 0 && day !== 6)) return d;
  const shift = dayOffset < 0 ? (day === 6 ? -1 : -2) : (day === 6 ? 2 : 1);
  return kst(dayOffset + shift, hour, minute);
}
function kstDay(dayOffset: number): string {
  return new Date(kst(dayOffset, 12).getTime() + KST * 60000).toISOString().slice(0, 10);
}

const U = USERS;

// Fictional companies at plausible street addresses.
const ADDRESS: Record<number, string> = {
  1: "경기 화성시 동탄산단8길 15", 2: "경기 성남시 중원구 둔촌대로 388", 3: "인천 남동구 남동서로 173",
  4: "서울 금천구 가산디지털1로 145", 5: "경기 안산시 단원구 산단로 67", 6: "서울 강남구 테헤란로 123",
  7: "경기 성남시 분당구 판교로 256", 8: "인천 부평구 부평대로 283", 9: "경기 안산시 단원구 강촌로 211",
  10: "충북 청주시 흥덕구 오송생명로 181", 11: "경기 시흥시 공단1대로 204", 12: "경기 김포시 양촌읍 황금로 109",
  13: "부산 사상구 새벽로 215", 14: "대구 서구 국채보상로 97", 15: "서울 구로구 디지털로 300",
  16: "경기 평택시 포승읍 평택항로 156", 17: "경기 용인시 기흥구 흥덕중앙로 120", 18: "서울 송파구 법원로 128",
  19: "경기 수원시 영통구 광교로 107", 20: "서울 영등포구 여의대로 108",
};
const L = (id: number) => `30000000-0000-4000-8000-0000000000${String(id).padStart(2, "0")}`;

const leads = (): LeadSeed[] => [
  // DRAFT — registered today by caller, waiting for owner to publish
  { id: L(1), company: "한솔이엔지(주)", region: "경기 화성시", industry: "건설·설비 · 인테리어·설비", at: wd(3, 10), method: "VISIT", status: "DRAFT",
    summary: "설비 공사업, 직원 12명, 정책자금 관심", contact: ["김영호", "대표", "010-3333-0001"],
    topic: "운전자금 정책자금", interest: ["정책자금", "고용지원금"], concern: ["기존 대출 부담"],
    traits: "말이 빠르고 숫자에 민감. 결론부터 듣기를 원함", reason: "올해 설비 증설 계획이 있어 자금 조달 방법 상담 요청", mustKnow: "작년 매출 18억, 신용보증 이용 이력 있음", caution: "오전 10시 이후 통화 선호" },
  { id: L(2), company: "(주)미래푸드", region: "경기 성남시", industry: "제조 · 식품", at: wd(4, 14), method: "VISIT", status: "DRAFT",
    summary: "HACCP 식품제조, 직원 25명, 연구소 설립 관심", contact: ["박지현", "이사", "010-3333-0002"],
    topic: "기업부설연구소 설립", interest: ["기업부설연구소", "세액공제"], concern: [],
    traits: "꼼꼼함. 자료를 미리 받아보길 원함", reason: "연구소 설립으로 세액공제를 받고 싶어함", mustKnow: "연구 전담 인력 2명 확보 가능", caution: "" },

  // OPEN — published, waiting for a consultant
  { id: L(3), company: "태양금속(주)", region: "인천 남동구", industry: "제조 · 금속·기계", at: wd(2, 11), method: "VISIT", status: "OPEN",
    summary: "금속 가공업, 직원 30명, 고용지원금 관심", contact: ["정태양", "대표", "010-3333-0003"],
    topic: "청년 고용지원금", interest: ["고용지원금"], concern: ["서류 부담"],
    traits: "실무는 총무팀장이 담당. 대표는 큰 그림만", reason: "올해 청년 5명 채용 예정", mustKnow: "4대보험 명부 요청하면 바로 줄 수 있다고 함", caution: "총무팀장 동석 요청" },
  { id: L(4), company: "(주)클린케어", region: "서울 금천구", industry: "서비스 · 기타 서비스", at: wd(3, 15), method: "VISIT", status: "OPEN",
    summary: "위생 서비스, 직원 8명, 벤처인증 관심", contact: ["오하나", "대표", "010-3333-0004"],
    topic: "벤처인증", interest: ["벤처인증", "정책자금"], concern: ["비용"],
    traits: "친절하지만 결정이 느림", reason: "벤처인증 후 정책자금 연계 원함", mustKnow: "기술 특허 1건 보유", caution: "" },
  { id: L(5), company: "제일하이텍(주)", region: "경기 안산시", industry: "제조 · 전자·전기", at: wd(5, 10, 30), method: "VISIT", status: "OPEN",
    summary: "전자부품 제조, 직원 45명, 이노비즈 관심", contact: ["최은정", "관리이사", "010-3333-0005"],
    topic: "이노비즈·메인비즈 인증", interest: ["기업인증", "정책자금"], concern: [],
    traits: "온라인 미팅 선호", reason: "인증으로 금리 우대를 받고 싶어함", mustKnow: "작년 R&D 투자 3억", caution: "줌 링크 하루 전 발송 요청" },

  // ASSIGNED — meetings today
  { id: L(6), company: "성진테크(주)", region: "서울 강남구", industry: "제조 · 자동차 부품", at: wd(0, 10), method: "VISIT", status: "ASSIGNED", assignee: U.consultant4,
    summary: "자동차 부품 제조, 직원 60명, 정책자금·연구소 관심", contact: ["이명수", "대표", "010-3333-0006"],
    topic: "신규 생산라인 자금", interest: ["정책자금", "기업부설연구소"], concern: ["담보 부족"],
    traits: "결정이 빠름. 실행 계획을 구체적으로 원함", reason: "신규 생산라인 도입 검토 중, 자금 조달 상담 요청", mustKnow: "매출 80억, 기존 연구소 없음", caution: "제품 소개 자료 지참 요청" },
  { id: L(7), company: "(주)한빛솔루션", region: "경기 성남시", industry: "IT·소프트웨어 · 소프트웨어 개발", at: wd(0, 14), method: "VISIT", status: "ASSIGNED", assignee: U.leader,
    summary: "SW 개발, 직원 15명, 고용지원금 관심", contact: ["박민지", "이사", "010-3333-0007"],
    topic: "청년 채용 지원금", interest: ["고용지원금", "벤처인증"], concern: [],
    traits: "IT 용어에 익숙. 빠른 진행 선호", reason: "하반기 개발자 4명 채용 예정", mustKnow: "벤처인증 만료 임박", caution: "" },
  { id: L(8), company: "우림식품(주)", region: "인천 부평구", industry: "도소매·유통 · 도매", at: wd(0, 16), method: "VISIT", status: "ASSIGNED", assignee: U.consultant2,
    summary: "식품 유통, 직원 20명, 절세 관심", contact: ["김태호", "대표", "010-3333-0008"],
    topic: "법인 절세", interest: ["절세·법인", "가지급금"], concern: ["세무사 교체 부담"],
    traits: "보수적. 기존 세무사와 관계 중시", reason: "가지급금 정리 방법 문의", mustKnow: "가지급금 약 3억", caution: "세무사 비판 금지" },

  // ASSIGNED — tomorrow
  { id: L(9), company: "대성산업(주)", region: "경기 안산시", industry: "제조 · 금속·기계", at: wd(1, 11), method: "VISIT", status: "ASSIGNED", assignee: U.leaderB,
    summary: "기계부품 제조, 직원 35명, 연구소 관심", contact: ["정은주", "이사", "010-3333-0009"],
    topic: "연구소 설립·세액공제", interest: ["기업부설연구소"], concern: [], traits: "", reason: "연구소 설립으로 세액공제 원함", mustKnow: "", caution: "" },

  // ASSIGNED — meeting passed, NO REPORT (the core owner pain)
  { id: L(10), company: "(주)그린바이오", region: "충북 청주시", industry: "제조 · 바이오·의료기기", at: wd(-2, 14), method: "VISIT", status: "ASSIGNED", assignee: U.consultant3,
    summary: "바이오 소재, 직원 18명, 정책자금 관심", contact: ["윤재석", "대표", "010-3333-0010"],
    topic: "R&D 자금", interest: ["정책자금", "정부지원사업"], concern: [], traits: "", reason: "R&D 과제 신청 준비", mustKnow: "", caution: "" },
  { id: L(11), company: "하나정밀(주)", region: "경기 시흥시", industry: "제조 · 금속·기계", at: wd(-5, 10), method: "VISIT", status: "ASSIGNED", assignee: U.consultant6,
    summary: "정밀가공, 직원 22명, 고용지원금 관심", contact: ["송하나", "대표", "010-3333-0011"],
    topic: "고용지원금", interest: ["고용지원금"], concern: [], traits: "", reason: "직원 채용 계획", mustKnow: "", caution: "" },

  // FOLLOW_UP — report submitted, follow-ups pending
  { id: L(12), company: "대명플라스틱(주)", region: "경기 김포시", industry: "제조 · 화학·플라스틱", at: wd(-3, 10), method: "VISIT", status: "FOLLOW_UP", assignee: U.consultant1,
    summary: "사출 제조, 직원 40명, 정책자금 관심", contact: ["김민수", "대표", "010-3333-0012"],
    topic: "시설자금", interest: ["정책자금"], concern: [], traits: "", reason: "설비 교체", mustKnow: "", caution: "",
    report: { outcome: "DONE", reaction: "HIGH", result: "MATERIAL_REQUEST", next: "SEND_MATERIAL", due: 0, memo: "설비 교체 시설자금 관심 높음. 다음 주 재방문 가능",
      topics: ["정책자금"], materials: ["재무제표", "부가세 과세표준증명"], nextNote: "정책자금 안내자료 보내고 재무제표 3년치 받기" } },
  { id: L(13), company: "(주)블루오션", region: "부산 사상구", industry: "제조 · 기타 제조", at: wd(-10, 15), method: "VISIT", status: "FOLLOW_UP", assignee: U.consultant3,
    summary: "조선기자재, 직원 55명, 인증 관심", contact: ["강동원", "이사", "010-3333-0013"],
    topic: "메인비즈 인증", interest: ["기업인증"], concern: ["시간 부족"], traits: "", reason: "인증 갱신", mustKnow: "", caution: "",
    report: { outcome: "DONE", reaction: "MID", result: "REVIEW_THEN_CONTACT", next: "CALL", due: -8, memo: "내부 검토 후 연락 주기로 함",
      topics: ["기업인증"], materials: ["회사소개서"], nextNote: "인증 갱신 일정 확인 전화" } },

  // CLOSED
  { id: L(14), company: "동아섬유(주)", region: "대구 서구", industry: "제조 · 섬유·의류", at: wd(-7, 11), method: "VISIT", status: "CLOSED", assignee: U.consultant1,
    summary: "섬유 제조, 직원 28명", contact: ["이동아", "대표", "010-3333-0014"],
    topic: "정책자금", interest: ["정책자금"], concern: ["시기 부적절"], traits: "", reason: "", mustKnow: "", caution: "",
    report: { outcome: "DONE", reaction: "LOW", result: "HARD", next: "NONE", memo: "내년 상반기에 다시 검토 예정", topics: ["정책자금"] } },

  // CANCELLED
  { id: L(15), company: "(주)서울테크", region: "서울 구로구", industry: "IT·소프트웨어 · IT 서비스", at: wd(2, 13), method: "VISIT", status: "CANCELLED",
    summary: "IT 서비스, 직원 10명", contact: ["박서울", "대표", "010-3333-0015"], topic: "", interest: [], concern: [], traits: "", reason: "", mustKnow: "", caution: "",
    cancelReason: "업체 요청으로 미팅 취소" },

  // --- more samples (20 in total)
  { id: L(16), company: "(주)한결정밀", region: "경기 평택시", industry: "제조 · 금속·기계", at: wd(3, 15), method: "VISIT", status: "DRAFT",
    division: "2본부", createdBy: U.leader,
    summary: "제조 · 금속·기계, 정책자금·가업승계 관심", contact: ["한결", "대표", "010-3333-0016"],
    topic: "", interest: ["정책자금", "가업승계"], concern: [], traits: "", reason: "2본부 자체 발굴 DB. 부친 회사 승계 예정", mustKnow: "매출 45억", caution: "" },
  { id: L(17), company: "새봄식품(주)", region: "경기 용인시", industry: "제조 · 식품", at: wd(4, 10), method: "VISIT", status: "OPEN",
    division: "2본부", createdBy: U.leader,
    summary: "제조 · 식품, 고용지원금·사내근로복지기금 관심", contact: ["봄새", "전무이사", "010-3333-0017"],
    topic: "", interest: ["고용지원금", "사내근로복지기금"], concern: [], traits: "", reason: "2본부 공개 DB. 직원 복지 제도 문의", mustKnow: "직원 38명", caution: "" },
  { id: L(18), company: "(주)다온물류", region: "서울 송파구", industry: "서비스 · 물류·운송", at: wd(2, 14), method: "VISIT", status: "OPEN",
    summary: "서비스 · 물류·운송, 절세·법인·가지급금 관심", contact: ["김다온", "대표", "010-3333-0018"],
    topic: "", interest: ["절세·법인", "가지급금"], concern: [], traits: "숫자에 밝음", reason: "법인세 부담 상담 요청", mustKnow: "가지급금 약 2억", caution: "오후 미팅 선호" },
  { id: L(19), company: "(주)에이스전자", region: "경기 수원시", industry: "제조 · 전자·전기", at: wd(2, 11), method: "VISIT", status: "ASSIGNED", assignee: U.consultant2, round: 2,
    summary: "제조 · 전자·전기, 기업부설연구소·벤처인증 관심", contact: ["최에이스", "상무이사", "010-3333-0019"],
    topic: "", interest: ["기업부설연구소", "벤처인증"], concern: [], traits: "", reason: "연구소 설립 상담", mustKnow: "연구 인력 3명", caution: "",
    report: { outcome: "DONE", reaction: "HIGH", result: "REVISIT", next: "REVISIT", due: 2, memo: "1차: 연구소 요건 설명, 대표 긍정적. 2차 때 인력 서류 확인",
      topics: ["기업부설연구소", "벤처인증"], materials: ["4대보험 가입자 명부"], nextNote: "2차 미팅: 연구 인력 서류 확인" } },
  { id: L(20), company: "(주)대한테크", region: "서울 영등포구", industry: "IT·소프트웨어 · 플랫폼·앱", at: wd(-4, 14), method: "VISIT", status: "FOLLOW_UP", assignee: U.consultant6,
    division: "3본부", createdBy: U.leaderB,
    summary: "IT·소프트웨어 · 플랫폼·앱, M&A·절세·법인 관심", contact: ["정대한", "대표", "010-3333-0020"],
    topic: "", interest: ["M&A", "절세·법인"], concern: [], traits: "", reason: "3본부 자체 DB. 회사 매각 검토", mustKnow: "", caution: "",
    report: { outcome: "DONE", reaction: "MID", result: "REVIEW_THEN_CONTACT", next: "CALL", due: 1, memo: "M&A 시점 검토 중", topics: ["M&A", "절세·법인"], nextNote: "매각 희망가 자료 받기" } },
];

/** Wipes and recreates both demo organizations. Runs inside the caller's transaction. */
export async function seedDemo(tx: TransactionSql): Promise<{ users: number; leads: number }> {
  const all = leads();
  const users: SeedUser[] = Object.values(U);
  const orgs = [ORG_ID, ORG2_ID];
  await tx`delete from training_reads where organization_id in ${tx(orgs)}`;
  await tx`delete from training_file_chunks where organization_id in ${tx(orgs)}`;
  await tx`delete from training_files where organization_id in ${tx(orgs)}`;
  await tx`delete from trainings where organization_id in ${tx(orgs)}`;
  await tx`delete from activity_logs where organization_id in ${tx(orgs)}`;
  await tx`delete from follow_ups where organization_id in ${tx(orgs)}`;
  await tx`delete from meeting_reports where organization_id in ${tx(orgs)}`;
  await tx`delete from lead_assignments where organization_id in ${tx(orgs)}`;
  await tx`delete from lead_private_details where organization_id in ${tx(orgs)}`;
  await tx`delete from leads where organization_id in ${tx(orgs)}`;
  await tx`delete from profiles where organization_id in ${tx(orgs)}`;
  await tx`delete from divisions where organization_id in ${tx(orgs)}`;
  await tx`delete from organizations where id in ${tx(orgs)}`;
  await tx`delete from auth.users where id in ${tx(users.map((u) => u.id))}`;

  await tx`insert into organizations(id, name, invite_code) values (${ORG_ID}, '스마트 사업단', 'SMART2026'), (${ORG2_ID}, '다른 사업단', 'OTHER0001')`;
  for (const d of DIVISIONS) {
    await tx`insert into divisions(id, organization_id, name, sort, claims_org_leads) values (${d.id}, ${ORG_ID}, ${d.name}, ${d.sort}, ${d.claims})`;
  }
  for (const u of users) {
    await tx`insert into auth.users(id, email) values (${u.id}, ${u.email})`;
    await tx`insert into profiles(id, organization_id, role, full_name, phone, title, division, division_id)
      values (${u.id}, ${u.org ?? ORG_ID}, ${u.role}, ${u.name}, ${u.phone}, ${u.title ?? null}, ${u.division ?? null}, ${DIV(u.division)})`;
  }

  for (const l of all) {
    const assigned = l.assignee?.id ?? null;
    const published = l.status === "DRAFT" ? null : new Date(l.at.getTime() - 3 * 86400000);
    const createdAt = published ?? kst(0, 17);
    const assignedAt = assigned && published ? new Date(published.getTime() + 3600000) : null;
    const creator = l.createdBy ?? U.caller;
    const round = l.round ?? 1;
    await tx`insert into leads(id, organization_id, company_name, region, industry, meeting_at, meeting_method, public_summary, status, created_by, caller_id, assigned_to, assigned_at, published_at, closed_at, cancel_reason, created_at, division_id, meeting_round)
      values (${l.id}, ${ORG_ID}, ${l.company}, ${l.region}, ${l.industry}, ${l.at}, ${l.method}, ${l.summary}, ${l.status}, ${creator.id}, ${l.createdBy ? null : U.caller.id},
        ${assigned}, ${assignedAt}, ${published},
        ${["CLOSED", "CANCELLED"].includes(l.status) ? new Date() : null}, ${l.cancelReason ?? null}, ${createdAt}, ${DIV(l.division)}, ${round})`;
    // Same shape as the one-page form: one comment instead of separate memo boxes.
    const comment = [l.reason, l.mustKnow, l.traits, l.caution && `주의: ${l.caution}`].filter(Boolean).join("\n") || null;
    await tx`insert into lead_private_details(lead_id, organization_id, contact_name, contact_title, contact_phone, address, interest_tags, extra_note)
      values (${l.id}, ${ORG_ID}, ${l.contact[0]}, ${l.contact[1]}, ${l.contact[2]}, ${ADDRESS[Number(l.id.slice(-2))] ?? null}, ${l.interest}, ${comment})`;
    await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, to_status, created_at) values (${ORG_ID}, ${l.id}, ${creator.id}, 'CREATE', 'DRAFT', ${createdAt})`;
    if (published) {
      await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, created_at) values (${ORG_ID}, ${l.id}, ${l.createdBy ? creator.id : U.owner.id}, 'PUBLISH', 'DRAFT', 'OPEN', ${published})`;
    }
    if (assigned && assignedAt) {
      await tx`insert into lead_assignments(organization_id, lead_id, consultant_id, assigned_by, method, created_at) values (${ORG_ID}, ${l.id}, ${assigned}, ${assigned}, 'CLAIM', ${assignedAt})`;
      await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, detail, created_at) values (${ORG_ID}, ${l.id}, ${assigned}, 'CLAIM', 'OPEN', 'ASSIGNED', ${tx.json({ consultant_id: assigned })}, ${assignedAt})`;
    }
    if (l.report && assigned) {
      const r = l.report;
      const nextRound = l.status === "ASSIGNED" && round > 1;
      // A 2차 lead's report belongs to the 1st meeting, a week earlier.
      const reportedAt = nextRound ? new Date(l.at.getTime() - 7 * 86400000 + 2 * 3600000) : new Date(l.at.getTime() + 2 * 3600000);
      const due = r.due === undefined ? null : kstDay(r.due);
      const [{ id: reportId }] = await tx<{ id: string }[]>`insert into meeting_reports(organization_id, lead_id, reporter_id, outcome, reaction, result, next_action, next_action_date, memo, topics, materials, next_note, created_at, round)
        values (${ORG_ID}, ${l.id}, ${assigned}, ${r.outcome}, ${r.reaction}, ${r.result}, ${r.next}, ${due}, ${r.memo}, ${r.topics ?? []}, ${r.materials ?? []}, ${r.nextNote ?? null}, ${reportedAt}, ${nextRound ? round - 1 : round}) returning id`;
      let followId: string | null = null;
      if (r.next !== "NONE" && l.status === "FOLLOW_UP") {
        const [{ id }] = await tx<{ id: string }[]>`insert into follow_ups(organization_id, lead_id, assignee_id, action, due_date, memo, created_by, created_at)
          values (${ORG_ID}, ${l.id}, ${assigned}, ${r.next}, ${due}, ${r.nextNote ?? r.memo}, ${assigned}, ${reportedAt}) returning id`;
        followId = id;
      }
      await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, detail, created_at)
        values (${ORG_ID}, ${l.id}, ${assigned}, 'REPORT', 'ASSIGNED', ${l.status}, ${tx.json({ report_id: reportId, outcome: r.outcome, reaction: r.reaction, result: r.result, next_action: r.next, follow_up_id: followId })}, ${reportedAt})`;
    }
    if (l.status === "CANCELLED") {
      await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, detail) values (${ORG_ID}, ${l.id}, ${U.owner.id}, 'CANCEL_LEAD', 'OPEN', 'CANCELLED', ${tx.json({ reason: l.cancelReason ?? null })})`;
    }
  }

  // Second org: one lead, to prove isolation.
  await tx`insert into leads(id, organization_id, company_name, region, industry, meeting_at, meeting_method, public_summary, status, created_by, published_at)
    values ('40000000-0000-4000-8000-000000000001', ${ORG2_ID}, '타조직상사(주)', '광주 북구', '유통', ${kst(2, 10)}, 'VISIT', '다른 조직의 DB', 'OPEN', ${U.otherOwner.id}, now())`;
  await tx`insert into lead_private_details(lead_id, organization_id, contact_name, contact_phone) values ('40000000-0000-4000-8000-000000000001', ${ORG2_ID}, '비밀담당자', '010-9999-9999')`;

  await seedTrainings(tx);

  return { users: users.length, leads: all.length };
}

// ------------------------------------------------------------ 교육 자료실
// Sample sessions: 월요일 = 단장, 수요일 = 본부장. Summaries are written in the
// same shape the AI produces so the demo shows the finished experience.
interface TrainingSeed {
  id: string; title: string; day: number; hour: number; instructor: SeedUser; content: string | null;
  /** 교육 안내 (공지) shown before the session. `at` pins an exact date. */
  notice?: string; at?: Date;
  summary: null | { one_line: string; key_points: string[]; action_items: string[]; talk_tracks: string[]; keywords: string[] };
  file?: { name: string; text: string }; readers: SeedUser[];
}

const T = (n: number) => `50000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

function trainings(): TrainingSeed[] {
  const local = new Date(Date.now() + KST * 60000);
  const monday = -((local.getUTCDay() + 6) % 7); // offset (days) to this week's Monday
  return [
    { id: T(1), title: "4분기 정책자금 상담 전략 — 한도보다 '준비 순서'", day: monday - 7, hour: 10, instructor: U.owner,
      content: `오늘은 4분기 정책자금 상담을 어떻게 끌고 갈지 이야기하겠습니다. 대표님들은 항상 "얼마까지 나와요?"부터 물어보십니다. 그런데 한도는 우리가 약속할 수 있는 숫자가 아닙니다. 한도를 먼저 말하면 나중에 신뢰를 잃습니다.
그래서 첫 미팅에서는 한도 대신 준비 순서를 보여드려야 합니다. 재무제표 3년치, 부가세 과세표준증명, 4대보험 가입자 명부, 기존 대출 현황. 이 네 가지만 받으면 우리가 가능성을 판단할 수 있다고 말씀드리세요.
기존 대출이 많은 기업은 무조건 안 된다고 단정하지 마세요. 자금 용도가 명확하고 매출이 늘고 있으면 이야기가 달라집니다. 반드시 용도와 시기를 먼저 확인해야 합니다.
연말에는 기관 예산이 소진되는 경우가 있어서 11월 이전에 접수 준비를 끝내는 것이 좋습니다. 이번 주에 만나는 대표님들께는 서류 목록을 꼭 문자로 남겨 주세요.
마지막으로, 정책자금만 이야기하지 말고 고용지원금이나 연구소처럼 같이 챙길 수 있는 것을 한 가지는 함께 말씀드리세요. 그래야 다음 미팅이 생깁니다.`,
      summary: {
        one_line: "첫 미팅에서 한도를 약속하지 말고, 서류 4가지와 준비 순서를 보여줘서 신뢰를 먼저 얻는다.",
        key_points: [
          "한도는 약속할 수 없는 숫자 — 먼저 말하면 나중에 신뢰를 잃는다",
          "첫 미팅 목표는 '서류 4가지' 받기: 재무제표 3년치 · 부가세 과세표준증명 · 4대보험 가입자 명부 · 기존 대출 현황",
          "기존 대출이 많아도 단정 금지 — 자금 용도와 매출 추세를 먼저 확인",
          "연말 예산 소진 가능성 → 11월 이전 접수 준비 완료가 목표",
          "정책자금 + 한 가지(고용지원금·연구소 등)를 함께 제안해야 다음 미팅이 생긴다",
        ],
        action_items: [
          "이번 주 미팅 대표님께 필요 서류 목록을 문자로 남기기",
          "결과 입력 때 '받을 자료'를 빠짐없이 체크하기",
          "기존 대출 현황은 금액·기관·만기까지 메모하기",
        ],
        talk_tracks: [
          "\"한도는 서류를 보고 나서 정확히 말씀드리는 게 대표님께 손해가 없습니다. 이 네 가지만 먼저 보내 주세요.\"",
          "\"자금을 어디에, 언제 쓰실 계획인지가 제일 중요합니다. 그게 정리되면 방법이 보입니다.\"",
        ],
        keywords: ["정책자금", "서류 4종", "자금 용도", "연말 예산", "교차 제안"],
      },
      file: { name: "정책자금_첫미팅_체크리스트.txt", text: "[정책자금 첫 미팅 체크리스트]\n\n□ 재무제표 3년치\n□ 부가세 과세표준증명\n□ 4대보험 가입자 명부\n□ 기존 대출 현황 (기관 · 금액 · 만기)\n□ 자금 용도와 사용 시기\n□ 함께 제안할 제도 1가지 (고용지원금 / 연구소 / 인증)\n\n※ 한도는 서류 확인 후 안내합니다.\n" },
      readers: [U.consultant2, U.leader] },

    { id: T(2), title: "고용지원금 첫 상담: 4대보험 명부로 5분 진단", day: monday - 5, hour: 10, instructor: U.leader,
      content: `고용지원금은 대표님이 제도 이름을 몰라도 됩니다. 4대보험 가입자 명부 한 장이면 우리가 5분 안에 가능성을 볼 수 있습니다.
명부에서 볼 것은 세 가지입니다. 최근 입사자, 나이, 고용 형태. 청년이나 신규 채용이 있으면 먼저 체크하세요.
주의할 점은 퇴사자입니다. 최근에 권고사직 같은 인원 감축이 있으면 지원이 제한될 수 있으니 반드시 확인해야 합니다.
대표님께는 "받을 수 있는 돈을 놓치고 계신지 확인해 드리는 것"이라고 설명하세요. 비용 이야기는 진단 후에 하는 게 좋습니다.
채용 계획이 있는 회사라면 채용 전에 먼저 상담해야 합니다. 채용 후에 알면 놓치는 경우가 많습니다.`,
      summary: {
        one_line: "4대보험 명부 한 장으로 입사자·나이·고용형태를 보고 5분 안에 가능성을 진단한다.",
        key_points: [
          "명부에서 볼 3가지: 최근 입사자 · 나이 · 고용 형태",
          "최근 인원 감축(권고사직 등)이 있으면 제한될 수 있으니 반드시 확인",
          "채용 계획이 있으면 '채용 전' 상담이 핵심 — 채용 후엔 놓치기 쉽다",
          "비용 이야기는 진단 결과를 보여준 다음에",
        ],
        action_items: [
          "미팅 전 대표님께 4대보험 가입자 명부 요청 문자 보내기",
          "명부 받으면 청년·신규 입사자에 표시하기",
          "퇴사자·인원 감축 여부 질문 꼭 하기",
        ],
        talk_tracks: [
          "\"받으실 수 있는 지원금을 놓치고 계신지 확인해 드리는 겁니다. 명부 한 장이면 5분이면 됩니다.\"",
          "\"하반기 채용 계획이 있으시면, 뽑기 전에 한 번 저희랑 보시는 게 유리합니다.\"",
        ],
        keywords: ["고용지원금", "4대보험 명부", "청년 채용", "인원 감축", "채용 전 상담"],
      },
      readers: [U.consultant1, U.consultant2, U.consultant3, U.leaderB] },

    { id: T(3), title: "기업부설연구소, 설립보다 사후관리가 계약을 만든다", day: monday - 14, hour: 10, instructor: U.owner,
      content: `연구소 설립은 이제 많은 곳에서 합니다. 우리가 달라야 하는 부분은 설립 이후입니다.
설립 후에 대표님들이 제일 어려워하는 건 연구노트, 인력 변동 신고, 그리고 세액공제 증빙입니다. 연구원이 퇴사했는데 신고를 안 해서 문제가 되는 경우가 실제로 많습니다.
그래서 설립 상담을 할 때부터 사후관리까지 같이 설명하세요. "설립해 드리고 끝"이 아니라 "매달 챙겨드린다"는 그림을 보여줘야 합니다.
연구전담요원 요건은 기업 규모에 따라 다르니 미팅 전에 직원 수와 매출을 먼저 확인하세요.
사후관리 고객은 매달 연락할 이유가 생기기 때문에 다른 상품 제안으로 이어지기 쉽습니다.`,
      summary: {
        one_line: "설립만 해주는 곳과 차별화하려면 연구노트·인력 신고·증빙까지 '사후관리'를 처음부터 제안한다.",
        key_points: [
          "설립 후 대표님들이 가장 어려워하는 것: 연구노트 · 인력 변동 신고 · 세액공제 증빙",
          "연구원 퇴사 후 신고 누락으로 문제 되는 사례가 많다",
          "연구전담요원 요건은 기업 규모별로 다름 → 직원 수·매출 먼저 확인",
          "사후관리 고객은 매달 연락할 이유가 생겨 추가 제안으로 이어진다",
        ],
        action_items: [
          "설립 상담 자료에 '사후관리 1년 계획' 한 장 추가하기",
          "기존 연구소 보유 고객에게 인력 변동 여부 확인 전화하기",
        ],
        talk_tracks: [
          "\"설립은 시작이고, 연구노트랑 인력 신고를 놓치시면 그동안 받은 혜택이 문제가 될 수 있습니다. 그걸 저희가 매달 챙겨드립니다.\"",
        ],
        keywords: ["기업부설연구소", "사후관리", "연구노트", "변경 신고", "세액공제"],
      },
      file: { name: "연구소_사후관리_월간점검표.txt", text: "[연구소 사후관리 월간 점검표]\n\n□ 이번 달 연구노트 작성 여부\n□ 연구원 입사 · 퇴사 변동 (있으면 변경 신고)\n□ 연구 과제 진행 상황 메모\n□ 세액공제용 인건비 · 재료비 증빙 보관\n□ 다음 달 일정 공유\n" },
      readers: [U.consultant1, U.consultant2, U.consultant3, U.consultant4, U.leader, U.leaderB, U.consultant6] },

    { id: T(4), title: "첫 방문 10분 화법: 대표님이 말하게 만드는 질문 7가지", day: monday - 12, hour: 10, instructor: U.leaderB,
      content: `첫 방문에서 우리가 말을 많이 하면 실패합니다. 대표님이 말하게 해야 합니다.
처음 10분은 질문만 하세요. 회사를 어떻게 시작하셨는지, 요즘 제일 신경 쓰이는 게 뭔지, 올해 계획이 뭔지.
대표님이 고민을 말하면 바로 해결책을 말하지 말고 한 번 더 물어보세요. "그게 왜 제일 걱정되세요?"
메모는 꼭 하세요. 대표님은 메모하는 사람을 신뢰합니다. 그리고 미팅이 끝나면 바로 결과를 입력하세요. 기억은 한 시간이면 흐려집니다.
마지막에는 다음 약속을 날짜로 잡고 나오세요. "다음에 연락드릴게요"는 약속이 아닙니다.`,
      summary: {
        one_line: "처음 10분은 질문만 하고, 끝날 때 다음 약속을 '날짜'로 잡고 나온다.",
        key_points: [
          "첫 10분은 질문만 — 우리가 말을 많이 하면 실패",
          "고민을 들으면 바로 답하지 말고 '왜'를 한 번 더 묻기",
          "메모하는 모습이 신뢰를 만든다",
          "미팅 직후 바로 결과 입력 — 기억은 한 시간이면 흐려진다",
          "'다음에 연락드릴게요'는 약속이 아니다 — 날짜로 잡기",
        ],
        action_items: [
          "질문 7가지를 휴대폰 메모에 저장해 두기",
          "미팅 끝나고 차에 타기 전에 결과 입력하기",
          "다음 약속 날짜를 후속조치에 등록하기",
        ],
        talk_tracks: [
          "\"요즘 회사 운영하시면서 제일 신경 쓰이시는 게 뭐세요?\"",
          "\"그게 왜 제일 걱정되세요?\"",
          "\"그럼 다음 주 목요일 오전에 자료 들고 다시 찾아뵐까요?\"",
        ],
        keywords: ["첫 방문", "질문 화법", "경청", "결과 입력", "다음 약속"],
      },
      readers: [U.consultant1, U.consultant3, U.leader] },

    { id: T(5), title: "벤처·이노비즈 인증을 정책자금과 묶어서 제안하기", day: monday - 21, hour: 10, instructor: U.owner,
      content: `인증 하나만 따로 팔면 대표님은 비용으로 생각합니다. 인증이 정책자금이나 세제 혜택과 어떻게 연결되는지를 보여줘야 투자로 생각합니다.
인증 상담 전에 특허, 연구개발 투자, 매출 추세를 확인하세요. 준비 기간이 필요하기 때문에 일정표를 같이 드리는 게 좋습니다.
인증이 만료되는 고객도 기회입니다. 만료일을 기록해 두고 미리 연락하세요.`,
      summary: {
        one_line: "인증은 단독 상품이 아니라 정책자금·세제 혜택으로 가는 '연결 고리'로 제안한다.",
        key_points: [
          "인증만 따로 제안하면 '비용', 연결해서 보여주면 '투자'",
          "상담 전 확인: 특허 · 연구개발 투자 · 매출 추세",
          "준비 기간이 필요하니 일정표를 함께 전달",
          "인증 만료 예정 고객은 미리 연락할 기회",
        ],
        action_items: [
          "담당 고객의 인증 만료일 정리하기",
          "인증 → 정책자금 연결 흐름을 한 장으로 설명할 수 있게 연습하기",
        ],
        talk_tracks: [
          "\"인증 자체보다, 인증을 받으면 자금 쪽에서 어떤 점이 유리해지는지가 중요합니다.\"",
        ],
        keywords: ["벤처기업확인", "이노비즈", "인증 만료", "교차 제안"],
      },
      readers: [U.consultant1, U.consultant2, U.consultant3, U.consultant4, U.consultant5, U.leader, U.leaderB] },

    { id: T(6), title: "절세·법인 상담 입문: 가지급금 대화 시작하기", day: monday + 2, hour: 19, instructor: U.leader,
      notice: "2본부 서인수 본부장이 진행합니다. 가지급금이 있는 법인 대표님과 첫 5분에 무슨 말을 해야 하는지, 실제 상담 사례로 연습합니다.",
      content: null, summary: null, readers: [] },
    // 오늘 저녁 단장 교육 (실제 공지 문구)
    { id: T(7), title: "개인투자조합으로 벤처인증까지 — 법인영업 실전 교육", day: 0, hour: 19, at: new Date("2026-09-28T19:00:00+09:00"), instructor: U.owner,
      notice: [
        "오늘 저녁 7시, 법인영업의 판을 바꿀 실전 교육이 시작됩니다!",
        "개인투자조합 하나로 벤처인증까지 연결하는 구조를 처음부터 끝까지 파헤칩니다.",
        "창업기업 대표에게 꼭 필요한 사람이 되는 접근법과 제안 포인트를 공개합니다.",
        "상담에서 끝나지 않고 실제 계약으로 이어지는 연결고리까지 단계별로 짚어드립니다.",
        "오늘은 평소보다 훨씬 디테일하게 진행합니다. 놓치면 후회할 시간, 꼭 함께하세요!",
      ].join("\n\n"),
      content: null, summary: null, readers: [] },
    { id: T(8), title: "월요일 정기 교육 (주제 추후 공지)", day: monday + 7, hour: 19, instructor: U.owner, content: null, summary: null, readers: [] },
    { id: T(9), title: "3본부 상담 사례 공유", day: monday + 9, hour: 19, instructor: U.leaderB,
      notice: "3본부 정행래 본부장 진행. 이번 달 계약으로 이어진 상담 3건을 처음부터 끝까지 풀어 봅니다.", content: null, summary: null, readers: [] },
  ];
}

async function seedTrainings(tx: TransactionSql) {
  for (const t of trainings()) {
    const heldAt = t.at ?? kst(t.day, t.hour);
    await tx`insert into trainings(id, organization_id, title, held_at, instructor_id, content, notice, summary, summary_source, summarized_at, created_by, created_at)
      values (${t.id}, ${ORG_ID}, ${t.title}, ${heldAt}, ${t.instructor.id}, ${t.content}, ${t.notice ?? null}, ${t.summary ? tx.json(t.summary) : null},
        ${t.summary ? "AI" : null}, ${t.summary ? new Date(heldAt.getTime() + 3 * 3600000) : null}, ${t.instructor.id}, ${new Date(heldAt.getTime() - 86400000)})`;
    if (t.file) {
      const data = Buffer.from(t.file.text, "utf8");
      const [{ id }] = await tx<{ id: string }[]>`insert into training_files(organization_id, training_id, name, mime, size, chunk_count, complete, created_by)
        values (${ORG_ID}, ${t.id}, ${t.file.name}, 'text/plain', ${data.length}, 1, true, ${t.instructor.id}) returning id`;
      await tx`insert into training_file_chunks(file_id, organization_id, idx, data) values (${id}, ${ORG_ID}, 0, ${data})`;
    }
    for (const r of t.readers) {
      await tx`insert into training_reads(training_id, profile_id, organization_id, read_at) values (${t.id}, ${r.id}, ${ORG_ID}, ${new Date(heldAt.getTime() + 5 * 3600000)})`;
    }
  }
}

/** 샘플 DB 모두 지우기: people and trainings stay, every DB and its history goes. */
export async function clearDemoLeads(tx: TransactionSql): Promise<void> {
  await tx`delete from activity_logs where organization_id = ${ORG_ID} and lead_id is not null`;
  await tx`delete from follow_ups where organization_id = ${ORG_ID}`;
  await tx`delete from meeting_reports where organization_id = ${ORG_ID}`;
  await tx`delete from lead_assignments where organization_id = ${ORG_ID}`;
  await tx`delete from lead_private_details where organization_id = ${ORG_ID}`;
  await tx`delete from leads where organization_id = ${ORG_ID}`;
}
