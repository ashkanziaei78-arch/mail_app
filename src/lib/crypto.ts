import crypto from "node:crypto";

/**
 * کلیدهای جداگانه برای هر کاربرد از یک APP_SECRET مشتق می‌شوند (HKDF-SHA256).
 * جدا بودن کلیدها یعنی لو رفتن یا اشتباه در یک مسیر، مسیر دیگر را آلوده نمی‌کند.
 */
type KeyPurpose = "session-hmac" | "data-encryption" | "link-hmac";

const keyCache = new Map<KeyPurpose, Buffer>();

function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SECRET تعریف نشده یا کوتاه است (حداقل ۳۲ کاراکتر). با `openssl rand -base64 48` بسازید.");
  }
  if (process.env.NODE_ENV === "production" && /change-me|dev-secret/.test(secret)) {
    throw new Error("APP_SECRET هنوز مقدار نمونه است. پیش از استقرار آن را عوض کنید.");
  }
  return secret;
}

function key(purpose: KeyPurpose): Buffer {
  const cached = keyCache.get(purpose);
  if (cached) return cached;
  const derived = Buffer.from(
    crypto.hkdfSync("sha256", Buffer.from(appSecret(), "utf8"), Buffer.alloc(0), Buffer.from(purpose, "utf8"), 32),
  );
  keyCache.set(purpose, derived);
  return derived;
}

/** AES-256-GCM. خروجی: iv.tag.ciphertext (base64url) */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key("data-encryption"), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("payload نامعتبر");
  const [iv, tag, data] = parts.map((p) => Buffer.from(p, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key("data-encryption"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function sign(value: string, purpose: KeyPurpose = "session-hmac"): string {
  return crypto.createHmac("sha256", key(purpose)).update(value).digest("base64url");
}

/** مقایسه زمان‌ثابت — جلوگیری از حدس امضا با اندازه‌گیری زمان پاسخ. */
export function verifySigned(value: string, signature: string, purpose: KeyPurpose = "session-hmac"): boolean {
  const expected = Buffer.from(sign(value, purpose));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** مقایسه زمان‌ثابت دو رشته کوتاه (کد دسترسی، توکن) */
export function timingSafeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; // بدون 0/O/1/l/I

/**
 * انتخاب یکنواخت از الفبا با رد نمونه‌های بایاس‌دار.
 * (b % 57 روی بایت ۰..۲۵۵ توزیع را کمی به نفع کاراکترهای اول کج می‌کرد.)
 */
export function randomCode(length = 10): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let out = "";
  while (out.length < length) {
    for (const b of crypto.randomBytes(length * 2)) {
      if (b >= limit) continue;
      out += ALPHABET[b % ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

export function randomDigits(length = 6): string {
  let out = "";
  while (out.length < length) {
    for (const b of crypto.randomBytes(length * 2)) {
      if (b >= 250) continue; // 250 = 25*10 ⇒ بدون بایاس
      out += String(b % 10);
      if (out.length === length) break;
    }
  }
  return out;
}
