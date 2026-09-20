import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { contactScope } from "@/lib/scope";
import { normalizeMobile } from "@/lib/sms";
import { audit } from "@/lib/audit";

export const contactInput = z.object({
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  firstName: z.string().trim().min(1, "نام الزامی است."),
  lastName: z.string().trim().min(1, "نام خانوادگی الزامی است."),
  formalTitle: z.string().trim().optional().nullable(),
  mobilePhone: z.string().trim().optional().nullable(),
  landlinePhone: z.string().trim().optional().nullable(),
  email: z.string().trim().email("ایمیل معتبر نیست.").optional().nullable().or(z.literal("")),
  province: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  smsConsent: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  organizationName: z.string().trim().optional().nullable(),
  jobTitle: z.string().trim().optional().nullable(),
  jobCategory: z.string().trim().optional().nullable(),
  tagIds: z.array(z.string().uuid()).default([]),
});

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApi("contacts.read");
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);

    return prisma.contact.findMany({
      where: {
        AND: [
          contactScope(user),
          q
            ? {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { mobilePhone: { contains: q } },
                  { organizations: { some: { organizationName: { contains: q, mode: "insensitive" } } } },
                ],
              }
            : {},
        ],
      },
      include: { tags: { include: { tag: true } }, organizations: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take,
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("contacts.write");
    const input = await readBody(request, contactInput);
    const mobile = normalizeMobile(input.mobilePhone);
    if (input.mobilePhone && !mobile) throw new ApiError(422, "شماره همراه معتبر نیست (نمونه: 09123456789).");

    const ownerUserId = input.visibility === "PRIVATE" ? user.id : null;
    if (mobile) {
      const duplicate = await prisma.contact.findFirst({
        where: { organizationId: user.organizationId, visibility: input.visibility, ownerUserId, mobilePhone: mobile, deletedAt: null },
      });
      if (duplicate) throw new ApiError(409, `این شماره قبلاً به نام «${duplicate.firstName} ${duplicate.lastName}» ثبت شده است.`);
    }

    const contact = await prisma.contact.create({
      data: {
        organizationId: user.organizationId,
        createdByUserId: user.id,
        ownerUserId,
        visibility: input.visibility,
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
        organizations: input.organizationName
          ? {
              create: {
                organizationId: user.organizationId,
                departmentId: user.departmentId,
                organizationName: input.organizationName,
                jobTitle: input.jobTitle || null,
                jobCategory: input.jobCategory || null,
                isPrimary: true,
              },
            }
          : undefined,
        tags: { create: (input.tagIds ?? []).map((tagId) => ({ tagId })) },
        history: { create: { changedById: user.id, changeType: "CREATE", diffJson: input as object } },
      },
    });

    await audit({ organizationId: user.organizationId, userId: user.id, action: "CONTACT_CREATE", entityType: "Contact", entityId: contact.id });
    return contact;
  });
}
