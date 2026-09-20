/* بررسی سریع منطق‌های غیربدیهی — اجرا: npm test */
import assert from "node:assert/strict";

process.env.APP_SECRET ??= "selftest-secret-selftest-secret";

import { sanitizeHtml, applyVariables, missingVariables, htmlToPlainText } from "./render";
import { countSegments, normalizeMobile } from "./sms";
import { parseCsv, toCsv } from "./csv";
import { encrypt, decrypt, randomCode } from "./crypto";
import { serialize, parse } from "./session";

// --- sanitizeHtml: XSS ---
assert.equal(sanitizeHtml(`<script>alert(1)</script><p>سلام</p>`), "<p>سلام</p>");
assert.equal(sanitizeHtml(`<img src="/a.png" onerror="alert(1)">`), `<img src="/a.png" />`);
assert.equal(sanitizeHtml(`<img src="x">`), `<img />`); // مسیر نسبی مجاز نیست
assert.ok(!sanitizeHtml(`<a href="javascript:alert(1)">x</a>`).includes("javascript"));
assert.equal(sanitizeHtml(`<a href="https://a.ir">x</a>`), `<a href="https://a.ir">x</a>`);
assert.equal(sanitizeHtml(`<p style="text-align:center">م</p>`), `<p style="text-align:center">م</p>`);
assert.ok(!sanitizeHtml(`<p style="background:url(javascript:1)">م</p>`).includes("javascript"));
assert.ok(sanitizeHtml(`<marquee>x</marquee>`).startsWith("&lt;marquee&gt;"));
assert.equal(sanitizeHtml(`<table><tr><td colspan="2">a</td></tr></table>`), `<table><tr><td colspan="2">a</td></tr></table>`);

// --- متغیرها ---
const ctx = { "{{نام}}": "حسین", "{{سازمان}}": "" };
assert.equal(applyVariables("{{نام}} گرامی", ctx), "حسین گرامی");
assert.equal(applyVariables("{{ناشناخته}}", ctx), "{{ناشناخته}}");
assert.deepEqual(missingVariables("{{نام}} {{ناشناخته}}", ctx), ["{{ناشناخته}}"]);
assert.equal(htmlToPlainText("<p>خط۱</p><p>خط۲</p>"), "خط۱\nخط۲");

// --- شمارش پیامک (فارسی = یونیکد) ---
assert.deepEqual(countSegments("a".repeat(160)), { unicode: false, length: 160, segments: 1 });
assert.equal(countSegments("a".repeat(161)).segments, 2);
assert.equal(countSegments("ا".repeat(70)).segments, 1);
assert.equal(countSegments("ا".repeat(71)).segments, 2);
assert.equal(countSegments("").segments, 0);

// --- نرمال‌سازی موبایل ---
assert.equal(normalizeMobile("0912 345 6789"), "09123456789");
assert.equal(normalizeMobile("+989123456789"), "09123456789");
assert.equal(normalizeMobile("۰۹۱۲۳۴۵۶۷۸۹"), "09123456789");
assert.equal(normalizeMobile("02133445566"), null);
assert.equal(normalizeMobile(null), null);

// --- CSV ---
assert.deepEqual(parseCsv('a,b\n"x,1","y\n2"'), [["a", "b"], ["x,1", "y\n2"]]);
assert.ok(toCsv([{ a: "x,y" }], ["a"]).includes('"x,y"'));

// --- رمزنگاری کلید درگاه ---
assert.equal(decrypt(encrypt("api-key-123")), "api-key-123");
assert.notEqual(encrypt("same"), encrypt("same")); // IV تصادفی
assert.equal(new Set(Array.from({ length: 200 }, () => randomCode(10))).size, 200);

// --- نشست ---
const token = serialize({ userId: "u1", organizationId: "o1", departmentId: null, role: "USER", fullName: "ت", exp: Date.now() + 1000 });
assert.equal(parse(token)?.userId, "u1");
assert.equal(parse(token.slice(0, -2) + "xx"), null); // امضای دستکاری‌شده
assert.equal(parse(serialize({ userId: "u1", organizationId: "o1", departmentId: null, role: "USER", fullName: "ت", exp: Date.now() - 1 })), null);

console.log("✓ همه بررسی‌ها موفق بود");
