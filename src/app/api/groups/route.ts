import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi } from "@/lib/api";
import { resolveRecipients } from "@/lib/campaign";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1, "نام گروه الزامی است.").max(60),
  type: z.enum(["MANUAL", "SMART"]).default("MANUAL"),
  /** MANUAL: فهرست شناسه مخاطبین — SMART: فیلتر ذخیره‌شده */
  contactIds: z.array(z.string().uuid()).default([]),
  filter: z.object({
    tagIds: z.array(z.string().uuid()).default([]),
    tagMode: z.enum(["AND", "OR"]).default("OR"),
    city: z.string().trim().optional(),
    jobCategory: z.string().trim().optional(),
  }).optional(),
});

export async function GET() {
  return handle(async () => {
    const user = await requireApi("contacts.read");
    return prisma.group.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("groups.write");
    const input = await readBody(request, schema);

    // گروه هوشمند: اعضا همین حالا از فیلتر حل می‌شوند و فیلتر هم ذخیره می‌ماند تا بعداً قابل تازه‌سازی باشد.
    const memberIds =
      input.type === "SMART" && input.filter
        ? await resolveRecipients(user, { tagIds: input.filter.tagIds, tagMode: input.filter.tagMode })
        : (input.contactIds ?? []);

    const group = await prisma.group.create({
      data: {
        organizationId: user.organizationId,
        name: input.name,
        type: input.type,
        filterJson: input.type === "SMART" ? (input.filter as object) : undefined,
        members: { create: memberIds.map((contactId) => ({ contactId })) },
      },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "GROUP_CREATE", entityType: "Group", entityId: group.id });
    return group;
  });
}
