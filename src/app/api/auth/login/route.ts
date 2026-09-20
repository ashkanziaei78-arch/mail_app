import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkPassword } from "@/lib/auth";
import { setSession } from "@/lib/session";
import { handle, readBody, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("ایمیل معتبر نیست."),
  password: z.string().min(1, "گذرواژه را وارد کنید."),
});

export async function POST(request: Request) {
  return handle(async () => {
    const { email, password } = await readBody(request, schema);
    const user = await prisma.user.findUnique({ where: { email } });

    // پیام یکسان برای «کاربر نیست» و «گذرواژه غلط» تا حساب‌ها شمارش‌پذیر نشوند
    const invalid = new ApiError(401, "ایمیل یا گذرواژه نادرست است.");
    if (!user || user.deletedAt) throw invalid;
    if (!(await checkPassword(password, user.passwordHash))) throw invalid;
    if (user.status !== "ACTIVE") throw new ApiError(403, "حساب کاربری شما غیرفعال است.");

    await setSession({
      userId: user.id,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      role: user.role,
      fullName: user.fullName,
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id });

    return { fullName: user.fullName, role: user.role };
  });
}
