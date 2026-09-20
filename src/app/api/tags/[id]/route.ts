import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

/** حذف نرم برچسب — مخاطبین حذف نمی‌شوند، فقط اتصال برچسب برداشته می‌شود. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("tags.write");
    const { id } = await params;
    const tag = await prisma.tag.findFirst({ where: { id, organizationId: user.organizationId, deletedAt: null } });
    if (!tag) throw new ApiError(404, "برچسب یافت نشد.");

    await prisma.$transaction([
      prisma.contactTag.deleteMany({ where: { tagId: id } }),
      prisma.tag.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
    await audit({ organizationId: user.organizationId, userId: user.id, action: "TAG_DELETE", entityType: "Tag", entityId: id });
    return { id };
  });
}
