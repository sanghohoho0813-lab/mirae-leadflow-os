import { test, expect, type Browser, type Page } from "@playwright/test";
import { execSync } from "node:child_process";

const U = {
  owner: "10000000-0000-4000-8000-000000000001",
  manager: "10000000-0000-4000-8000-000000000002",
  caller: "10000000-0000-4000-8000-000000000003",
  minsu: "10000000-0000-4000-8000-000000000004",
  jiyoung: "10000000-0000-4000-8000-000000000005",
  sehun: "10000000-0000-4000-8000-000000000006",
  otherOwner: "20000000-0000-4000-8000-000000000001",
};
const SHOT = "qa/screenshots";

async function loginAs(browser: Browser, userId: string, viewport = { width: 1440, height: 900 }): Promise<Page> {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("pageerror: " + e.message); });
  await go(page, "/login");
  await page.click(`[data-testid="login-${userId}"]`);
  await page.waitForURL("**/");
  await page.waitForSelector('body[data-hydrated="1"]');
  return page;
}

/** Evidence screenshot: settle animations first. */
async function shot(page: Page, name: string, fullPage = true) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage, animations: "disabled", caret: "hide" });
}

/** Navigates and waits until React has hydrated (body[data-hydrated]). */
async function go(page: Page, url: string) {
  const res = await page.goto(url);
  await page.waitForSelector('body[data-hydrated="1"]', { timeout: 15000 });
  return res;
}

function tomorrow(): string {
  const d = new Date(Date.now() + 86400000 + 9 * 3600000);
  return d.toISOString().slice(0, 10);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  execSync("node scripts/seed.mjs", { stdio: "inherit" });
});

let leadId = "";

test("1. CALLER registers a new DB (DRAFT)", async ({ browser }) => {
  const page = await loginAs(browser, U.caller);
  await expect(page.getByRole("heading", { name: /오늘 할 일/ })).toBeVisible();
  await shot(page, "01-caller-home");
  await go(page, "/leads/new");
  await page.fill("#company_name", "QA테스트기업(주)");
  await page.fill("#region", "경기 수원시");
  await page.fill("#industry", "정밀 부품 제조");
  await page.fill("#meeting_date", tomorrow());
  await page.fill("#meeting_time", "14:30");
  await page.getByRole("radio", { name: "방문" }).click();
  await page.fill("#public_summary", "정밀부품 제조, 직원 40명, 정책자금·연구소 관심");
  await page.fill("#contact_name", "홍길동");
  await page.fill("#contact_title", "대표");
  await page.fill("#contact_phone", "010-5555-1234");
  await page.fill("#call_topic", "시설자금 정책자금");
  await page.getByRole("button", { name: "정책자금" }).click();
  await page.getByRole("button", { name: "기업부설연구소" }).click();
  await page.getByRole("button", { name: "비용" }).click();
  await page.fill("#meeting_reason", "설비 증설을 위한 시설자금 조달 방법 상담 요청");
  await page.fill("#must_know", "작년 매출 35억, 신용보증 이용 이력 있음");
  await page.fill("#caution", "오후 2시 이후 방문 선호");
  await shot(page, "02-caller-new-form");
  await page.click('[data-testid="lead-submit"]');
  await page.waitForURL(/\/leads\/[0-9a-f-]{36}/);
  leadId = page.url().match(/\/leads\/([0-9a-f-]{36})/)![1];
  await expect(page.getByText("공개 대기").first()).toBeVisible();
  await expect(page.getByTestId("contact-phone")).toContainText("010-5555-1234"); // creator sees private
  await shot(page, "03-caller-lead-created");
  await page.context().close();
});

