import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";
import { resolveRecipients } from "@/lib/campaign";
import { audit } from "@/lib/audit";

/** تازه‌سازی اعضای گروه هوشمند از روی فیلتر ذخیره‌شده. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("groups.write");
    const { id } = await params;
    const group = await prisma.group.findFirst({ where: { id, organizationId: user.organizationId, deletedAt: null } });
    if (!group) throw new ApiError(404, "گروه یافت نشد.");
    if (group.type !== "SMART") throw new ApiError(400, "فقط گروه هوشمند قابل تازه‌سازی است.");

    const filter = (group.filterJson ?? {}) as { tagIds?: string[]; tagMode?: "AND" | "OR" };
    const memberIds = await resolveRecipients(user, { tagIds: filter.tagIds, tagMode: filter.tagMode });

    await prisma.$transaction([
      prisma.groupMember.deleteMany({ where: { groupId: id } }),
      prisma.groupMember.createMany({ data: memberIds.map((contactId) => ({ groupId: id, contactId })) }),
    ]);
    return { count: memberIds.length };
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("groups.write");
    const { id } = await params;
    const group = await prisma.group.findFirst({ where: { id, organizationId: user.organizationId, deletedAt: null } });
    if (!group) throw new ApiError(404, "گروه یافت نشد.");
    await prisma.group.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "GROUP_DELETE", entityType: "Group", entityId: id });
    return { id };
  });
}
