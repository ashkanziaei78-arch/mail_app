import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";
import { storeAttachment, type StoredAttachment } from "@/lib/uploads";
import { audit } from "@/lib/audit";

const MAX_ATTACHMENTS = 10;

async function loadLetter(campaignId: string, organizationId: string) {
  const letter = await prisma.letter.findFirst({
    where: { campaignId, organizationId },
    orderBy: { createdAt: "asc" },
  });
  if (!letter) throw new ApiError(404, "ابتدا متن نامه را ذخیره کنید، بعد پیوست اضافه کنید.");
  return letter;
}

function current(letter: { attachmentsJson: unknown }): StoredAttachment[] {
  return (letter.attachmentsJson as StoredAttachment[] | null) ?? [];
}

/** افزودن یک یا چند پیوست به نامه این نامه. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("campaigns.write");
    const { id } = await params;
    const letter = await loadLetter(id, user.organizationId);

    const form = await request.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new ApiError(422, "فایلی انتخاب نشده است.");

    const existing = current(letter);
    if (existing.length + files.length > MAX_ATTACHMENTS) {
      throw new ApiError(422, `حداکثر ${MAX_ATTACHMENTS} پیوست برای هر نامه مجاز است.`);
    }

    const added: StoredAttachment[] = [];
    for (const file of files) added.push(await storeAttachment(file, user.organizationId));

    const attachments = [...existing, ...added];
    await prisma.letter.update({ where: { id: letter.id }, data: { attachmentsJson: attachments } });
    await audit({
      organizationId: user.organizationId, userId: user.id,
      action: "LETTER_ATTACH", entityType: "Letter", entityId: letter.id,
      metadata: { count: added.length },
    });
    return attachments;
  });
}

/** حذف یک پیوست. فایلش هم از دیتابیس پاک می‌شود تا جا اشغال نکند. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("campaigns.write");
    const { id } = await params;
    const letter = await loadLetter(id, user.organizationId);

    const fileId = new URL(request.url).searchParams.get("fileId");
    if (!fileId) throw new ApiError(400, "شناسه پیوست مشخص نیست.");

    const attachments = current(letter).filter((a) => a.id !== fileId);
    await prisma.letter.update({ where: { id: letter.id }, data: { attachmentsJson: attachments } });
    await prisma.uploadedFile
      .deleteMany({ where: { id: fileId, organizationId: user.organizationId, kind: "attachment" } })
      .catch(() => undefined);
    return attachments;
  });
}
