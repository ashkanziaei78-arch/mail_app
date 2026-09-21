import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { currentUser, checkPassword } from "@/lib/auth";
import { handle, readBody, ApiError } from "@/lib/api";
import { encrypt, decrypt } from "@/lib/crypto";
import { generateSecret, verifyCode, otpauthUrl, generateBackupCodes, hashBackupCode } from "@/lib/totp";
import { consume, RULES } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

/** مرحله ۱: ساخت کلید و نشانی otpauth برای اسکن در برنامه احراز هویت. */
export async function POST() {
  return handle(async () => {
    const user = await currentUser();
    if (!user) throw new ApiError(401, "برای این عملیات باید وارد شوید.");

    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (record.totpEnabled) throw new ApiError(409, "احراز هویت دومرحله‌ای از قبل فعال است.");

    const secret = generateSecret();
    // کلید هنوز فعال نشده؛ تا وقتی کاربر یک کد درست نداده totpEnabled=false می‌ماند
    await prisma.user.update({ where: { id: user.id }, data: { totpSecretEncrypted: encrypt(secret) } });

    return { secret, otpauthUrl: otpauthUrl(secret, user.email) };
  });
}

/** مرحله ۲: تأیید نخستین کد و فعال‌سازی + صدور کدهای پشتیبان. */
export async function PUT(request: Request) {
  return handle(async () => {
    const user = await currentUser();
    if (!user) throw new ApiError(401, "برای این عملیات باید وارد شوید.");
    await consume(`totp-setup:${user.id}`, RULES.loginPerAccount);

    const { code } = await readBody(request, z.object({ code: z.string().trim().min(6).max(10) }));
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!record.totpSecretEncrypted) throw new ApiError(409, "اول باید کلید را بسازید.");
    if (!verifyCode(decrypt(record.totpSecretEncrypted), code)) {
      throw new ApiError(401, "کد وارد‌شده درست نیست. ساعت گوشی را بررسی کنید و دوباره امتحان کنید.");
    }

    const backupCodes = generateBackupCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true, totpBackupCodes: backupCodes.map(hashBackupCode) },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "TOTP_ENABLED", entityType: "User", entityId: user.id });

    // کدهای پشتیبان فقط همین یک بار به‌صورت متن ساده نمایش داده می‌شوند
    return { backupCodes };
  });
}

/** غیرفعال‌سازی — با گذرواژه فعلی تأیید می‌شود تا نشست ربوده‌شده نتواند ۲FA را بردارد. */
export async function DELETE(request: Request) {
  return handle(async () => {
    const user = await currentUser();
    if (!user) throw new ApiError(401, "برای این عملیات باید وارد شوید.");
    await consume(`totp-disable:${user.id}`, RULES.loginPerAccount);

    const { password } = await readBody(request, z.object({ password: z.string().min(1).max(200) }));
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await checkPassword(password, record.passwordHash))) {
      await bcrypt.compare(password, record.passwordHash);
      throw new ApiError(401, "گذرواژه نادرست است.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: false, totpSecretEncrypted: null, totpBackupCodes: [] },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "TOTP_DISABLED", entityType: "User", entityId: user.id });
    return { disabled: true };
  });
}
