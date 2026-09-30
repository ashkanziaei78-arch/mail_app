import { prisma } from "@/lib/db";
import { sendCampaign } from "@/lib/campaign";
import { timingSafeEqual } from "@/lib/crypto";

/**
 * ارسال نامه‌های زمان‌بندی‌شده.
 *
 * Vercel Cron هر ربع ساعت این مسیر را صدا می‌زند. نامه‌ای فرستاده می‌شود که
 * تأیید شده و زمان ارسالش رسیده باشد. مسیر عمومی است، پس با CRON_SECRET
 * محافظت می‌شود؛ ورسل هم هدر Authorization: Bearer <CRON_SECRET> را می‌فرستد.
 *
 * هر اجرا حداکثر چند نامه را می‌فرستد تا از مهلت اجرای تابع رد نشویم؛ بقیه در
 * اجرای بعدی می‌روند.
 */
export const maxDuration = 60;

const MAX_PER_RUN = 3;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET تنظیم نشده است." }, { status: 503 });

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !timingSafeEqual(secret, provided)) {
    return Response.json({ ok: false, error: "دسترسی مجاز نیست." }, { status: 401 });
  }

  const due = await prisma.campaign.findMany({
    where: { status: "APPROVED", scheduledAt: { not: null, lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: MAX_PER_RUN,
    include: { createdBy: { select: { id: true, fullName: true, email: true, role: true, organizationId: true, departmentId: true } } },
  });

  const done: Array<{ id: string; sent: number; failed: number }> = [];
  for (const campaign of due) {
    try {
      const organization = await prisma.organization.findUniqueOrThrow({
        where: { id: campaign.organizationId },
        select: { name: true },
      });
      // ارسال به نام سازنده نامه انجام می‌شود؛ ردپای ممیزی به همان شخص می‌خورد
      const result = await sendCampaign(campaign.id, {
        ...campaign.createdBy,
        organizationName: organization.name,
        permissions: ["campaigns.send"],
      });
      done.push({ id: campaign.id, ...result });
    } catch (error) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "FAILED", rejectionReason: error instanceof Error ? error.message : "خطای ناشناخته در ارسال زمان‌بندی‌شده" },
      });
    }
  }

  return Response.json({ ok: true, data: { processed: done.length, done } });
}
