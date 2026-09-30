import { prisma } from "@/lib/db";
import { allows, requirePage } from "@/lib/auth";
import { can } from "@/lib/rbac";
import ShortLinksClient from "./short-links-client";

export const metadata = { title: "کوتاه‌کننده لینک" };
export const dynamic = "force-dynamic";

export default async function ShortLinksPage() {
  const user = await requirePage("campaigns.read");
  const links = await prisma.shortUrl.findMany({
    where: { organizationId: user.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <ShortLinksClient
      canWrite={allows(user, "campaigns.write")}
      links={links.map((l) => ({
        id: l.id,
        code: l.code,
        targetUrl: l.targetUrl,
        label: l.label,
        clicks: l.clicks,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
