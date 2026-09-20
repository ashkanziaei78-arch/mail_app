import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";
import { randomCode } from "@/lib/crypto";
import { audit } from "@/lib/audit";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
]);

/** ponytail: فایل روی دیسک محلی زیر public/uploads. برای چنداستقراری، همین تابع را به S3/MinIO ببرید. */
async function store(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new ApiError(413, "حجم تصویر بیش از ۴ مگابایت است.");
  const extension = ALLOWED.get(file.type);
  if (!extension) throw new ApiError(415, "فقط تصویر PNG، JPG، WEBP یا SVG پذیرفته می‌شود.");
  const name = `${Date.now()}-${randomCode(8)}${extension}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
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
