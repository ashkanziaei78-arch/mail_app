import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi } from "@/lib/api";

/** ثبت شناسه گفت‌وگوی کاربر با ربات هر پیام‌رسان (خالی یعنی حذف). */
const FIELD = { bale: "baleChatId", telegram: "telegramChatId", eitaa: "eitaaChatId" } as const;

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi();
    const input = await readBody(
      request,
      z.object({
        messenger: z.enum(["bale", "telegram", "eitaa"]),
        chatId: z.string().trim().max(40),
      }),
    );
    const value = input.chatId || null;
    await prisma.user.update({ where: { id: user.id }, data: { [FIELD[input.messenger]]: value } });
    return { chatId: value };
  });
}
