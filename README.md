# 리드플로우 (mirae-leadflow-os)

컨설팅 사업단의 **DB 배정 → 선착순 신청 → 미팅 → 결과보고 → 후속관리**를 카카오톡 대신 한 화면에서 운영하는 시스템.

- 문서: [MVP_SPEC.md](MVP_SPEC.md) · [DECISIONS.md](DECISIONS.md) · [MVP_STATE.md](MVP_STATE.md) · [QA_REPORT.md](QA_REPORT.md)
- 스택: Next.js 15 (App Router) · TypeScript · Tailwind 4 · PostgreSQL/Supabase (Auth + RLS) · Vercel

## 로컬 실행 (개발/QA)

```bash
npm install
# 로컬 PostgreSQL 16이 5432에서 실행 중이어야 합니다 (superuser postgres, trust)
cp .env.example .env.local   # DATABASE_URL=postgres://postgres@localhost:5432/leadflow, AUTH_MODE=local
npm run db:reset             # 마이그레이션 + 시드(역할별 계정 7명, 상태별 DB 15건)
npm run dev                  # http://localhost:3000 → 개발용 로그인(계정 선택)
```

검증:
```bash
npm run test:db      # 동시성·RLS·상태전이 53개 검사
npm run build && LOCAL_AUTH_UNSAFE_OK=1 npm start   # 프로덕션 빌드
npm run test:e2e     # Playwright Primary Journey + 390/430 + Device View (스크린샷: qa/screenshots)
```

## 운영 배포 (Supabase + Vercel)

1. Supabase 프로젝트 생성 → SQL Editor에서 `supabase/migrations/0001_init.sql` 실행 (또는 `DATABASE_URL`을 직접 연결 문자열로 두고 `npm run db:migrate`).
2. Authentication → Providers → Email 활성화. (원하면 "Confirm email" 끄기 — 50~60대 사용자에게는 끄는 편이 진입이 쉽습니다.)
3. Vercel 환경변수:
   - `DATABASE_URL` = Supabase **Transaction pooler** URI (포트 6543)
   - `AUTH_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `LOCAL_AUTH_UNSAFE_OK`는 **절대 설정하지 않음**
4. 배포 후 `/signup`에서 단장 계정 생성 → 온보딩에서 "새 사업단 만들기" → `/members`의 초대코드를 단톡방에 공유.
5. 가입한 콜 직원·운영담당은 `/members`에서 역할 변경.

## 구조

```
supabase/migrations/0001_init.sql   스키마 · RLS · RPC(claim_lead, submit_meeting_report …)
supabase/local/                     로컬 Postgres용 Supabase auth 스키마 흉내(운영에서는 사용 안 함)
src/lib/db.ts                       withUser(): 트랜잭션마다 authenticated 역할 + JWT claims 설정 → RLS 강제
src/lib/actions/*.ts                Server Actions (모든 쓰기)
src/lib/queries.ts                  대시보드/목록/상세 조회
src/components/layout/DeviceView.tsx PC / Mobile / PC+Mobile 미리보기 + Route Sync
scripts/                            migrate · seed · test-db
qa/                                 Playwright E2E + 증거 스크린샷
```
