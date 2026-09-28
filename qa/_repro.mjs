import { chromium } from "@playwright/test";
const B = process.env.B || "https://mirae-leadflow-os.vercel.app";
const b = await chromium.launch({ channel: "chromium", args: ["--ignore-certificate-errors"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
const log = [];
ctx.on("page", () => {});
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") log.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
p.on("pageerror", (e) => log.push("[pageerror main] " + e.message.slice(0, 300)));
p.on("frameattached", (f) => log.push("frame attached"));
p.on("requestfailed", (r) => log.push(`[reqfail] ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
p.on("response", (r) => { if (r.status() >= 400) log.push(`[${r.status()}] ${r.url().slice(0, 140)}`); });
await p.goto(B + "/", { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(1500);
for (const mode of ["PC+Mobile", "Mobile", "PC", "Mobile", "PC+Mobile"]) {
  await p.getByRole("tab", { name: mode, exact: true }).first().click();
  await p.waitForTimeout(4000);
  const main = await p.evaluate(() => !!document.querySelector('[data-testid="recovery-screen"]'));
  const f = p.frames().find((x) => x !== p.mainFrame());
  const inFrame = f ? await f.evaluate(() => !!document.querySelector('[data-testid="recovery-screen"]') || document.body.innerText.slice(0, 80)).catch((e) => "ERR " + e.message.slice(0, 60)) : "no frame";
  console.log(mode, "main recovery:", main, "| frame:", inFrame);
}
console.log(log.join("\n"));
await p.screenshot({ path: "qa/screenshots/repro.png" });
await b.close();
