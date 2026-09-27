import type { LeadStatus, MeetingMethod, MeetingOutcome, MemberRole, MeetingResult, NextAction, ReactionLevel, FollowUpStatus } from "./types";

export type Tone = "info" | "success" | "warning" | "danger" | "purple" | "neutral";

export const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: "사업단장",
  MANAGER: "운영담당",
  CALLER: "콜 담당",
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
};

export const INTEREST_TAG_OPTIONS = ["정책자금", "고용지원금", "기업부설연구소", "벤처기업확인", "기업인증", "세액공제", "법인컨설팅", "정부지원사업", "가지급금", "절세"];
export const CONCERN_TAG_OPTIONS = ["비용", "시간 부족", "서류 부담", "기존 대출 부담", "담보 부족", "세무사 교체 부담", "시기 부적절", "결정권자 아님"];
