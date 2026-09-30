import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi } from "@/lib/api";

/** ثبت شناسه گفت‌وگوی کاربر با ربات بله (خالی یعنی حذف). */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi();
    const input = await readBody(request, z.object({ baleChatId: z.string().trim().max(40) }));
    const baleChatId = input.baleChatId || null;
    await prisma.user.update({ where: { id: user.id }, data: { baleChatId } });
    return { baleChatId };
  });
}
