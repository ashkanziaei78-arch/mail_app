import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";
import { storeUpload } from "@/lib/uploads";
import { audit } from "@/lib/audit";

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

    const fileUrl = await storeUpload(file, user.organizationId, "letterhead");
    const footerFileUrl = footer instanceof File && footer.size > 0
      ? await storeUpload(footer, user.organizationId, "footer")
      : null;

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
