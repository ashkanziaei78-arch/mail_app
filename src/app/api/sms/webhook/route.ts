import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, ApiError } from "@/lib/api";
import { timingSafeEqual } from "@/lib/crypto";
import { audit } from "@/lib/audit";

/**
 * وبهوک وضعیت تحویل پیامک.
 *
 * درگاه پیامک با شناسه پیام و وضعیت نهایی اینجا را صدا می‌زند، پس «ارسال شد»
 * به «تحویل شد» ارتقا می‌یابد. مسیر عمومی است، بنابراین با یک توکن مشترک
 * (SMS_WEBHOOK_SECRET) محافظت می‌شود؛ بدون آن، هر کسی می‌توانست وضعیت
 * پیامک‌ها را جعل کند.
 */
const schema = z.object({
  messageId: z.string().trim().min(1).max(120),
  status: z.enum(["delivered", "failed", "sent", "expired"]),
  detail: z.string().trim().max(300).optional(),
});

const STATUS_MAP = {
  delivered: { sms: "DELIVERED", recipient: "SMS_DELIVERED" },
  sent: { sms: "SENT", recipient: "SMS_SENT" },
  failed: { sms: "FAILED", recipient: "SMS_FAILED" },
  expired: { sms: "FAILED", recipient: "SMS_FAILED" },
} as const;

export async function POST(request: Request) {
  return handle(async () => {
    const secret = process.env.SMS_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(503, "وبهوک پیامک پیکربندی نشده است.");

    const provided = request.headers.get("x-webhook-token") ?? new URL(request.url).searchParams.get("token") ?? "";
    if (!provided || !timingSafeEqual(secret, provided)) {
      throw new ApiError(401, "توکن وبهوک معتبر نیست.");
    }

    const input = await readBody(request, schema);
    const message = await prisma.smsMessage.findFirst({ where: { providerMessageId: input.messageId } });
    if (!message) throw new ApiError(404, "پیامکی با این شناسه یافت نشد.");

    const mapped = STATUS_MAP[input.status];
    const now = new Date();

    await prisma.$transaction([
      prisma.smsMessage.update({
        where: { id: message.id },
        data: {
          status: mapped.sms,
          deliveredAt: input.status === "delivered" ? now : message.deliveredAt,
          errorMessage: mapped.sms === "FAILED" ? (input.detail ?? "درگاه تحویل را تأیید نکرد.") : null,
        },
      }),
      prisma.campaignRecipient.update({
        where: { id: message.campaignRecipientId },
        data: {
          status: mapped.recipient,
          deliveredAt: input.status === "delivered" ? now : undefined,
          errorMessage: mapped.sms === "FAILED" ? (input.detail ?? "تحویل نشد.") : null,
        },
      }),
    ]);

    await audit({
      action: "SMS_DELIVERY_UPDATE", entityType: "SmsMessage", entityId: message.id,
      metadata: { status: input.status, messageId: input.messageId },
    });
    return { updated: true, status: mapped.sms };
  });
}
