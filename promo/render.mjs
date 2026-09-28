// scenes.html → 30fps 프레임 → MP4 (H.264). 사용: node promo/render.mjs
// ffmpeg: FFMPEG 환경변수 또는 PATH의 ffmpeg (pip install imageio-ffmpeg 로도 받을 수 있음)
import { chromium } from "@playwright/test";
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const FPS = 30, DURATION = 41.2;
const FRAMES = "promo/.frames";
const OUT = process.env.OUT ?? "promo/leadflow-intro.mp4";
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const only = process.env.ONLY ? process.env.ONLY.split(",").map(Number) : null; // 확인용: ONLY=5,9.5 → 그 순간만 PNG

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("file://" + resolve("promo/scenes.html"));
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode()));
});
await page.evaluate(() => window.dispatchEvent(new Event("resize")));

if (only) {
  for (const t of only) {
    await page.evaluate((x) => window.render(x), t);
    await page.screenshot({ path: `${FRAMES}/at-${t}.png` });
  }
  console.log(`preview frames in ${FRAMES}`);
} else {
  const n = Math.round(DURATION * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((x) => window.render(x), i / FPS);
    await page.screenshot({ path: `${FRAMES}/${String(i).padStart(5, "0")}.jpg`, type: "jpeg", quality: 92 });
  }
  await browser.close();
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${FRAMES}/%05d.jpg`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], { stdio: "inherit" });
  rmSync(FRAMES, { recursive: true, force: true });
  console.log(`wrote ${OUT} (${n} frames)`);
}
await browser.close().catch(() => {});
