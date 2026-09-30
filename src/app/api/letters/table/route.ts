import { handle, requireApi, ApiError } from "@/lib/api";
import { readSpreadsheet } from "@/lib/spreadsheet";

/** فرار دادن متن سلول تا محتوای اکسل نتواند HTML تزریق کند. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * تبدیل فایل اکسل/CSV به جدول HTML برای درج در متن نامه.
 * ردیف اول سرستون در نظر گرفته می‌شود.
 */
export async function POST(request: Request) {
  return handle(async () => {
    await requireApi("campaigns.write");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ApiError(422, "فایلی انتخاب نشده است.");
    if (file.size > 2 * 1024 * 1024) throw new ApiError(413, "حجم فایل بیش از ۲ مگابایت است.");

    const rows = await readSpreadsheet(file);
    if (rows.length === 0) throw new ApiError(422, "فایل خالی است.");
    if (rows.length > 200) throw new ApiError(422, "بیش از ۲۰۰ ردیف؛ فایل را کوچک‌تر کنید.");

    const [header, ...body] = rows;
    const head = `<thead><tr>${header.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`;
    const rest = body
      .map((row) => `<tr>${header.map((_, i) => `<td>${escapeHtml(row[i] ?? "")}</td>`).join("")}</tr>`)
      .join("");
    return { html: `<table dir="rtl">${head}<tbody>${rest}</tbody></table>` };
  });
}
