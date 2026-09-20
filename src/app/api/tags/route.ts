import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1, "نام برچسب الزامی است.").max(40).transform((v) => v.replace(/^#/, "")),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "رنگ باید کد هگز باشد.").optional().nullable(),
});

export async function GET() {
  return handle(async () => {
    const user = await requireApi("contacts.read");
    return prisma.tag.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: { _count: { select: { contacts: true } } },
      orderBy: { name: "asc" },
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("tags.write");
    const input = await readBody(request, schema);
    const tag = await prisma.tag.create({
      data: { organizationId: user.organizationId, name: input.name, color: input.color || null },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "TAG_CREATE", entityType: "Tag", entityId: tag.id });
    return tag;
  });
}
