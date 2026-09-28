# 리드플로우 (mirae-leadflow-os)

컨설팅 사업단의 **DB 배정 → 선착순 신청 → 미팅 → 결과보고 → 후속관리**와 **매주 교육 자료·핵심 요약**을 카카오톡 대신 한 화면에서 운영하는 시스템.

- 문서: [MVP_SPEC.md](MVP_SPEC.md) · [DECISIONS.md](DECISIONS.md) · [MVP_STATE.md](MVP_STATE.md) · [QA_REPORT.md](QA_REPORT.md)
- 주요 기능: 선착순 신청(원자 처리, **1인 동시 진행 한도**) · 클릭형 결과 입력(상담 분야·받을 자료·다음 할 일) · 후속조치 · 결과 미입력 대시보드 · **교육 자료실(자료 공유 + AI 핵심 정리 + 확인 현황)** · 미팅 주소 복사/지도앱 · 서울·경기 지도 · 9가지 화면 색 · 실시간 시계 · PC/Mobile 동시 미리보기
- 스택: Next.js 15 (App Router) · TypeScript · Tailwind 4 · PostgreSQL/Supabase (Auth + RLS) · Vercel

## 지금 바로 써보기 — 체험 모드 (로그인 없음)

Supabase 없이도 배포 주소에서 전체 흐름을 체험할 수 있습니다. 첫 접속은 사업단장(송하균) 화면, 화면 맨 위 **[사용자 변경하기]**(휴대폰은 ☰ 메뉴 맨 위 '체험 도구')에서 단장·비서(이미라)·콜팀장(이제원)·본부별 본부장·지점장·팀장·컨설턴트 화면으로 전환. **[샘플 DB 추가·삭제]**: 5·10·20개 추가, 전체 삭제, 처음 샘플로.

**DB를 연결하지 않아도 바로 열립니다** — 서버 안의 임시 DB로 동작하며(상단에 "임시 체험" 표시), 한동안 접속이 없으면 샘플 상태로 돌아갑니다. 데이터를 유지하고 여러 기기에서 같이 보려면 DB를 연결하세요:
1. Vercel 프로젝트 → **Storage** → **Create Database** → **Neon (Postgres)** → 무료 플랜 생성
2. 이 프로젝트에 **Connect** → `DATABASE_URL`이 자동 등록됨
3. **Deployments → Redeploy**
4. 주소 접속 → 테이블·샘플 데이터가 자동 생성되고 바로 시작

> 체험 모드는 누구나 모든 역할로 들어갈 수 있습니다. **실제 고객 정보는 넣지 마세요.**

## 로컬 실행 (개발/QA)

```bash
npm install
# 로컬 PostgreSQL 16이 5432에서 실행 중이어야 합니다 (superuser postgres, trust)
cp .env.example .env.local   # DATABASE_URL=postgres://postgres@localhost:5432/leadflow, AUTH_MODE=demo
npm run db:reset             # 마이그레이션 + 시드(스마트 사업단 10명, 상태별 DB 15건, 교육 6회)
npm run dev                  # http://localhost:3000 → 체험 모드로 바로 시작
```

검증:
```bash
npm run test:db      # 동시성·1인 한도·RLS·상태전이·교육 자료실 권한 74개 검사
npm run build && npm start
npm run test:e2e     # Playwright 23개: Primary Journey, 1인 한도, 교육 자료실, 390/430, Device View, 테마
node qa/crawl.mjs    # 전 화면 × 역할 × 해상도 195개: 오류·가로넘침 검사 (FONT=xlarge 로 큰 글자 검사)
node qa/ai-summary.mjs  # AI 요약 경로(모의 Claude API): PDF·PPTX 전달, 실패 시 기본 요약
```

## 실사용 전환 (Supabase Auth + Vercel)

1. Supabase 프로젝트 생성(지역 **Seoul**) → `DATABASE_URL`을 Supabase **Transaction pooler**(포트 6543) 주소로 교체 → `npm run db:migrate` (또는 SQL Editor에서 `supabase/migrations/*.sql`을 번호 순서대로 실행)
2. Authentication → Providers → Email 활성화 ("Confirm email"은 끄는 것을 권장), URL Configuration에 배포 주소와 `/auth/callback` 등록
3. Vercel 환경변수: `AUTH_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Redeploy
4. (선택) 교육 AI 요약: `ANTHROPIC_API_KEY` 등록 — 없으면 기본 요약으로 동작
5. `/signup`에서 단장 계정 생성 → "새 사업단 만들기" → `/members` 초대코드를 단톡방에 공유 → 콜 직원·운영담당 역할 변경

## 구조

```
supabase/migrations/0001_init.sql   스키마 · RLS · RPC(claim_lead, submit_meeting_report …)
supabase/migrations/0003_*.sql      1인 동시 진행 한도 · 상세 결과 입력 · 교육 자료실(파일 조각 저장, 확인 기록)
src/lib/ai/                         교육 요약: Claude(Messages API) + 키 없을 때 기본 요약, PPTX·워드 텍스트 추출
supabase/local/                     로컬 Postgres용 Supabase auth 스키마 흉내(운영에서는 사용 안 함)
src/lib/db.ts                       withUser(): 트랜잭션마다 authenticated 역할 + JWT claims 설정 → RLS 강제
src/lib/actions/*.ts                Server Actions (모든 쓰기)
src/lib/queries.ts                  대시보드/목록/상세 조회
src/components/layout/DeviceView.tsx PC / Mobile / PC+Mobile 미리보기 + Route Sync
scripts/                            migrate · seed · test-db
qa/                                 Playwright E2E + 증거 스크린샷
```

## 소개 영상
`public/intro/leadflow-intro.mp4` (44초, 세로 9:16 릴스 비율, 자막형, 단장·본부장 관점) — 앱에 들어오면 팝업으로 뜨고, ☰ 메뉴 맨 아래 [서비스 소개 영상 보기]로 다시 볼 수 있습니다. 화면이 바뀌면 다시 만들기:
```bash
npm run db:seed && npm start                 # 다른 터미널
curl -sL -o promo/PretendardVariable.woff2 https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2
node promo/capture.mjs                        # 앱 화면 캡처 → promo/shots
FFMPEG=/path/to/ffmpeg node promo/render.mjs  # → public/intro/ (mp4 · webm · poster.jpg)
```

