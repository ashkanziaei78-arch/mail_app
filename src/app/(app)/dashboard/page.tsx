import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { contactScope } from "@/lib/scope";
import { faDate, faNumber } from "@/lib/jalali";
import { Badge, PageHeader, StatCard, EmptyState } from "@/components/ui/primitives";
import { CAMPAIGN_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "داشبورد" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requirePage();
  const denied = (await searchParams).denied;
  const org = { organizationId: user.organizationId };

  const [contacts, activeContacts, tags, groups, campaignsSent, pendingApproval, smsAgg, recent, byDepartment] =
    await Promise.all([
      prisma.contact.count({ where: contactScope(user) }),
      prisma.contact.count({ where: { AND: [contactScope(user), { status: "ACTIVE" }] } }),
      prisma.tag.count({ where: { ...org, deletedAt: null } }),
      prisma.group.count({ where: { ...org, deletedAt: null } }),
      prisma.campaign.count({ where: { ...org, status: { in: ["COMPLETED", "PROCESSING"] } } }),
      prisma.campaign.count({ where: { ...org, status: "PENDING_APPROVAL" } }),
      prisma.smsMessage.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { campaignRecipient: { campaign: org } },
      }),
      prisma.campaign.findMany({
        where: org,
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { department: true, _count: { select: { recipients: true } } },
      }),
      prisma.campaign.groupBy({ by: ["departmentId"], _count: { _all: true }, where: org }),
    ]);

  const sent = smsAgg.filter((s) => s.status === "SENT" || s.status === "DELIVERED").reduce((a, s) => a + s._count._all, 0);
  const failed = smsAgg.filter((s) => s.status === "FAILED").reduce((a, s) => a + s._count._all, 0);
  const totalSms = sent + failed;
  const successRate = totalSms ? ((sent / totalSms) * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) : "—";

  const departments = await prisma.department.findMany({ where: org });
  const deptRows = byDepartment
    .map((row) => ({
      name: departments.find((d) => d.id === row.departmentId)?.name ?? "بدون واحد",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);
  const maxDept = Math.max(1, ...deptRows.map((d) => d.count));

  return (
    <>
      <PageHeader title="داشبورد" description={`خلاصه وضعیت مکاتبات ${user.organizationName}`} />

      {denied && (
        <p role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
           style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
          دسترسی لازم برای آن بخش را ندارید. در صورت نیاز از مدیر سازمان درخواست کنید.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="کل مخاطبین" value={faNumber(contacts)} hint={`${faNumber(activeContacts)} مخاطب فعال`} href="/contacts" />
        <StatCard label="کمپین‌های ارسال‌شده" value={faNumber(campaignsSent)} hint={`${faNumber(groups)} گروه، ${faNumber(tags)} برچسب`} href="/campaigns" />
        <StatCard label="پیامک‌های موفق" value={totalSms ? `${successRate}٪` : "—"} hint={`${faNumber(sent)} موفق از ${faNumber(totalSms)} ارسال`} href="/reports" />
        <StatCard label="نامه‌های در انتظار تأیید" value={faNumber(pendingApproval)} hint="نیازمند بررسی" href="/approvals" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">آخرین کمپین‌ها</h2>
            <Link href="/campaigns" className="btn btn-sm">مشاهده همه</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              title="هنوز کمپینی ساخته نشده"
              description="اولین کمپین را بسازید: قالب نامه را انتخاب کنید، مخاطبین هدف را مشخص کنید و پیامک را بفرستید."
              action={<Link href="/campaigns/new" className="btn btn-primary">ساخت کمپین جدید</Link>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <caption className="sr-only">فهرست شش کمپین اخیر سازمان</caption>
                <thead>
                  <tr><th>نام کمپین</th><th>واحد</th><th>مخاطبین</th><th>وضعیت</th><th>تاریخ</th></tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id}>
                      <td><Link href={`/campaigns/${c.id}`} className="link">{c.name}</Link></td>
                      <td>{c.department?.name ?? "—"}</td>
                      <td className="tnum">{faNumber(c._count.recipients)}</td>
                      <td><Badge tone={CAMPAIGN_STATUS[c.status].tone}>{CAMPAIGN_STATUS[c.status].label}</Badge></td>
                      <td className="tnum">{faDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-bold">عملکرد واحدها</h2>
          {deptRows.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>هنوز داده‌ای برای نمایش نیست.</p>
          ) : (
            <ul className="space-y-3">
              {deptRows.map((d) => (
                <li key={d.name}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{d.name}</span>
                    <span className="tnum" style={{ color: "var(--muted)" }}>{faNumber(d.count)} کمپین</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(d.count / maxDept) * 100}%`, background: "var(--primary)" }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
