import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { contactScope } from "@/lib/scope";
import { can } from "@/lib/rbac";
import ContactsClient from "./contacts-client";

export const metadata: Metadata = { title: "دفترچه مخاطبین" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ContactsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; book?: string; tag?: string; status?: string; page?: string }>;
}) {
  const user = await requirePage("contacts.read");
  const sp = await searchParams;
  const q = sp.q?.trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const where: Prisma.ContactWhereInput = {
    AND: [
      contactScope(user),
      sp.book === "PUBLIC" || sp.book === "PRIVATE" ? { visibility: sp.book as Prisma.ContactWhereInput["visibility"] } : {},
      sp.status === "ACTIVE" || sp.status === "INACTIVE" ? { status: sp.status as Prisma.ContactWhereInput["status"] } : {},
      sp.tag ? { tags: { some: { tagId: sp.tag } } } : {},
      q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { mobilePhone: { contains: q } },
              { city: { contains: q, mode: "insensitive" as const } },
              { organizations: { some: { organizationName: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {},
    ],
  };

  const [contacts, total, tags] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } }, organizations: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contact.count({ where }),
    prisma.tag.findMany({ where: { organizationId: user.organizationId, deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ContactsClient
      initialFilters={{ q: q ?? "", book: sp.book ?? "", tag: sp.tag ?? "", status: sp.status ?? "" }}
      pagination={{ page, pageSize: PAGE_SIZE, total }}
      contacts={contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        formalTitle: c.formalTitle,
        mobilePhone: c.mobilePhone,
        landlinePhone: c.landlinePhone,
        email: c.email,
        province: c.province,
        city: c.city,
        address: c.address,
        notes: c.notes,
        smsConsent: c.smsConsent,
        status: c.status,
        visibility: c.visibility,
        lastUsedInCampaignAt: c.lastUsedInCampaignAt?.toISOString() ?? null,
        organizationName: c.organizations[0]?.organizationName ?? "",
        jobTitle: c.organizations[0]?.jobTitle ?? "",
        jobCategory: c.organizations[0]?.jobCategory ?? "",
        tagIds: c.tags.map((t) => t.tagId),
      }))}
      tags={tags.map((t) => ({ id: t.id, name: t.name }))}
      canWrite={can(user.role, "contacts.write")}
      canDelete={can(user.role, "contacts.delete")}
    />
  );
}
