import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("users.manage");
    const { id } = await params;
    const position = await prisma.position.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { _count: { select: { users: true, workflowSteps: true } } },
    });
    if (!position) throw new ApiError(404, "سمت یافت نشد.");
    if (position._count.users > 0) {
      throw new ApiError(409, `${position._count.users.toLocaleString("fa-IR")} کاربر این سمت را دارند. اول سمتشان را عوض کنید.`);
    }
    if (position._count.workflowSteps > 0) {
      throw new ApiError(409, "این سمت در یک گردش تأیید استفاده شده است. اول آن مرحله را حذف کنید.");
    }
    await prisma.position.delete({ where: { id } });
    return { id };
  });
}
