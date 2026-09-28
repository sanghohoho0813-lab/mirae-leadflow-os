import { test, expect, type Browser, type Page } from "@playwright/test";
import { execSync } from "node:child_process";

// 스마트 사업단 demo people. Consultant A and E start with no open meeting
// (one active meeting per person), B has 우림식품 today, C has 그린바이오 unreported.
const U = {
  owner: "10000000-0000-4000-8000-000000000001", // 송하균 단장
  caller: "10000000-0000-4000-8000-000000000003", // 이제원 콜팀장
  cA: "10000000-0000-4000-8000-000000000004",
  cB: "10000000-0000-4000-8000-000000000005",
  cC: "10000000-0000-4000-8000-000000000006",
  cE: "10000000-0000-4000-8000-000000000010",
  leader2: "10000000-0000-4000-8000-000000000007", // 서인수 2본부 본부장
  secretary: "10000000-0000-4000-8000-000000000018", // 이미라 비서 팀장
  gwangju: "10000000-0000-4000-8000-000000000017", // 광주 상무본부 컨설턴트 G
  otherOwner: "20000000-0000-4000-8000-000000000001",
};
const UURIM = "30000000-0000-4000-8000-000000000008"; // 우림식품, 컨설턴트 B
const GREENBIO = "30000000-0000-4000-8000-000000000010"; // 그린바이오, 컨설턴트 C (결과 미입력)
const SHOT = "qa/screenshots";

async function loginAs(browser: Browser, userId: string, viewport = { width: 1440, height: 900 }): Promise<Page> {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("pageerror: " + e.message); });
  await go(page, "/login");
  await page.click(`[data-testid="login-${userId}"]`);
  await page.waitForURL("**/");
  await settle(page);
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
  await settle(page);
  return res;
}

/** Hydrated, and streamed Suspense content has replaced the loading skeleton. */
async function settle(page: Page) {
  await page.waitForSelector('body[data-hydrated="1"]', { timeout: 15000 });
  // A not-found page can leave one inert template behind; don't wait forever for it.
  await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'), null, { timeout: 3000 }).catch(() => {});
}

function tomorrow(): string {
  const d = new Date(Date.now() + 86400000 + 9 * 3600000);
  return d.toISOString().slice(0, 10);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  if (process.env.E2E_SKIP_SEED === "1") return; // server uses its own fresh built-in DB
  execSync("node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed.mjs", { stdio: "inherit" });
});

let leadId = "";

test("1. CALLER registers a new DB (DRAFT)", async ({ browser }) => {
  const page = await loginAs(browser, U.caller);
  await expect(page.getByRole("heading", { name: /오늘 할 일/ })).toBeVisible();
  await shot(page, "01-caller-home");
  await go(page, "/leads/new");
  await page.fill("#company_name", "QA테스트기업(주)");
  // Pasting the full address fills 지역 automatically.
  await page.fill("#address", "경기도 수원시 영통구 광교로 147, 3층");
  await expect(page.locator("#region")).toHaveValue("경기 수원시");
  // 업종: two taps. 미팅 방식 is gone (always 방문), and so are the separate memo boxes.
  await page.getByTestId("industry-group-제조").click();
  await page.getByTestId("industry-금속·기계").click();
  await expect(page.getByRole("radio", { name: "방문" })).toHaveCount(0);
  await expect(page.locator("#public_summary, #meeting_reason, #caution")).toHaveCount(0);
  await page.fill("#meeting_date", tomorrow());
  await page.getByTestId("meeting-time-h14").click();
  await page.getByTestId("meeting-time-zero").click();
  await page.fill("#contact_name", "홍길동");
  await page.getByTestId("title-전무이사").click();
  await expect(page.locator("#contact_title")).toHaveValue("전무이사");
  await page.fill("#contact_phone", "010-5555-1234");
  await page.getByRole("button", { name: "정책자금" }).click();
  await page.getByRole("button", { name: "기업부설연구소" }).click();
  await page.fill('[data-testid="interest-custom"]', "스마트공장");
  await page.getByTestId("interest-add").click();
  await expect(page.getByRole("button", { name: /스마트공장/ })).toHaveAttribute("aria-pressed", "true");
  await page.fill("#extra_note", "작년 매출 35억, 신용보증 이용 이력 있음\n주의: 오후 2시 이후 방문 선호");
  await shot(page, "02-caller-new-form");
  await page.click('[data-testid="lead-submit"]');
  await page.waitForURL(/\/leads\/[0-9a-f-]{36}/);
  leadId = page.url().match(/\/leads\/([0-9a-f-]{36})/)![1];
  await expect(page.getByText("공개 대기").first()).toBeVisible();
  await expect(page.getByTestId("contact-phone")).toContainText("010-5555-1234"); // creator sees private
  await expect(page.getByTestId("interest-tags")).toContainText("스마트공장");
  await expect(page.getByTestId("meeting-at")).toContainText("14:00");
  // The one-line public summary is written automatically from 업종 + 관심 분야.
  await expect(page.getByRole("main")).toContainText("제조 · 금속·기계, 정책자금·기업부설연구소·스마트공장 관심");
  await shot(page, "03-caller-lead-created");
  await page.context().close();
});

