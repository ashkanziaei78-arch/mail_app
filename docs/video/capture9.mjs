import { chromium } from "playwright"; import path from "node:path"; import fs from "node:fs";
const BASE = "http://localhost:3100", PASS = "Mailing@1404";
const OUT = path.resolve("shots9"); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ["--force-color-profile=srgb", "--font-render-hinting=none"] });
const mobile = { viewport: { width: 420, height: 900 }, deviceScaleFactor: 3, locale: "fa-IR", isMobile: true, hasTouch: true };

async function shots(email, pages) {
  const ctx = await b.newContext(mobile);
  const p = await ctx.newPage();
  if (email) {
    await p.goto(BASE + "/login", { waitUntil: "networkidle" });
    await p.fill('input[type="email"]', email); await p.fill('input[type="password"]', PASS);
    await p.click('button[type="submit"]');
    await p.waitForURL(/dashboard|approvals|campaigns/, { timeout: 30000 }).catch(() => {});
  }
  for (const [name, url, opt = {}] of pages) {
    await p.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
    await p.waitForTimeout(opt.wait ?? 1800);
    if (opt.scroll) { await p.mouse.wheel(0, opt.scroll); await p.waitForTimeout(1100); }
    if (opt.dark) { await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await p.waitForTimeout(800); }
    await p.evaluate(() => {
      document.activeElement?.blur?.();
      // نوار پایینِ چسبیده وسط عکسِ تمام‌صفحه تکرار می‌شود؛ برای ضبط پنهانش می‌کنیم
      for (const n of document.querySelectorAll("body *")) {
        const st = getComputedStyle(n);
        if ((st.position === "fixed" || st.position === "sticky") && n.getBoundingClientRect().height < 220) {
          n.style.setProperty("display", "none", "important");
        }
      }
    });
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(OUT, name + ".png"), fullPage: opt.full !== false });
    console.log(name);
  }
  await ctx.close();
}

await shots("admin@mailing.local", [
  ["dashboard", "/dashboard"],
  ["contacts", "/contacts"],
  ["campaigns", "/campaigns"],
  ["compose", "/campaigns/new", { wait: 2400 }],
  ["letterheads", "/letterheads", { wait: 2200 }],
  ["workflow", "/settings/workflow", { wait: 2000 }],
  ["access", "/settings/access", { wait: 2000 }],
  ["sms", "/settings/sms", { wait: 2000 }],
  ["reports", "/reports", { wait: 3000 }],
  ["branding", "/settings/branding", { wait: 2200 }],
  ["users", "/settings/users", { wait: 1800 }],
  ["campaign", "/campaigns/8e6d4f08-821b-48a6-8a83-a236751abdd6", { wait: 2500 }],
  ["dark", "/dashboard", { wait: 1800, dark: true }],
]);
await shots("approver@mailing.local", [["approvals", "/approvals", { wait: 1800 }]]);
await shots(null, [
  ["gate", "/l/FmMX3dZid3", { wait: 2000 }],
  ["letter", "/l/dNqaCtXwzM", { wait: 2500 }],
  ["login", "/login", { wait: 2500 }],
]);
await b.close(); console.log("done");
