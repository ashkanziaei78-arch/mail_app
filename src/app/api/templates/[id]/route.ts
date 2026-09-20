import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("templates.write");
    const { id } = await params;
    const template = await prisma.letterTemplate.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!template) throw new ApiError(404, "قالب یافت نشد.");
    await prisma.letterTemplate.update({ where: { id }, data: { status: "ARCHIVED" } });
    return { id };
  });
}
