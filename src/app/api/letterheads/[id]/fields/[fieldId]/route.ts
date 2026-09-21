import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

async function ownedField(letterheadId: string, fieldId: string, organizationId: string) {
  const field = await prisma.letterheadField.findFirst({
    where: { id: fieldId, letterheadId, letterhead: { organizationId } },
  });
  if (!field) throw new ApiError(404, "فیلد یافت نشد.");
  return field;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; fieldId: string }> }) {
  return handle(async () => {
    const user = await requireApi("letterheads.write");
    const { id, fieldId } = await params;
    await ownedField(id, fieldId, user.organizationId);
    const input = await readBody(request, z.object({ sortOrder: z.number().int().min(0).max(999) }));
    await prisma.letterheadField.update({ where: { id: fieldId }, data: { sortOrder: input.sortOrder } });
    return { id: fieldId };
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; fieldId: string }> }) {
  return handle(async () => {
    const user = await requireApi("letterheads.write");
    const { id, fieldId } = await params;
    const field = await ownedField(id, fieldId, user.organizationId);
    await prisma.letterheadField.delete({ where: { id: fieldId } });
    await audit({
      organizationId: user.organizationId, userId: user.id,
      action: "LETTERHEAD_FIELD_DELETE", entityType: "LetterheadField", entityId: fieldId,
      metadata: { key: field.key },
    });
    return { id: fieldId };
  });
}
