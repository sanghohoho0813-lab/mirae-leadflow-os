# 리드플로우 (mirae-leadflow-os)

컨설팅 사업단의 **DB 배정 → 선착순 신청 → 미팅 → 결과보고 → 후속관리**를 카카오톡 대신 한 화면에서 운영하는 시스템.

- 문서: [MVP_SPEC.md](MVP_SPEC.md) · [DECISIONS.md](DECISIONS.md) · [MVP_STATE.md](MVP_STATE.md) · [QA_REPORT.md](QA_REPORT.md)
- 스택: Next.js 15 (App Router) · TypeScript · Tailwind 4 · PostgreSQL/Supabase (Auth + RLS) · Vercel

## 지금 바로 써보기 — 체험 모드 (로그인 없음)

Supabase 없이도 배포 주소에서 전체 흐름을 체험할 수 있습니다. 첫 접속은 사업단장 화면, 화면 맨 위 막대에서 **클릭 한 번으로 단장·운영·콜·컨설턴트·본부장 화면 전환**, [초기화]로 샘플 데이터 복원.

Vercel에서 필요한 것은 **DB 연결 한 번**뿐입니다.
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
npm run db:reset             # 마이그레이션 + 시드(역할별 계정 7명, 상태별 DB 15건)
npm run dev                  # http://localhost:3000 → 체험 모드로 바로 시작
```

검증:
```bash
npm run test:db      # 동시성·RLS·상태전이 53개 검사
npm run build && npm start
npm run test:e2e     # Playwright 12개: Primary Journey, 390/430, Device View, 체험 모드 역할 전환
```

## 실사용 전환 (Supabase Auth + Vercel)

1. Supabase 프로젝트 생성 → `DATABASE_URL`을 Supabase **Transaction pooler**(포트 6543) 주소로 교체 → SQL Editor에서 `supabase/migrations/0001_init.sql` 실행 (또는 `npm run db:migrate`)
2. Authentication → Providers → Email 활성화 ("Confirm email"은 끄는 것을 권장), URL Configuration에 배포 주소와 `/auth/callback` 등록
3. Vercel 환경변수: `AUTH_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Redeploy
4. `/signup`에서 단장 계정 생성 → "새 사업단 만들기" → `/members` 초대코드를 단톡방에 공유 → 콜 직원·운영담당 역할 변경

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
