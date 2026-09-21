import "server-only";
import ExcelJS from "exceljs";
import { parseCsv } from "./csv";

/**
 * خواندن فایل مخاطبین: اکسل (.xlsx/.xlsm) یا CSV.
 *
 * خروجی هر دو یکسان است — آرایه‌ای از سطرها که هر سطر آرایه‌ای از رشته‌هاست —
 * تا بقیه مسیر ایمپورت نداند فایل ورودی چه فرمتی داشته.
 */
export type SheetRows = string[][];

/** سلول اکسل می‌تواند عدد، تاریخ، فرمول یا متن غنی باشد؛ همه به رشته تبدیل می‌شوند. */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  if (typeof value === "object") {
    // فرمول: مقدار محاسبه‌شده را می‌خواهیم، نه خود فرمول
    if ("result" in value && value.result !== undefined) return cellToString(value.result as ExcelJS.CellValue);
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("hyperlink" in value && "text" in value) return String(value.text ?? "").trim();
    if ("error" in value) return "";
  }
  return String(value).trim();
}

export async function readSpreadsheet(file: File): Promise<SheetRows> {
  const isCsv = /\.(csv|txt)$/i.test(file.name);
  if (isCsv) return parseCsv(await file.text());

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("فایل اکسل هیچ برگه‌ای ندارد.");

  const rows: SheetRows = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    // ستون ۰ در exceljs همیشه خالی است؛ از ۱ شروع می‌کنیم
    for (let column = 1; column <= sheet.columnCount; column++) {
      values.push(cellToString(row.getCell(column).value));
    }
    if (values.some((v) => v !== "")) rows.push(values);
  });
  return rows;
}

/** نام ستون‌های پذیرفته‌شده — مبنای هم ایمپورت و هم فایل نمونه. */
export const IMPORT_COLUMNS: Array<{ header: string; field: string; example: string; required?: boolean }> = [
  { header: "نام", field: "firstName", example: "حسین", required: true },
  { header: "نام خانوادگی", field: "lastName", example: "موسوی", required: true },
  { header: "عنوان", field: "formalTitle", example: "جناب آقای دکتر" },
  { header: "موبایل", field: "mobilePhone", example: "09121110003" },
  { header: "تلفن ثابت", field: "landlinePhone", example: "03536221100" },
  { header: "ایمیل", field: "email", example: "h.mousavi@yazd.ac.ir" },
  { header: "سازمان", field: "organizationName", example: "دانشگاه یزد" },
  { header: "سمت", field: "jobTitle", example: "معاون پژوهشی" },
  { header: "رسته شغلی", field: "jobCategory", example: "آموزش عالی" },
  { header: "استان", field: "province", example: "یزد" },
  { header: "شهر", field: "city", example: "یزد" },
  { header: "آدرس", field: "address", example: "بلوار دانشگاه" },
  { header: "توضیحات", field: "notes", example: "عضو کارگروه فناوری" },
  { header: "برچسب‌ها", field: "tags", example: "مدیران_استان، حامیان_فناوری" },
];

/** ساخت فایل نمونه اکسل با سرستون‌های درست و یک سطر راهنما. */
export async function buildTemplateWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "سامانه میلینگ سازمانی";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("مخاطبین", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });

  sheet.columns = IMPORT_COLUMNS.map((column) => ({
    header: column.header,
    key: column.field,
    width: Math.max(14, column.header.length + 6),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2547" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  // سطر نمونه تا کاربر ببیند هر ستون چه شکلی باید باشد
  const example = sheet.addRow(IMPORT_COLUMNS.map((c) => c.example));
  example.font = { italic: true, color: { argb: "FF64748B" } };

  // ستون موبایل متنی بماند تا اکسل صفر ابتدایی را نخورد
  const mobileIndex = IMPORT_COLUMNS.findIndex((c) => c.field === "mobilePhone") + 1;
  sheet.getColumn(mobileIndex).numFmt = "@";

  const note = sheet.addRow([]);
  note.getCell(1).value =
    "سطر دوم فقط نمونه است — آن را پاک کنید و داده خودتان را از سطر دوم بنویسید. ستون‌های «نام» و «نام خانوادگی» الزامی‌اند.";
  sheet.mergeCells(note.number, 1, note.number, IMPORT_COLUMNS.length);
  note.getCell(1).font = { color: { argb: "FFB91C1C" }, bold: true };
  note.getCell(1).alignment = { horizontal: "right" };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** خروجی اکسل از مخاطبین — همان ستون‌هایی که ایمپورت می‌پذیرد، تا رفت‌وبرگشت بی‌دردسر باشد. */
export async function buildContactsWorkbook(rows: Array<Record<string, string>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "سامانه میلینگ سازمانی";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("مخاطبین", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  sheet.columns = IMPORT_COLUMNS.map((column) => ({
    header: column.header,
    key: column.field,
    width: Math.max(14, column.header.length + 6),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2547" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  for (const row of rows) sheet.addRow(row);

  // شماره‌ها متنی بمانند تا صفر ابتدایی حفظ شود
  for (const field of ["mobilePhone", "landlinePhone"]) {
    const index = IMPORT_COLUMNS.findIndex((c) => c.field === field) + 1;
    sheet.getColumn(index).numFmt = "@";
  }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: IMPORT_COLUMNS.length } };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
