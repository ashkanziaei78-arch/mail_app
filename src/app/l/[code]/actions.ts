"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { sign, timingSafeEqual } from "@/lib/crypto";
import { clientIp, consume, reset, RULES, RateLimitError } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const accessCookieName = (code: string) => `ml_${code}`;

export type AccessResult = { ok: true } | { ok: false; error: string };

/**
 * بررسی کد دسترسی نامه محرمانه.
 * کد شش‌رقمی است (یک میلیون حالت) پس بدون محدودیت نرخ در چند ساعت قابل حدس بود؛
 * به ازای هر لینک و هر IP شمارش و مسدود می‌شود.
 */
export async function verifyAccessCode(code: string, given: string): Promise<AccessResult> {
  const ip = await clientIp();
  try {
    await consume(`access-code:${code}`, RULES.accessCode);
    await consume(`access-code-ip:${ip}`, RULES.accessCode);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const link = await prisma.shortLink.findUnique({ where: { code } });
  const stored = link?.accessCode;
  // مقایسه زمان‌ثابت: زمان پاسخ نباید بگوید چند رقم اول درست بوده است.
  if (!stored || !timingSafeEqual(stored, given.trim())) {
    await audit({ action: "LETTER_ACCESS_DENIED", entityType: "ShortLink", entityId: link?.id ?? null, metadata: { code } });
    return { ok: false, error: "کد دسترسی نادرست است. کد شش‌رقمی ارسال‌شده در پیامک دوم را وارد کنید." };
  }

  const store = await cookies();
  store.set(accessCookieName(code), sign(`${code}:${stored}`, "link-hmac"), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: `/l/${code}`,
    maxAge: 60 * 60 * 24,
  });

  await reset(`access-code:${code}`);
  await audit({ action: "LETTER_ACCESS_GRANTED", entityType: "ShortLink", entityId: link.id, metadata: { code } });
  return { ok: true };
}
