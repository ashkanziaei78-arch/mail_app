import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { allows, requirePage } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { faDate, faNumber } from "@/lib/jalali";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { CAMPAIGN_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "کمپین‌ها" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const user = await requirePage("campaigns.read");
  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: user.organizationId },
    include: {
      department: true,
      _count: { select: { recipients: true } },
      recipients: { where: { status: { in: ["SMS_SENT", "SMS_DELIVERED"] } }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="کمپین‌ها"
        description="هر کمپین یک نامه است که برای فهرستی از مخاطبین شخصی‌سازی و پیامک می‌شود."
        action={allows(user, "campaigns.write") && <Link href="/campaigns/new" className="btn btn-primary">+ کمپین جدید</Link>}
      />

      {campaigns.length === 0 ? (
        <EmptyState
          title="هنوز کمپینی ندارید"
          description="برای شروع، یک کمپین بسازید: نام، سربرگ و قالب نامه را انتخاب کنید و سپس مخاطبین را مشخص کنید."
          action={allows(user, "campaigns.write") && <Link href="/campaigns/new" className="btn btn-primary">ساخت کمپین جدید</Link>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <caption className="sr-only">فهرست کمپین‌های سازمان</caption>
            <thead>
              <tr><th>نام کمپین</th><th className="col-optional">واحد</th><th className="col-optional">مخاطبین</th><th className="col-optional">پیامک موفق</th><th className="col-optional">محرمانگی</th><th>وضعیت</th><th>تاریخ</th></tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/campaigns/${c.id}`} className="link">{c.name}</Link></td>
                  <td className="col-optional">{c.department?.name ?? "—"}</td>
                  <td className="tnum col-optional">{faNumber(c._count.recipients)}</td>
                  <td className="tnum col-optional">{faNumber(c.recipients.length)} / {faNumber(c._count.recipients)}</td>
                  <td className="col-optional">{c.confidentiality === "CONFIDENTIAL" ? <Badge tone="warn">محرمانه</Badge> : <Badge>معمولی</Badge>}</td>
                  <td><Badge tone={CAMPAIGN_STATUS[c.status].tone}>{CAMPAIGN_STATUS[c.status].label}</Badge></td>
                  <td className="tnum">{faDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
