import { prisma } from "./db";
import { randomCode } from "./crypto";

/**
 * کوتاه‌کردن خودکار نشانی‌های بلند داخل متن پیامک.
 *
 * چرا: هر پیامک فارسی ۷۰ کاراکتر است؛ یک نشانی بلند به‌تنهایی می‌تواند یک بخش
 * اضافه به کل کمپین تحمیل کند. نشانی‌هایی که خودِ سامانه ساخته (نامه، لغو
 * اشتراک، لینک کوتاه) دست نمی‌خورند چون از این هم کوتاه‌ترند.
 */
const URL_RE = /https?:\/\/[^\s<>"']+/g;

/** نقطه و پرانتز و ویرگول ته جمله جزو نشانی نیستند. */
function trimTail(url: string): string {
  return url.replace(/[.,;:!?)\]»،؛]+$/, "");
}

export async function shortenLongUrls(
  text: string,
  organizationId: string,
  userId: string,
  baseUrl: string,
): Promise<string> {
  const found = text.match(URL_RE);
  if (!found) return text;

  const shortLength = `${baseUrl}/s/`.length + 7;
  let out = text;

  for (const raw of [...new Set(found)]) {
    const url = trimTail(raw);
    if (url.length <= shortLength) continue;
    if (url.startsWith(`${baseUrl}/s/`) || url.startsWith(`${baseUrl}/l/`) || url.startsWith(`${baseUrl}/u/`)) continue;

    let parsed: URL;
    try { parsed = new URL(url); } catch { continue; }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;

    const target = parsed.toString();
    const existing = await prisma.shortUrl.findFirst({
      where: { organizationId, targetUrl: target, deletedAt: null },
    });
    const link =
      existing ??
      (await prisma.shortUrl.create({
        data: {
          organizationId,
          createdByUserId: userId,
          code: randomCode(7),
          targetUrl: target,
          label: "کوتاه‌شده خودکار در پیامک",
        },
      }));
    out = out.split(url).join(`${baseUrl}/s/${link.code}`);
  }

  return out;
}
