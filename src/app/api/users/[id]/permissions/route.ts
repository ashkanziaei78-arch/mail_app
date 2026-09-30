import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { PERMISSIONS, rolePermissions, type PermissionCode } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({ codes: z.array(z.string()).max(50) });

/**
 * ثبت دسترسی‌های یک کاربر.
 *
 * ورودی «فهرست نهایی» است، نه تفاوت‌ها: هرچه با پیش‌فرض نقش فرق داشته باشد به
 * صورت استثنا ذخیره می‌شود و هرچه برابر باشد، استثنایش پاک می‌شود. این‌طوری اگر
 * بعداً نقش کاربر عوض شود، دسترسی‌هایی که دستی تغییر نداده‌ایم خودشان به‌روز
 * می‌شوند.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireApi("users.manage");
    const { id } = await params;
    const input = await readBody(request, schema);

    const target = await prisma.user.findFirst({ where: { id, organizationId: admin.organizationId, deletedAt: null } });
    if (!target) throw new ApiError(404, "کاربر یافت نشد.");
    if (target.id === admin.id) throw new ApiError(409, "دسترسی‌های خودتان را از همین‌جا تغییر ندهید؛ ممکن است خودتان را بیرون بگذارید.");
    if (target.role === "SUPER_ADMIN") throw new ApiError(409, "مدیر کل سامانه همه دسترسی‌ها را دارد و تغییر نمی‌کند.");

    const wanted = new Set(input.codes.filter((c): c is PermissionCode => (PERMISSIONS as readonly string[]).includes(c)));
    const byRole = new Set(rolePermissions(target.role));
    const catalog = await prisma.permission.findMany({ select: { id: true, code: true } });

    const overrides: Array<{ permissionId: string; granted: boolean }> = [];
    const clear: string[] = [];
    for (const permission of catalog) {
      if (!(PERMISSIONS as readonly string[]).includes(permission.code)) continue;
      const want = wanted.has(permission.code as PermissionCode);
      if (want === byRole.has(permission.code as PermissionCode)) clear.push(permission.id);
      else overrides.push({ permissionId: permission.id, granted: want });
    }

    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId: id, permissionId: { in: clear } } }),
      ...overrides.map((o) =>
        prisma.userPermission.upsert({
          where: { userId_permissionId: { userId: id, permissionId: o.permissionId } },
          update: { granted: o.granted },
          create: { userId: id, permissionId: o.permissionId, granted: o.granted },
        }),
      ),
    ]);

    await audit({
      organizationId: admin.organizationId, userId: admin.id,
      action: "USER_PERMISSIONS", entityType: "User", entityId: id,
      metadata: { codes: [...wanted] },
    });
    return { codes: [...wanted] };
  });
}
