import { chromium } from "playwright";
import fs from "node:fs"; import path from "node:path";
const FPS = 30, DUR = 150;
const OUT = path.resolve("frames9");
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ["--force-color-profile=srgb", "--font-render-hinting=none", "--disable-lcd-text"] });
const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto("file://" + path.resolve("film9.html"));
await p.evaluate(() => document.fonts.ready);
await p.evaluate(async () => {
  for (let t = 0; t <= 150; t += 1) window.SEEK(t);
  window.SEEK(0);
  await Promise.all([...document.images].map(im => im.complete ? 1 : im.decode().catch(() => 1)));
});
await p.waitForTimeout(2500);
const total = DUR * FPS, t0 = Date.now();
for (let i = 0; i < total; i++) {
  await p.evaluate(tt => window.SEEK(tt), i / FPS);
  await p.screenshot({ path: path.join(OUT, "f" + String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 94 });
  if (i % 150 === 0) { const el = (Date.now() - t0) / 1000;
    console.log(`${i}/${total}  ${el.toFixed(0)}s  eta ${(el / Math.max(i, 1) * (total - i)).toFixed(0)}s`); }
}
console.log("frames done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
await b.close();
