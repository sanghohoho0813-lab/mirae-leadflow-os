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

/** 송하균 단장 2026-09-28 교육 원문 (강의 노트 그대로). */
const LECTURE_0928 = "1. 벤처기업 인증 및 투자 전략\n\n1-1. 벤처기업 인증의 중요성\n- 소득이 많은 사람들이 소득공제 혜택을 받으려면 벤처기업 인증이 필요함\n- (중요) 벤처기업 인증은 소득공제를 받는 것과 다른 개념이며, 적절한 절차를 통해 받아야 함\n- 소득공제는 직접 유상증자에 참여하더라도 가능하지만, 벤처기업 인증은 투자받는 것과 다름\n- 벤처기업 인증은 개인투자조합을 통하지 않아도 소득공제를 받을 수 있음\n\n1-2. 벤처기업 인증의 요건과 방법\n- 벤처기업 인증의 요건은 투자금 합계 5천만 원 이상, 자본금 5% 이상임\n- (중요) 소득공제를 받는 것과는 별개로, 벤처기업 인증은 적격투자기관에서 받아야 함\n- 적격투자기관에는 벤처투자조합, 벤처기업 인증 받을 수 있음\n- 개인투자조합이 적격투자기관에 해당하지 않는 경우, 적절한 절차를 거쳐야 함\n\n1-3. 투자로 인정되는 방식과 특징\n- 신규 발행 주식의 인수나 전환사채 인수가 투자로 인정될 수 있음\n- 전환사채 계약서 변경에 따른 이자 처리 방식은 세금 신고에 영향을 미침\n- 신규 발행 주식 인수는 가능하지만, 기존 주식을 사는 것은 투자로 보지 않음\n- 투자로 인정되는 방식에 따라, 전환사채 인수는 전환사채를 발행하는 개인투자조합을 통해 이루어짐\n\n2. 개인투자조합과 법인세\n\n2-1. 개인투자조합과 법인세의 이해\n- 개인투자조합이 법인에 투자하면, 조기상환 시 이자와 15.4% 공제해 지급명세서 제출해야 함\n- 법인은 다음 연도 2월 말까지 지급명세서 발행해야 함\n- 지급명세서 제출 대상은 개인투자조합, 직접 제출하거나 스마트 개인투자조합을 통한 제출 가능\n- 개인투자조합은 이자 발생 시 지분율대로 배분하고, 이자나 배당이 2천만 원을 초과하면 안 됨\n- (중요) 개인투자조합은 세금을 내지 않고, 보관만 하는 역할만 함\n\n2-2. 조기상환과 명세서 제출\n- 조기상환 시 개인투자조합은 지급명세서를 작성하여 종합소득세 계산에 반영해야 함\n- 15.4% 공제된 이자나 배당을 2천만 원을 초과하면 안 됨\n- 명세서를 지급할 때, 개인투자조합은 이자와 배당을 고려하여 지급 여부를 결정함\n- 명세서는 이자와 배당을 지분율대로 나누어 제출함\n- 명세서 제출 시, 법인과 은행이 원천징수를 해야 함\n\n2-3. 개인투자조합의 대표성 문제\n- 최근에는 법인 단위로 개인투자조합을 대표하는 개인투자조합을 운영하는 추세임\n- 대표성 있는 법인만을 대상으로 운영하며, 다른 법인끼리 섞인 경우 약정서를 작성하여 책임질 수 있도록 함\n- 법인과 개인투자조합의 이해관계를 명확히 하고, 법적인 문제를 방지하기 위함\n- 명세서 제출 시, 3명 이상의 법인이 대표인 경우, 동의 규정이 필요함\n\n3. 소득공제 방법\n\n3-1. 벤처기업 소득공제 방법\n- 법 개정 시 다른 방안 만들어야 됨\n- 개인투자조합에서 벤처기업 투자하면 소득공제됨\n- 네이버에서 개인투자조합 모집하여 투자하면 소득공제됨\n- 피플라이프에서 가족과 특수관계인 대상 3년간 운용하여 300만 원 받음\n- 개인투자조합에서 법인에 투자하면 벤처기업 인증받음\n\n3-2. 개인투자조합 투자 절차\n- 벤처기업 인증받으려면 5천만 원 이상 투자해야 하고, 투자금이 자본금의 10% 이상이 돼야 함\n- 조합 결산 후 벤처기업 인증 완료까지 3개월 걸림\n- 올해 안에 소득공제를 받고자 하는 사람은 안 됨\n- 벤처기업 인증 받고자 하는 사람은 괜찮음\n- 내년에 소득공제 받고자 하는 분도 상관없음\n\n3-3. 증자와 전환사채\n- 유한회사에서 출자인수 가능함\n- (중요) 주식 수 아니라 출자금액이 중요함\n- 시가보다 액면가로 증자할 경우, 주주간 증여이익 발생 가능\n- 증자로 인한 소득공제를 위해서는 정당한 사유가 있어야 함\n- 주식이 아닌 전환사채로도 증자와 투자할 수 있음\n\n4. 벤처기업 인증과 혜택 분석\n\n4-1. 벤처기업 인증의 종류와 특징\n- RCPS(상환, 전환, 우선주)가 포함된 인증이 주로 사용됨\n- (중요) 회수 문제를 줄이기 위해 상환 전환 인증을 우선적으로 고려하는 경향이 있음\n- 고객이 이해하기 쉽도록 단순화된 설명으로 계약서를 작성하는 것이 중요함\n- 복잡한 설명은 고객의 이해를 저해하고, 이로 인해 발생하는 문제를 줄일 수 있음\n\n4-2. 벤처기업 인증의 혜택\n- 벤처기업 인증은 법인세나 소득세 감면, 취득세 절약 등 다양한 혜택이 있음\n- (중요) 법인세 감면 신청은 국세청에서 직접 이루어지며, 반드시 신청해야 함\n- 벤처기업 인증은 5년간 혜택을 받을 수 있으며, 5년 차부터 5년간 혜택을 받을 수 있음\n- 재산세, 취득세, 고용지원금 등도 혜택에 포함되며, 세부 사항은 업종에 따라 달라짐\n\n4-3. 벤처기업 인증의 실제 사례와 전망\n- 노블리치 사업단의 김수정 전무는 인증으로만 연간 5~6천만 원의 수익을 창출함\n- 벤처기업 인증이 기업의 성장에 중요한 역할을 하는 것으로 확인됨\n- 중과세 배제 조항이 사라지면서 중과세 문제가 증가함\n- (중요) 벤처기업 인증을 받은 기업은 전담 연구 요원 2명 이상이 있어야 하며, 이는 벤처기업 인증의 장점 중 하나임\n- 기업 부설 연구소 설립에 대해, 벤처기업 인증을 받은 기업은 2명 이상이면 되며, 이는 부설 연구소 설립의 장점임\n\n5. 창업기업의 세무 혜택과 법인설립\n\n5-1. 창업기업의 세무 혜택\n- 취득세를 낼 때 감면 신청서를 제출하면 감면받을 수 있음\n- 중과세 기준에 따라 일정 비율의 감면이 이루어짐\n- 지방세 담당자들이 잘못 부과하는 경우도 많음\n- (중요) 이노비즈 인증을 받으면 혜택이 크게 늘어나므로 중요한 정보임\n- 지방세를 줄이기 위해 10명이 넘는 근로자를 고용해야 함\n\n5-2. 창업기업의 법인설립과 세금감면\n- 신설 법인 설립 시 법인세 50%가 감면되지만, 창업기업 인증이 필요함\n- 창업기업 인증을 받으면 법인세 감면이 이루어지지 않음\n- 감면을 받으려면 사업장, 대표이사, 직원이 있는 경우에 한함\n- (중요) 임차한 경우 감면이 안 되며, 거래처를 부모 법인의 매출로 사용하는 것도 안됨\n- 체계적인 사업 계획과 창업기업 인증이 중요함\n\n5-3. 법인설립 시 주의사항\n- 법인설립 시 임대차 계약서와 직원 수 증가, 새로운 사업장 등 명확한 계획 필요\n- 아버지 법인에서 임차하거나, 외부 임차를 통한 본점 주소지 설정이 필요함\n- (중요) 감면을 받기 위해선 컨설턴트의 도움이 필요하며, 명확한 계획과 증거가 필요함\n- 고객들은 이러한 절차를 제대로 이해하고 계획을 세워야 함\n- 명확한 계획과 증거 없이 법인설립 시 감면을 받기 어려움\n\n6. 법인영업비법\n\n6-1. 세액감면 및 소득공제 이해\n- 법인영업에 세액감면 18가지 업종이 있음\n- 소득공제는 3천만 원 이하까지 100%, 3천만 원 초과 시 70% 구간별로 달라짐\n- 법인에서 자녀가 최대주주로 하는 경우, 개인투자조합을 통해 벤처인증을 받고 소득공제를 받는 것이 유리함\n- (중요) 영업 시 고객의 머릿속에 항상 그 사람이 앉아있어야 함\n- 고객의 거절은 거절이 아님, 제대로 설명을 못한 것임\n\n6-2. 고객의 심리 이해\n- 고객은 이해를 못 해서 나중에 괜히 향수세 더 날리는 거 아니냐고 함\n- 반복해서 설명을 해야 함, 한 번에 이해시키려 하지 말고\n- 고객의 거절은 고객의 생각 때문임\n- 새로운 정보를 꾸준히 전달하고, 근처에 갔을 때마다 새로운 기회를 볼 수 있음\n- 타이밍이 맞아서 그런 경우들이 많음\n\n6-3. 영업을 잘하려면\n- 영업을 잘하려면 고객의 심리를 잘 알아야 함\n- 다른 사람과 똑같이 행동하면서 꿈꾸는 것은 미친 짓임\n- 행동으로 움직여야 함, 연락을 취했을 때 감사해야 함\n- 고객의 거절은 고객의 생각 때문임\n- 계속 관리하는 사람이 필요함\n\n7. 가족법인\n\n7-1. 가족법인 투자 방법\n- 가족법인에 투자 자금 필요 시 개인투자조합 통해 투자하고 소득공제 받을 수 있음\n- 최대 1억, 10억까지 가능하며 투자 조합이 아직 결정 안 된 경우도 있음\n- 개인투자조합을 통해 투자 금액에 대한 소득공제와 세금 혜택을 받을 수 있음\n- 가족법인에 투자 시, 개인투자조합의 활용도가 다양함\n- 투자 금액과 소득공제를 고려하여 최선의 투자 방법을 찾아야 함\n\n7-2. 개인투자조합 절차\n- 개인투자자 통해 벤처기업 인증 받고 싶다면 조합결성계획 신청이 필요함\n- 승인받기까지 3주가 걸리며, 그에 맞춰 신청서 작성과 조합 계좌 개설, 등록 심사까지 진행해야 함\n- 개인투자조합은 VICS 시스템에서 신청하며, 승인 후 개인투자조합 등기까지 약 3개월이 걸림\n- 법인 전환, 투자형 벤처기업 인증, 이익 소각, 자기 주식 취득 등 다양한 테마별 개인투자조합의 절차를 마련할 예정임\n- 개인투자조합의 절차를 디테일하게 접근하여 누구나 이해하기 쉽게 만들 계획임\n\n7-3. 향후 계획\n- 개인투자조합 절차 개선을 위한 테마별 개인투자조합 설계가 필요함\n- 법인 전환, 투자형 벤처기업 인증, 액면소각, 이익 소각, 자기 주식 취득 등 다양한 테마를 고려함\n- 고용지원금도 개인투자조합의 다양한 활용도를 고려하여 개발할 예정임\n- (중요) 개인투자조합 절차 개선을 통해 사업장에서 개인투자조합을 쉽게 구성할 수 있도록 함\n- 법인 전환, 투자형 벤처기업 인증, 액면소각, 이익 소각, 자기 주식 취득 등 다양한 테마를 모아 실용적인 자료를 제공할 계획임";

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
      // 2026-09-28 강의 원문(노트 그대로)과 핵심 정리. 노트에 서로 다른 숫자가 섞인 곳은 '확인'으로 표시.
      content: LECTURE_0928, summary: {
        "one_line": "벤처인증과 투자자 소득공제는 요건·절차가 다른 별개의 일 — 개인투자조합으로 둘을 함께 설계하되, 대표님께는 이 차이부터 쉽게 풀어 준다.",
        "key_points": [
                "벤처인증 ≠ 소득공제: 소득공제는 직접 유상증자 참여로도 가능하지만, 투자형 벤처인증은 적격투자기관(벤처투자조합·개인투자조합 등)의 투자가 있어야 한다",
                "투자형 벤처 요건: 투자금 합계 5천만 원 이상 + 자본금 대비 일정 비율 (강의 노트에 5%·10%가 함께 적혀 있음 → 고객 안내 전 최신 기준 확인)",
                "투자로 인정: 신규 발행 주식 인수·전환사채(CB)·RCPS 인수. 기존 주식(구주) 매입은 투자로 보지 않는다. 유한회사는 주식 수가 아니라 출자금액이 기준",
                "개인투자조합은 세금을 내지 않는 '통로': 이자·배당은 지분율대로 배분하고, 투자받은 법인은 15.4% 원천징수 후 다음 해 2월 말까지 지급명세서를 낸다",
                "일정: 조합결성계획 승인 약 3주(VICS 신청) → 등록·결산 → 벤처인증까지 약 3개월. 올해 소득공제는 어렵고, 벤처인증·내년 소득공제 목적은 가능",
                "소득공제율은 투자 금액 구간별로 달라진다(3천만 원까지 100%, 그 위는 낮아짐) — 구간과 한도는 최신 조세특례제한법으로 확인",
                "벤처인증 혜택: 법인세·소득세 감면, 취득세·재산세 등. 법인세 감면은 직접 신청해야 적용된다. 연구소 설립 시 연구전담요원 요건이 2명으로 완화",
                "창업 감면은 실체가 핵심: 사업장·대표이사·직원이 있어야 하고, 부모 법인 사업장·매출을 끌어다 쓰는 구조는 인정받기 어렵다. 임대차 계약서·채용 계획 등 증빙 준비",
                "영업: 거절은 설명이 부족했다는 신호. 한 번에 이해시키려 하지 말고 새 정보로 꾸준히 다시 찾아가는 사람이 계약을 가져간다"
        ],
        "action_items": [
                "벤처인증과 소득공제를 헷갈리는 대표님께 '두 가지는 따로 움직인다'부터 설명하기",
                "투자형 벤처 요건(투자금·자본금 비율)과 소득공제 구간을 최신 기준으로 확인해 한 장짜리 체크리스트로 만들기",
                "올해 소득공제를 원하는 고객에게는 일정(약 3개월)상 어렵다는 점을 먼저 알리고, 내년 공제·벤처인증으로 방향 잡기",
                "창업 감면 상담 때는 사업장·대표·직원 실체와 임대차 계약서부터 확인하기",
                "자녀가 최대주주인 가족법인 고객을 따로 추려 개인투자조합 활용안을 제안하기",
                "거절했던 고객 목록을 만들어 새 정보(법 개정·사례)를 들고 다시 연락하기"
        ],
        "talk_tracks": [
                "대표님, 벤처인증과 소득공제는 따로 움직입니다. 둘 중 무엇이 먼저 필요하신지부터 정하면 방법이 나옵니다.",
                "올해 공제는 일정상 빠듯합니다. 대신 지금 시작하면 벤처인증과 내년 공제는 충분히 맞출 수 있습니다.",
                "감면은 신청해야 받는 혜택입니다. 그동안 놓친 부분이 없는지 한 번 같이 보시죠."
        ],
        "keywords": [
                "벤처인증",
                "개인투자조합",
                "소득공제",
                "전환사채",
                "지급명세서",
                "창업 감면",
                "가족법인"
        ]
},
      file: { name: "0928_법인영업_실전교육_체크리스트.txt", text: "[0928 법인영업 실전 교육 — 확인 체크리스트]\n\n□ 고객이 원하는 것: 벤처인증 / 소득공제 / 둘 다\n□ 투자 방식: 신주 · 전환사채 · RCPS (구주 매입은 투자 아님)\n□ 투자형 벤처 요건: 투자금 5천만 원 이상 + 자본금 대비 비율 (최신 기준 확인)\n□ 일정: 조합결성계획 승인 약 3주 → 벤처인증까지 약 3개월\n□ 원천징수 15.4% · 지급명세서 다음 해 2월 말\n□ 창업 감면: 사업장 · 대표이사 · 직원 실체, 임대차 계약서\n□ 벤처인증 후 법인세 감면은 직접 신청\n" },
      readers: [U.secretary, U.leader, U.leaderB, U.consultant1] },
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

