import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { contactScope } from "@/lib/scope";
import { can } from "@/lib/rbac";
import ContactsClient from "./contacts-client";

export const metadata: Metadata = { title: "دفترچه مخاطبین" };
export const dynamic = "force-dynamic";

export default async function ContactsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; book?: string; tag?: string; status?: string }>;
}) {
  const user = await requirePage("contacts.read");
  const sp = await searchParams;
  const q = sp.q?.trim();

  const [contacts, tags] = await Promise.all([
    prisma.contact.findMany({
      where: {
        AND: [
          contactScope(user),
          sp.book === "PUBLIC" || sp.book === "PRIVATE" ? { visibility: sp.book } : {},
          sp.status === "ACTIVE" || sp.status === "INACTIVE" ? { status: sp.status } : {},
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
      },
      include: { tags: { include: { tag: true } }, organizations: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 300,
    }),
    prisma.tag.findMany({ where: { organizationId: user.organizationId, deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ContactsClient
      initialFilters={{ q: q ?? "", book: sp.book ?? "", tag: sp.tag ?? "", status: sp.status ?? "" }}
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