test("2. Consultant cannot see DRAFT lead; OWNER publishes it", async ({ browser }) => {
  const c = await loginAs(browser, U.cA);
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
  const a = await loginAs(browser, U.cA);
  const b = await loginAs(browser, U.cE);
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
  await expect(winner.getByTestId("call-comment")).toContainText("오후 2시");
  await expect(winner.getByRole("main")).toContainText("홍길동 전무이사");
  await expect(winner.getByRole("main").getByTestId("address-text")).toHaveText("경기도 수원시 영통구 광교로 147, 3층");
  await shot(winner, "08-consultant-claim-won");

  // Loser reloads: sees assigned status, no private info, no report access.
  await loser.reload();
  await settle(loser);
  await expect(loser.getByText("배정 완료").first()).toBeVisible();
  await expect(loser.getByTestId("contact-phone")).toHaveCount(0);
  await go(loser, `/leads/${leadId}/report`);
  await loser.waitForURL(`**/leads/${leadId}`);

  // Make the test deterministic downstream: ensure 컨설턴트 A is the assignee.
  if (!aWon) {
    const owner = await loginAs(browser, U.owner);
    await go(owner, `/leads/${leadId}`);
    await owner.click('[data-testid="reassign-button"]');
    await owner.selectOption('[data-testid="reassign-select"]', U.cA);
    await owner.click('[data-testid="reassign-confirm"]');
    await expect(owner.getByTestId("assignee")).toHaveText("컨설턴트 A");
    await owner.context().close();
  }
  await a.context().close();
  await b.context().close();
});

test("4. Assignee submits a click-first meeting report -> follow-up created", async ({ browser }) => {
  const a = await loginAs(browser, U.cA);
  await go(a, `/leads/${leadId}`);
  await expect(a.getByTestId("assignee")).toHaveText("컨설턴트 A");
  await a.getByRole("link", { name: /미팅 결과 입력/ }).click();
  await a.waitForURL(`**/leads/${leadId}/report`);
  await expect(a.getByTestId("report-submit")).toBeDisabled();
  await a.getByRole("radio", { name: "완료" }).click();
  await a.getByRole("radio", { name: "관심 높음" }).click();
  await a.getByRole("radio", { name: "후속상담 필요" }).click();
  await expect(a.getByRole("radio", { name: "전화" })).toHaveAttribute("aria-checked", "true"); // smart default
  // 상담 분야 comes preselected from the call memo's interest tags.
  await expect(a.getByRole("button", { name: /정책자금/ }).first()).toHaveAttribute("aria-pressed", "true");
  await a.getByRole("button", { name: "재무제표" }).click();
  await a.getByRole("button", { name: "3일 후" }).click();
  await a.fill('[data-testid="next-note"]', "재무제표 받았는지 확인 전화");
  await a.fill('[data-testid="memo"]', "신규 생산라인 도입 검토 중. 다음 주 재방문 가능, 제품 소개자료 요청");
  await a.click('[data-testid="detail-memo-open"]');
  await expect(a.getByTestId("detail-memo")).toHaveValue(/대표님 핵심 고민/);
  await shot(a, "09-report-form");
  await a.click('[data-testid="report-submit"]');
  await expect(a.getByTestId("report-done")).toBeVisible();
  await expect(a.getByTestId("report-done")).toContainText("후속조치에 등록");
  await expect(a.getByTestId("report-done")).toContainText("재무제표 받았는지 확인 전화");
  await expect(a.getByTestId("report-done")).toContainText("다음 DB를 신청할 수 있습니다");
  await shot(a, "10-report-done");
  await a.waitForLoadState("networkidle");
  await a.getByRole("link", { name: "DB 상세 보기" }).click();
  await a.waitForURL(new RegExp(`/leads/${leadId}$`));
  await expect(a.getByText("후속 진행").first()).toBeVisible();
  await expect(a.getByTestId("report-item")).toHaveCount(1);
  await expect(a.getByTestId("report-item")).toContainText("재무제표");
  await expect(a.getByTestId("report-item")).toContainText("기업부설연구소");
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

  // Release 대성산업 (3본부 정행래 본부장, tomorrow) then reassign to 컨설턴트 E, then reschedule.
  const daesung = "30000000-0000-4000-8000-000000000009";
  await go(owner, `/leads/${daesung}`);
  await owner.click('[data-testid="release-button"]');
  await owner.click('[data-testid="release-button-confirm"]');
  await expect(owner.getByTestId("assignee")).toHaveText("신청 가능");
  await owner.click('[data-testid="reassign-button"]');
  await owner.selectOption('[data-testid="reassign-select"]', U.cE);
  await owner.click('[data-testid="reassign-confirm"]');
  await expect(owner.getByTestId("assignee")).toHaveText("컨설턴트 E");
  await owner.click('[data-testid="reschedule-button"]');
  await owner.fill("#rs-date", tomorrow());
  await owner.getByTestId("rs-time-h16").click();
  await owner.getByTestId("rs-time-zero").click();
  await owner.click('[data-testid="reschedule-confirm"]');
  await expect(owner.getByTestId("meeting-at")).toContainText("16:00");
  await expect(owner.getByTestId("activity-timeline")).toContainText("일정 변경");
  await shot(owner, "14-owner-release-reassign");

  // Members page + invite code
  await go(owner, "/members");
  await expect(owner.getByTestId("invite-code")).toHaveText("SMART2026");
  await shot(owner, "15-owner-members");
  await owner.context().close();
});

