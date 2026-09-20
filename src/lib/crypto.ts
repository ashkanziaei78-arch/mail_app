import crypto from "node:crypto";

function key(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("APP_SECRET تعریف نشده یا کوتاه است (حداقل ۱۶ کاراکتر).");
  }
  // ponytail: secret → 32-byte key via SHA-256 instead of a KDF + stored salt.
  // Upgrade to scrypt with a per-install salt if secrets ever leave this server.
  return crypto.createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. خروجی: iv.tag.ciphertext (base64url) */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !data) throw new Error("payload نامعتبر");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** امضای HMAC برای کوکی نشست */
export function sign(value: string): string {
  return crypto.createHmac("sha256", key()).update(value).digest("base64url");
}

export function verifySigned(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; // بدون 0/O/1/l/I
export function randomCode(length = 10): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function randomDigits(length = 6): string {
  let out = "";
  for (const b of crypto.randomBytes(length)) out += String(b % 10);
  return out;
}
