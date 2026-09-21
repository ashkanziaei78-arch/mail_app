import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";
import { randomCode } from "@/lib/crypto";
import { audit } from "@/lib/audit";

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * نوع فایل از روی بایت‌های ابتدایی (magic number) تشخیص داده می‌شود، نه از
 * `file.type` که کلاینت می‌فرستد و قابل جعل است.
 *
 * SVG عمداً پذیرفته نمی‌شود: SVG می‌تواند <script> داشته باشد و چون از همین
 * دامنه سرو می‌شود، آپلودش برابر با XSS ذخیره‌شده روی کل سامانه بود.
 */
function matches(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function sniffImage(bytes: Uint8Array): ".png" | ".jpg" | ".webp" | null {
  if (matches(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return ".png";
  if (matches(bytes, 0, [0xff, 0xd8, 0xff])) return ".jpg";
  // RIFF....WEBP
  if (matches(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && matches(bytes, 8, [0x57, 0x45, 0x42, 0x50])) return ".webp";
  return null;
}

/**
 * ponytail: فایل روی دیسک محلی زیر public/uploads.
 *
 * روی Vercel فایل‌سیستم فقط-خواندنی است، پس آپلود سربرگ آنجا کار نمی‌کند و
 * پیام روشنی برمی‌گرداند. برای استقرار واقعی، یا روی سروری با دیسک دائمی
 * اجرا کنید (docker-compose همین مخزن) یا همین تابع را به S3/MinIO ببرید.
 */
async function store(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new ApiError(413, "حجم تصویر بیش از ۴ مگابایت است.");
  if (file.size === 0) throw new ApiError(422, "فایل خالی است.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = sniffImage(buffer);
  if (!extension) throw new ApiError(415, "فقط تصویر PNG، JPG یا WEBP پذیرفته می‌شود. (SVG به دلایل امنیتی پذیرفته نمی‌شود.)");

  const name = `${Date.now()}-${randomCode(16)}${extension}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES") {
      throw new ApiError(
        501,
        "این نسخه روی فضای ابری با فایل‌سیستم فقط-خواندنی اجرا می‌شود، پس آپلود سربرگ فعال نیست. برای استفاده واقعی، سامانه را روی سرور خودتان (docker-compose داخل مخزن) اجرا کنید.",
      );
    }
    throw error;
  }
  return `/uploads/${name}`;
}

export async function GET() {
  return handle(async () => {
    const user = await requireApi("campaigns.read");
    return prisma.letterhead.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" } });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("letterheads.write");
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const file = form.get("file");
    const footer = form.get("footerFile");
    const isDefault = form.get("isDefault") === "true";

    if (!name) throw new ApiError(422, "نام سربرگ الزامی است.");
    if (!(file instanceof File) || file.size === 0) throw new ApiError(422, "تصویر سربرگ را انتخاب کنید.");

    const fileUrl = await store(file);
    const footerFileUrl = footer instanceof File && footer.size > 0 ? await store(footer) : null;

    if (isDefault) {
      await prisma.letterhead.updateMany({ where: { organizationId: user.organizationId }, data: { isDefault: false } });
    }

    const letterhead = await prisma.letterhead.create({
      data: {
        organizationId: user.organizationId,
        departmentId: user.departmentId,
        name, fileUrl, footerFileUrl, isDefault,
        versions: { create: { fileUrl, version: 1 } },
      },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "LETTERHEAD_CREATE", entityType: "Letterhead", entityId: letterhead.id });
    return letterhead;
  });
}
