import { prisma } from "@/lib/db";
import { requireApi } from "@/lib/api";
import { contactScope } from "@/lib/scope";
import { toCsv } from "@/lib/csv";

const COLUMNS = ["نام", "نام خانوادگی", "عنوان", "موبایل", "تلفن ثابت", "ایمیل", "سازمان", "سمت", "رسته شغلی", "استان", "شهر", "آدرس", "برچسب‌ها", "دفترچه", "وضعیت"];

export async function GET() {
  const user = await requireApi("contacts.read");
  const contacts = await prisma.contact.findMany({
    where: contactScope(user),
    include: { tags: { include: { tag: true } }, organizations: { where: { isPrimary: true }, take: 1 } },
    orderBy: [{ lastName: "asc" }],
  });

  const csv = toCsv(
    contacts.map((c) => ({
      "نام": c.firstName,
      "نام خانوادگی": c.lastName,
      "عنوان": c.formalTitle ?? "",
      "موبایل": c.mobilePhone ?? "",
      "تلفن ثابت": c.landlinePhone ?? "",
      "ایمیل": c.email ?? "",
      "سازمان": c.organizations[0]?.organizationName ?? "",
      "سمت": c.organizations[0]?.jobTitle ?? "",
      "رسته شغلی": c.organizations[0]?.jobCategory ?? "",
      "استان": c.province ?? "",
      "شهر": c.city ?? "",
      "آدرس": c.address ?? "",
      "برچسب‌ها": c.tags.map((t) => `#${t.tag.name}`).join("، "),
      "دفترچه": c.visibility === "PUBLIC" ? "عمومی" : "خصوصی",
      "وضعیت": c.status === "ACTIVE" ? "فعال" : "غیرفعال",
    })),
    COLUMNS,
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="contacts-${Date.now()}.csv"`,
    },
  });
}
