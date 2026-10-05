import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { encrypt, decrypt } from "@/lib/crypto";
import { MESSENGERS, sendMessenger, type MessengerId } from "@/lib/messengers";
import { audit } from "@/lib/audit";

/**
 * اتصال ربات پیام‌رسان‌ها (بله، تلگرام، ایتا).
 *
 * مسیر قدیمی bale نگه داشته شد تا نشانی‌های ذخیره‌شده نشکنند؛ حالا هر سه
 * پیام‌رسان را با پارامتر messenger می‌گیرد.
 */
const TOKEN_FIELD: Record<MessengerId, "baleBotTokenEncrypted" | "telegramBotTokenEncrypted" | "eitaaTokenEncrypted"> = {
  bale: "baleBotTokenEncrypted",
  telegram: "telegramBotTokenEncrypted",
  eitaa: "eitaaTokenEncrypted",
};

const CHAT_FIELD: Record<MessengerId, "baleChatId" | "telegramChatId" | "eitaaChatId"> = {
  bale: "baleChatId",
  telegram: "telegramChatId",
  eitaa: "eitaaChatId",
};

const messengerId = z.enum(["bale", "telegram", "eitaa"]);

const schema = z.object({
  messenger: messengerId,
  token: z.string().trim().max(200).default(""),
  disconnect: z.boolean().default(false),
});

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("sms.settings");
    const input = await readBody(request, schema);
    const field = TOKEN_FIELD[input.messenger];
    const label = MESSENGERS.find((m) => m.id === input.messenger)?.label ?? input.messenger;

    if (input.disconnect) {
      await prisma.organization.update({ where: { id: user.organizationId }, data: { [field]: null } });
      await audit({ organizationId: user.organizationId, userId: user.id, action: "MESSENGER_DISCONNECT", entityType: "Organization", entityId: user.organizationId, metadata: { messenger: input.messenger } });
      return { connected: false };
    }

    if (!input.token) throw new ApiError(422, `توکن ربات ${label} را وارد کنید.`);
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { [field]: encrypt(input.token) },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "MESSENGER_CONNECT", entityType: "Organization", entityId: user.organizationId, metadata: { messenger: input.messenger } });
    return { connected: true };
  });
}

/** پیام آزمایشی به گفت‌وگوی خودِ کاربر، برای اطمینان از درستی توکن و شناسه. */
export async function PUT(request: Request) {
  return handle(async () => {
    const user = await requireApi("sms.settings");
    const input = await readBody(request, z.object({ messenger: messengerId }));
    const label = MESSENGERS.find((m) => m.id === input.messenger)?.label ?? input.messenger;

    // هر سه ستون را می‌خوانیم و همان‌جا انتخاب می‌کنیم؛ ساده‌تر از select پویا
    // است و تایپ‌ها هم سالم می‌مانند.
    const [org, me] = await Promise.all([
      prisma.organization.findUniqueOrThrow({
        where: { id: user.organizationId },
        select: { baleBotTokenEncrypted: true, telegramBotTokenEncrypted: true, eitaaTokenEncrypted: true },
      }),
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { baleChatId: true, telegramChatId: true, eitaaChatId: true },
      }),
    ]);
    const encrypted = org[TOKEN_FIELD[input.messenger]];
    const chatId = me[CHAT_FIELD[input.messenger]];

    if (!encrypted) throw new ApiError(422, `اول توکن ربات ${label} را ثبت کنید.`);
    if (!chatId) throw new ApiError(422, `شناسه گفت‌وگوی ${label} خودتان در «حساب و امضای من» ثبت نشده است.`);

    const result = await sendMessenger(input.messenger, decrypt(encrypted), chatId, "پیام آزمایشی سامانه میلینگ پرس");
    if (!result.ok) throw new ApiError(502, result.error);
    return { sent: true };
  });
}
