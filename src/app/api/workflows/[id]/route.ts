import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";

/**
 * حذف گردش کار.
 *
 * اگر نامه‌ای از این گردش کار استفاده کرده باشد، به‌طور پیش‌فرض حذف نمی‌شود تا
 * کسی ناخواسته تاریخچه تأیید را از بین نبرد. با `?force=1` (که در رابط کاربری
 * تأیید صریح می‌خواهد) نامه‌ها از گردش کار جدا می‌شوند و خودش حذف می‌شود؛
 * نامه‌ای که وسط تأیید مانده به پیش‌نویس برمی‌گردد تا در کارتابل کسی گیر نکند.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("users.manage");
    const { id } = await params;
    const force = new URL(request.url).searchParams.get("force") === "1";

    const workflow = await prisma.workflow.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { _count: { select: { campaigns: true } } },
    });
    if (!workflow) throw new ApiError(404, "گردش کار یافت نشد.");

    if (workflow._count.campaigns > 0 && !force) {
      throw new ApiError(409, `این گردش کار در ${workflow._count.campaigns} نامه استفاده شده است. برای حذف، گزینه «حذف به‌همراه جداکردن نامه‌ها» را بزنید.`);
    }

    await prisma.$transaction([
      // نامه‌های وسط تأیید را از بلاتکلیفی دربیاور
      prisma.campaign.updateMany({
        where: { workflowId: id, status: "PENDING_APPROVAL" },
        data: { status: "DRAFT", currentStepOrder: 0, rejectionReason: "گردش تأیید این نامه حذف شد؛ دوباره برای تأیید بفرستید." },
      }),
      prisma.campaign.updateMany({ where: { workflowId: id }, data: { workflowId: null } }),
      // تاریخچه تصمیم‌ها می‌ماند، فقط پیوندش به مرحله حذف‌شده باز می‌شود
      prisma.campaignApproval.updateMany({ where: { workflowStep: { workflowId: id } }, data: { workflowStepId: null } }),
      prisma.workflow.delete({ where: { id } }),
    ]);
    return { id };
  });
}
