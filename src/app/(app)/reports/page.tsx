import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { faDateTime, faNumber } from "@/lib/jalali";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/primitives";
import { SMS_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "گزارش‌ها" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const user = await requirePage("reports.read");
  const sp = await searchParams;

  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : undefined;
  const statusFilter = sp.status && sp.status in SMS_STATUS ? (sp.status as keyof typeof SMS_STATUS) : undefined;

  const where = {
    campaignRecipient: { campaign: { organizationId: user.organizationId } },
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [messages, totals, links] = await Promise.all([
    prisma.smsMessage.findMany({
      where,
      include: { campaignRecipient: { include: { campaign: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.smsMessage.groupBy({ by: ["status"], _count: { _all: true }, _sum: { segmentsCount: true }, where }),
    prisma.shortLink.aggregate({
      _sum: { viewCount: true },
      where: { document: { campaignRecipient: { campaign: { organizationId: user.organizationId } } } },
    }),
  ]);

  const count = (status: string) => totals.find((t) => t.status === status)?._count._all ?? 0;
  const segments = totals.reduce((sum, t) => sum + (t._sum.segmentsCount ?? 0), 0);

  const query = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="گزارش‌ها"
        description="وضعیت ارسال پیامک‌ها و مشاهده نامه‌ها"
        action={<a className="btn btn-sm" href={`/api/reports/export?${query}`}>خروجی CSV</a>}
      />

      <form className="card mb-4 grid gap-3 p-3 md:grid-cols-4" method="get">
        <div><label htmlFor="from" className="label">از تاریخ</label><input id="from" name="from" type="date" className="input" defaultValue={sp.from} /></div>
        <div><label htmlFor="to" className="label">تا تاریخ</label><input id="to" name="to" type="date" className="input" defaultValue={sp.to} /></div>
        <div>
          <label htmlFor="status" className="label">وضعیت</label>
          <select id="status" name="status" className="select" defaultValue={sp.status ?? ""}>
            <option value="">همه</option>
            {Object.entries(SMS_STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </select>
        </div>
        <div className="flex items-end"><button className="btn btn-primary w-full" type="submit">اعمال فیلتر</button></div>
        <p className="hint md:col-span-4">تاریخ‌ها میلادی وارد می‌شوند (محدودیت فیلد تاریخ مرورگر)؛ نمایش نتایج شمسی است.</p>
      </form>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ارسال موفق" value={faNumber(count("SENT") + count("DELIVERED"))} />
        <StatCard label="ناموفق" value={faNumber(count("FAILED"))} />
        <StatCard label="بخش‌های پیامک" value={faNumber(segments)} hint="مبنای محاسبه هزینه" />
        <StatCard label="بازدید لینک نامه‌ها" value={faNumber(links._sum.viewCount ?? 0)} />
      </div>

      {messages.length === 0 ? (
        <EmptyState title="رکوردی یافت نشد" description="برای این بازه یا وضعیت، پیامکی ثبت نشده است. فیلترها را تغییر دهید." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <caption className="sr-only">فهرست پیامک‌های ارسال‌شده</caption>
            <thead><tr><th>کمپین</th><th>مخاطب</th><th>شماره</th><th>وضعیت</th><th>بخش</th><th>زمان</th><th>خطا</th></tr></thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td>{m.campaignRecipient.campaign.name}</td>
                  <td>{m.campaignRecipient.contact.firstName} {m.campaignRecipient.contact.lastName}</td>
                  <td className="tnum" dir="ltr">{m.toPhone}</td>
                  <td><Badge tone={SMS_STATUS[m.status].tone}>{SMS_STATUS[m.status].label}</Badge></td>
                  <td className="tnum">{faNumber(m.segmentsCount)}</td>
                  <td className="tnum">{faDateTime(m.sentAt ?? m.createdAt)}</td>
                  <td style={{ color: "var(--danger)" }}>{m.errorMessage ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
