import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { storeUpload } from "@/lib/uploads";
import { AVATAR_STYLES } from "@/lib/avatars";

/** انتخاب یکی از طرح‌های گالری. */
export async function PATCH(request: Request) {
  return handle(async () => {
    const user = await requireApi();
    const input = await readBody(request, z.object({ styleId: z.string().trim().max(40) }));
    if (!AVATAR_STYLES.some((s) => s.id === input.styleId)) throw new ApiError(422, "این طرح در گالری نیست.");
    const avatarPath = `avatar:${input.styleId}`;
    await prisma.user.update({ where: { id: user.id }, data: { avatarPath } });
    return { avatarPath };
  });
}

/** آپلود عکس شخصی. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ApiError(422, "عکسی انتخاب نشده است.");
    const avatarPath = await storeUpload(file, user.organizationId, "signature");
    await prisma.user.update({ where: { id: user.id }, data: { avatarPath } });
    return { avatarPath };
  });
}

export async function DELETE() {
  return handle(async () => {
    const user = await requireApi();
    await prisma.user.update({ where: { id: user.id }, data: { avatarPath: null } });
    return { avatarPath: null };
  });
}
