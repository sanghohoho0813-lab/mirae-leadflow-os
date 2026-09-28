// Verifies the AI summary path without a real key: a local mock of the
// Messages API records what the app sends and answers like Claude would.
// Usage: node qa/ai-summary.mjs   (needs a built app: `npm run build`)
// Starts its own server on :3100 with ANTHROPIC_API_KEY/BASE_URL pointing at the mock.
import http from "node:http";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import { zipSync, strToU8 } from "fflate";
import { chromium } from "@playwright/test";

const MOCK_PORT = 8787, APP = "http://localhost:3100";
let mode = "ok"; const seen = [];
const mock = http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    const j = JSON.parse(body); seen.push({ headers: req.headers, body: j });
    if (mode === "fail") { res.writeHead(529, { "content-type": "application/json" }); return res.end('{"type":"error","error":{"type":"overloaded_error"}}'); }
    const text = JSON.stringify({ one_line: "모의 AI: 슬라이드와 PDF를 함께 읽고 정리했습니다.", key_points: ["첫째 핵심", "둘째 핵심", "셋째 핵심"], action_items: ["명부 요청하기"], talk_tracks: ["\"확인해 드리겠습니다.\""], keywords: ["모의", "AI"] });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: "msg_mock", type: "message", role: "assistant", content: [{ type: "text", text: "```json\n" + text + "\n```" }] }));
  });
}).listen(MOCK_PORT);

const env = { ...process.env, PORT: "3100", ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`, ANTHROPIC_MODEL: "claude-sonnet-5" };
const app = spawn("npx", ["next", "start", "-p", "3100"], { env, stdio: "ignore" });
for (let i = 0; i < 60; i++) { try { await fetch(APP + "/setup"); break; } catch { await new Promise((r) => setTimeout(r, 500)); } }

const secret = (fs.readFileSync(".env.local", "utf8").match(/AUTH_SECRET=(.*)/) || [])[1]?.trim() || "local-dev-secret";
const sign = (id) => `${id}.${createHmac("sha256", secret).update(id).digest("hex")}`;
const pptx = Buffer.from(zipSync({
  "ppt/slides/slide1.xml": strToU8('<p:sld><a:p><a:r><a:t>슬라이드1: 고용지원금 진단 순서</a:t></a:r></a:p></p:sld>'),
  "ppt/slides/slide2.xml": strToU8('<p:sld><a:p><a:r><a:t>슬라이드2: 명부 &amp; 퇴사자 확인</a:t></a:r></a:p></p:sld>'),
  "ppt/notesSlides/notesSlide2.xml": strToU8("<p:notes><a:p><a:r><a:t>발표 메모 내용</a:t></a:r></a:p></p:notes>"),
}));
const pdf = Buffer.from("%PDF-1.4\n% mock pdf for the test\n");

let fail = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${ok ? "" : extra}`); if (!ok) fail++; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: "lf_local_session", value: sign("10000000-0000-4000-8000-000000000001"), url: APP }]);
const p = await ctx.newPage();
try {
  await p.goto(APP + "/trainings/new");
  await p.fill('[data-testid="training-title"]', "AI 경로 검증 교육");
  await p.setInputFiles('[data-testid="training-file-input"]', [
    { name: "강의자료.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer: pptx },
    { name: "요약본.pdf", mimeType: "application/pdf", buffer: pdf },
  ]);
  await p.click('[data-testid="training-submit"]');
  await p.waitForURL(/\/trainings\/[0-9a-f-]{36}$/, { timeout: 60000 });
  await p.waitForSelector('[data-testid="summary-one-line"]');
  check("summary saved from AI", (await p.textContent('[data-testid="summary-one-line"]')).includes("모의 AI"));
  check("labelled AI 정리", (await p.textContent('[data-testid="training-summary"]')).includes("AI 정리"));
  const req = seen.at(-1);
  check("sends x-api-key + version", req.headers["x-api-key"] === "test-key" && req.headers["anthropic-version"] === "2023-06-01");
  check("uses configured model", req.body.model === "claude-sonnet-5");
  const blocks = req.body.messages[0].content;
  check("PDF sent as document block", blocks.some((c) => c.type === "document" && c.source.media_type === "application/pdf"));
  const text = blocks.find((c) => c.type === "text")?.text ?? "";
  check("PPTX slide text + notes extracted", text.includes("슬라이드1: 고용지원금 진단 순서") && text.includes("명부 & 퇴사자 확인") && text.includes("발표 메모 내용"), text.slice(0, 200));

  // AI down -> falls back to the basic summary and says so.
  mode = "fail";
  await p.goto(p.url() + "/edit");
  await p.fill('[data-testid="training-content"]', "고용지원금은 명부로 진단합니다. 최근 입사자를 반드시 확인하세요. 퇴사자가 있으면 제한될 수 있습니다. 채용 전에 상담해야 합니다.");
  await p.check('[data-testid="training-auto-summary"]');
  await p.click('[data-testid="training-submit"]');
  await p.waitForURL(/\/trainings\/[0-9a-f-]{36}$/, { timeout: 60000 });
  await p.waitForSelector('[data-testid="summary-one-line"]');
  check("AI failure -> basic summary instead of an error", (await p.textContent('[data-testid="training-summary"]')).includes("기본 요약"));
} finally {
  await b.close(); app.kill(); mock.close();
}
console.log(fail ? `${fail} failed` : "all passed");
process.exit(fail ? 1 : 0);
