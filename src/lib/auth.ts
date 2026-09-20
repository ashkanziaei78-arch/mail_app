import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { getSession } from "./session";
import { can, type PermissionCode } from "./rbac";
import type { UserRole } from "@prisma/client";

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  departmentId: string | null;
};

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findFirst({
    where: { id: session.userId, status: "ACTIVE", deletedAt: null },
    include: { organization: { select: { name: true } } },
  });
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: user.organization.name,
    departmentId: user.departmentId,
  };
}

/** برای صفحات: نبود نشست ⇒ ریدایرکت به ورود */
export async function requirePage(permission?: PermissionCode): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (permission && !can(user.role, permission)) redirect("/dashboard?denied=1");
  return user;
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function checkPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
