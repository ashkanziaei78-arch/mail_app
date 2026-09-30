import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { getSession, refreshSession } from "./session";
import { effectivePermissions, type PermissionCode } from "./rbac";
import type { UserRole } from "@prisma/client";

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  departmentId: string | null;
  /** مجوزهای مؤثر: پیش‌فرض نقش + استثناهای همین کاربر */
  permissions: PermissionCode[];
};

/** آیا کاربر این مجوز را دارد؟ همه‌جا به‌جای بررسی نقش از این استفاده کنید. */
export function allows(user: CurrentUser, permission: PermissionCode): boolean {
  return user.permissions.includes(permission);
}

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  // وضعیت کاربر هر درخواست از پایگاه داده خوانده می‌شود؛ پس غیرفعال کردن یک
  // حساب بلافاصله اثر می‌کند و منتظر انقضای کوکی نمی‌ماند.
  const user = await prisma.user.findFirst({
    where: { id: session.userId, status: "ACTIVE", deletedAt: null },
    include: {
      organization: { select: { name: true, status: true } },
      rolePermissions: { include: { permission: { select: { code: true } } } },
    },
  });
  if (!user) return null;
  if (user.organization.status !== "ACTIVE") return null;

  // تغییر گذرواژه همه نشست‌های قدیمی را بی‌اعتبار می‌کند.
  if (user.passwordChangedAt.getTime() > session.iat) return null;

  // تمدید پنجره بی‌فعالیتی (حداکثر یک بار در هر ۵ دقیقه، تا هر درخواست کوکی ننویسد)
  const remaining = session.exp - Date.now();
  if (remaining < 115 * 60 * 1000) {
    try {
      await refreshSession(session);
    } catch {
      // در Server Component نوشتن کوکی مجاز نیست؛ تمدید در اولین route handler انجام می‌شود
    }
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: user.organization.name,
    departmentId: user.departmentId,
    permissions: effectivePermissions(
      user.role,
      user.rolePermissions.map((p) => ({ code: p.permission.code, granted: p.granted })),
    ),
  };
}

/** برای صفحات: نبود نشست ⇒ ریدایرکت به ورود */
export async function requirePage(permission?: PermissionCode): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (permission && !allows(user, permission)) redirect("/dashboard?denied=1");
  return user;
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function checkPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
