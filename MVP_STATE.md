# MVP_STATE

## TIER A (100%)
- `/` 역할별 홈 — 단장/운영: 결과 미입력·장기 미처리·오늘 미팅·후속 예정·공개 대기·신청 가능 + 미입력 목록 최상단 / 컨설턴트: 오늘 미팅·결과 미입력·후속 연락·신청 가능 + 다음 할 일 CTA / 콜직원: 오늘 등록·공개 대기·예정 미팅
- `/leads` 목록(역할별 탭·검색) — `/leads/[id]` 상세(공개/비공개 분리, 역할·상태별 액션 전부) — `/leads/[id]/report` 클릭형 결과 입력 + 완료 화면 — `/leads/new` 등록(태그형 콜메모)

## TIER B (75~90%)
- `/leads/[id]/edit` 수정 · `/follow-ups` 후속조치(완료→다음 연쇄) · `/activity` 전체 이력 · `/members` 구성원·역할·초대코드 · `/login` `/signup` `/onboarding`

## PRIMARY JOURNEY
등록 → 공개 → 선착순 신청(원자적) → 담당 확정 → 콜메모 공개 → 결과 입력 → 후속조치 → 단장 현황 반영 → 후속 완료/종료 — **E2E PASS**

## WOW FEATURE
"미팅은 지났는데 결과가 없는 DB"가 상태 저장 없이 자동으로 떠오르는 단장 대시보드 + 30초 클릭형 결과 입력

## MOBILE
390/430 실제 뷰포트 검증, 하단 네비 + 드로어, 큰 버튼(52px), 카드형 목록

## DEVICE VIEW
PC / Mobile / PC+Mobile, Route Sync, 재귀 차단, localStorage 유지 — PASS

## FUTURE PREVIEW (구현 안 함, UI에 위장하지 않음)
결과 미입력 자동 리마인드(카톡/SMS) · 본부별 조직관리 · 컨설턴트별 성과 · Excel 업로드/중복검사 · 미팅 성공률/업종별 전환율 · Multi Org / SaaS 과금

## KNOWN ISSUES
- 실제 Supabase Auth 로그인은 이 세션에서 미검증(구현은 완료)
- Playwright 스크린샷의 sticky 헤더 위치는 fullPage 캡처 아티팩트(실제 기기에서는 정상)
