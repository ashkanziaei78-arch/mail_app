import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * سرو فایل‌های آپلودی (سربرگ، پاورقی، امضا).
 *
 * محتوا تغییرناپذیر است — هر آپلود تازه شناسه تازه می‌گیرد — پس با کش طولانی
 * سرو می‌شود. هدرهای امنیتی همان‌هایی‌اند که قبلاً برای /uploads ست می‌شد:
 * nosniff تا فایل به‌عنوان HTML تفسیر نشود و CSP سخت‌گیرانه.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await prisma.uploadedFile.findUnique({ where: { id } });
  if (!file) return new NextResponse("یافت نشد", { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "content-type": file.mimeType,
      "content-length": String(file.size),
      "cache-control": "public, max-age=31536000, immutable",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
