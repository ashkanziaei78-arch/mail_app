import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { shortUrlInput } from "@/lib/validators";
import { randomCode } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export async function GET() {
  return handle(async () => {
    const user = await requireApi("campaigns.read");
    return prisma.shortUrl.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("campaigns.write");
    const input = await readBody(request, shortUrlInput);

    // فقط http/https — جلوی javascript: و data: گرفته می‌شود تا لینک کوتاه به
    // اجرای اسکریپت روی مرورگر مخاطب تبدیل نشود.
    let parsed: URL;
    try { parsed = new URL(input.targetUrl); } catch { throw new ApiError(422, "نشانی معتبر نیست."); }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new ApiError(422, "فقط نشانی http یا https پذیرفته می‌شود.");
    }

    // همان نشانی را دوباره کوتاه نکنیم؛ کد قبلی را برمی‌گردانیم.
    const existing = await prisma.shortUrl.findFirst({
      where: { organizationId: user.organizationId, targetUrl: parsed.toString(), deletedAt: null },
    });
    if (existing) return existing;

    const link = await prisma.shortUrl.create({
      data: {
        organizationId: user.organizationId,
        createdByUserId: user.id,
        code: randomCode(7),
        targetUrl: parsed.toString(),
        label: input.label || null,
      },
    });
    await audit({
      organizationId: user.organizationId, userId: user.id,
      action: "SHORTURL_CREATE", entityType: "ShortUrl", entityId: link.id,
    });
    return link;
  });
}
