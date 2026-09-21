import { requireApi } from "@/lib/api";
import { buildTemplateWorkbook } from "@/lib/spreadsheet";

/** دانلود فایل نمونه اکسل با سرستون‌های درست. */
export async function GET() {
  await requireApi("contacts.read");
  const buffer = await buildTemplateWorkbook();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="contacts-template.xlsx"',
      "cache-control": "no-store",
    },
  });
}
