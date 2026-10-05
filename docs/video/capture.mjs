import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3100";
const OUT = path.resolve("shots");
fs.mkdirSync(OUT, { recursive: true });

const PASS = "Mailing@1404";

async function login(page, email) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|approvals|campaigns/, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function shoot(page, name, url, opts = {}) {
  if (url) {
    await page.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(opts.wait ?? 1400);
  }
  if (opts.before) await opts.before(page);
  // hide caret/focus rings for a clean plate
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur?.(); });
  await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: !!opts.full });
  console.log("shot", name);
}

const desktop = { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, locale: "fa-IR" };
const mobile  = { viewport: { width: 414, height: 896 },  deviceScaleFactor: 3, locale: "fa-IR", isMobile: true, hasTouch: true };

const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--font-render-hinting=none"] });

// ---------- admin, desktop ----------
{
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  await login(page, "admin@mailing.local");
  await shoot(page, "dashboard", "/dashboard");
  await shoot(page, "campaigns", "/campaigns");
  await shoot(page, "compose", "/campaigns/new", { wait: 2200 });
  await shoot(page, "contacts", "/contacts");
  await shoot(page, "reports", "/reports", { wait: 3000 });
  await shoot(page, "reports2", null, { before: async (p) => { await p.mouse.wheel(0, 900); await p.waitForTimeout(1200); } });
  await shoot(page, "workflow", "/settings/workflow", { wait: 2000 });
  await shoot(page, "approvals", "/approvals");
  await shoot(page, "access", "/settings/access", { wait: 2000 });
  await shoot(page, "users", "/settings/users");
  await shoot(page, "sms", "/settings/sms");
  await shoot(page, "branding", "/settings/branding", { wait: 2000 });
  await shoot(page, "letterheads", "/letterheads", { wait: 1800 });
  await shoot(page, "tags", "/tags");
  // first campaign detail
  const id = process.env.CAMPAIGN_ID;
  if (id) await shoot(page, "campaign", "/campaigns/" + id, { wait: 2500 });
  // dark mode
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await page.evaluate(() => { document.documentElement.setAttribute("data-theme", "dark"); });
  await page.waitForTimeout(900);
  await shoot(page, "dashboard-dark", null);
  await ctx.close();
}

// ---------- public letter gate ----------
if (process.env.GATE_CODE) {
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  await shoot(page, "gate", "/l/" + process.env.GATE_CODE, { wait: 1800 });
  await ctx.close();
}
if (process.env.OPEN_CODE) {
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  await shoot(page, "letter", "/l/" + process.env.OPEN_CODE, { wait: 2200 });
  await ctx.close();
}

// ---------- login page (no session) ----------
{
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  await shoot(page, "login", "/login", { wait: 2500 });
  await ctx.close();
}

// ---------- mobile ----------
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await login(page, "approver@mailing.local");
  await shoot(page, "m-approvals", "/approvals", { wait: 1800 });
  await shoot(page, "m-dashboard", "/dashboard", { wait: 1800 });
  await ctx.close();
}

await browser.close();
console.log("done");
