// 소개 영상용 앱 화면 캡처. 로컬 서버(체험 모드, 샘플 데이터)에서 실행:
//   npm run db:seed && npm start   →   node promo/capture.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = "promo/shots";
mkdirSync(OUT, { recursive: true });
const FONT = readFileSync("promo/PretendardVariable.woff2");
const ID = {
  owner: "10000000-0000-4000-8000-000000000001", secretary: "10000000-0000-4000-8000-000000000018",
  cA: "10000000-0000-4000-8000-000000000004", cB: "10000000-0000-4000-8000-000000000005",
};
const UURIM = "30000000-0000-4000-8000-000000000008";
const DAEHAN = "30000000-0000-4000-8000-000000000020";
const T1 = "50000000-0000-4000-8000-000000000001";

const browser = await chromium.launch({ env: { ...process.env, LANG: "C.UTF-8", LC_ALL: "C.UTF-8" } });

async function as(user, viewport, scale) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, locale: "ko-KR", timezoneId: "Asia/Seoul", reducedMotion: "reduce" });
  await ctx.route("**/__promo/font.woff2", (r) => r.fulfill({ body: FONT, contentType: "font/woff2" }));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.click(`[data-testid="login-${user}"]`);
  await page.waitForURL(`${BASE}/`);
  return page;
}
async function open(page, url) {
  await page.goto(`${BASE}${url}`);
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.addStyleTag({ content: `
    @font-face { font-family: "Pretendard Variable"; src: url("/__promo/font.woff2") format("woff2"); font-weight: 45 920; }
    [data-testid="demo-bar"], [data-testid="nav-progress"] { display: none !important; }
    * { caret-color: transparent !important; }` });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}
const snap = (page, name, opts = {}) => page.screenshot({ path: `${OUT}/${name}.png`, animations: "disabled", ...opts });

// 1) 컨설턴트: 신청 가능 DB → 바로 신청 (모바일)
let p = await as(ID.cA, { width: 390, height: 844 }, 3);
await open(p, "/leads?tab=open");
await snap(p, "m-open");
await p.locator('[data-testid^="quick-claim-"]').first().click();
await p.waitForTimeout(400);
await snap(p, "m-claim");
await p.context().close();

// 2) 컨설턴트 B: 클릭형 결과 입력 (모바일)
p = await as(ID.cB, { width: 390, height: 844 }, 3);
await open(p, `/leads/${UURIM}/report`);
await p.getByRole("radio", { name: "완료" }).click();
await p.getByRole("radio", { name: "관심 높음" }).click();
await p.getByRole("radio", { name: "후속상담 필요" }).click();
await p.getByRole("button", { name: "3일 후" }).click();
await p.fill('[data-testid="memo"]', "신규 설비 자금 관심. 재무제표 받기로 함");
await p.waitForTimeout(300);
await p.evaluate(() => window.scrollTo(0, 170));
await snap(p, "m-report");
await p.context().close();

// 3) 단장 홈: 결과 미입력이 먼저 보인다 (PC)
p = await as(ID.owner, { width: 1440, height: 900 }, 1.5);
await open(p, "/");
await snap(p, "d-owner-home");

// 4) 2차·3차 미팅: 같은 DB에 차수별로 (PC)
await open(p, `/leads/${DAEHAN}`);
const tomorrow = new Date(Date.now() + 86400000 + 9 * 3600000).toISOString().slice(0, 10);
await p.click('[data-testid="next-meeting-button"]');
await p.fill('[data-testid="nm-date"]', tomorrow);
await p.getByTestId("nm-time-h15").click();
await p.click('[data-testid="next-meeting-confirm"]');
await p.getByText("2차 미팅").first().waitFor();
await p.click('[data-testid="note-button"]');
await p.fill('[data-testid="note-text"]', "대표님이 다음 미팅에 세무사 동석을 원하심");
await p.click('[data-testid="note-confirm"]');
await p.getByTestId("note-item").first().waitFor();
await open(p, `/leads/${DAEHAN}/report`);
await p.getByRole("radio", { name: "완료" }).click();
await p.getByRole("radio", { name: "관심 높음" }).click();
await p.getByRole("radio", { name: "재방문 필요" }).click();
await p.fill('[data-testid="next-date"]', tomorrow);
await p.getByTestId("next-meeting-time-h11").click();
await p.fill('[data-testid="memo"]', "세무사 동석. 가지급금 정리 방향 합의, 3차에 견적 제시");
await p.click('[data-testid="report-submit"]');
await p.getByTestId("report-done").waitFor();
await open(p, `/leads/${DAEHAN}`);
await p.locator("text=차수별 미팅 결과").scrollIntoViewIfNeeded();
await p.evaluate(() => window.scrollBy(0, 330));
await p.waitForTimeout(300);
await snap(p, "d-rounds");
await p.context().close();

// 5) 교육: 달력(PC, 비서) + AI 핵심 정리(모바일)
p = await as(ID.secretary, { width: 1440, height: 900 }, 1.5);
await open(p, "/trainings/schedule");
await p.evaluate(() => window.scrollTo(0, 120));
await snap(p, "d-schedule");
await p.context().close();
p = await as(ID.cA, { width: 390, height: 844 }, 3);
await open(p, `/trainings/${T1}`);
await p.evaluate(() => {
  const h = [...document.querySelectorAll("h2")].find((e) => e.textContent?.includes("핵심 정리"));
  h?.scrollIntoView({ block: "start" });
  window.scrollBy(0, -100);
});
await snap(p, "m-training");
await p.context().close();

await browser.close();
console.log("captured");
