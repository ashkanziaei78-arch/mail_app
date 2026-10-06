/**
 * Screenshots of the real Mailing Press app, for the video's software scenes.
 *
 *   NODE_PATH=<dir-with-playwright>/node_modules node capture.mjs <stage> [campaignId] [letterCode]
 *
 * stage = approval  → campaign mid-approval (approvals inbox, campaign page)
 * stage = sent      → everything else (dashboard, contacts, letterhead, compose, reports, public letter)
 *
 * The app runs locally on :3100 with seed data (npm run db:seed).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "capture/assets");
fs.mkdirSync(OUT, { recursive: true });
const [stage, campaignId, letterCode] = process.argv.slice(2);

const desktop = { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2, locale: "fa-IR" };
const mobile = { viewport: { width: 414, height: 896 }, deviceScaleFactor: 3, locale: "fa-IR", isMobile: true, hasTouch: true };

async function login(page, email) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', "Mailing@1404");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|approvals|campaigns/, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function shot(page, name, url, wait = 1600, full = false) {
  if (url) await page.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(wait);
  // hide the Next.js dev-mode badge so it never lands in a plate
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: full });
  console.log("shot", name);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
});

if (stage === "approval") {
  const ctx = await browser.newContext(desktop);
  const p = await ctx.newPage();
  await login(p, "approver@mailing.local");
  await shot(p, "approvals", "/approvals");
  if (campaignId) await shot(p, "campaign-approval", "/campaigns/" + campaignId, 2400);
  await ctx.close();

  const m = await browser.newContext(mobile);
  const mp = await m.newPage();
  await login(mp, "approver@mailing.local");
  await shot(mp, "m-approvals", "/approvals", 2000);
  await m.close();
}

if (stage === "sent") {
  const ctx = await browser.newContext(desktop);
  const p = await ctx.newPage();
  await login(p, "admin@mailing.local");
  await shot(p, "dashboard", "/dashboard", 2400);
  await shot(p, "contacts", "/contacts");
  await shot(p, "tags", "/tags");
  await shot(p, "letterheads", "/letterheads", 2000);
  await shot(p, "compose", "/campaigns/new", 2600);
  await shot(p, "campaigns", "/campaigns");
  if (campaignId) {
    await shot(p, "campaign", "/campaigns/" + campaignId, 2600);
    await shot(p, "campaign-full", null, 400, true);
  }
  await shot(p, "reports", "/reports", 3000);
  await shot(p, "reports-full", null, 400, true);
  await shot(p, "workflow", "/settings/workflow", 2000);
  await ctx.close();

  if (letterCode) {
    const pub = await browser.newContext(desktop);
    const pp = await pub.newPage();
    await shot(pp, "letter", "/l/" + letterCode, 2600);
    await shot(pp, "letter-full", null, 400, true);
    await pub.close();
    const pm = await browser.newContext(mobile);
    const pmp = await pm.newPage();
    await shot(pmp, "m-letter", "/l/" + letterCode, 2600);
    await pm.close();
  }
}

await browser.close();
