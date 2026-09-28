import type { LeadStatus, MeetingMethod, MeetingOutcome, MemberRole, MeetingResult, NextAction, ReactionLevel, FollowUpStatus } from "./types";

export type Tone = "info" | "success" | "warning" | "danger" | "purple" | "neutral";

export const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: "사업단장",
  MANAGER: "비서·운영",
  CALLER: "콜팀",
  LEADER: "본부장",
  CONSULTANT: "컨설턴트",
};

export const STATUS_LABEL: Record<LeadStatus, string> = {
  DRAFT: "공개 대기",
  OPEN: "신청 가능",
  ASSIGNED: "배정 완료",
  FOLLOW_UP: "후속 진행",
  CLOSED: "종료",
  CANCELLED: "취소",
};

export const STATUS_TONE: Record<LeadStatus, Tone> = {
  DRAFT: "neutral",
  OPEN: "warning",
  ASSIGNED: "success",
  FOLLOW_UP: "purple",
  CLOSED: "neutral",
  CANCELLED: "danger",
};

export const METHOD_LABEL: Record<MeetingMethod, string> = {
  VISIT: "방문",
  PHONE: "전화",
  ONLINE: "온라인",
};

export const OUTCOME_LABEL: Record<MeetingOutcome, string> = {
  DONE: "완료",
  POSTPONED: "연기",
  CANCELLED: "취소",
  NO_SHOW: "부재",
};

export const REACTION_LABEL: Record<ReactionLevel, string> = {
  HIGH: "관심 높음",
  MID: "보통",
  LOW: "낮음",
};

export const RESULT_LABEL: Record<MeetingResult, string> = {
  FOLLOW_UP_NEEDED: "후속상담 필요",
  MATERIAL_REQUEST: "자료 요청",
  REVISIT: "재방문 필요",
  REVIEW_THEN_CONTACT: "검토 후 연락",
  HARD: "진행 어려움",
  OTHER: "기타",
};

export const NEXT_ACTION_LABEL: Record<NextAction, string> = {
  CALL: "전화",
  SEND_MATERIAL: "자료 전달",
  REVISIT: "재방문",
  OWNER_CHECK: "단장 확인 필요",
  NONE: "없음",
};

export const FOLLOW_UP_STATUS_LABEL: Record<FollowUpStatus, string> = {
  PENDING: "예정",
  DONE: "완료",
  CANCELLED: "취소",
};

export const ACTION_LABEL: Record<string, string> = {
  CREATE: "DB 등록",
  UPDATE: "정보 수정",
  PUBLISH: "공개",
  UNPUBLISH: "공개 취소",
  CLAIM: "선착순 신청 · 배정",
  CANCEL_CLAIM: "신청 취소",
  RELEASE: "관리자 회수",
  ASSIGN: "관리자 배정",
  REASSIGN: "재배정",
  RESCHEDULE: "일정 변경",
  CANCEL_LEAD: "DB 취소",
  REPORT: "미팅 결과 입력",
  FOLLOW_UP_DONE: "후속조치 완료",
  NOTE: "진행 메모",
  NEXT_ROUND: "다음 미팅 잡기",
};

/** 관심을 보인 분야 — 세금·법인 쪽이 가장 많아 앞에 둔다. */
export const INTEREST_TAG_OPTIONS = ["절세·법인", "가지급금", "가업승계", "M&A", "사내근로복지기금", "정책자금", "고용지원금", "기업부설연구소", "세액공제", "벤처인증", "기업인증", "정부지원사업"];
export const CONCERN_TAG_OPTIONS = ["비용", "시간 부족", "서류 부담", "기존 대출 부담", "담보 부족", "세무사 교체 부담", "시기 부적절", "결정권자 아님"];

const HONORIFIC_BASE: Record<MemberRole, string> = { OWNER: "단장", MANAGER: "비서", CALLER: "콜팀", LEADER: "본부장", CONSULTANT: "컨설턴트" };

/** 직함 (title) if set, else the short role name: 단장 · 콜팀장 · 본부장 · 컨설턴트. */
export function titleOf(role: MemberRole, title?: string | null): string {
  return title?.trim() || HONORIFIC_BASE[role];
}

/** "송하균 단장님", "이제원 콜팀장님", "컨설턴트 A님" (no doubled title). */
export function honorific(name: string, role: MemberRole, title?: string | null): string {
  const t = titleOf(role, title);
  return name.startsWith(t) || name.endsWith(t) ? `${name}님` : `${name} ${t}님`;
}

/** Chip / list label without doubling: "단장 송하균", "본부장 서인수". */
export function personLabel(name: string, role: MemberRole, title?: string | null): string {
  const t = titleOf(role, title);
  return name.startsWith(t) ? name : `${t} ${name}`;
}

/** 상담 분야 (결과 입력 · 교육 키워드와 공유). */
export const TOPIC_OPTIONS = ["절세·법인", "정책자금", "고용지원금", "기업부설연구소", "벤처인증", "기업인증(이노비즈·메인비즈)", "사내근로복지기금", "M&A", "가업승계", "정부지원사업", "사업계획서"];
/** 받을 자료 / 보낼 자료. */
export const MATERIAL_OPTIONS = ["재무제표", "부가세 과세표준증명", "4대보험 가입자 명부", "사업자등록증", "기존 대출 현황", "회사소개서", "견적서·제안서"];

/** 업종: 대분류 → 세부 (클릭으로 고름). 저장 값은 "제조 · 금속·기계" 형식. */
export const INDUSTRY_TREE: { group: string; items: string[] }[] = [
  { group: "제조", items: ["금속·기계", "전자·전기", "자동차 부품", "식품", "화학·플라스틱", "섬유·의류", "바이오·의료기기", "가구·목재", "기타 제조"] },
  { group: "건설·설비", items: ["종합건설", "인테리어·설비", "전기·통신공사"] },
  { group: "IT·소프트웨어", items: ["소프트웨어 개발", "플랫폼·앱", "IT 서비스"] },
  { group: "도소매·유통", items: ["도매", "소매·온라인몰", "무역"] },
  { group: "서비스", items: ["물류·운송", "음식점", "교육", "병·의원", "뷰티·미용", "광고·디자인", "기타 서비스"] },
];

/** 만나는 분 직책 (클릭 또는 직접 입력). */
export const CONTACT_TITLE_OPTIONS = ["대표", "전무이사", "상무이사", "이사", "부장", "실장", "팀장"];

/** 신청 전 컨설턴트에게 보이는 한 줄: 업종 + 관심 분야 (콜팀이 따로 쓰지 않아도 됨). */
export function publicSummaryOf(industry: string | null | undefined, interest: string[]): string | null {
  const parts = [industry?.trim(), interest.length ? `${interest.slice(0, 4).join("·")} 관심` : ""].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
