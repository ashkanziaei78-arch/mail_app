/**
 * رندرِ قطعی: برای هر فریم window.seek(t) را صدا می‌زند و عکس می‌گیرد.
 *
 *   node render.mjs            → همهٔ فریم‌ها + انکودِ H.264
 *   node render.mjs sheet      → فقط کانتکت‌شیت (یک فریم سرِ هر ضرب)
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const MODE = process.argv[2] || "full";
const DIR = path.resolve(".");
const W = 1080, H = 1920, FPS = 30;

/* ضرب‌های کلیدی برای کانتکت‌شیت */
const BEATS = [
  1.4, 3.8, 6.0, 8.4, 12.6, 14.6, 16.4, 18.6, 20.4, 22.2, 23.6,
  25.4, 27.2, 29.0, 31.4, 32.6, 34.0, 36.0, 37.4, 39.6, 41.5, 43.6,
  45.4, 48.0, 50.3, 51.4, 53.0, 55.0, 57.4, 59.6, 62.0, 64.6,
  67.4, 70.0, 71.6, 73.6, 75.6, 78.0, 80.4, 82.6, 84.2, 85.9,
  88.0, 90.5, 93.0, 95.2, 97.4, 99.6, 101.8, 103.8, 105.4,
  107.8, 109.0, 110.2, 111.6, 113.0, 114.4, 116.0, 119.0, 121.6, 123.6, 125.4,
];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto("file://" + path.join(DIR, "film.html"));
await page.waitForFunction("typeof window.seek === 'function'");
await page.evaluate(() => Promise.all([...document.images].map(i =>
  i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const DUR = await page.evaluate(() => window.DUR);

if (MODE === "sheet") {
  fs.rmSync("sheet", { recursive: true, force: true });
  fs.mkdirSync("sheet", { recursive: true });
  for (let i = 0; i < BEATS.length; i++) {
    await page.evaluate(t => window.seek(t), BEATS[i]);
    await page.screenshot({ path: `sheet/b${String(i).padStart(2, "0")}_${BEATS[i]}.png` });
  }
  await browser.close();
  /* موزاییکِ ۸ ستونه برای نگاهِ یک‌جا */
  const files = fs.readdirSync("sheet").filter(f => f.endsWith(".png")).sort();
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y",
    "-pattern_type", "glob", "-i", "sheet/*.png",
    "-vf", `scale=270:480,tile=8x${Math.ceil(files.length / 8)}`, "-frames:v", "1", "contact-sheet.png"]);
  console.log(`کانتکت‌شیت ساخته شد: ${files.length} فریم → contact-sheet.png`);
  process.exit(0);
}

const N = Math.round(DUR * FPS);
fs.rmSync("frames", { recursive: true, force: true });
fs.mkdirSync("frames", { recursive: true });
for (let f = 0; f < N; f++) {
  await page.evaluate(t => window.seek(t), f / FPS);
  await page.screenshot({ path: `frames/f${String(f).padStart(5, "0")}.png` });
  if (f % 90 === 0) process.stdout.write(`\r${f}/${N}`);
}
process.stdout.write(`\r${N}/${N}\n`);
await browser.close();

execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y",
  "-framerate", String(FPS), "-i", "frames/f%05d.png",
  "-c:v", "libx264", "-preset", "slow", "-crf", "16",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", "میلینگ-پرس.mp4"], { stdio: "inherit" });
console.log("ساخته شد: میلینگ-پرس.mp4");