// ------------------------------------------------------------ 샘플 DB 추가 (5·10·20건)
// Random but plausible DBs on top of whatever is there: mostly 사업단 공통 신청 가능,
// some 본부 전용 (2본부·3본부 본부장이 등록), some 공개 대기. Meetings on weekdays, 9–17시.
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const pickSome = <T,>(a: readonly T[], min: number, max: number): T[] => {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  return [...a].sort(() => Math.random() - 0.5).slice(0, n);
};

const NAME_HEAD = ["한빛", "대성", "미래", "새한", "동방", "청운", "성진", "우진", "가온", "해솔", "누리", "태림", "세움", "진성", "한울", "동일", "보람", "신화", "명성", "다올", "오성", "금강", "삼원", "은하", "푸른", "제일", "나래", "하늘", "대명", "정우"];
const KIND: { word: string; industry: string }[] = [
  { word: "정밀", industry: "제조 · 금속·기계" }, { word: "기계", industry: "제조 · 금속·기계" },
  { word: "전자", industry: "제조 · 전자·전기" }, { word: "오토텍", industry: "제조 · 자동차 부품" },
  { word: "식품", industry: "제조 · 식품" }, { word: "푸드", industry: "제조 · 식품" },
  { word: "케미칼", industry: "제조 · 화학·플라스틱" }, { word: "바이오", industry: "제조 · 바이오·의료기기" },
  { word: "메디칼", industry: "제조 · 바이오·의료기기" }, { word: "건설", industry: "건설·설비 · 종합건설" },
  { word: "이엔지", industry: "건설·설비 · 인테리어·설비" }, { word: "전기통신", industry: "건설·설비 · 전기·통신공사" },
  { word: "소프트", industry: "IT·소프트웨어 · 소프트웨어 개발" }, { word: "랩스", industry: "IT·소프트웨어 · 플랫폼·앱" },
  { word: "유통", industry: "도소매·유통 · 도매" }, { word: "트레이딩", industry: "도소매·유통 · 무역" },
  { word: "물류", industry: "서비스 · 물류·운송" }, { word: "디자인", industry: "서비스 · 광고·디자인" },
];
const PLACES: { region: string; road: string }[] = [
  { region: "서울 강남구", road: "테헤란로" }, { region: "서울 금천구", road: "가산디지털2로" }, { region: "서울 구로구", road: "디지털로" },
  { region: "서울 성동구", road: "성수이로" }, { region: "서울 마포구", road: "월드컵북로" }, { region: "서울 송파구", road: "문정로" },
  { region: "서울 영등포구", road: "영등포로" }, { region: "경기 성남시", road: "판교역로" }, { region: "경기 화성시", road: "동탄대로" },
  { region: "경기 안산시", road: "산단로" }, { region: "경기 시흥시", road: "공단1대로" }, { region: "경기 수원시", road: "광교중앙로" },
  { region: "경기 용인시", road: "기흥로" }, { region: "경기 김포시", road: "김포한강로" }, { region: "경기 평택시", road: "평택로" },
  { region: "경기 부천시", road: "길주로" }, { region: "경기 고양시", road: "중앙로" }, { region: "인천 남동구", road: "남동대로" },
  { region: "인천 서구", road: "가좌로" },
];
const SURNAME = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황"];
const GIVEN = ["영수", "정호", "민수", "성진", "현우", "지훈", "상철", "경희", "미경", "수진", "동욱", "재형", "병철", "은정", "태호", "준영"];
const TITLES = ["대표", "대표", "대표", "전무이사", "상무이사", "이사", "실장", "부장"];
const INTERESTS = ["절세·법인", "가지급금", "가업승계", "M&A", "사내근로복지기금", "정책자금", "고용지원금", "기업부설연구소", "세액공제", "벤처인증", "기업인증", "정부지원사업"];
const NOTES = [
  "작년 매출 약 40억, 올해 설비 투자 계획 있음",
  "대표님이 숫자로 설명하는 걸 좋아하심. 자료 준비해 가면 좋음",
  "직원 15명, 청년 채용 예정 2명",
  "가지급금 약 3억 추정, 세무사와 정리 방법 고민 중",
  "기존 정책자금 이용 이력 있음(중진공)",
  "연구 전담 인력 1명 있음. 연구소 설립 문의",
  "자녀에게 회사 승계 고민. 지분 정리부터 궁금해하심",
  "오전 통화 선호. 방문 전날 문자 드리기",
  "매각 제안 받은 적 있음. 기업가치 평가 궁금",
  "벤처인증 받으면 어떤 혜택이 있는지 문의",
];

