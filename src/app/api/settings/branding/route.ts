import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { storeUpload } from "@/lib/uploads";
import { audit } from "@/lib/audit";

/** متن و ترتیب بنرها؛ خود تصویرها با POST جدا آپلود می‌شوند. */
const schema = z.object({
  banners: z.array(z.object({
    src: z.string().trim().max(300),
    caption: z.string().trim().max(200).default(""),
  })).max(8),
  /** درصد تیرگی روی تصویر بنر و مدت نمایش هر بنر */
  overlay: z.number().int().min(0).max(100).default(45),
  seconds: z.number().int().min(3).max(120).default(10),
  removeLogo: z.boolean().default(false),
  removeFavicon: z.boolean().default(false),
});

export async function PATCH(request: Request) {
  return handle(async () => {
    const user = await requireApi("users.manage");
    const input = await readBody(request, schema);
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        bannersJson: { items: input.banners, overlay: input.overlay, seconds: input.seconds },
        ...(input.removeLogo ? { logoPath: null } : {}),
        ...(input.removeFavicon ? { faviconPath: null } : {}),
      },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "BRANDING_UPDATE", entityType: "Organization", entityId: user.organizationId });
    return { ok: true };
  });
}

/** آپلود نشان، نشان تب یا یک بنر تازه. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("users.manage");
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");
    if (!(file instanceof File) || file.size === 0) throw new ApiError(422, "فایلی انتخاب نشده است.");
    if (kind !== "logo" && kind !== "favicon" && kind !== "banner") throw new ApiError(422, "نوع تصویر مشخص نیست.");

    const path = await storeUpload(file, user.organizationId, kind);

    if (kind === "logo") await prisma.organization.update({ where: { id: user.organizationId }, data: { logoPath: path } });
    if (kind === "favicon") await prisma.organization.update({ where: { id: user.organizationId }, data: { faviconPath: path } });

    return { path };
  });
}
