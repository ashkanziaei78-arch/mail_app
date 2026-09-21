import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { canEditContact, contactScope } from "@/lib/scope";
import { normalizeMobile } from "@/lib/sms";
import { audit } from "@/lib/audit";
import { contactInput } from "@/lib/validators";

async function load(id: string, user: Awaited<ReturnType<typeof requireApi>>) {
  const contact = await prisma.contact.findFirst({ where: { AND: [contactScope(user), { id }] } });
  if (!contact) throw new ApiError(404, "مخاطب یافت نشد.");
  if (!canEditContact(user, contact)) throw new ApiError(403, "اجازه ویرایش این مخاطب را ندارید.");
  return contact;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("contacts.write");
    const { id } = await params;
    const before = await load(id, user);
    const input = await readBody(request, contactInput);

    const mobile = normalizeMobile(input.mobilePhone);
    if (input.mobilePhone && !mobile) throw new ApiError(422, "شماره همراه معتبر نیست (نمونه: 09123456789).");

    const ownerUserId = input.visibility === "PRIVATE" ? (before.ownerUserId ?? user.id) : null;

    await prisma.$transaction([
      prisma.contactTag.deleteMany({ where: { contactId: id } }),
      prisma.contact.update({
        where: { id },
        data: {
          visibility: input.visibility,
          ownerUserId,
          firstName: input.firstName,
          lastName: input.lastName,
          formalTitle: input.formalTitle || null,
          mobilePhone: mobile,
          landlinePhone: input.landlinePhone || null,
          email: input.email || null,
          province: input.province || null,
          city: input.city || null,
          address: input.address || null,
          notes: input.notes || null,
          smsConsent: input.smsConsent,
          status: input.status,
          tags: { create: (input.tagIds ?? []).map((tagId) => ({ tagId })) },
          history: { create: { changedById: user.id, changeType: "UPDATE", diffJson: { before, after: input } as object } },
        },
      }),
      prisma.contactOrganization.deleteMany({ where: { contactId: id, isPrimary: true } }),
      ...(input.organizationName
        ? [
            prisma.contactOrganization.create({
              data: {
                contactId: id,
                organizationId: user.organizationId,
                departmentId: user.departmentId,
                organizationName: input.organizationName,
                jobTitle: input.jobTitle || null,
                jobCategory: input.jobCategory || null,
                isPrimary: true,
              },
            }),
          ]
        : []),
    ]);

    await audit({ organizationId: user.organizationId, userId: user.id, action: "CONTACT_UPDATE", entityType: "Contact", entityId: id });
    return { id };
  });
}

/** حذف نرم — رکورد برای تاریخچه کمپین‌ها باقی می‌ماند. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("contacts.delete");
    const { id } = await params;
    await load(id, user);
    await prisma.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
        history: { create: { changedById: user.id, changeType: "DELETE", diffJson: {} } },
      },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "CONTACT_DELETE", entityType: "Contact", entityId: id });
    return { id };
  });
}