export async function addRandomDemoLeads(tx: TransactionSql, count: number): Promise<number> {
  const n = Math.max(1, Math.min(50, Math.floor(count)));
  const used = new Set((await tx<{ company_name: string }[]>`select company_name from leads where organization_id = ${ORG_ID}`).map((r) => r.company_name));
  for (let i = 0; i < n; i++) {
    let company = "";
    let kind = pick(KIND);
    for (let tries = 0; tries < 30; tries++) {
      kind = pick(KIND);
      const head = pick(NAME_HEAD);
      company = Math.random() < 0.5 ? `(주)${head}${kind.word}` : `${head}${kind.word}(주)`;
      if (!used.has(company)) break;
    }
    used.add(company);
    const place = pick(PLACES);
    const interest = pickSome(INTERESTS, 1, 3);
    const roll = Math.random();
    // 55% 사업단 공통 신청 가능, 25% 본부 전용(바로 공개), 20% 공개 대기
    const status = roll < 0.8 ? "OPEN" : "DRAFT";
    const division = roll >= 0.55 && roll < 0.8 ? pick(["2본부", "3본부"]) : undefined;
    const creator = division === "2본부" ? U.leader : division === "3본부" ? U.leaderB : U.caller;
    const at = wd(1 + Math.floor(Math.random() * 10), 9 + Math.floor(Math.random() * 9), Math.random() < 0.3 ? 30 : 0);
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 3) * 3600000);
    const published = status === "OPEN" ? createdAt : null;
    const summary = [kind.industry, `${interest.join("·")} 관심`].join(", ");
    const [{ id }] = await tx<{ id: string }[]>`insert into leads(organization_id, company_name, region, industry, meeting_at, meeting_method, public_summary, status, created_by, caller_id, published_at, created_at, division_id)
      values (${ORG_ID}, ${company}, ${place.region}, ${kind.industry}, ${at}, 'VISIT', ${summary}, ${status}, ${creator.id}, ${division ? null : U.caller.id}, ${published}, ${createdAt}, ${DIV(division)})
      returning id`;
    const phone = `010-${4000 + Math.floor(Math.random() * 5999)}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    await tx`insert into lead_private_details(lead_id, organization_id, contact_name, contact_title, contact_phone, address, interest_tags, extra_note)
      values (${id}, ${ORG_ID}, ${pick(SURNAME) + pick(GIVEN)}, ${pick(TITLES)}, ${phone}, ${`${place.region} ${place.road} ${10 + Math.floor(Math.random() * 390)}`}, ${interest}, ${pickSome(NOTES, 1, 2).join("\n")})`;
    await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, to_status, created_at) values (${ORG_ID}, ${id}, ${creator.id}, 'CREATE', 'DRAFT', ${createdAt})`;
    if (published) {
      await tx`insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, created_at) values (${ORG_ID}, ${id}, ${division ? creator.id : U.owner.id}, 'PUBLISH', 'DRAFT', 'OPEN', ${published})`;
    }
  }
  return n;
}
