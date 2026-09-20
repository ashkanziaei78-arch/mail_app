import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  fullName: z.string().trim().min(1, "نام کامل الزامی است.").max(120),
  email: z.string().trim().toLowerCase().email("ایمیل معتبر نیست."),
  password: z.string().min(8, "گذرواژه باید حداقل ۸ کاراکتر باشد."),
  role: z.enum(["ORG_ADMIN", "DEPT_ADMIN", "APPROVER", "USER"]),
  departmentId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  return handle(async () => {
    const admin = await requireApi("users.manage");
    const input = await readBody(request, schema);

    if (await prisma.user.findUnique({ where: { email: input.email } })) {
      throw new ApiError(409, "این ایمیل قبلاً ثبت شده است.");
    }
    if (input.departmentId) {
      const department = await prisma.department.findFirst({ where: { id: input.departmentId, organizationId: admin.organizationId } });
      if (!department) throw new ApiError(422, "واحد سازمانی معتبر نیست.");
    }

    const user = await prisma.user.create({
      data: {
        organizationId: admin.organizationId,
        departmentId: input.departmentId || null,
        fullName: input.fullName,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
      },
    });

    await audit({ organizationId: admin.organizationId, userId: admin.id, action: "USER_CREATE", entityType: "User", entityId: user.id, metadata: { role: input.role } });
    return { id: user.id };
  });
}
