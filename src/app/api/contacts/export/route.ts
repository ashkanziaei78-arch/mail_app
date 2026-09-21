import { prisma } from "@/lib/db";
import { requireApi } from "@/lib/api";
import { contactScope } from "@/lib/scope";
import { buildContactsWorkbook } from "@/lib/spreadsheet";

export async function GET() {
  const user = await requireApi("contacts.read");
  const contacts = await prisma.contact.findMany({
    where: contactScope(user),
    include: { tags: { include: { tag: true } }, organizations: { where: { isPrimary: true }, take: 1 } },
    orderBy: [{ lastName: "asc" }],
  });

  const buffer = await buildContactsWorkbook(
    contacts.map((c) => ({
      firstName: c.firstName,
      lastName: c.lastName,
      formalTitle: c.formalTitle ?? "",
      mobilePhone: c.mobilePhone ?? "",
      landlinePhone: c.landlinePhone ?? "",
      email: c.email ?? "",
      organizationName: c.organizations[0]?.organizationName ?? "",
      jobTitle: c.organizations[0]?.jobTitle ?? "",
      jobCategory: c.organizations[0]?.jobCategory ?? "",
      province: c.province ?? "",
      city: c.city ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
      tags: c.tags.map((t) => t.tag.name).join("، "),
    })),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="contacts-${Date.now()}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
