import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, ApiError } from "@/lib/api";
import { clientIp, consume, RULES } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const schema = z.object({
  kind: z.enum(["ACKNOWLEDGED", "ACCEPTED", "DECLINED", "REPLIED"]),
  message: z.string().trim().max(2000).optional().nullable(),
});

/**
 * ثبت پاسخ گیرنده. مسیر عمومی است (گیرنده حساب کاربری ندارد)، پس دانستن کد
 * ۱۰ کاراکتری لینک تنها شرط دسترسی است — همان چیزی که برای دیدن نامه لازم بود.
 */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await params;
    const ip = await clientIp();
    await consume(`respond:${ip}`, RULES.accessCode);

    const input = await readBody(request, schema);
    if (input.kind === "REPLIED" && !input.message) {
      throw new ApiError(422, "متن پاسخ را بنویسید.");
    }

    const link = await prisma.shortLink.findUnique({
      where: { code },
      include: { document: { include: { campaignRecipient: true } } },
    });
    if (!link || !link.isActive) throw new ApiError(404, "این نامه در دسترس نیست.");
    if (link.expiresAt && link.expiresAt < new Date()) throw new ApiError(410, "مهلت پاسخ به این نامه گذشته است.");

    const recipientId = link.document.campaignRecipient.id;
    if (await prisma.letterResponse.findUnique({ where: { campaignRecipientId: recipientId } })) {
      throw new ApiError(409, "پاسخ شما قبلاً ثبت شده است.");
    }

    const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;
    await prisma.$transaction([
      prisma.letterResponse.create({
        data: { campaignRecipientId: recipientId, kind: input.kind, message: input.message || null, ipAddress: ip, userAgent },
      }),
      prisma.campaignRecipient.update({ where: { id: recipientId }, data: { respondedAt: new Date() } }),
    ]);

    await audit({ action: "LETTER_RESPONSE", entityType: "CampaignRecipient", entityId: recipientId, metadata: { kind: input.kind } });
    return { recorded: true };
  });
}
