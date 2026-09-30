import { prisma } from "@/lib/db";
import { handle, requireApi } from "@/lib/api";

/**
 * نامه‌های منتظر تصمیمِ همین کاربر (کارتابل تأیید).
 *
 * هر نیم‌دقیقه از مرورگر صدا زده می‌شود، پس سبک نگه داشته شده: حداکثر ۸ نامه
 * آخر، فقط با فیلدهایی که در فهرست کشویی نشان داده می‌شوند.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireApi("campaigns.approve");
    const isAdmin = user.role === "ORG_ADMIN" || user.role === "SUPER_ADMIN";

    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { positionId: true } });
    if (!isAdmin && !record.positionId) return { pending: 0, items: [] };

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: user.organizationId, status: "PENDING_APPROVAL" },
      select: {
        id: true, name: true, subject: true, updatedAt: true,
        createdBy: { select: { fullName: true } },
        approvals: {
          where: { status: "PENDING" }, orderBy: { order: "asc" }, take: 1,
          select: { positionId: true, position: { select: { name: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // مدیر سازمان همه را می‌بیند؛ بقیه فقط نامه‌ای که مرحله جاری‌اش سمت خودشان است
    const mine = isAdmin
      ? campaigns
      : campaigns.filter((c) => c.approvals[0]?.positionId === record.positionId);

    return {
      pending: mine.length,
      items: mine.slice(0, 8).map((c) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        author: c.createdBy.fullName,
        step: c.approvals[0]?.position.name ?? null,
        at: c.updatedAt.toISOString(),
      })),
    };
  });
}
