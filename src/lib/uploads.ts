import "server-only";
import { prisma } from "./db";
import { ApiError } from "./api";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

/**
 * نوع‌های مجاز برای پیوست نامه.
 * فایل اجرایی و HTML عمداً نیستند: پیوست از همین دامنه سرو می‌شود و یک HTML
 * آلوده برابر با اجرای اسکریپت روی نشست گیرنده بود.
 */
const ATTACHMENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  txt: "text/plain",
};

export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES).map((e) => `.${e}`).join(",");

function matches(bytes: Uint8Array, offset: number, signature: number[]) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * نوع تصویر از روی محتوای فایل تشخیص داده می‌شود، نه از پسوند یا هدر Content-Type
 * که هر دو دست کاربرند. SVG عمداً پذیرفته نمی‌شود چون می‌تواند اسکریپت داشته باشد.
 */
export function sniffImage(bytes: Uint8Array): string | null {
  if (matches(bytes, 0, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (matches(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && matches(bytes, 8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  return null;
}

/**
 * فایل را در دیتابیس ذخیره می‌کند و نشانی سرو شدنش را برمی‌گرداند.
 *
 * قبلاً روی دیسک محلی نوشته می‌شد؛ روی میزبان‌های بدون دیسک دائمی آپلود با
 * EROFS شکست می‌خورد. حجم‌ها کوچک‌اند و تعدادشان کم، پس دیتابیس ساده‌ترین جایی
 * است که همه‌جا کار می‌کند.
 */
export async function storeUpload(
  file: File,
  organizationId: string,
  kind: "letterhead" | "footer" | "signature",
): Promise<string> {
  if (file.size > MAX_BYTES) throw new ApiError(413, "حجم تصویر بیش از ۴ مگابایت است.");
  if (file.size === 0) throw new ApiError(422, "فایل خالی است.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffImage(buffer);
  if (!mimeType) throw new ApiError(415, "فقط تصویر PNG، JPG یا WEBP پذیرفته می‌شود. (SVG به دلایل امنیتی پذیرفته نمی‌شود.)");

  const row = await prisma.uploadedFile.create({
    data: { organizationId, kind, mimeType, size: buffer.byteLength, data: buffer },
    select: { id: true },
  });
  return `/api/files/${row.id}`;
}

export type StoredAttachment = { id: string; name: string; size: number; mimeType: string };

/**
 * پیوست نامه را ذخیره می‌کند.
 * برخلاف تصاویر، اینجا نوع از روی پسوند تعیین می‌شود (فرمت‌های اداری امضای
 * یکتای قابل اتکا ندارند)، ولی فهرست پسوندها بسته است و نوعِ سرو‌شده از همان
 * فهرست می‌آید، نه از چیزی که کلاینت فرستاده.
 */
export async function storeAttachment(file: File, organizationId: string): Promise<StoredAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new ApiError(413, "حجم هر پیوست حداکثر ۸ مگابایت است.");
  if (file.size === 0) throw new ApiError(422, "فایل خالی است.");

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = ATTACHMENT_TYPES[extension];
  if (!mimeType) {
    throw new ApiError(415, `این نوع فایل پذیرفته نمی‌شود. مجاز: ${Object.keys(ATTACHMENT_TYPES).join("، ")}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const row = await prisma.uploadedFile.create({
    data: { organizationId, kind: "attachment", mimeType, size: buffer.byteLength, data: buffer },
    select: { id: true },
  });
  return { id: row.id, name: file.name.slice(0, 120), size: buffer.byteLength, mimeType };
}
