import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkPassword, hashPassword, currentUser } from "@/lib/auth";
import { handle, readBody, ApiError } from "@/lib/api";
import { validatePassword } from "@/lib/password";
import { clearSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { clientIp, consume, RULES } from "@/lib/rate-limit";

const schema = z.object({
  currentPassword: z.string().min(1, "گذرواژه فعلی را وارد کنید.").max(200),
  newPassword: z.string().min(1, "گذرواژه جدید را وارد کنید.").max(200),
});

export async function POST(request: Request) {
  return handle(async () => {
    const user = await currentUser();
    if (!user) throw new ApiError(401, "برای این عملیات باید وارد شوید.");
    await consume(`password-change:${user.id}`, RULES.loginPerAccount);

    const { currentPassword, newPassword } = await readBody(request, schema);

    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await checkPassword(currentPassword, record.passwordHash))) {
      await audit({ organizationId: user.organizationId, userId: user.id, action: "PASSWORD_CHANGE_FAILED", entityType: "User", entityId: user.id });
      throw new ApiError(401, "گذرواژه فعلی نادرست است.");
    }
    if (currentPassword === newPassword) {
      throw new ApiError(422, "گذرواژه جدید باید با گذرواژه فعلی فرق کند.");
    }

    const problem = validatePassword(newPassword, { email: user.email, fullName: user.fullName });
    if (problem) throw new ApiError(422, problem);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        // همه نشست‌های دیگر (مثلاً روی دستگاه گم‌شده) بلافاصله باطل می‌شوند
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    await audit({
      organizationId: user.organizationId, userId: user.id,
      action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id,
      metadata: { ip: await clientIp() },
    });

    // نشست فعلی هم باطل است ⇒ کاربر دوباره وارد می‌شود
    await clearSession();
    return { changed: true };
  });
}
