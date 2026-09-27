import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * ریدایرکت لینک کوتاه.
 *
 * مسیر عمداً کوتاه است (`/s/AbC123x`) چون در پیامک فارسی هر بخش ۷۰ کاراکتر است و
 * هر کاراکتر اضافه ممکن است یک بخش کامل هزینه اضافه کند.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = await prisma.shortUrl.findFirst({ where: { code, deletedAt: null } });

  if (!link || (link.expiresAt && link.expiresAt < new Date())) {
    return new NextResponse("این لینک معتبر نیست یا منقضی شده است.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // شمارش کلیک نباید ریدایرکت را کند کند یا با خطایش آن را بشکند.
  void prisma.shortUrl
    .update({ where: { id: link.id }, data: { clicks: { increment: 1 }, lastClickAt: new Date() } })
    .catch(() => undefined);

  return NextResponse.redirect(link.targetUrl, { status: 302 });
}
