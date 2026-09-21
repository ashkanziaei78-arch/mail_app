/* بررسی سریع منطق‌های غیربدیهی — اجرا: npm test */
import assert from "node:assert/strict";

process.env.APP_SECRET ??= "selftest-secret-selftest-secret-0123456789";

import { sanitizeHtml, applyVariables, missingVariables, htmlToPlainText } from "./render";
import { countSegments, normalizeMobile } from "./sms";
import { parseCsv, toCsv } from "./csv";
import { encrypt, decrypt, randomCode } from "./crypto";
import { serialize, parse } from "./session";
import { validatePassword } from "./password";

// --- sanitizeHtml: XSS (sanitize-html با پارسر واقعی) ---
assert.equal(sanitizeHtml(`<script>alert(1)</script><p>سلام</p>`), "<p>سلام</p>");
assert.equal(sanitizeHtml(`<img src="/a.png" onerror="alert(1)">`), `<img src="/a.png" />`);
assert.equal(sanitizeHtml(`<p onclick="x()">متن</p>`), "<p>متن</p>");
assert.ok(!sanitizeHtml(`<a href="javascript:alert(1)">x</a>`).includes("javascript"));
assert.ok(!sanitizeHtml(`<a href="  javascript:alert(1)">x</a>`).includes("javascript"));
assert.equal(sanitizeHtml(`<p style="text-align:center">م</p>`), `<p style="text-align:center">م</p>`);
assert.ok(!sanitizeHtml(`<p style="background:url(javascript:1)">م</p>`).includes("javascript"));
assert.equal(sanitizeHtml(`<marquee>x</marquee>`), "x"); // تگ ناشناخته حذف، متنش می‌ماند
assert.equal(sanitizeHtml(`<table><tr><td colspan="2">a</td></tr></table>`), `<table><tr><td colspan="2">a</td></tr></table>`);
// محتوای تگ خطرناک باید کامل برود، نه اینکه به متن تبدیل شود
assert.equal(sanitizeHtml(`<div><style>p{}</style>متن</div>`), "<div>متن</div>");
assert.equal(sanitizeHtml(`<svg><script>alert(1)</script></svg>`), "");
assert.equal(sanitizeHtml(`<p>a<!--[if IE]><script>alert(1)</script><![endif]-->b</p>`), "<p>ab</p>");
// لینک خارجی: بدون دسترسی به window.opener
assert.ok(sanitizeHtml(`<a href="https://a.ir">x</a>`).includes('rel="noopener noreferrer nofollow"'));

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
const base = { userId: "u1", organizationId: "o1", departmentId: null, role: "USER", fullName: "ت" };
const token = serialize({ ...base, iat: Date.now(), exp: Date.now() + 1000 });
assert.equal(parse(token)?.userId, "u1");
assert.equal(parse(token.slice(0, -2) + "xx"), null);                                  // امضای دستکاری‌شده
assert.equal(parse(serialize({ ...base, iat: Date.now(), exp: Date.now() - 1 })), null); // منقضی (بی‌فعالیتی)
assert.equal(parse(serialize({ ...base, iat: Date.now() - 13 * 3600_000, exp: Date.now() + 60_000 })), null); // عبور از سقف مطلق ۱۲ ساعت
assert.equal(parse("garbage"), null);
assert.equal(parse(undefined), null);

// --- سیاست گذرواژه ---
assert.equal(validatePassword("Abcdefgh12"), null);
assert.ok(validatePassword("short1A"));                                   // کوتاه
assert.ok(validatePassword("alllowercase123"));                           // بدون حرف بزرگ
assert.ok(validatePassword("ALLUPPERCASE123"));                           // بدون حرف کوچک
assert.ok(validatePassword("NoDigitsHereAtAll"));                         // بدون رقم
assert.ok(validatePassword("Password123", { email: "password123@x.ir" })); // شامل ایمیل
assert.ok(validatePassword("Ahmadi12345", { fullName: "رضا Ahmadi" }));    // شامل نام

console.log("✓ همه بررسی‌ها موفق بود");