test("6. Assignee completes the follow-up -> lead CLOSED (re-entry)", async ({ browser }) => {
  const a = await loginAs(browser, U.cA);
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
  const m = await loginAs(browser, U.cA, { width: 390, height: 844 });
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
  // Drawer opens from the left (☰ at top-left) and closes
  await m.click('[data-testid="menu-button"]');
  await expect(m.getByTestId("drawer")).toBeVisible();
  await m.waitForTimeout(350);
  const panel = await m.getByRole("dialog", { name: "메뉴" }).boundingBox();
  expect(panel!.x).toBeLessThanOrEqual(1);
  await expect(m.getByTestId("drawer").getByTestId("made-by")).toContainText("미래AI랩");
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
  await expect(p.getByTestId("device-switch-compact")).toBeVisible();
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
  await frame.getByTestId("bottom-nav").getByText("홈", { exact: true }).click();
  await p.waitForURL("**/");
  expect(new URL(p.url()).pathname).toBe("/");

  // Persisted after reload
  await p.reload();
  await settle(p);
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

test("11. Demo mode: no login needed, one click switches role", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await go(p, "/");
  // Fresh visitor lands directly on the 사업단장 dashboard.
  await expect(p.getByTestId("demo-bar")).toBeVisible();
  await expect(p.getByRole("heading", { name: /송하균 단장님/ })).toBeVisible();
  await expect(p.getByTestId("kpi-needs-report")).toBeVisible();
  await shot(p, "19-demo-owner", false);

  // One click → consultant view on the same page. Wait for all background
  // requests first: a refresh used to hang in exactly this state.
  await p.waitForLoadState("networkidle");
  const t0 = Date.now();
  await p.getByTestId(`persona-${U.cA}`).click();
  await expect(p.getByTestId(`persona-${U.cA}`)).toHaveAttribute("aria-checked", "true", { timeout: 300 });
  await expect(p.getByRole("heading", { name: /컨설턴트 A님/ })).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(3000);
  await expect(p.getByTestId("sidebar").getByRole("link", { name: "신청 가능 DB" })).toBeVisible();
  await expect(p.getByTestId("sidebar").getByRole("link", { name: "전체 이력" })).toHaveCount(0);
  await shot(p, "20-demo-consultant", false);

  // One click → caller.
  await p.getByTestId(`persona-${U.caller}`).click();
  await expect(p.getByRole("heading", { name: /이제원 콜팀장님/ })).toBeVisible();

  // Same DB detail seen by two roles: owner sees contact, other consultant does not.
  await go(p, `/leads/${UURIM}`);
  await p.getByTestId(`persona-${U.owner}`).click();
  await expect(p.getByTestId("contact-phone")).toBeVisible();
  await p.getByTestId(`persona-${U.cC}`).click();
  await expect(p.getByTestId("private-locked")).toBeVisible();
  await expect(p.getByTestId("contact-phone")).toHaveCount(0);

  // Reset restores seed data.
  await p.getByTestId("demo-reset").click();
  await p.getByTestId("demo-reset-confirm").click();
  await expect(p.getByText("처음 상태로 되돌렸습니다")).toBeVisible();
  await ctx.close();
});

test("12. Demo mode on mobile 390: role bar fits without horizontal scroll", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await go(p, "/");
  await expect(p.getByTestId("demo-bar")).toBeVisible();
  expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await p.getByTestId(`persona-${U.cA}`).click();
  await expect(p.getByRole("heading", { name: /컨설턴트 A님/ })).toBeVisible();
  await shot(p, "m390-08-demo-bar", false);
  await ctx.close();
});

