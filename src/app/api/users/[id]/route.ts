import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  role: z.enum(["ORG_ADMIN", "DEPT_ADMIN", "APPROVER", "USER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  password: z.string().min(8, "گذرواژه باید حداقل ۸ کاراکتر باشد.").optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireApi("users.manage");
    const { id } = await params;
    const input = await readBody(request, schema);

    const target = await prisma.user.findFirst({ where: { id, organizationId: admin.organizationId } });
    if (!target) throw new ApiError(404, "کاربر یافت نشد.");
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
        passwordHash: input.password ? await hashPassword(input.password) : undefined,
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
