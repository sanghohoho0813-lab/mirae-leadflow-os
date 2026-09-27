# MVP_SPEC — 리드플로우 (mirae-leadflow-os)

> Source of Truth: 미래AI랩 Rapid High-Fidelity MVP System v1.2 + 본 프로젝트 Override(실사용형 MVP)

## Strategy Lock

| 항목 | 내용 |
|---|---|
| PRODUCT NAME | 리드플로우 (LeadFlow) — DB부터 만남까지, 성과로 |
| ONE-LINE VALUE | 단톡방으로 돌던 DB 배정·미팅·결과보고를 한 화면에서 자동 정리하는 운영 시스템 |
| TARGET USER | 사업단장(OWNER), 운영담당(MANAGER), 콜직원(CALLER), 컨설턴트(CONSULTANT ~150명), 향후 본부장(LEADER) |
| CORE PROBLEM | 누가 어떤 DB를 맡았고, 미팅 결과가 들어왔는지, 다음에 뭘 해야 하는지를 단장이 카톡으로 일일이 쫓아다녀야 한다 |
| PRIMARY HYPOTHESIS | 콜직원이 DB를 등록하고 컨설턴트가 앱에서 선착순 신청·결과입력을 하면, 단장은 “결과 미입력”을 한 화면에서 보고 더 이상 개인 카톡으로 확인하지 않아도 된다 |
| PRIMARY CTA | 컨설턴트: **[이 미팅 신청하기]** / 단장: **[공개하기]** / 콜직원: **[신규 DB 등록]** |
| PRIMARY PROOF JOURNEY | DB 등록 → 공개 → 선착순 신청 → 담당 확정 → 상세 콜메모 열람 → 미팅 → 클릭형 결과입력 → 후속조치 생성 → 단장 전체현황 반영 |
| WOW FEATURE | **결과 미입력·장기 미처리가 자동으로 떠오르는 단장 대시보드** + 30초 클릭형 결과입력 |
| COMPLETION STATE | 결과 입력 완료 → 후속조치 생성 → 단장 대시보드 “결과 미입력”에서 사라지고 “후속조치 예정”에 나타남 |
| BUSINESS MODEL | 사업단 단위 월 구독(조직당) → 본부/멀티조직 SaaS. P0에서는 UI로 노출하지 않음(실사용 조직 내부 도구) |
| DEFAULT THEME | Reference 이미지 기준 **Navy Sidebar + Blue Primary(#2563EB)** + Pure White Surface. Theme Picker 미구현(DECISIONS 참고) |
| REFERENCE STYLE | 첨부 Reference 2장(모바일 홈/DB 상세, PC 대시보드) |

## Roles & Permission Matrix

| 동작 | OWNER | MANAGER | CALLER | CONSULTANT | LEADER(P0) |
|---|---|---|---|---|---|
| DB 등록(DRAFT) | ○ | ○ | ○ | × | × |
| DB 수정 | ○ | ○ | 본인 등록건 | × | × |
| DB 공개(DRAFT→OPEN) | ○ | ○ | × | × | × |
| DB 취소 | ○ | ○ | × | × | × |
| 공개 DB 목록(공개정보만) | ○ | ○ | ○ | ○ | ○ |
| 상세 콜메모/연락처 | ○ | ○ | 본인 등록건 | 본인 배정건 | 본인 배정건 |
| 선착순 신청 | × | × | × | ○ | ○ |
| 신청 취소(본인) | × | × | × | ○(미팅 전) | ○ |
| 회수 / 재배정 / 일정변경 | ○ | ○ | 일정변경(본인 등록건) | × | × |
| 미팅 결과 입력 | ○(대리) | ○(대리) | × | 본인 배정건 | 본인 배정건 |
| 후속조치 완료 처리 | ○ | ○ | × | 본인 담당건 | 본인 담당건 |
| 전체 현황 대시보드 | ○ | ○ | × | × | × |
| 전체 이력 | ○ | ○ | × | × | × |
| 구성원 역할 변경 | ○ | × | × | × | × |

LEADER는 P0에서 CONSULTANT와 동일 권한. 데이터 모델(`profiles.division`)만 확장 여지를 둔다.

## Status Model (leads.status)

```
DRAFT      등록됨 · 공개 전        (콜직원 등록 직후)
OPEN       신청 가능               (단장이 공개)
ASSIGNED   배정 완료 · 미팅 예정    (선착순 확정 / 수동 배정)
FOLLOW_UP  후속 진행 중            (결과 입력 후 다음 행동이 있음)
CLOSED     종료                    (결과 입력 후 다음 행동 없음 / 진행 어려움)
CANCELLED  취소                    (단장/운영자가 DB 취소)
```

파생 상태(저장하지 않고 계산):
- **결과 미입력**: `ASSIGNED` 이면서 미팅 일시가 지남
- **장기 미처리**: 결과 미입력 3일 이상 또는 후속조치 예정일 7일 이상 경과

전이:
```
DRAFT → OPEN (공개)             OPEN → ASSIGNED (선착순 / 수동배정)
ASSIGNED → OPEN (회수·신청취소)  ASSIGNED → ASSIGNED (재배정 / 연기)
ASSIGNED → FOLLOW_UP | CLOSED (결과 입력)
FOLLOW_UP → FOLLOW_UP (후속 결과 재입력) | CLOSED
DRAFT|OPEN|ASSIGNED|FOLLOW_UP → CANCELLED (취소)
```
모든 전이는 `activity_logs`(actor, from, to, detail)에 기록된다.

## Data Model (Supabase Postgres)

- `organizations` — 사업단. `invite_code`로 가입.
- `profiles` — `auth.users` 1:1, `organization_id`, `role`, `division`(본부, 확장용).
- `leads` — 공개 가능 정보(업체명·지역·업종·미팅일시·방식·공개용 한줄·상태·담당자).
- `lead_private_details` — 배정자/운영진만 보는 정보(담당자명·직책·연락처·상세 콜메모·관심/부정 태그·주의사항). RLS로 분리.
- `lead_assignments` — 배정 이력(선착순/수동, 해제 사유).
- `meeting_reports` — 클릭형 결과(진행·반응·결과·다음행동·예정일·메모).
- `follow_ups` — 후속조치(담당·유형·예정일·상태).
- `activity_logs` — 모든 변경 이력.

모든 업무 테이블에 `organization_id`. RLS는 `auth.uid()` → `profiles` 조회로 조직·역할 판정.

## Route Map (Ceiling 12)

| Tier | Route | 역할 |
|---|---|---|
| A | `/` 홈(역할별 오늘 할 일) | 전체 |
| A | `/leads` DB 목록(탭: 신청가능·내 담당·전체·결과미입력) | 전체 |
| A | `/leads/[id]` DB 상세 + 모든 액션 | 전체 |
| A | `/leads/[id]/report` 결과 입력(클릭형) | CONSULTANT/운영진 |
| A | `/leads/new` 신규 DB 등록 | CALLER/운영진 |
| B | `/leads/[id]/edit` 수정 | CALLER/운영진 |
| B | `/follow-ups` 후속조치 | 전체 |
| B | `/activity` 전체 이력 | 운영진 |
| B | `/members` 구성원·역할 | OWNER |
| B | `/login`, `/signup`(초대코드) | — |

## Judge Fast Path (실사용 기준 “첫 접속 30초”)
컨설턴트: 로그인 → 홈 “신청 가능한 DB” → 상세 → [이 미팅 신청하기] → 배정 확정 → 콜메모 열람.
단장: 로그인 → 홈 “결과 미입력 N건” → 상세 → 담당자 확인.

## NOT BUILDING (P0)
카카오/SMS 알림, AI 분석, 정책자금 추천, 계약/매출/정산, 성과평가, CreTop 연동, 과금, 화이트라벨, 다수 사업단 관리센터, 테마 피커, Excel 업로드.
