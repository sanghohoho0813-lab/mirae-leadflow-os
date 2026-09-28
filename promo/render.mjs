// scenes.html → 30fps 프레임 → MP4 (H.264). 사용: node promo/render.mjs
// ffmpeg: FFMPEG 환경변수 또는 PATH의 ffmpeg (pip install imageio-ffmpeg 로도 받을 수 있음)
import { chromium } from "@playwright/test";
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const FPS = 30;
const FRAMES = "promo/.frames";
const OUT = process.env.OUT ?? "public/intro/leadflow-intro.mp4";
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const only = process.env.ONLY ? process.env.ONLY.split(",").map(Number) : null; // 확인용: ONLY=5,9.5 → 그 순간만 PNG

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
const browser = await chromium.launch();
// 기본은 세로(릴스) 9:16. 가로판은 SCENES=promo/scenes.html SIZE=1920x1080
const SCENES = process.env.SCENES ?? "promo/scenes-vertical.html";
const [W, H] = (process.env.SIZE ?? (SCENES.includes("vertical") ? "1080x1920" : "1920x1080")).split("x").map(Number);
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto("file://" + resolve(SCENES));
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode()));
  if (window.ready) await window.ready;
});
const DURATION = await page.evaluate(() => window.DURATION);

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
  // 앱 팝업용: H.264를 못 트는 브라우저를 위한 WebM, 그리고 첫 화면(포스터)
  const base = OUT.replace(/\.mp4$/, "");
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", OUT, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", "-cpu-used", "4", "-an", `${base}.webm`], { stdio: "inherit" });
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", "2.2", "-i", OUT, "-frames:v", "1", "-vf", `scale=${Math.min(W, 1280)}:-2`, "-q:v", "4", OUT.replace(/[^/]+$/, "poster.jpg")], { stdio: "inherit" });
  console.log(`wrote ${OUT}, ${base}.webm, poster.jpg (${n} frames)`);
}
await browser.close().catch(() => {});
