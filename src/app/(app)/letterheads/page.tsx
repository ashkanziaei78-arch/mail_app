import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/rbac";
import LetterheadsClient from "./letterheads-client";

export const metadata: Metadata = { title: "سربرگ و قالب نامه" };
export const dynamic = "force-dynamic";

export default async function LetterheadsPage() {
  const user = await requirePage("campaigns.read");
  const [letterheads, templates] = await Promise.all([
    prisma.letterhead.findMany({
      where: { organizationId: user.organizationId },
      include: { fields: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.letterTemplate.findMany({ where: { organizationId: user.organizationId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <LetterheadsClient
      letterheads={letterheads.map((l) => ({
        id: l.id, name: l.name, fileUrl: l.fileUrl, isDefault: l.isDefault, status: l.status, version: l.version,
        fields: l.fields.map((f) => ({
          id: f.id, key: f.key, label: f.label, type: f.type, area: f.area,
          placeholder: f.placeholder, helpText: f.helpText, required: f.required,
          defaultValue: f.defaultValue, options: (f.optionsJson as string[] | null) ?? [],
        })),
      }))}
      templates={templates.map((t) => ({ id: t.id, name: t.name, bodyHtml: t.bodyHtml }))}
      canWrite={can(user.role, "letterheads.write")}
    />
  );
}
