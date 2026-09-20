import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { contactScope } from "@/lib/scope";
import TagsClient from "./tags-client";

export const metadata: Metadata = { title: "برچسب‌ها و گروه‌ها" };
export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const user = await requirePage("contacts.read");
  const [tags, groups, contacts] = await Promise.all([
    prisma.tag.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: { _count: { select: { contacts: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.group.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: contactScope(user),
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }],
      take: 500,
    }),
  ]);

  return (
    <TagsClient
      tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.contacts }))}
      groups={groups.map((g) => ({ id: g.id, name: g.name, type: g.type, count: g._count.members }))}
      contacts={contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))}
      canWrite={can(user.role, "tags.write")}
    />
  );
}
