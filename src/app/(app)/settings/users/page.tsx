import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import UsersClient from "./users-client";

export const metadata: Metadata = { title: "کاربران و نقش‌ها" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requirePage("users.manage");
  const [users, departments, positions, recentLogs] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: admin.organizationId, deletedAt: null },
      include: { department: true, position: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.department.findMany({ where: { organizationId: admin.organizationId }, orderBy: { name: "asc" } }),
    prisma.position.findMany({ where: { organizationId: admin.organizationId }, orderBy: { rank: "asc" } }),
    prisma.auditLog.findMany({
      where: { organizationId: admin.organizationId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <UsersClient
      currentUserId={admin.id}
      users={users.map((u) => ({
        id: u.id, fullName: u.fullName, email: u.email, role: u.role, status: u.status,
        departmentId: u.departmentId, departmentName: u.department?.name ?? null,
        positionId: u.positionId, positionName: u.position?.name ?? null,
        totpEnabled: u.totpEnabled,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      }))}
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      positions={positions.map((p) => ({ id: p.id, name: p.name }))}
      logs={recentLogs.map((l) => ({
        id: l.id, action: l.action, entityType: l.entityType,
        user: l.user?.fullName ?? "سیستم", createdAt: l.createdAt.toISOString(), ipAddress: l.ipAddress,
      }))}
    />
  );
}
