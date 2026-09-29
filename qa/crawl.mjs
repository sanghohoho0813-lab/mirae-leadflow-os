// Full stability crawl: every page x role x viewport (+ PC+Mobile dual).
// Reports page errors, recovery screens, 404s, horizontal overflow, and text layout
// problems (short labels cut off with "…", text squeezed into a narrow column,
// button text spilling out of its button).
// Usage: node qa/crawl.mjs   (server on :3000, seeded DB, AUTH_SECRET from .env.local)
//        FONT=xlarge node qa/crawl.mjs   (same, with the largest 글자 크기)
import { chromium } from "@playwright/test";
import { createHmac } from "node:crypto";
import fs from "node:fs";
const B = process.env.B || "http://localhost:3000";
const secret = (fs.readFileSync(".env.local", "utf8").match(/AUTH_SECRET=(.*)/) || [])[1]?.trim() || "local-dev-secret";
const sign = (id) => `${id}.${createHmac("sha256", secret).update(id).digest("hex")}`;
const L6 = "30000000-0000-4000-8000-000000000006", L1 = "30000000-0000-4000-8000-000000000001", L4 = "30000000-0000-4000-8000-000000000004", L10 = "30000000-0000-4000-8000-000000000010";
const T1 = "50000000-0000-4000-8000-000000000001", T6 = "50000000-0000-4000-8000-000000000006";
const ROLES = {
  owner: { id: "10000000-0000-4000-8000-000000000001", pages: ["/", "/leads?tab=all", "/leads?tab=needs_report", "/leads?tab=all&view=map", `/leads/${L6}`, `/leads/${L6}/report`, "/leads/new", `/leads/${L6}/edit`, "/follow-ups", "/activity", "/members", "/trainings", `/trainings/${T1}`, `/trainings/${T6}`, "/trainings/new", `/trainings/${T1}/edit`, "/trainings/schedule", "/trainings/schedule/bulk", "/settings"] },
  caller: { id: "10000000-0000-4000-8000-000000000003", pages: ["/", "/leads", "/leads/new", `/leads/${L1}`, `/leads/${L1}/edit`, "/trainings", `/trainings/${T1}`] },
  leader: { id: "10000000-0000-4000-8000-000000000007", pages: ["/", "/leads?tab=division", "/leads/new", "/members", "/trainings", "/trainings/new", `/trainings/${T1}`, "/trainings/schedule"] },
  secretary: { id: "10000000-0000-4000-8000-000000000018", pages: ["/", "/leads?tab=all", "/members", "/trainings/schedule", "/trainings/schedule/bulk"] },
  gwangju: { id: "10000000-0000-4000-8000-000000000017", pages: ["/", "/trainings", "/trainings/schedule", `/trainings/${T1}`] },
  consultant: { id: "10000000-0000-4000-8000-000000000006", pages: ["/", "/leads?tab=open", "/leads?tab=mine", "/leads?tab=open&view=map", `/leads/${L10}`, `/leads/${L10}/report`, `/leads/${L4}`, "/follow-ups", "/trainings", `/trainings/${T1}`, "/trainings/schedule", "/settings"] },
};
const VIEWPORTS = [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1280, h: 800 }, { w: 1440, h: 900, dual: true }];
const IGNORE = /ERR_CERT|Failed to load resource|basemaps|cartocdn|pretendard/i;
const b = await chromium.launch();
let problems = 0, checks = 0;
fs.mkdirSync("qa/screenshots/crawl", { recursive: true });
for (const [role, cfg] of Object.entries(ROLES)) {
  for (const vp of VIEWPORTS) {
    for (const mode of vp.dual ? ["pc", "dual"] : ["pc"]) {
      const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
      await ctx.addCookies([{ name: "lf_local_session", value: sign(cfg.id), url: B }]);
      await ctx.addInitScript(([m, f]) => { try { if (window.self === window.top) localStorage.setItem("lf_device_mode", m); if (f) localStorage.setItem("lf_font", f); } catch {} }, [mode, process.env.FONT || ""]);
      const p = await ctx.newPage();
      const errs = [];
      p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
      p.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) errs.push("console: " + m.text().slice(0, 160)); });
      for (const path of cfg.pages) {
        errs.length = 0; checks++;
        const res = await p.goto(B + path, { waitUntil: "load" });
        await p.waitForTimeout(mode === "dual" ? 2200 : 700);
        const info = await p.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          recovery: !!document.querySelector('[data-testid="recovery-screen"]'),
          notFound: document.body.innerText.includes("페이지를 찾을 수 없습니다"),
          appError: document.body.innerText.includes("Application error"),
          text: (() => {
            const out = [];
            const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" && el.closest("[aria-hidden='true'],.leaflet-container,[data-testid='page-skeleton']") === null; };
            for (const el of document.querySelectorAll("body *")) {
              if (!vis(el)) continue;
              const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("").trim();
              const cs = getComputedStyle(el);
              const fs = parseFloat(cs.fontSize);
              const full = (el.innerText || "").trim();
              // 1) 짧은 이름표가 "…"로 잘림 (긴 설명문은 줄임 허용)
              const clamps = cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none";
              if (clamps && full.length > 0 && full.length <= 14 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2)) out.push(`잘림 "${full.slice(0, 20)}"`);
              // 2) 글자가 좁은 칸에 세로로 쌓임
              if (own.length >= 4 && el.clientWidth > 0 && el.clientWidth < fs * 2.6 && el.getBoundingClientRect().height > fs * 3.2) out.push(`세로 "${own.slice(0, 12)}"`);
              // 3) 버튼·링크 글자가 칸 밖으로 넘침
              if ((el.tagName === "BUTTON" || el.tagName === "A") && cs.overflow !== "visible" ? false : (el.tagName === "BUTTON" && el.scrollWidth > el.clientWidth + 2 && !clamps)) out.push(`넘침 "${full.slice(0, 16)}"`);
            }
            return [...new Set(out)].slice(0, 6);
          })(),
        }));
        let frameRecovery = false;
        if (mode === "dual") {
          const f = p.frames().find((fr) => fr !== p.mainFrame());
          frameRecovery = f ? await f.evaluate(() => !!document.querySelector('[data-testid="recovery-screen"]') || document.body.innerText.includes("Application error")).catch(() => false) : false;
        }
        const bad = [];
        if (res && res.status() >= 400) bad.push(`HTTP ${res.status()}`);
        if (info.overflow > 1) bad.push(`overflow ${info.overflow}px`);
        if (info.recovery || info.appError) bad.push("ERROR SCREEN");
        if (frameRecovery) bad.push("ERROR SCREEN IN MOBILE PREVIEW");
        if (info.notFound) bad.push("404");
        if (info.text.length) bad.push(...info.text);
        if (errs.length) bad.push(...errs);
        if (bad.length) { problems++; console.log(`✘ ${role} ${vp.w}${mode === "dual" ? " dual" : ""} ${path}: ${bad.join(" | ")}`); }
        if (vp.w === 390 || (vp.w === 1440 && mode === "pc")) {
          const name = `${role}-${vp.w}-${path.replace(/[^a-z0-9]+/gi, "_").replace(/_[0-9a-f]{8}_.*?(_|$)/, "_id$1").slice(0, 40)}`;
          await p.screenshot({ path: `qa/screenshots/crawl/${name}.png` });
        }
      }
      await ctx.close();
    }
  }
}
console.log(`\n${checks} page checks, ${problems} with problems`);
await b.close();
process.exit(problems ? 1 : 0);
