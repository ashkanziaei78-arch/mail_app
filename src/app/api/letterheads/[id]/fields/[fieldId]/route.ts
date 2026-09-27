import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { letterheadFieldInput } from "@/lib/validators";

/** همان فیلدهای ساخت، ولی همه اختیاری: ویرایشگر بوم فقط جای کادر را می‌فرستد. */
const patchInput = letterheadFieldInput.partial().omit({ key: true });

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
    const input = await readBody(request, patchInput);
    const { options, ...rest } = input;
    const field = await prisma.letterheadField.update({
      where: { id: fieldId },
      data: {
        ...rest,
        // undefined یعنی «دست نزن»؛ null یعنی «خالی کن». Prisma فقط کلیدهای موجود را می‌نویسد.
        ...(options ? { optionsJson: options as object } : {}),
      },
    });
    return field;
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
