import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("users.manage");
    const { id } = await params;
    const workflow = await prisma.workflow.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { _count: { select: { campaigns: true } } },
    });
    if (!workflow) throw new ApiError(404, "گردش کار یافت نشد.");
    if (workflow._count.campaigns > 0) {
      throw new ApiError(409, "این گردش کار در کمپین‌هایی استفاده شده و حذف نمی‌شود.");
    }
    await prisma.workflow.delete({ where: { id } });
    return { id };
  });
}
