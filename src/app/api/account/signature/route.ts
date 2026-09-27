import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";
import { storeUpload } from "@/lib/uploads";
import { audit } from "@/lib/audit";

/** آپلود تصویر امضا برای حساب جاری. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ApiError(422, "تصویر امضا را انتخاب کنید.");

    const url = await storeUpload(file, user.organizationId, "signature");
    await prisma.user.update({ where: { id: user.id }, data: { signatureImagePath: url } });
    await audit({
      organizationId: user.organizationId, userId: user.id,
      action: "SIGNATURE_UPDATE", entityType: "User", entityId: user.id,
    });
    return { signatureImagePath: url };
  });
}

/** حذف امضا. */
export async function DELETE() {
  return handle(async () => {
    const user = await requireApi();
    await prisma.user.update({ where: { id: user.id }, data: { signatureImagePath: null } });
    return { signatureImagePath: null };
  });
}
