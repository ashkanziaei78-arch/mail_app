import crypto from "node:crypto";

/**
 * TOTP بر اساس RFC 6238 — سازگار با Google Authenticator، Authy و مشابه.
 * پیاده‌سازی مستقیم روی node:crypto است؛ برای ۴۰ خط کد، افزودن وابستگی
 * به یک کتابخانه رمزنگاری شخص ثالث توجیه نداشت.
 */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error("کلید TOTP معتبر نیست.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function codeForCounter(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function currentCode(secret: string, at: Date = new Date()): string {
  return codeForCounter(secret, Math.floor(at.getTime() / 1000 / STEP_SECONDS));
}

/**
 * بررسی کد با پنجره ±۱ گام (۳۰ ثانیه) برای جبران اختلاف ساعت گوشی و سرور.
 * مقایسه زمان‌ثابت است تا کد از روی زمان پاسخ حدس زده نشود.
 */
export function verifyCode(secret: string, token: string, at: Date = new Date(), window = 1): boolean {
  const clean = token.replace(/\D/g, "");
  if (clean.length !== DIGITS) return false;
  const counter = Math.floor(at.getTime() / 1000 / STEP_SECONDS);
  let matched = false;
  for (let offset = -window; offset <= window; offset++) {
    const expected = Buffer.from(codeForCounter(secret, counter + offset));
    const given = Buffer.from(clean);
    // بدون break: زمان اجرا نباید به محل تطابق وابسته باشد
    if (expected.length === given.length && crypto.timingSafeEqual(expected, given)) matched = true;
  }
  return matched;
}

/** نشانی otpauth:// که برنامه‌های احراز هویت با QR یا دستی می‌خوانند. */
export function otpauthUrl(secret: string, account: string, issuer = "میلینگ سازمانی"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params}`;
}

/** کدهای پشتیبان یک‌بارمصرف — وقتی گوشی در دسترس نیست. */
export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
}
