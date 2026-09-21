import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkPassword } from "@/lib/auth";
import { setSession } from "@/lib/session";
import { handle, readBody, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { clientIp, consume, reset, RULES } from "@/lib/rate-limit";
import { decrypt } from "@/lib/crypto";
import { hashBackupCode, verifyCode } from "@/lib/totp";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("ایمیل معتبر نیست.").max(200),
  password: z.string().min(1, "گذرواژه را وارد کنید.").max(200),
  /** کد ۶ رقمی برنامه احراز هویت یا یکی از کدهای پشتیبان */
  totpCode: z.string().trim().max(20).optional(),
});

/**
 * هش ساختگی با همان هزینه bcrypt واقعی. وقتی کاربر وجود ندارد هم یک مقایسه
 * انجام می‌شود تا زمان پاسخ «کاربر هست» و «کاربر نیست» یکسان بماند و
 * فهرست ایمیل‌های سازمان از روی تایمینگ قابل استخراج نباشد.
 */
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-constant-time", 10);

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
  return handle(async () => {
    const ip = await clientIp();
    await consume(`login:ip:${ip}`, RULES.loginPerIp);

    const input = await readBody(request, schema);
    const { email, password } = input;
    await consume(`login:email:${email}`, RULES.loginPerAccount);

    const user = await prisma.user.findUnique({ where: { email } });

    // پیام یکسان برای «کاربر نیست»، «گذرواژه غلط» و «حساب حذف‌شده»
    const invalid = new ApiError(401, "ایمیل یا گذرواژه نادرست است.");

    if (!user || user.deletedAt) {
      await bcrypt.compare(password, DUMMY_HASH);
      await audit({ action: "LOGIN_FAILED", entityType: "User", metadata: { email, reason: "NOT_FOUND" } });
      throw invalid;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000).toLocaleString("fa-IR");
      throw new ApiError(429, `حساب به دلیل تلاش‌های ناموفق قفل است. ${minutes} دقیقه دیگر امتحان کنید.`);
    }

    if (!(await checkPassword(password, user.passwordHash))) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lock = failedLoginCount >= MAX_FAILED;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
        },
      });
      await audit({
        organizationId: user.organizationId, userId: user.id,
        action: lock ? "LOGIN_LOCKED" : "LOGIN_FAILED",
        entityType: "User", entityId: user.id,
        metadata: { failedLoginCount },
      });
      if (lock) {
        throw new ApiError(429, `حساب پس از ${MAX_FAILED.toLocaleString("fa-IR")} تلاش ناموفق، ${LOCK_MINUTES.toLocaleString("fa-IR")} دقیقه قفل شد.`);
      }
      throw invalid;
    }

    // مرحله دوم: کد احراز هویت دومرحله‌ای
    if (user.totpEnabled && user.totpSecretEncrypted) {
      if (!input.totpCode) {
        // گذرواژه درست بود ولی نشستی صادر نمی‌شود تا کد دوم بیاید
        return { totpRequired: true };
      }
      const secret = decrypt(user.totpSecretEncrypted);
      const backupHash = hashBackupCode(input.totpCode);
      const usedBackup = user.totpBackupCodes.includes(backupHash);

      if (!usedBackup && !verifyCode(secret, input.totpCode)) {
        await audit({ organizationId: user.organizationId, userId: user.id, action: "TOTP_FAILED", entityType: "User", entityId: user.id });
        throw new ApiError(401, "کد دومرحله‌ای نادرست است.");
      }
      if (usedBackup) {
        // کد پشتیبان یک‌بارمصرف است
        await prisma.user.update({
          where: { id: user.id },
          data: { totpBackupCodes: user.totpBackupCodes.filter((h) => h !== backupHash) },
        });
        await audit({ organizationId: user.organizationId, userId: user.id, action: "TOTP_BACKUP_USED", entityType: "User", entityId: user.id });
      }
    }

    if (user.status !== "ACTIVE") {
      await audit({ organizationId: user.organizationId, userId: user.id, action: "LOGIN_BLOCKED", entityType: "User", entityId: user.id });
      throw new ApiError(403, "حساب کاربری شما غیرفعال است. با مدیر سازمان تماس بگیرید.");
    }

    await setSession({
      userId: user.id,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      role: user.role,
      fullName: user.fullName,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });
    await Promise.all([reset(`login:email:${email}`), reset(`login:ip:${ip}`)]);
    await audit({ organizationId: user.organizationId, userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id });

    return { fullName: user.fullName, role: user.role, mustChangePassword: user.mustChangePassword };
  });
}
