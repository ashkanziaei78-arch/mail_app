import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import BrandingClient, { type Banner } from "./branding-client";

export const metadata: Metadata = { title: "نشان و بنرها" };
export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const user = await requirePage("users.manage");
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
    select: { logoPath: true, faviconPath: true, bannersJson: true },
  });

  return (
    <BrandingClient
      logoPath={organization.logoPath}
      faviconPath={organization.faviconPath}
      banners={(organization.bannersJson as Banner[] | null) ?? []}
    />
  );
}
