import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { ROLE_LABELS, effectivePermissions, rolePermissions } from "@/lib/rbac";
import AccessClient from "./access-client";

export const metadata: Metadata = { title: "دسترسی‌ها" };
export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const admin = await requirePage("users.manage");
  const users = await prisma.user.findMany({
    where: { organizationId: admin.organizationId, deletedAt: null, role: { not: "SUPER_ADMIN" } },
    include: { rolePermissions: { include: { permission: { select: { code: true } } } } },
    orderBy: { fullName: "asc" },
  });

  return (
    <AccessClient
      currentUserId={admin.id}
      users={users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        roleLabel: ROLE_LABELS[u.role],
        byRole: rolePermissions(u.role),
        codes: effectivePermissions(
          u.role,
          u.rolePermissions.map((p) => ({ code: p.permission.code, granted: p.granted })),
        ),
      }))}
    />
  );
}
