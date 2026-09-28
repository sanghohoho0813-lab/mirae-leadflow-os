export const ERROR_MESSAGE: Record<string, string> = {
  NOT_AUTHENTICATED: "로그인이 필요합니다.",
  NOT_MEMBER: "소속된 사업단이 없습니다.",
  ROLE_NOT_ALLOWED: "이 역할로는 신청할 수 없습니다.",
  INACTIVE: "비활성화된 계정입니다. 사업단장에게 문의하세요.",
  NOT_FOUND: "해당 DB를 찾을 수 없습니다.",
  ALREADY_MINE: "이미 내가 담당하고 있는 DB입니다.",
  ALREADY_ASSIGNED: "아쉽지만 다른 컨설턴트가 먼저 신청했습니다.",
  LIMIT_REACHED: "진행 중인 미팅이 있습니다. 그 미팅의 결과를 입력하면 바로 다음 DB를 신청할 수 있습니다.",
  INVALID_LIMIT: "0~20 사이로 정해 주세요.",
  NOT_OPEN: "지금은 신청할 수 없는 상태입니다.",
  FORBIDDEN: "권한이 없습니다.",
  INVALID_STATE: "현재 상태에서는 할 수 없는 작업입니다.",
  MEETING_PASSED: "미팅 시간이 지나 신청을 취소할 수 없습니다. 결과를 입력해 주세요.",
  INVALID_CONSULTANT: "배정할 수 없는 구성원입니다.",
  SAME_CONSULTANT: "이미 같은 담당자입니다.",
  REASON_REQUIRED: "사유를 입력해 주세요.",
  NEW_MEETING_REQUIRED: "새 미팅 일시를 선택해 주세요.",
  REACTION_RESULT_REQUIRED: "상대 반응과 결과를 선택해 주세요.",
  NEXT_DATE_REQUIRED: "후속 예정일을 선택해 주세요.",
  NO_ASSIGNEE: "담당자가 없는 DB입니다.",
  ALREADY_MEMBER: "이미 가입된 계정입니다.",
  INVALID_INVITE_CODE: "초대코드가 올바르지 않습니다.",
  CANNOT_CHANGE_SELF: "본인 역할은 바꿀 수 없습니다.",
  VALIDATION: "입력 내용을 확인해 주세요.",
  UNKNOWN: "처리 중 문제가 생겼습니다. 다시 시도해 주세요.",
};

export function messageFor(code: string | undefined): string {
  return (code && ERROR_MESSAGE[code]) || ERROR_MESSAGE.UNKNOWN;
}
