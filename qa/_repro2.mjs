import { chromium } from "@playwright/test";
const B = process.env.B || "https://mirae-leadflow-os.vercel.app";
const b = await chromium.launch({ channel: "chromium", args: ["--ignore-certificate-errors"] });
const pages = ["/", "/leads?tab=all", "/leads?tab=all&view=map", "/leads/30000000-0000-4000-8000-000000000006", "/trainings", "/trainings/50000000-0000-4000-8000-000000000001", "/follow-ups", "/members", "/leads/new", "/activity"];
for (const w of [1024, 1280, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  const log = [];
  p.on("pageerror", (e) => log.push("main: " + e.message.slice(0, 200)));
  p.on("frameattached", (f) => {});
  p.on("console", (m) => { if (m.type() === "error") log.push("console: " + m.text().slice(0, 200)); });
  await p.goto(B + "/", { waitUntil: "load", timeout: 90000 });
  for (const path of pages) {
    await p.goto(B + path, { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(800);
    for (const mode of ["PC+Mobile", "Mobile", "PC"]) {
      const tab = p.getByRole("tab", { name: mode, exact: true }).first();
      if (!(await tab.isVisible().catch(() => false))) { log.push(`${path} ${mode}: tab not visible`); continue; }
      await tab.click(); await p.waitForTimeout(2500);
      const bad = await p.evaluate(() => !!document.querySelector('[data-testid="recovery-screen"]') || document.body.innerText.includes("Application error"));
      const fr = p.frames().filter((x) => x !== p.mainFrame());
      let fbad = false;
      for (const f of fr) fbad ||= await f.evaluate(() => !!document.querySelector('[data-testid="recovery-screen"]') || document.body.innerText.includes("Application error") || document.body.innerText.includes("다시 불러와")).catch(() => false);
      if (bad || fbad) log.push(`${w} ${path} ${mode}: main=${bad} frame=${fbad}`);
    }
  }
  console.log(w, log.length ? log.join("\n  ") : "clean");
  await ctx.close();
}
await b.close();
