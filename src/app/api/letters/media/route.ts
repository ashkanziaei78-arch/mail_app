import { handle, requireApi, ApiError } from "@/lib/api";
import { storeUpload } from "@/lib/uploads";

/** آپلود تصویری که داخل متن نامه درج می‌شود. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("campaigns.write");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ApiError(422, "تصویری انتخاب نشده است.");
    const path = await storeUpload(file, user.organizationId, "letterhead");
    return { path };
  });
}
