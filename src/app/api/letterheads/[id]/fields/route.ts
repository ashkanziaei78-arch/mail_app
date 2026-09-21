import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { letterheadFieldInput } from "@/lib/validators";
import { audit } from "@/lib/audit";

async function ownedLetterhead(id: string, organizationId: string) {
  const letterhead = await prisma.letterhead.findFirst({ where: { id, organizationId } });
  if (!letterhead) throw new ApiError(404, "سربرگ یافت نشد.");
  return letterhead;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("campaigns.read");
    const { id } = await params;
    await ownedLetterhead(id, user.organizationId);
    return prisma.letterheadField.findMany({ where: { letterheadId: id }, orderBy: { sortOrder: "asc" } });
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("letterheads.write");
    const { id } = await params;
    await ownedLetterhead(id, user.organizationId);
    const input = await readBody(request, letterheadFieldInput);

    if (input.type === "SELECT" && (input.options ?? []).length === 0) {
      throw new ApiError(422, "برای فیلد انتخابی باید حداقل یک گزینه تعریف کنید.");
    }
    if (await prisma.letterheadField.findFirst({ where: { letterheadId: id, key: input.key } })) {
      throw new ApiError(409, `فیلدی با کلید «${input.key}» روی این سربرگ وجود دارد.`);
    }

    const count = await prisma.letterheadField.count({ where: { letterheadId: id } });
    if (count >= 30) throw new ApiError(422, "حداکثر ۳۰ فیلد برای هر سربرگ مجاز است.");

    const field = await prisma.letterheadField.create({
      data: {
        letterheadId: id,
        key: input.key,
        label: input.label,
        type: input.type,
        area: input.area,
        placeholder: input.placeholder || null,
        helpText: input.helpText || null,
        required: input.required,
        defaultValue: input.defaultValue || null,
        optionsJson: input.type === "SELECT" ? (input.options as object) : undefined,
        sortOrder: input.sortOrder || count,
      },
    });

    await audit({
      organizationId: user.organizationId, userId: user.id,
      action: "LETTERHEAD_FIELD_CREATE", entityType: "LetterheadField", entityId: field.id,
      metadata: { letterheadId: id, key: input.key, type: input.type },
    });
    return field;
  });
}
