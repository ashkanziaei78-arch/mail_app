import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { handle, readBody, ApiError } from "@/lib/api";
import { validatePassword } from "@/lib/password";
import crypto from "node:crypto";
import { randomDigits, timingSafeEqual } from "@/lib/crypto";
import { normalizeMobile } from "@/lib/sms";
import { resolveProvider } from "@/lib/sms-server";
import { clientIp, consume, reset as resetLimit, RULES } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const OTP_TTL_MINUTES = 10;

const hashResetCode = (code: string) => crypto.createHash("sha256").update(code.trim()).digest("hex");

/**
 * بازیابی گذرواژه با پیامک.
 * ایمیل سرور نداریم، ولی درگاه پیامک سازمان هست — پس کد یک‌بارمصرف به شماره‌ای
 * می‌رود که مدیر در پروفایل کاربر ثبت کرده است.
 */
const requestSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

export async function POST(request: Request) {
  return handle(async () => {
    const ip = await clientIp();
    await consume(`reset-request:${ip}`, RULES.loginPerIp);
    const { email } = await readBody(request, requestSchema);
    await consume(`reset-request:${email}`, RULES.loginPerAccount);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: { select: { name: true } } },
    });

    // پاسخ همیشه یکسان است تا نشود فهمید کدام ایمیل ثبت شده یا شماره دارد
    const generic = { sent: true, hint: "اگر این ایمیل ثبت شده باشد و شماره همراه داشته باشد، کد برایش پیامک شد." };

    const mobile = normalizeMobile(user?.mobilePhone);
    if (!user || user.deletedAt || user.status !== "ACTIVE" || !mobile) return generic;

    const code = randomDigits(6);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    // فقط هش کد ذخیره می‌شود
    await prisma.passwordResetCode.upsert({
      where: { userId: user.id },
      create: { userId: user.id, codeHash: hashResetCode(code), expiresAt },
      update: { codeHash: hashResetCode(code), expiresAt, attempts: 0 },
    });

    const config = await prisma.smsProviderConfig.findFirst({
      where: { organizationId: user.organizationId, isDefault: true },
    });
    const provider = resolveProvider(config);
    await provider.send(
      mobile,
      `کد بازیابی گذرواژه سامانه ${user.organization.name}: ${code}\nاین کد ${OTP_TTL_MINUTES} دقیقه اعتبار دارد.`,
      config?.senderNumber ?? "10008663",
    );

    await audit({ organizationId: user.organizationId, userId: user.id, action: "PASSWORD_RESET_REQUESTED", entityType: "User", entityId: user.id });
    return generic;
  });
}

const confirmSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  code: z.string().trim().regex(/^\d{6}$/, "کد باید شش رقم باشد."),
  newPassword: z.string().min(1).max(200),
});

export async function PUT(request: Request) {
  return handle(async () => {
    const ip = await clientIp();
    await consume(`reset-confirm:${ip}`, RULES.loginPerIp);
    const input = await readBody(request, confirmSchema);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const invalid = new ApiError(401, "کد نادرست یا منقضی است. دوباره درخواست کد بدهید.");
    if (!user || user.deletedAt || user.status !== "ACTIVE") throw invalid;

    const record = await prisma.passwordResetCode.findUnique({ where: { userId: user.id } });
    if (!record || record.expiresAt < new Date()) throw invalid;

    // سقف تلاش روی خودِ کد، جدا از محدودیت IP
    if (record.attempts >= 5) {
      await prisma.passwordResetCode.delete({ where: { userId: user.id } });
      throw new ApiError(429, "تلاش‌های بیش از حد. دوباره درخواست کد بدهید.");
    }
    if (!timingSafeEqual(record.codeHash, hashResetCode(input.code))) {
      await prisma.passwordResetCode.update({ where: { userId: user.id }, data: { attempts: { increment: 1 } } });
      throw invalid;
    }

    const problem = validatePassword(input.newPassword, { email: user.email, fullName: user.fullName });
    if (problem) throw new ApiError(422, problem);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(input.newPassword),
          passwordChangedAt: new Date(), // همه نشست‌های قبلی باطل
          mustChangePassword: false,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordResetCode.delete({ where: { userId: user.id } }),
    ]);
    await resetLimit(`login:email:${user.email}`);

    await audit({ organizationId: user.organizationId, userId: user.id, action: "PASSWORD_RESET_COMPLETED", entityType: "User", entityId: user.id });
    return { reset: true };
  });
}
