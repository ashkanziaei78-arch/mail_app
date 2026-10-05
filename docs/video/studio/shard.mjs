/* یک برشِ فریم‌ها را می‌کِشد:  node shard.mjs <index> <total> */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
const [IDX, TOT] = [Number(process.argv[2]), Number(process.argv[3])];
const W = 1080, H = 1920, FPS = 30;
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto("file://" + path.join(path.resolve("."), "film.html"));
await page.waitForFunction("typeof window.seek === 'function'");
await page.evaluate(() => Promise.all([...document.images].map(i =>
  i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
const N = Math.round((await page.evaluate(() => window.DUR)) * FPS);
for (let f = IDX; f < N; f += TOT) {
  const p = `frames/f${String(f).padStart(5, "0")}.png`;
  if (fs.existsSync(p)) continue;
  await page.evaluate(t => window.seek(t), f / FPS);
  await page.screenshot({ path: p });
}
await browser.close();
console.log(`برشِ ${IDX} تمام شد`);