test("2. Consultant cannot see DRAFT lead; OWNER publishes it", async ({ browser }) => {
  const c = await loginAs(browser, U.minsu);
  await go(c, `/leads/${leadId}`);
  await expect(c.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  await expect(c.getByText("QA테스트기업(주)")).toHaveCount(0);
  await c.context().close();

  const owner = await loginAs(browser, U.owner);
  await page404Free(owner);
  await expect(owner.getByTestId("kpi-needs-report")).toBeVisible();
  await page404Free(owner);
  await shot(owner, "04-owner-home");
  await go(owner, `/leads/${leadId}`);
  await expect(owner.getByText("공개 대기").first()).toBeVisible();
  await owner.click('[data-testid="publish-button"]');
  await expect(owner.getByText("신청 가능").first()).toBeVisible();
  await expect(owner.getByTestId("assignee")).toHaveText("신청 가능");
  await shot(owner, "05-owner-published");
  await owner.context().close();
});

async function page404Free(page: Page) {
  await expect(page.locator("text=페이지를 찾을 수 없습니다")).toHaveCount(0);
}

test("3. Two consultants click 신청 simultaneously — exactly one wins", async ({ browser }) => {
  const a = await loginAs(browser, U.minsu);
  const b = await loginAs(browser, U.jiyoung);
  await go(a, `/leads/${leadId}`);
  await go(b, `/leads/${leadId}`);
  await expect(a.getByTestId("private-locked")).toBeVisible(); // before claim: no private info
  await expect(a.getByTestId("contact-phone")).toHaveCount(0);
  await shot(a, "06-consultant-open-detail");
  await expect(a.getByTestId("claim-button")).toBeVisible();
  await expect(b.getByTestId("claim-button")).toBeVisible();

  await Promise.all([a.click('[data-testid="claim-button"]'), b.click('[data-testid="claim-button"]')]);
  await Promise.all([
    a.waitForFunction(() => !!document.querySelector('[data-testid="private-details"], [data-testid="claim-lost"]')),
    b.waitForFunction(() => !!document.querySelector('[data-testid="private-details"], [data-testid="claim-lost"]')),
  ]);
  const aWon = (await a.getByTestId("private-details").count()) > 0;
  const bWon = (await b.getByTestId("private-details").count()) > 0;
  expect(aWon !== bWon).toBe(true);
  const winner = aWon ? a : b;
  const loser = aWon ? b : a;
  await expect(loser.getByTestId("claim-lost")).toContainText("먼저 신청");
  await shot(loser, "07-consultant-claim-lost");
  await expect(winner.getByTestId("contact-phone")).toContainText("010-5555-1234");
  await expect(winner.getByTestId("caution")).toContainText("오후 2시");
  await shot(winner, "08-consultant-claim-won");

  // Loser reloads: sees assigned status, no private info, no report access.
  await loser.reload();
  await loser.waitForSelector('body[data-hydrated="1"]');
  await expect(loser.getByText("배정 완료").first()).toBeVisible();
  await expect(loser.getByTestId("contact-phone")).toHaveCount(0);
  await go(loser, `/leads/${leadId}/report`);
  await loser.waitForURL(`**/leads/${leadId}`);

  // Make the test deterministic downstream: ensure minsu is the assignee.
  if (!aWon) {
    const owner = await loginAs(browser, U.owner);
    await go(owner, `/leads/${leadId}`);
    await owner.click('[data-testid="reassign-button"]');
    await owner.selectOption('[data-testid="reassign-select"]', U.minsu);
    await owner.click('[data-testid="reassign-confirm"]');
    await expect(owner.getByTestId("assignee")).toHaveText("최민수");
    await owner.context().close();
  }
  await a.context().close();
  await b.context().close();
});

test("4. Assignee submits a click-first meeting report -> follow-up created", async ({ browser }) => {
  const a = await loginAs(browser, U.minsu);
  await go(a, `/leads/${leadId}`);
  await expect(a.getByTestId("assignee")).toHaveText("최민수");
  await a.getByRole("link", { name: /미팅 결과 입력/ }).click();
  await a.waitForURL(`**/leads/${leadId}/report`);
  await expect(a.getByTestId("report-submit")).toBeDisabled();
  await a.getByRole("radio", { name: "완료" }).click();
  await a.getByRole("radio", { name: "관심 높음" }).click();
  await a.getByRole("radio", { name: "후속상담 필요" }).click();
  await expect(a.getByRole("radio", { name: "전화" })).toHaveAttribute("aria-checked", "true"); // smart default
  await a.getByRole("button", { name: "3일 후" }).click();
  await a.fill('[data-testid="memo"]', "신규 생산라인 도입 검토 중. 다음 주 재방문 가능, 제품 소개자료 요청");
  await shot(a, "09-report-form");
  await a.click('[data-testid="report-submit"]');
  await expect(a.getByTestId("report-done")).toBeVisible();
  await expect(a.getByTestId("report-done")).toContainText("후속조치에 등록");
  await shot(a, "10-report-done");
  await a.waitForLoadState("networkidle");
  await a.getByRole("link", { name: "DB 상세 보기" }).click();
  await a.waitForURL(new RegExp(`/leads/${leadId}$`));
  await expect(a.getByText("후속 진행").first()).toBeVisible();
  await expect(a.getByTestId("report-item")).toHaveCount(1);
  await expect(a.getByTestId("activity-timeline")).toContainText("미팅 결과 입력");
  await shot(a, "11-lead-after-report");
  await a.context().close();
});

test("5. OWNER sees the whole picture; releases & reassigns another lead; reschedules", async ({ browser }) => {
  const owner = await loginAs(browser, U.owner);
  await go(owner, "/follow-ups?scope=all");
  await expect(owner.getByText("QA테스트기업(주)")).toBeVisible();
  await shot(owner, "12-owner-follow-ups");
  await go(owner, "/activity");
  await expect(owner.getByTestId("activity-timeline")).toContainText("QA테스트기업(주)");
  await go(owner, "/leads?tab=needs_report");
  await expect(owner.getByText("하나정밀(주)")).toBeVisible();
  await shot(owner, "13-owner-needs-report");

  // Release 대성산업 (assigned to 한지영, tomorrow) then reassign to 오세훈, then reschedule.
  const daesung = "30000000-0000-4000-8000-000000000009";
  await go(owner, `/leads/${daesung}`);
  await owner.click('[data-testid="release-button"]');
  await owner.click('[data-testid="release-button-confirm"]');
  await expect(owner.getByTestId("assignee")).toHaveText("신청 가능");
  await owner.click('[data-testid="reassign-button"]');
  await owner.selectOption('[data-testid="reassign-select"]', U.sehun);
  await owner.click('[data-testid="reassign-confirm"]');
  await expect(owner.getByTestId("assignee")).toHaveText("오세훈");
  await owner.click('[data-testid="reschedule-button"]');
  await owner.fill("#rs-date", tomorrow());
  await owner.fill("#rs-time", "16:00");
  await owner.click('[data-testid="reschedule-confirm"]');
  await expect(owner.getByTestId("meeting-at")).toContainText("16:00");
  await expect(owner.getByTestId("activity-timeline")).toContainText("일정 변경");
  await shot(owner, "14-owner-release-reassign");

  // Members page + invite code
  await go(owner, "/members");
  await expect(owner.getByTestId("invite-code")).toHaveText("MIRAE2026");
  await shot(owner, "15-owner-members");
  await owner.context().close();
});

test("6. Assignee completes the follow-up -> lead CLOSED (re-entry)", async ({ browser }) => {
  const a = await loginAs(browser, U.minsu);
  await go(a, "/follow-ups");
  const card = a.locator('[data-testid^="follow-up-"]', { hasText: "QA테스트기업(주)" });
  await expect(card).toBeVisible();
  await card.locator('[data-testid^="complete-follow-up-"]').click();
  await a.fill('[id^="note-"]', "통화 완료. 자료 검토 후 다음 달 재논의");
  await a.getByRole("radio", { name: "없음 (종료)" }).click();
  await a.click('[data-testid="confirm-complete-follow-up"]');
  await expect(a.getByTestId("complete-follow-up-dialog")).toHaveCount(0);
  await go(a, `/leads/${leadId}`);
  await expect(a.getByText("종료").first()).toBeVisible();
  await expect(a.getByTestId("activity-timeline")).toContainText("후속조치 완료");
  await a.context().close();
});

test("7. Cross-organization isolation and role gates", async ({ browser }) => {
  const other = await loginAs(browser, U.otherOwner);
  await go(other, `/leads/${leadId}`);
  await expect(other.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  await expect(other.getByText("QA테스트기업(주)")).toHaveCount(0);
  await go(other, "/leads?tab=all");
  await expect(other.getByText("타조직상사(주)")).toBeVisible();
  await expect(other.getByText("QA테스트기업(주)")).toHaveCount(0);
  await other.context().close();

  const caller = await loginAs(browser, U.caller);
  await go(caller, "/members");
  await caller.waitForURL("**/");
  await go(caller, "/activity");
  await caller.waitForURL("**/");
  await caller.context().close();
});

test("8. Mobile 390: consultant journey (home -> open DB -> detail -> claim)", async ({ browser }) => {
  const m = await loginAs(browser, U.jiyoung, { width: 390, height: 844 });
  await expect(m.getByTestId("bottom-nav")).toBeVisible();
  await shot(m, "m390-01-consultant-home", false);
  const bodyWidth = await m.evaluate(() => document.documentElement.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(390);
  await m.getByTestId("bottom-nav").getByText("신청 가능").click();
  await m.waitForURL("**/leads?tab=open");
  await shot(m, "m390-02-open-list", false);
  const first = m.locator('[data-testid^="lead-row-"]').first();
  await first.click();
  await m.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
  await expect(m.getByTestId("claim-button")).toBeVisible();
  await shot(m, "m390-03-detail-open", false);
  await m.click('[data-testid="claim-button"]');
  await expect(m.getByTestId("private-details")).toBeVisible();
  await shot(m, "m390-04-detail-claimed", false);
  await m.getByRole("link", { name: /미팅 결과 입력/ }).click();
  await m.waitForURL(/\/report$/);
  await m.getByRole("radio", { name: "완료" }).click();
  await m.getByRole("radio", { name: "보통" }).click();
  await m.getByRole("radio", { name: "자료 요청" }).click();
  await m.getByRole("button", { name: "1주 후" }).click();
  await shot(m, "m390-05-report");
  await m.click('[data-testid="report-submit"]');
  await expect(m.getByTestId("report-done")).toBeVisible();
  await shot(m, "m390-06-report-done");
  // Drawer opens and closes
  await m.click('[data-testid="menu-button"]');
  await expect(m.getByTestId("drawer")).toBeVisible();
  await shot(m, "m390-07-drawer", false);
  await m.getByRole("button", { name: "닫기" }).click();
  await expect(m.getByTestId("drawer")).toHaveCount(0);
  await m.context().close();
});

test("9. Mobile 430: owner home / detail / new form", async ({ browser }) => {
  const m = await loginAs(browser, U.owner, { width: 430, height: 932 });
  await shot(m, "m430-01-owner-home", false);
  expect(await m.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(430);
  await go(m, `/leads/${leadId}`);
  await shot(m, "m430-02-owner-detail", false);
  expect(await m.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(430);
  await go(m, "/leads/new");
  await shot(m, "m430-03-new-form");
  expect(await m.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(430);
  await m.context().close();
});

test("10. Device View: PC / Mobile / PC+Mobile with route sync, no recursion", async ({ browser }) => {
  const p = await loginAs(browser, U.owner);
  await expect(p.getByTestId("device-switch")).toBeVisible();
  await p.getByRole("tab", { name: "PC+Mobile" }).click();
  await expect(p.getByTestId("dual-view")).toBeVisible();
  const frame = p.frameLocator('[data-testid="device-frame"] iframe');
  await expect(frame.getByTestId("bottom-nav")).toBeVisible();
  await expect(frame.getByTestId("device-switch")).toHaveCount(0); // no recursive switch inside frame
  await expect(frame.locator('[data-testid="device-frame"]')).toHaveCount(0); // no nested frame
  await p.waitForTimeout(600);
  await shot(p, "16-dual-view-home", false);

  // PC -> Mobile sync
  await p.getByTestId("sidebar").getByRole("link", { name: "후속조치" }).click();
  await p.waitForURL("**/follow-ups");
  await expect.poll(async () => (await p.locator('[data-testid="device-frame"] iframe').evaluate((el) => (el as HTMLIFrameElement).contentWindow?.location.pathname))).toBe("/follow-ups");
  await p.waitForTimeout(400);
  await shot(p, "17-dual-view-synced", false);

  // Mobile -> PC sync
  await frame.getByTestId("bottom-nav").getByText("대시보드").click();
  await p.waitForURL("**/");
  expect(new URL(p.url()).pathname).toBe("/");

  // Persisted after reload
  await p.reload();
  await p.waitForSelector('body[data-hydrated="1"]');
  await expect(p.getByTestId("dual-view")).toBeVisible();
  const dualScroll = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(dualScroll).toBe(true);

  // Mobile-only stage
  await p.getByRole("tab", { name: "Mobile", exact: true }).click();
  await expect(p.getByTestId("device-frame")).toBeVisible();
  await expect(p.getByTestId("dual-view")).toHaveCount(0);
  await p.waitForTimeout(500);
  await shot(p, "18-mobile-stage", false);
  await p.getByRole("tab", { name: "PC", exact: true }).click();
  await expect(p.getByTestId("device-frame")).toHaveCount(0);
  await p.context().close();
});
