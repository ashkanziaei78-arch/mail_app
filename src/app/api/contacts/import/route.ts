import { prisma } from "@/lib/db";
import { handle, requireApi, ApiError } from "@/lib/api";
import { parseCsv } from "@/lib/csv";
import { normalizeMobile } from "@/lib/sms";
import { audit } from "@/lib/audit";

/** ستون‌های پذیرفته‌شده در فایل ورودی (سطر اول = عنوان ستون‌ها) */
const COLUMNS: Record<string, string> = {
  "نام": "firstName",
  "نام خانوادگی": "lastName",
  "عنوان": "formalTitle",
  "موبایل": "mobilePhone",
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
};

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("contacts.write");
    const form = await request.formData();
    const file = form.get("file");
    const visibility = form.get("visibility") === "PRIVATE" ? "PRIVATE" : "PUBLIC";

    if (!(file instanceof File)) throw new ApiError(400, "فایلی انتخاب نشده است.");
    if (file.size > MAX_BYTES) throw new ApiError(413, "حجم فایل بیش از ۵ مگابایت است.");
    if (!/\.(csv|txt)$/i.test(file.name)) {
      throw new ApiError(415, "فقط فایل CSV پذیرفته می‌شود. در اکسل: ذخیره به‌صورت «CSV UTF-8».");
    }

    const rows = parseCsv(await file.text());
    if (rows.length < 2) throw new ApiError(422, "فایل خالی است یا فقط سطر عنوان دارد.");

    const header = rows[0].map((h) => COLUMNS[h.trim()] ?? h.trim());
    if (!header.includes("firstName") || !header.includes("lastName")) {
      throw new ApiError(422, "ستون‌های «نام» و «نام خانوادگی» الزامی هستند.");
    }

    const ownerUserId = visibility === "PRIVATE" ? user.id : null;
    const tags = await prisma.tag.findMany({ where: { organizationId: user.organizationId, deletedAt: null } });
    const tagByName = new Map(tags.map((t) => [t.name.replace(/^#/, ""), t.id]));

    let created = 0;
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const record = Object.fromEntries(header.map((key, index) => [key, (rows[i][index] ?? "").trim()]));
      const line = i + 1;
      if (!record.firstName || !record.lastName) { errors.push(`سطر ${line}: نام یا نام خانوادگی خالی است.`); continue; }

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
      metadata: { created, failed: errors.length, fileName: file.name },
    });

    return { created, failed: errors.length, errors: errors.slice(0, 50) };
  });
}
