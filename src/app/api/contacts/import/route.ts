import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";
import { readSpreadsheet } from "@/lib/spreadsheet";
import { normalizeMobile } from "@/lib/sms";
import { audit } from "@/lib/audit";

/** ستون‌های پذیرفته‌شده در فایل ورودی (سطر اول = عنوان ستون‌ها) */
const COLUMNS: Record<string, string> = {
  "نام": "firstName",
  "نام کوچک": "firstName",
  "نام خانوادگی": "lastName",
  "فامیلی": "lastName",
  "نام و نام خانوادگی": "fullName",
  "عنوان": "formalTitle",
  "موبایل": "mobilePhone",
  "شماره همراه": "mobilePhone",
  "تلفن همراه": "mobilePhone",
  "همراه": "mobilePhone",
  "تلفن ثابت": "landlinePhone",
  "ایمیل": "email",
  "سازمان": "organizationName",
  "سمت": "jobTitle",
  "رسته شغلی": "jobCategory",
  "استان": "province",
  "شهر": "city",
  "آدرس": "address",
  "توضیحات": "notes",
  "برچسب‌ها": "tags",
  "برچسب": "tags",
  "هشتگ": "tags",
  "هشتگ‌ها": "tags",
};

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = /\.(xlsx|xlsm|csv|txt)$/i;

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("contacts.write");
    const form = await request.formData();
    const file = form.get("file");
    const visibility = form.get("visibility") === "PRIVATE" ? "PRIVATE" : "PUBLIC";

    if (!(file instanceof File)) throw new ApiError(400, "فایلی انتخاب نشده است.");
    if (file.size === 0) throw new ApiError(422, "فایل خالی است.");
    if (file.size > MAX_BYTES) throw new ApiError(413, "حجم فایل بیش از ۸ مگابایت است.");
    if (!ACCEPTED.test(file.name)) {
      throw new ApiError(415, "فقط فایل اکسل (xlsx) یا CSV پذیرفته می‌شود. فایل‌های قدیمی xls را در اکسل به xlsx تبدیل کنید.");
    }

    let rows;
    try {
      rows = await readSpreadsheet(file);
    } catch {
      throw new ApiError(422, "فایل خوانده نشد. اگر اکسل است، یک بار بازش کنید و دوباره با فرمت xlsx ذخیره کنید.");
    }
    if (rows.length < 2) throw new ApiError(422, "فایل خالی است یا فقط سطر عنوان دارد.");

    // سرستون‌ها ممکن است فاصله اضافی، نیم‌فاصله یا «ها»ی چسبیده داشته باشند
    const normalizeHeader = (value: string) =>
      value.trim().replace(/\u200c/g, " ").replace(/\s+/g, " ");
    const header = rows[0].map((h) => COLUMNS[normalizeHeader(h)] ?? normalizeHeader(h));

    // «نام و نام خانوادگی» در یک ستون هم پذیرفته می‌شود و خودکار تفکیک می‌گردد
    const hasSplitName = header.includes("firstName") && header.includes("lastName");
    const hasFullName = header.includes("fullName");
    if (!hasSplitName && !hasFullName) {
      const found = rows[0].filter(Boolean).join("، ") || "(خالی)";
      throw new ApiError(
        422,
        `ستون‌های «نام» و «نام خانوادگی» در سطر اول پیدا نشد. سرستون‌های فایل شما: ${found}. فایل نمونه را از همین صفحه دانلود کنید.`,
      );
    }

    const ownerUserId = visibility === "PRIVATE" ? user.id : null;
    const tags = await prisma.tag.findMany({ where: { organizationId: user.organizationId, deletedAt: null } });
    const tagByName = new Map(tags.map((t) => [t.name.replace(/^#/, ""), t.id]));

    let created = 0;
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const record = Object.fromEntries(header.map((key, index) => [key, (rows[i][index] ?? "").trim()]));
      const line = i + 1;

      if (!record.firstName && record.fullName) {
        // نخستین واژه نام، بقیه نام خانوادگی
        const parts = record.fullName.split(/\s+/).filter(Boolean);
        record.firstName = parts.shift() ?? "";
        record.lastName = parts.join(" ");
      }
      if (!record.firstName || !record.lastName) {
        errors.push(`سطر ${line}: نام یا نام خانوادگی خالی است.`);
        continue;
      }

      const mobile = normalizeMobile(record.mobilePhone);
      if (record.mobilePhone && !mobile) { errors.push(`سطر ${line}: شماره همراه «${record.mobilePhone}» معتبر نیست.`); continue; }
      if (mobile) {
        const duplicate = await prisma.contact.findFirst({
          where: { organizationId: user.organizationId, visibility, ownerUserId, mobilePhone: mobile, deletedAt: null },
        });
        if (duplicate) { errors.push(`سطر ${line}: شماره ${mobile} تکراری است.`); continue; }
      }

      const tagIds = (record.tags ?? "")
        .split(/[,،|]/).map((t) => t.trim().replace(/^#/, "")).filter(Boolean)
        .map((name) => tagByName.get(name)).filter((id): id is string => Boolean(id));

      await prisma.contact.create({
        data: {
          organizationId: user.organizationId,
          createdByUserId: user.id,
          ownerUserId,
          visibility,
          firstName: record.firstName,
          lastName: record.lastName,
          formalTitle: record.formalTitle || null,
          mobilePhone: mobile,
          landlinePhone: record.landlinePhone || null,
          email: record.email || null,
          province: record.province || null,
          city: record.city || null,
          address: record.address || null,
          notes: record.notes || null,
          organizations: record.organizationName
            ? {
                create: {
                  organizationId: user.organizationId,
                  departmentId: user.departmentId,
                  organizationName: record.organizationName,
                  jobTitle: record.jobTitle || null,
                  jobCategory: record.jobCategory || null,
                  isPrimary: true,
                },
              }
            : undefined,
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
          history: { create: { changedById: user.id, changeType: "CREATE", diffJson: { source: "import", line } } },
        },
      });
      created++;
    }

    await audit({
      organizationId: user.organizationId, userId: user.id,
      action: "CONTACT_IMPORT", entityType: "Contact",
      metadata: { created, failed: errors.length, fileName: file.name, rows: rows.length - 1 },
    });

    return { created, failed: errors.length, total: rows.length - 1, errors: errors.slice(0, 50) };
  });
}
