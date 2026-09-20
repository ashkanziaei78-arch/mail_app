import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import NewCampaignForm from "./new-campaign-form";

export const metadata: Metadata = { title: "ساخت کمپین جدید" };
export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const user = await requirePage("campaigns.write");
  const [letterheads, templates] = await Promise.all([
    prisma.letterhead.findMany({
      where: { organizationId: user.organizationId, status: "ACTIVE" },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.letterTemplate.findMany({ where: { organizationId: user.organizationId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <NewCampaignForm
      letterheads={letterheads.map((l) => ({ id: l.id, name: l.name, isDefault: l.isDefault }))}
      templates={templates.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}