test("13. Address: copy address, copy meeting info, open in map apps", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  const p = await ctx.newPage();
  // 컨설턴트 B is not in the short role bar (one per 본부) — pick from the login list.
  await go(p, "/login");
  await p.click(`[data-testid="login-${U.cB}"]`);
  await p.waitForURL("**/");
  await settle(p);
  await expect(p.getByRole("heading", { name: /컨설턴트 B님/ })).toBeVisible();
  await go(p, `/leads/${UURIM}`);
  const main = p.getByRole("main");
  await expect(main.getByTestId("address-text")).toHaveText("인천 부평구 부평대로 283");
  await main.getByTestId("copy-address").click();
  expect(await p.evaluate(() => navigator.clipboard.readText())).toBe("인천 부평구 부평대로 283");
  await main.getByTestId("copy-meeting-info").click();
  const info = await p.evaluate(() => navigator.clipboard.readText());
  expect(info).toContain("[미팅] 우림식품(주)");
  expect(info).toContain("장소: 인천 부평구 부평대로 283");
  expect(info).toContain("010-3333-0008");
  await expect(main.getByRole("link", { name: /카카오맵/ })).toHaveAttribute("href", /map\.kakao\.com\/link\/search\//);
  await expect(main.getByRole("link", { name: /네이버지도/ })).toHaveAttribute("href", /map\.naver\.com\/p\/search\//);
  expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await main.getByTestId("meeting-address").scrollIntoViewIfNeeded();
  await shot(p, "m390-09-address", false);

  // Before claiming, another consultant sees neither the address nor the copy buttons.
  await p.getByTestId(`persona-${U.cA}`).click();
  await expect(main.getByTestId("private-locked")).toBeVisible();
  await expect(main.getByTestId("meeting-address")).toHaveCount(0);
  await ctx.close();
});

test("14. Map view: pins for 수도권, others listed, tab kept when switching", async ({ browser }) => {
  const p = await loginAs(browser, U.owner);
  await go(p, "/leads?tab=all");
  await p.getByTestId("view-map").click();
  await p.waitForURL(/view=map/);
  expect(new URL(p.url()).searchParams.get("tab")).toBe("all");
  await expect(p.locator(".lf-pin").first()).toBeVisible();
  const pins = await p.locator(".lf-pin").count();
  expect(pins).toBeGreaterThanOrEqual(8);
  await expect(p.getByTestId("map-outside")).toContainText("충북 청주시");
  await p.locator(".leaflet-marker-icon").first().click({ force: true });
  await expect(p.locator(".lf-popup-title")).toBeVisible();
  await shot(p, "21-map-all", false);
  // Switching tab keeps the map view.
  await p.getByTestId("tab-open").click();
  await p.waitForURL(/tab=open/);
  expect(new URL(p.url()).searchParams.get("view")).toBe("map");
  await expect(p.locator(".lf-pin").first()).toBeVisible();
  // Popup link goes to the lead.
  await p.locator(".leaflet-marker-icon").first().click({ force: true });
  await p.locator(".lf-popup-link").click();
  await p.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
  await p.context().close();
});

test("15. 설정: 글자 크기 · 9 themes · 움직임 줄이기 — apply at once, persist, reach the mobile preview", async ({ browser }) => {
  const p = await loginAs(browser, U.owner);
  const primary = () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--theme-primary").trim());
  const rootPx = () => p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(await primary()).toBe("#087a83"); // default: 딥 틸
  expect(await rootPx()).toBe(17);
  // 설정 lives in the left menu.
  await p.getByTestId("sidebar").getByRole("link", { name: /설정/ }).click();
  await p.waitForURL("**/settings");
  await expect(p.getByTestId("my-info")).toContainText("송하균");
  for (const key of ["navy", "navy-gold", "emerald-gold", "forest-sage", "deep-teal", "onyx-gold", "burgundy-slate", "plum-indigo", "steel-platinum"]) {
    await expect(p.getByTestId(`theme-${key}`)).toBeVisible();
  }
  await p.getByTestId("font-xlarge").click();
  expect(await rootPx()).toBe(21);
  await p.getByTestId("theme-burgundy-slate").click();
  expect(await primary()).toBe("#7a2b47");
  await p.getByTestId("motion-toggle").check();
  await expect(p.locator("html")).toHaveAttribute("data-motion", "reduce");
  await shot(p, "22-settings", false);
  await p.reload();
  await settle(p);
  expect(await primary()).toBe("#7a2b47");
  expect(await rootPx()).toBe(21);
  expect(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await p.getByRole("tab", { name: "PC+Mobile" }).first().click();
  const frameHtml = p.frameLocator('[data-testid="device-frame"] iframe').locator("html");
  await expect(frameHtml).toHaveAttribute("data-theme", "burgundy-slate");
  await expect(frameHtml).toHaveAttribute("data-font", "xlarge");
  await shot(p, "23-settings-dual", false);
  await p.getByRole("tab", { name: "PC", exact: true }).first().click();
  // Back to defaults.
  await p.getByTestId("font-normal").click();
  await p.getByTestId("theme-deep-teal").click();
  await p.getByTestId("motion-toggle").uncheck();
  expect(await primary()).toBe("#087a83");
  expect(await rootPx()).toBe(17);
  await p.context().close();
});

test("16. Mobile nav: tapped tab highlights immediately", async ({ browser }) => {
  const p = await loginAs(browser, U.cA, { width: 390, height: 844 });
  for (const label of ["신청 가능", "교육", "홈"]) {
    const t = Date.now();
    await p.getByTestId("bottom-nav").getByText(label, { exact: true }).click();
    await expect(p.getByTestId("bottom-nav").locator('a[aria-current="page"]')).toContainText(label, { timeout: 1000 });
    expect(Date.now() - t).toBeLessThan(700);
  }
  await p.context().close();
});

test("17. Device View never bricks the app: Mobile → reload → back to PC; bad saved state ignored", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await go(p, "/");
  for (const path of ["/", "/leads?tab=all&view=map", "/leads/30000000-0000-4000-8000-000000000006"]) {
    await go(p, path);
    await p.getByRole("tab", { name: "Mobile", exact: true }).click();
    await expect(p.getByTestId("device-frame")).toBeVisible();
    await p.reload();
    await expect(p.getByTestId("device-frame")).toBeVisible({ timeout: 15000 });
    await p.getByRole("tab", { name: "PC", exact: true }).click();
    await expect(p.getByTestId("sidebar")).toBeVisible();
  }
  await expect(p.getByText("Application error")).toHaveCount(0);
  // Garbage in localStorage must not break loading.
  await p.evaluate(() => { localStorage.setItem("lf_device_mode", "banana"); localStorage.setItem("lf_theme", "no-such-theme"); });
  await p.reload();
  await expect(p.getByTestId("sidebar")).toBeVisible();
  await p.evaluate(() => { localStorage.removeItem("lf_device_mode"); localStorage.removeItem("lf_theme"); });
  expect(errors.filter((e) => !/Minified React error #418/.test(e))).toEqual([]);
  await ctx.close();
});

test("18. Sidebar: grouped sections, one active item, live badges", async ({ browser }) => {
  const p = await loginAs(browser, U.owner);
  const side = p.getByTestId("sidebar");
  for (const title of ["오늘 업무", "DB", "교육", "관리"]) await expect(side.getByText(title, { exact: true })).toBeVisible();
  await expect(side.getByTestId("org-name")).toHaveText("스마트 사업단");
  await expect(side.getByTestId("made-by")).toContainText("미래AI랩");
  await go(p, "/leads?tab=needs_report");
  await expect(side.locator('a[aria-current="page"]')).toHaveCount(1);
  await expect(side.locator('a[aria-current="page"]')).toContainText("결과 미입력");
  const needsLink = side.getByRole("link", { name: /결과 미입력/ });
  await expect(needsLink).toContainText(/\d+/);
  await shot(p, "24-sidebar-owner", false);
  await p.context().close();

  const c = await loginAs(browser, U.cA, { width: 390, height: 844 });
  await expect(c.getByTestId("bottom-nav")).toBeVisible();
  await shot(c, "m390-10-bottom-nav-badges", false);
  await c.context().close();
});

test("19. One active meeting per person: blocked until the result is in; 단장 can change the limit", async ({ browser }) => {
  const c = await loginAs(browser, U.cC);
  await expect(c.getByTestId("first-todo")).toContainText("그린바이오");
  await expect(c.getByTestId("claim-limit-note")).toBeVisible();
  const cleancare = "30000000-0000-4000-8000-000000000004";
  await go(c, `/leads/${cleancare}`);
  await expect(c.getByTestId("claim-limit")).toContainText("그린바이오");
  await expect(c.getByTestId("claim-button")).toHaveCount(0);
  await shot(c, "25-claim-limit", false);
  await c.getByRole("link", { name: /그 미팅 결과 입력하기/ }).click();
  await c.waitForURL(`**/leads/${GREENBIO}/report`);

  const owner = await loginAs(browser, U.owner);
  await go(owner, "/members");
  await owner.getByTestId("claim-limit-2").click();
  await expect(owner.getByText("한 사람당 2건으로 바꿨습니다.")).toBeVisible();
  await go(c, `/leads/${cleancare}`);
  await expect(c.getByTestId("claim-button")).toBeVisible();
  await owner.getByTestId("claim-limit-1").click();
  await expect(owner.getByText("한 사람당 1건으로 바꿨습니다.")).toBeVisible();
  await go(c, `/leads/${cleancare}`);
  await expect(c.getByTestId("claim-limit")).toBeVisible();
  await owner.context().close();
  await c.context().close();
});

test("20. 교육 자료실: 단장 uploads material, summary is built, files download, consultants confirm reading", async ({ browser }) => {
  const owner = await loginAs(browser, U.owner);
  await go(owner, "/trainings");
  await expect(owner.getByTestId("training-card").first()).toBeVisible();
  await shot(owner, "26-trainings-list", false);
  await owner.getByRole("link", { name: /교육 자료 올리기/ }).click();
  await owner.waitForURL("**/trainings/new");
  await owner.fill('[data-testid="training-title"]', "QA 교육: 고용지원금 명부 진단 실습");
  await owner.fill('[data-testid="training-content"]', [
    "오늘은 4대보험 가입자 명부로 고용지원금 가능성을 진단하는 실습을 했습니다.",
    "명부에서 최근 입사자와 나이, 고용 형태를 반드시 확인하세요.",
    "최근 인원 감축이 있으면 지원이 제한될 수 있으니 꼭 질문해야 합니다.",
    "채용 계획이 있는 회사는 채용 전에 상담해야 놓치지 않습니다.",
    "대표님께는 \"받으실 수 있는 지원금을 놓치고 계신지 확인해 드리는 겁니다\"라고 말씀드리세요.",
    "미팅이 끝나면 결과 입력에서 4대보험 가입자 명부를 받을 자료로 체크하세요.",
  ].join("\n"));
  const big = Buffer.alloc(5 * 1024 * 1024 + 123, 7); // 3 pieces of 2MB
  await owner.setInputFiles('[data-testid="training-file-input"]', [
    { name: "실습_체크리스트.txt", mimeType: "text/plain", buffer: Buffer.from("□ 최근 입사자 표시\n□ 청년 여부 확인\n□ 인원 감축 여부 질문\n") },
    { name: "교육_녹화.mp4", mimeType: "video/mp4", buffer: big },
  ]);
  await expect(owner.getByText("실습_체크리스트.txt")).toBeVisible();
  await shot(owner, "27-training-new", false);
  await owner.click('[data-testid="training-submit"]');
  await owner.waitForURL(/\/trainings\/[0-9a-f-]{36}$/, { timeout: 60000 });
  const trainingUrl = owner.url();
  await expect(owner.getByTestId("summary-one-line")).toBeVisible();
  await expect(owner.getByTestId("training-summary")).toContainText("기본 요약");
  await expect(owner.getByTestId("training-summary")).toContainText("명부");
  await expect(owner.getByTestId("training-file")).toHaveCount(2);
  await shot(owner, "28-training-detail-owner");
  // In-app preview of the checklist, then the multi-piece file comes back byte-for-byte.
  await owner.getByTestId("training-file").filter({ hasText: "실습_체크리스트.txt" }).getByTestId("file-preview").click();
  await expect(owner.getByTestId("file-preview-text")).toContainText("인원 감축 여부 질문");
  await owner.keyboard.press("Escape");
  const [dl] = await Promise.all([owner.waitForEvent("download"), owner.getByTestId("training-file").filter({ hasText: "교육_녹화.mp4" }).getByTestId("file-download").click()]);
  expect(dl.suggestedFilename()).toBe("교육_녹화.mp4");
  const fs = await import("node:fs");
  expect(fs.statSync((await dl.path())!).size).toBe(big.length);

  // Consultant: sees it as new, reads, confirms.
  const c = await loginAs(browser, U.cA, { width: 390, height: 844 });
  await go(c, "/trainings");
  const card = c.getByTestId("training-card").filter({ hasText: "QA 교육" });
  await expect(card.getByTestId("training-new")).toBeVisible();
  await expect(c.getByRole("link", { name: /교육 자료 올리기/ })).toHaveCount(0);
  await card.click();
  await c.waitForURL(/\/trainings\/[0-9a-f-]{36}$/);
  await c.getByTestId("summary-copy").click();
  // 자료 모아보기: every material in one list, previewable by anyone.
  const detailUrl = c.url();
  await go(c, "/trainings?view=files");
  await expect(c.getByTestId("file-library").getByTestId("training-file").filter({ hasText: "실습_체크리스트.txt" })).toBeVisible();
  await c.getByTestId("training-file").filter({ hasText: "실습_체크리스트.txt" }).getByTestId("file-preview").click();
  await expect(c.getByTestId("file-preview-text")).toContainText("최근 입사자");
  await c.keyboard.press("Escape");
  await go(c, detailUrl);
  await c.getByTestId("training-read").click();
  await expect(c.getByTestId("training-read-done")).toBeVisible();
  await shot(c, "m390-11-training-read", false);
  await go(c, "/trainings/new");
  await c.waitForURL("**/trainings");
  // Search finds past trainings by what was said.
  await go(c, "/trainings?q=" + encodeURIComponent("인원 감축"));
  await expect(c.getByTestId("training-card").filter({ hasText: "QA 교육" })).toBeVisible();
  await c.context().close();

  // 단장 sees who confirmed.
  await go(owner, trainingUrl);
  await expect(owner.getByTestId("read-status")).toContainText("1명 확인");
  await expect(owner.getByTestId("read-status")).toContainText("아직 안 본 사람");
  await owner.context().close();
});

test("21. Header shows today's date and a live clock (Korea time)", async ({ browser }) => {
  const p = await loginAs(browser, U.owner);
  const clock = p.getByRole("banner").getByTestId("live-clock").first();
  await expect(clock).toContainText(/\d{4}년 \d{1,2}월 \d{1,2}일 \([일월화수목금토]\)/);
  const first = await clock.innerText();
  await p.waitForTimeout(1300);
  expect(await clock.innerText()).not.toBe(first);
  await p.context().close();
});

test("22. Device preview never tears down the app: typed text survives switching views", async ({ browser }) => {
  const p = await loginAs(browser, U.owner);
  const errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await go(p, "/trainings");
  await p.fill('[data-testid="training-search"]', "아직 안 누른 검색어");
  for (let i = 0; i < 3; i++) {
    for (const mode of ["PC+Mobile", "Mobile", "PC"]) {
      await p.getByRole("tab", { name: mode, exact: true }).first().click();
      await p.waitForTimeout(250);
    }
  }
  // Same app instance all along: the half-typed search is still there.
  await expect(p.getByTestId("training-search")).toHaveValue("아직 안 누른 검색어");
  await expect(p.getByTestId("recovery-screen")).toHaveCount(0);
  expect(errors).toEqual([]);
  await p.context().close();
});

test("23. Quick 신청 from the list, then the one-meeting rule kicks in", async ({ browser }) => {
  const c = await loginAs(browser, U.cA, { width: 390, height: 844 });
  const quick = c.locator('[data-testid^="quick-claim-"]').first();
  await expect(quick).toBeVisible();
  await quick.click();
  await expect(c.getByTestId("quick-claim-dialog")).toBeVisible();
  await shot(c, "m390-12-quick-claim", false);
  await c.getByTestId("quick-claim-confirm").click();
  await c.waitForURL(/\/leads\/[0-9a-f-]{36}/);
  await expect(c.getByTestId("private-details")).toBeVisible();
  await go(c, "/");
  await expect(c.getByTestId("claim-limit-note")).toBeVisible();
  await expect(c.locator('[data-testid^="quick-claim-"]')).toHaveCount(0);
  await go(c, "/leads?tab=open");
  await expect(c.getByTestId("claim-limit-note")).toBeVisible();
  await c.context().close();
});

const DAEHAN = "30000000-0000-4000-8000-000000000020"; // (주)대한테크, 3본부 컨설턴트 F, 후속 진행 중

test("24. 본부장 DB: 2본부 전용으로 바로 공개, 콜팀장·다른 본부에는 안 보이고 비서에게는 보인다", async ({ browser }) => {
  const leader = await loginAs(browser, U.leader2);
  await go(leader, "/leads/new");
  await expect(leader.getByTestId("scope-fixed")).toContainText("2본부");
  await leader.fill("#company_name", "본부전용QA(주)");
  await leader.fill("#region", "서울 강서구");
  await leader.fill("#meeting_date", tomorrow());
  await leader.getByTestId("meeting-time-h10").click();
  await leader.getByTestId("meeting-time-half").click();
  await leader.fill("#contact_name", "김본부");
  await leader.fill("#contact_phone", "010-7777-2222");
  await leader.click('[data-testid="lead-submit"]');
  await leader.waitForURL(/\/leads\/[0-9a-f-]{36}/);
  const id = leader.url().match(/\/leads\/([0-9a-f-]{36})/)![1];
  await expect(leader.getByTestId("meeting-at")).toContainText("10:30");
  await expect(leader.getByText("2본부 전용 DB").first()).toBeVisible();
  await expect(leader.getByTestId("assignee")).toHaveText("신청 가능");
  await shot(leader, "24-leader-division-db");
  await leader.context().close();

  const caller = await loginAs(browser, U.caller);
  await go(caller, `/leads/${id}`);
  await expect(caller.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  await go(caller, "/leads?tab=all");
  await expect(caller.getByText("본부전용QA(주)")).toHaveCount(0);
  await caller.context().close();

  const e = await loginAs(browser, U.cE); // 3본부
  await go(e, `/leads/${id}`);
  await expect(e.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  await e.context().close();

  const c = await loginAs(browser, U.cC); // 2본부
  await go(c, "/leads?tab=open");
  await expect(c.getByText("본부전용QA(주)")).toBeVisible();
  await c.context().close();

  const sec = await loginAs(browser, U.secretary);
  await go(sec, `/leads/${id}`);
  await expect(sec.getByTestId("contact-phone")).toContainText("010-7777-2222");
  await sec.context().close();
});

test("25. 광주 상무본부: 교육만 보이고 DB 메뉴·신청은 없다", async ({ browser }) => {
  const g = await loginAs(browser, U.gwangju);
  const side = g.getByTestId("sidebar");
  await expect(side.getByRole("link", { name: "교육 자료실" })).toBeVisible();
  await expect(side.getByRole("link", { name: "신청 가능 DB" })).toHaveCount(0);
  await go(g, "/leads?tab=open");
  await expect(g).toHaveURL(/\/$/);
  await shot(g, "25-gwangju-home");
  await g.context().close();
});

test("26. 2차·3차 미팅: 후속 중인 DB에 2차 미팅을 잡고, 메모를 남기고, 결과에서 3차를 잡는다", async ({ browser }) => {
  const owner = await loginAs(browser, U.owner);
  await go(owner, `/leads/${DAEHAN}`);
  await owner.click('[data-testid="next-meeting-button"]');
  await owner.fill('[data-testid="nm-date"]', tomorrow());
  await owner.getByTestId("nm-time-h15").click();
  await owner.click('[data-testid="next-meeting-confirm"]');
  await expect(owner.getByText("2차 미팅").first()).toBeVisible();
  await expect(owner.getByTestId("meeting-at")).toContainText("15:00");

  await owner.click('[data-testid="note-button"]');
  await owner.fill('[data-testid="note-text"]', "2차 때 세무사 동석 요청");
  await owner.click('[data-testid="note-confirm"]');
  await expect(owner.getByTestId("note-item").first()).toContainText("세무사 동석");

  await go(owner, `/leads/${DAEHAN}/report`);
  await expect(owner.getByRole("heading", { name: /2차 미팅 결과/ })).toBeVisible();
  await owner.getByRole("radio", { name: "완료" }).click();
  await owner.getByRole("radio", { name: "관심 높음" }).click();
  await owner.getByRole("radio", { name: "재방문 필요" }).click();
  await expect(owner.getByRole("radio", { name: /^재방문 \(3차 미팅\)$/ })).toHaveAttribute("aria-checked", "true");
  await owner.fill('[data-testid="next-date"]', tomorrow());
  await owner.getByTestId("next-meeting-time-h11").click();
  await owner.fill('[data-testid="memo"]', "2차: 세무사 동석, 가지급금 정리 방향 합의. 3차에 견적 제시");
  await shot(owner, "26-second-round-report");
  await owner.click('[data-testid="report-submit"]');
  await expect(owner.getByTestId("report-done")).toContainText("3차 미팅이");
  await go(owner, `/leads/${DAEHAN}`);
  await expect(owner.getByText("3차 미팅").first()).toBeVisible();
  await expect(owner.getByTestId("meeting-at")).toContainText("11:00");
  await expect(owner.getByTestId("report-item").first()).toContainText("2차 미팅");
  await shot(owner, "26-third-round-booked");
  await owner.context().close();
});

test("27. 교육 일정: 달력·한 달 일정 등록·메뉴 속 작은 달력·오늘 교육 공지", async ({ browser }) => {
  const sec = await loginAs(browser, U.secretary);
  await expect(sec.getByTestId("mini-calendar").first()).toBeVisible();
  await go(sec, "/trainings");
  await expect(sec.getByTestId("training-notice").first()).toContainText("법인영업의 판을 바꿀 실전 교육");
  await go(sec, "/trainings/schedule");
  await expect(sec.getByTestId("schedule-calendar")).toBeVisible();
  await expect(sec.getByTestId("schedule-list")).toContainText("개인투자조합");
  await shot(sec, "27-training-schedule");

  // Next month: 월·수 rows are pre-filled; saving twice never duplicates.
  const now = new Date(Date.now() + 9 * 3600000);
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const ym = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
  await go(sec, `/trainings/schedule/bulk?m=${ym}`);
  const rows = sec.locator('[data-testid^="bulk-row-"]');
  expect(await rows.count()).toBeGreaterThanOrEqual(8);
  await shot(sec, "27-training-bulk");
  await sec.click('[data-testid="bulk-save"]');
  await sec.waitForURL(new RegExp(`/trainings/schedule\\?m=${ym}`));
  await expect(sec.getByTestId("schedule-item").first()).toBeVisible();
  const created = await sec.getByTestId("schedule-item").count();
  expect(created).toBeGreaterThanOrEqual(8);
  await sec.context().close();

  const m = await loginAs(browser, U.cA, { width: 390, height: 844 });
  await go(m, "/trainings/schedule");
  expect(await m.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await shot(m, "m390-27-training-schedule");
  await m.context().close();
});

test("28. 사이드바 이름 누르기 → 본부장·지점장·팀장 화면으로 바꾸기 (위쪽 막대도 그대로)", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await go(p, "/");
  await expect(p.getByTestId("sidebar").getByTestId("made-by")).toHaveText("미래AI랩 · 김상호 기획 및 제작");
  await p.getByTestId("sidebar-persona").click();
  const menu = p.getByTestId("persona-menu");
  await expect(menu).toContainText("사업단 운영");
  await expect(menu).toContainText("2본부");
  await expect(menu).toContainText("지점장");
  await shot(p, "28-persona-menu", false);
  await menu.getByTestId("persona-menu-10000000-0000-4000-8000-000000000013").click(); // 2본부 지점장 B
  await expect(p.getByRole("heading", { name: /지점장 B님/ })).toBeVisible();
  await expect(p.getByTestId("persona-menu")).toHaveCount(0);
  await expect(p.getByTestId("sidebar")).toContainText("2본부 지점장");
  // 위쪽 막대 방식도 그대로
  await p.getByTestId(`persona-${U.leader2}`).click();
  await expect(p.getByRole("heading", { name: /서인수 본부장님/ })).toBeVisible();
  await ctx.close();

  // 모바일: 메뉴(☰) 안 이름으로도 바꾼다
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await m.newPage();
  await go(mp, "/");
  await mp.getByTestId("menu-button").click();
  await mp.getByTestId("drawer-persona").click();
  await mp.getByTestId("persona-menu").getByTestId("persona-menu-10000000-0000-4000-8000-000000000014").click(); // 2본부 팀장 B
  await expect(mp.getByRole("heading", { name: /팀장 B님/ })).toBeVisible();
  expect(await mp.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await m.close();
});

test("29. 샘플 DB: 전체 삭제 · 5개 · 10개 · 20개 추가 · 처음 샘플로", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await go(p, "/");
  await p.getByTestId(`persona-${U.owner}`).click();
  await expect(p.getByRole("heading", { name: /송하균 단장님/ })).toBeVisible();
  const open = async () => { await p.getByTestId("demo-reset").click(); await expect(p.getByTestId("demo-lead-count")).toBeVisible(); };
  const count = async (n: number) => { await open(); await expect(p.getByTestId("demo-lead-count")).toHaveText(`지금 DB ${n}건`); };

  await open();
  await shot(p, "29-sample-db-dialog", false);
  await p.getByTestId("demo-reset-empty").click();
  await expect(p.getByText("샘플 DB를 모두 지웠습니다")).toBeVisible();
  await count(0);
  await p.getByTestId("demo-add-5").click();
  await expect(p.getByText("샘플 DB 5건을 추가했습니다")).toBeVisible();
  await count(5);
  await p.getByTestId("demo-add-10").click();
  await expect(p.getByText("샘플 DB 10건을 추가했습니다")).toBeVisible();
  await count(15);
  await p.getByTestId("demo-add-20").click();
  await expect(p.getByText("샘플 DB 20건을 추가했습니다")).toBeVisible();
  await go(p, "/leads?tab=all");
  await expect(p.locator('[data-testid^="lead-row-"]').first()).toBeVisible();
  expect(await p.locator('[data-testid^="lead-row-"]').count()).toBeGreaterThanOrEqual(20);
  await shot(p, "29-sample-db-added");
  await count(35);
  await p.getByTestId("demo-reset-confirm").click();
  await expect(p.getByText("처음 상태로 되돌렸습니다")).toBeVisible();
  await count(20);
  await ctx.close();
});
