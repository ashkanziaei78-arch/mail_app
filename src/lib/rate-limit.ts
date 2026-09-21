import "server-only";
import { headers } from "next/headers";
import { prisma } from "./db";

export type RateLimitRule = {
  /** حداکثر تلاش در بازه */
  max: number;
  /** طول بازه به ثانیه */
  windowSeconds: number;
  /** مدت مسدودی پس از عبور از سقف، به ثانیه */
  blockSeconds: number;
};

export const RULES = {
  loginPerIp: { max: 20, windowSeconds: 15 * 60, blockSeconds: 15 * 60 },
  loginPerAccount: { max: 5, windowSeconds: 15 * 60, blockSeconds: 15 * 60 },
  accessCode: { max: 8, windowSeconds: 15 * 60, blockSeconds: 60 * 60 },
  smsTest: { max: 10, windowSeconds: 60 * 60, blockSeconds: 60 * 60 },
  writeApi: { max: 300, windowSeconds: 5 * 60, blockSeconds: 5 * 60 },
} satisfies Record<string, RateLimitRule>;

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60)).toLocaleString("fa-IR");
    super(`تلاش‌های بیش از حد. ${minutes} دقیقه دیگر دوباره امتحان کنید.`);
  }
}

/** IP واقعی کاربر — پشت پروکسی از x-forwarded-for خوانده می‌شود. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * یک تلاش را می‌شمارد و در صورت عبور از سقف خطا می‌دهد.
 * پنجره ثابت (fixed window) است؛ برای محافظت از ورود و کد دسترسی کافی است.
 */
export async function consume(bucket: string, rule: RateLimitRule): Promise<void> {
  const now = new Date();
  const record = await prisma.rateLimit.findUnique({ where: { bucket } });

  if (record?.blockedUntil && record.blockedUntil > now) {
    throw new RateLimitError(Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 1000));
  }

  const windowExpired = !record || now.getTime() - record.windowStart.getTime() > rule.windowSeconds * 1000;
  if (windowExpired) {
    await prisma.rateLimit.upsert({
      where: { bucket },
      create: { bucket, hits: 1, windowStart: now },
      update: { hits: 1, windowStart: now, blockedUntil: null },
    });
    return;
  }

  const hits = record.hits + 1;
  if (hits > rule.max) {
    const blockedUntil = new Date(now.getTime() + rule.blockSeconds * 1000);
    await prisma.rateLimit.update({ where: { bucket }, data: { hits, blockedUntil } });
    throw new RateLimitError(rule.blockSeconds);
  }
  await prisma.rateLimit.update({ where: { bucket }, data: { hits } });
}

/** پس از موفقیت، شمارنده پاک می‌شود تا کاربر درست جریمه نشود. */
export async function reset(bucket: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { bucket } });
}

/** پاک‌سازی رکوردهای کهنه — از یک مسیر کم‌ترافیک یا cron صدا زده می‌شود. */
export async function pruneRateLimits(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: cutoff }, OR: [{ blockedUntil: null }, { blockedUntil: { lt: new Date() } }] },
  });
  return count;
}
