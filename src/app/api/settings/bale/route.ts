import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { encrypt, decrypt } from "@/lib/crypto";
import { sendBale } from "@/lib/bale";
import { audit } from "@/lib/audit";

const schema = z.object({
  /** خالی یعنی توکن قبلی دست‌نخورده بماند */
  token: z.string().trim().max(200).default(""),
  /** true یعنی اتصال بله قطع شود */
  disconnect: z.boolean().default(false),
});

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("sms.settings");
    const input = await readBody(request, schema);

    if (input.disconnect) {
      await prisma.organization.update({ where: { id: user.organizationId }, data: { baleBotTokenEncrypted: null } });
      await audit({ organizationId: user.organizationId, userId: user.id, action: "BALE_DISCONNECT", entityType: "Organization", entityId: user.organizationId });
      return { connected: false };
    }

    if (!input.token) throw new ApiError(422, "توکن ربات بله را وارد کنید.");
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { baleBotTokenEncrypted: encrypt(input.token) },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "BALE_CONNECT", entityType: "Organization", entityId: user.organizationId });
    return { connected: true };
  });
}

/** پیام آزمایشی به گفت‌وگوی خودِ کاربر، برای اطمینان از درستی توکن و شناسه. */
export async function PUT() {
  return handle(async () => {
    const user = await requireApi("sms.settings");
    const [org, me] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, select: { baleBotTokenEncrypted: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { baleChatId: true } }),
    ]);
    if (!org.baleBotTokenEncrypted) throw new ApiError(422, "اول توکن ربات بله را ثبت کنید.");
    if (!me.baleChatId) throw new ApiError(422, "شناسه گفت‌وگوی بلهٔ خودتان در «حساب و امضای من» ثبت نشده است.");

    const result = await sendBale(decrypt(org.baleBotTokenEncrypted), me.baleChatId, "پیام آزمایشی سامانه میلینگ سازمانی");
    if (!result.ok) throw new ApiError(502, result.error);
    return { sent: true };
  });
}
