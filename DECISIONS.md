# DECISIONS

## D-01 데이터 접근: postgres.js + RLS 컨텍스트 (supabase-js 데이터 호출 대신)
- WHY: 실사용 MVP는 “선착순 동시성·RLS·이력”이 진짜로 동작해야 하고, 이 컨테이너에는 Supabase가 없다. 로컬 PostgreSQL 16을 띄워 **동일한 마이그레이션 SQL·동일한 RLS 정책·동일한 RPC**를 실제로 실행·테스트했다.
- HOW: 모든 쿼리는 서버(Server Actions/RSC)에서 트랜잭션 안에 `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = '{"sub": <uid>}'`를 설정해 실행한다. Supabase의 PostgREST가 하는 일과 동일하며, `auth.uid()` 기반 RLS가 그대로 강제된다.
- PROD: `DATABASE_URL`에 Supabase Pooler(Transaction mode, 6543) URI를 넣는다. `SET LOCAL`은 트랜잭션 범위라 Transaction Pooling에서 안전하다.
- NEXT: 필요 시 supabase-js로 클라이언트 직접 조회를 추가해도 RLS가 같은 정책으로 보호한다.

## D-02 인증: Supabase Auth(운영) / Local Auth(개발·QA)
- WHY: 운영에서는 비밀번호 재설정·이메일 확인 등을 Supabase Auth에 맡긴다. 개발 컨테이너에서는 GoTrue를 띄울 수 없어 `AUTH_MODE=local`일 때만 시드 사용자 선택 로그인을 제공한다(서명 쿠키, production에서는 강제 비활성).
- 위험: 실제 Supabase 로그인 화면은 이 세션에서 클릭 검증하지 못했다. 사용 전 체크리스트에 명시.

## D-03 가입은 “초대코드” 방식
- WHY: 150명에게 관리자가 일일이 초대 메일을 보내는 것보다, 단장이 초대코드+주소를 단톡방에 한 번 올리는 것이 현실적이다. 가입 시 기본 역할은 CONSULTANT, 단장이 `/members`에서 콜직원/운영담당으로 변경.

## D-04 공개정보 / 비공개정보 테이블 분리 (`leads` / `lead_private_details`)
- WHY: “신청 전에는 업체명·지역·일시만, 배정 후에만 연락처·콜메모”를 UI가 아니라 **RLS 행 단위**로 강제하기 위해. 컬럼 단위 RLS는 Postgres에 없으므로 테이블을 나눴다.

## D-05 상태 머신 6단계 + 파생 플래그
- WHY: 콜직원이 등록하는 시점에 미팅 일시가 이미 정해져 있어 `MEETING_SCHEDULED`를 별도 상태로 두면 `ASSIGNED`와 항상 같이 움직인다. 합쳤다. “결과 미입력”은 상태가 아니라 `ASSIGNED + 미팅시각 경과`로 계산해 누락이 구조적으로 불가능하게 했다.

## D-06 선착순은 단일 UPDATE 원자성
- `UPDATE leads SET status='ASSIGNED', assigned_to=uid WHERE id=$1 AND status='OPEN'` — READ COMMITTED에서 두 번째 트랜잭션은 락 해제 후 조건을 재평가해 0행. SECURITY DEFINER RPC `claim_lead`로 감싸고 역할·조직 검증 포함. 10명 동시 신청 테스트로 1명만 성공 확인(`scripts/test-db.mjs`).

## D-07 Theme Picker 미구현, Token 구조만 유지
- WHY: 실사용 조직 내부 도구 + 50~60대 사용자. Reference 이미지의 Navy/Blue를 Default로 고정. Master의 Theme Token 아키텍처(`--theme-*`, Pure White)는 그대로 적용해 나중에 Picker를 붙일 수 있다.

## D-08 Device View(PC/Mobile/PC+Mobile)는 ≥1024px에서만, iframe 동일 Route
- Master v1.2 규칙 그대로. `?frame=mobile` 플래그, postMessage 라우트 동기화, `window.self !== window.top`이면 스위치 숨김.

## D-09 미팅 결과 입력은 6문항 클릭형, 자유서술은 선택
- WHY: 50~60대 사용자가 스마트폰에서 30초 안에 끝내야 한다. 진행여부·반응·결과·다음행동·예정일·한줄메모. 연기 시에는 새 미팅 일시만 필수.

## D-10 알림(카톡/SMS/이메일)은 P0 제외, 대신 “미입력 목록”을 홈 최상단에
- WHY: 알림은 발송 인프라·비용·동의가 필요. P0는 단장이 앱을 열면 즉시 보이는 구조로 문제의 80%를 해결. 알림은 `follow_ups`/파생 플래그 기반으로 다음 단계에 붙일 수 있다.

## D-11 Soft Delete 대신 CANCELLED 상태 + 이력
- WHY: 운영 데이터는 삭제하지 않는다. 잘못 등록한 DB는 취소(사유 기록)로 처리하고 목록에서 기본 숨김.

## D-12 (app) 레이아웃에 Suspense를 두지 않는다
- WHY: 프로덕션 빌드에서 레이아웃 레벨 `<Suspense>` + Link prefetch 조합이 2~3번째 클라이언트 내비게이션을 영구 대기시키는 현상을 E2E로 확인(개발 서버에서는 재현 안 됨). 모든 페이지가 `force-dynamic`이라 `useSearchParams` 때문에 Suspense가 필요하지도 않다. 페이지 단위 Suspense(QueryToast 등)는 문제없음.

## D-13 로컬 인증은 프로덕션 빌드에서 `LOCAL_AUTH_UNSAFE_OK=1`일 때만
- WHY: E2E는 실제 `next build` 결과물에서 돌려야 의미가 있다(개발 서버는 동시 Server Action에서 다른 동작). 이 변수는 QA 컨테이너에서만 쓰고 Vercel에는 절대 두지 않는다.
