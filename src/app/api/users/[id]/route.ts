import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { validatePassword } from "@/lib/password";
import { normalizeMobile } from "@/lib/sms";

const schema = z.object({
  role: z.enum(["ORG_ADMIN", "DEPT_ADMIN", "APPROVER", "USER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  positionId: z.string().uuid().nullable().optional(),
  mobilePhone: z.string().trim().max(20).nullable().optional(),
  disableTotp: z.boolean().optional(),
  password: z.string().max(200).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireApi("users.manage");
    const { id } = await params;
    const input = await readBody(request, schema);

    const target = await prisma.user.findFirst({ where: { id, organizationId: admin.organizationId } });
    if (!target) throw new ApiError(404, "کاربر یافت نشد.");

    if (input.password) {
      const problem = validatePassword(input.password, { email: target.email, fullName: target.fullName });
      if (problem) throw new ApiError(422, problem);
    }
    if (input.positionId) {
      const position = await prisma.position.findFirst({ where: { id: input.positionId, organizationId: admin.organizationId } });
      if (!position) throw new ApiError(422, "سمت سازمانی معتبر نیست.");
    }
    const mobile = input.mobilePhone === undefined ? undefined : normalizeMobile(input.mobilePhone);
    if (input.mobilePhone && !mobile) throw new ApiError(422, "شماره همراه معتبر نیست.");
    if (target.id === admin.id && input.status === "INACTIVE") {
      throw new ApiError(409, "نمی‌توانید حساب خودتان را غیرفعال کنید.");
    }
    if (target.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
      throw new ApiError(403, "تغییر حساب مدیر کل سامانه مجاز نیست.");
    }

    await prisma.user.update({
      where: { id },
      data: {
        role: input.role,
        status: input.status,
        departmentId: input.departmentId,
        positionId: input.positionId,
        mobilePhone: mobile,
        // بازنشانی ۲FA وقتی کاربر دستگاهش را از دست داده است
        totpEnabled: input.disableTotp ? false : undefined,
        totpSecretEncrypted: input.disableTotp ? null : undefined,
        totpBackupCodes: input.disableTotp ? [] : undefined,
        passwordHash: input.password ? await hashPassword(input.password) : undefined,
        // تغییر گذرواژه: نشست‌های فعال کاربر باطل و قفل احتمالی برداشته می‌شود
        passwordChangedAt: input.password ? new Date() : undefined,
        mustChangePassword: input.password ? true : undefined,
        failedLoginCount: input.password || input.status === "ACTIVE" ? 0 : undefined,
        lockedUntil: input.password || input.status === "ACTIVE" ? null : undefined,
      },
    });

    await audit({
      organizationId: admin.organizationId, userId: admin.id, action: "USER_UPDATE",
      entityType: "User", entityId: id,
      metadata: { role: input.role, status: input.status, passwordChanged: Boolean(input.password) },
    });
    return { id };
  });
}
