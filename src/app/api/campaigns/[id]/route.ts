import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { sanitizeHtml } from "@/lib/render";

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  subject: z.string().trim().max(200).optional().nullable(),
  confidentiality: z.enum(["NORMAL", "CONFIDENTIAL"]).optional(),
  smsBodyText: z.string().trim().max(1000).optional().nullable(),
  letter: z.object({
    title: z.string().trim().max(200).optional(),
    letterNumber: z.string().trim().max(60).optional().nullable(),
    subject: z.string().trim().max(200).optional().nullable(),
    bodyHtml: z.string().trim().min(1, "متن نامه خالی است.").optional(),
    senderName: z.string().trim().max(120).optional().nullable(),
    letterheadId: z.string().uuid().optional().nullable(),
    /** مقدار فیلدهای تعریف‌شده روی سربرگ: { key: value } */
    fieldValues: z.record(z.string(), z.string().max(5000)).optional(),
  }).optional(),
});

/** فقط کمپین در وضعیت قابل ویرایش را تغییر می‌دهیم؛ کمپین ارسال‌شده قفل است. */
const EDITABLE = ["DRAFT", "PENDING_APPROVAL", "APPROVED"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("campaigns.write");
    const { id } = await params;
    const input = await readBody(request, schema);

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { letters: { orderBy: { createdAt: "asc" }, take: 1 } },
    });
    if (!campaign) throw new ApiError(404, "کمپین یافت نشد.");
    if (!EDITABLE.includes(campaign.status)) throw new ApiError(409, "کمپین ارسال‌شده قابل ویرایش نیست. از آن یک رونوشت بسازید.");

    await prisma.campaign.update({
      where: { id },
      data: {
        name: input.name,
        subject: input.subject,
        confidentiality: input.confidentiality,
        smsBodyText: input.smsBodyText,
        // ویرایش متن ⇒ بازگشت به پیش‌نویس تا دوباره تأیید شود
        status: input.letter?.bodyHtml && campaign.status !== "DRAFT" ? "DRAFT" : undefined,
      },
    });

    const letter = campaign.letters[0];
    if (input.letter && letter) {
      // فیلدهای الزامی سربرگ باید پر باشند
      const letterheadId = input.letter.letterheadId ?? letter.letterheadId;
      if (letterheadId && input.letter.fieldValues) {
        const fields = await prisma.letterheadField.findMany({ where: { letterheadId } });
        const missing = fields
          .filter((f) => f.required && !(input.letter!.fieldValues![f.key] ?? "").trim())
          .map((f) => f.label);
        if (missing.length) {
          throw new ApiError(422, `این فیلدهای سربرگ الزامی‌اند و خالی مانده‌اند: ${missing.join("، ")}`);
        }
      }

      await prisma.letter.update({
        where: { id: letter.id },
        data: {
          title: input.letter.title,
          letterNumber: input.letter.letterNumber,
          subject: input.letter.subject,
          senderName: input.letter.senderName,
          letterheadId: input.letter.letterheadId,
          bodyHtml: input.letter.bodyHtml ? sanitizeHtml(input.letter.bodyHtml) : undefined,
          fieldValuesJson: input.letter.fieldValues ? (input.letter.fieldValues as object) : undefined,
          version: input.letter.bodyHtml ? { increment: 1 } : undefined,
        },
      });
    }

    return { id };
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("campaigns.write");
    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!campaign) throw new ApiError(404, "کمپین یافت نشد.");
    if (campaign.status !== "DRAFT") throw new ApiError(409, "فقط کمپین پیش‌نویس حذف می‌شود. کمپین‌های دیگر را لغو کنید.");
    await prisma.campaign.delete({ where: { id } });
    return { id };
  });
}
