/* بررسی سریع منطق‌های غیربدیهی — اجرا: npm test */
import assert from "node:assert/strict";

process.env.APP_SECRET ??= "selftest-secret-selftest-secret-0123456789";

import { sanitizeHtml, applyVariables, missingVariables, htmlToPlainText } from "./render";
import { countSegments, normalizeMobile } from "./sms";
import { parseCsv, toCsv } from "./csv";
import { encrypt, decrypt, randomCode } from "./crypto";
import { serialize, parse } from "./session";
import { validatePassword } from "./password";
import { generateSecret, currentCode, verifyCode, otpauthUrl, generateBackupCodes, hashBackupCode } from "./totp";
import { gregorianToJalali, jalaliToGregorian, parseJalali, faDate, faDateLong, jalaliMonthLength, isJalaliLeapYear, formatJalaliInput } from "./jalali";

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

// --- تقویم شمسی ---
// نقاط مرجع تأییدشده
const known: Array<[string, [number, number, number]]> = [
  ["2026-09-21", [1405, 6, 30]],
  ["2024-03-20", [1403, 1, 1]],   // نوروز ۱۴۰۳
  ["2025-03-21", [1404, 1, 1]],   // نوروز ۱۴۰۴
  ["2024-09-22", [1403, 7, 1]],   // اول مهر
  ["2025-01-20", [1403, 11, 1]],
  ["1979-02-11", [1357, 11, 22]], // ۲۲ بهمن ۵۷
];
for (const [iso, [y, m, d]] of known) {
  const j = gregorianToJalali(new Date(`${iso}T00:00:00`));
  assert.deepEqual([j.year, j.month, j.day], [y, m, d], `تبدیل ${iso}`);
  const g = jalaliToGregorian({ year: y, month: m, day: d });
  assert.equal(`${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`, iso, `برگشت ${iso}`);
}

// مقایسه روزبه‌روز با تقویم رسمی (ICU) — مرجع مستقل از پیاده‌سازی ما
const icu = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
  year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC",
});
let icuMismatch = 0;
for (let t = Date.UTC(1990, 0, 1); t < Date.UTC(2040, 0, 1); t += 86400_000) {
  const utc = new Date(t);
  const local = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  const mine = gregorianToJalali(local);
  const parts = icu.formatToParts(utc);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  if (mine.year !== get("year") || mine.month !== get("month") || mine.day !== get("day")) icuMismatch++;
}
assert.equal(icuMismatch, 0, "تبدیل شمسی باید دقیقاً با تقویم رسمی یکی باشد");

// رفت‌وبرگشت روی ۳۰ سال: هیچ روزی نباید جابه‌جا شود
for (let t = Date.UTC(2000, 0, 1); t < Date.UTC(2030, 0, 1); t += 86400_000) {
  const date = new Date(t);
  const local = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const j = gregorianToJalali(local);
  const back = jalaliToGregorian(j);
  assert.deepEqual(
    [back.year, back.month, back.day],
    [local.getFullYear(), local.getMonth() + 1, local.getDate()],
    `رفت‌وبرگشت ${local.toDateString()}`,
  );
}

// طول ماه و سال کبیسه
assert.equal(jalaliMonthLength(1403, 1), 31);
assert.equal(jalaliMonthLength(1403, 7), 30);
assert.equal(jalaliMonthLength(1403, 12), 30); // ۱۴۰۳ کبیسه است
assert.equal(jalaliMonthLength(1404, 12), 29);
assert.equal(isJalaliLeapYear(1403), true);
assert.equal(isJalaliLeapYear(1404), false);

// تجزیه ورودی کاربر
assert.equal(formatJalaliInput(parseJalali("۱۴۰۴/۰۶/۲۹")), "1404/06/29"); // ارقام فارسی
assert.equal(formatJalaliInput(parseJalali("1404-6-29")), "1404/06/29");   // جداکننده و رقم تک
assert.equal(parseJalali("1404/13/01"), null);  // ماه نامعتبر
assert.equal(parseJalali("1404/12/30"), null);  // ۱۴۰۴ کبیسه نیست
assert.equal(parseJalali("چیز نامربوط"), null);
assert.equal(faDate(new Date(2025, 2, 21)), "۱۴۰۴/۰۱/۰۱");
assert.equal(faDateLong(new Date(2025, 2, 21)), "۱ فروردین ۱۴۰۴");

// --- TOTP (احراز هویت دومرحله‌ای) ---
{
  // بردار آزمون RFC 6238: کلید "12345678901234567890" در base32
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(currentCode(rfcSecret, new Date(59 * 1000)), "287082");
  assert.equal(currentCode(rfcSecret, new Date(1111111109 * 1000)), "081804");
  assert.equal(currentCode(rfcSecret, new Date(1234567890 * 1000)), "005924");

  const secret = generateSecret();
  const now = new Date();
  assert.equal(verifyCode(secret, currentCode(secret, now), now), true);
  assert.equal(verifyCode(secret, "000000", now) && currentCode(secret, now) !== "000000", false);
  // پنجره ±۳۰ ثانیه برای اختلاف ساعت گوشی
  assert.equal(verifyCode(secret, currentCode(secret, new Date(now.getTime() - 30_000)), now), true);
  assert.equal(verifyCode(secret, currentCode(secret, new Date(now.getTime() + 30_000)), now), true);
  // خارج از پنجره باید رد شود
  assert.equal(verifyCode(secret, currentCode(secret, new Date(now.getTime() - 180_000)), now), false);
  assert.equal(verifyCode(secret, "12345", now), false); // طول نادرست

  assert.ok(otpauthUrl(secret, "user@x.ir").startsWith("otpauth://totp/"));
  const codes = generateBackupCodes();
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes.map(hashBackupCode)).size, 8);
  assert.equal(hashBackupCode("abcde-12345"), hashBackupCode("ABCDE12345")); // نرمال‌سازی
}

console.log("✓ همه بررسی‌ها موفق بود");
