import { prisma } from "@/lib/db";
import { handle, requireApi } from "@/lib/api";

/**
 * شمار نامه‌های منتظر تصمیمِ همین کاربر (کارتابل تأیید).
 *
 * سبک نگه داشته شده چون هر نیم‌دقیقه از مرورگر صدا زده می‌شود: فقط count، بدون
 * بار کردن خود نامه‌ها.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireApi("campaigns.approve");
    const isAdmin = user.role === "ORG_ADMIN" || user.role === "SUPER_ADMIN";

    if (isAdmin) {
      const count = await prisma.campaign.count({
        where: { organizationId: user.organizationId, status: "PENDING_APPROVAL" },
      });
      return { pending: count };
    }

    // بقیه فقط نامه‌هایی را می‌بینند که مرحله جاری‌شان سمت خودِ کاربر است
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { positionId: true } });
    if (!record.positionId) return { pending: 0 };

    const pending = await prisma.campaign.findMany({
      where: { organizationId: user.organizationId, status: "PENDING_APPROVAL" },
      select: { id: true, approvals: { where: { status: "PENDING" }, orderBy: { order: "asc" }, take: 1, select: { positionId: true } } },
    });
    return { pending: pending.filter((c) => c.approvals[0]?.positionId === record.positionId).length };
  });
}
