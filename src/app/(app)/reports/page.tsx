import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { faDate, faDateTime, faNumber } from "@/lib/jalali";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/primitives";
import { RankedBars, TimeBars } from "@/components/ui/charts";
import { SMS_STATUS } from "@/lib/labels";
import ReportFilters from "./report-filters";

export const metadata: Metadata = { title: "گزارش‌ها" };
export const dynamic = "force-dynamic";

/** بازه‌های آماده برای برش سریع گزارش. */
const RANGES = [
  { label: "همه", days: null as number | null },
  { label: "۷ روز", days: 7 },
  { label: "۳۰ روز", days: 30 },
  { label: "۹۰ روز", days: 90 },
  { label: "یک سال", days: 365 },
];

function rangeParams(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** نشانی همین صفحه با چند پارامتر عوض‌شده؛ بقیه فیلترها دست‌نخورده می‌مانند. */
function slicerHref(current: Record<string, string | undefined>, patch: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/reports?${query}` : "/reports";
}

/** درصد با یک رقم اعشار، برای نرخ‌ها. */
function rate(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${faNumber((Math.round((part / whole) * 1000) / 10).toLocaleString("en-US"))}٪`;
}

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

  const [messages, totals, links, campaignStats, recipientStats, trend, responses, uniqueContacts] = await Promise.all([
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
    prisma.campaign.groupBy({
      by: ["status"], _count: { _all: true },
      where: { organizationId: user.organizationId },
    }),
    prisma.campaignRecipient.aggregate({
      _count: { _all: true },
      _sum: { viewCount: true },
      where: { campaign: { organizationId: user.organizationId } },
    }),
    // برای نمودار روزانه فقط همین دو ستون لازم است؛ گروه‌بندی روزانه در جاوااسکریپت
    // انجام می‌شود تا کوئری خام و وابسته به لهجه SQL ننویسیم.
    prisma.smsMessage.findMany({
      where,
      select: { createdAt: true, sentAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.letterResponse.count({
      where: { campaignRecipient: { campaign: { organizationId: user.organizationId } } },
    }),
    prisma.campaignRecipient
      .findMany({
        where: { campaign: { organizationId: user.organizationId } },
        select: { contactId: true },
        distinct: ["contactId"],
      })
      .then((rows) => rows.length),
  ]);

  const count = (status: string) => totals.find((t) => t.status === status)?._count._all ?? 0;
  const segments = totals.reduce((sum, t) => sum + (t._sum.segmentsCount ?? 0), 0);
  const allMessages = totals.reduce((sum, t) => sum + t._count._all, 0);
  const successful = count("SENT") + count("DELIVERED");
  const views = links._sum.viewCount ?? 0;
  const recipients = recipientStats._count._all;
  const completedCampaigns = campaignStats.find((c) => c.status === "COMPLETED")?._count._all ?? 0;

  // ۳۰ روز اخیر، حتی روزهایی که پیامکی نداشته‌اند (خالی‌ها هم داستان دارند)
  const days: Array<{ key: string; label: string; value: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    days.push({ key: day.toISOString().slice(0, 10), label: faDate(day), value: 0 });
  }
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  for (const row of trend) {
    const key = (row.sentAt ?? row.createdAt).toISOString().slice(0, 10);
    const index = dayIndex.get(key);
    if (index !== undefined) days[index].value++;
  }

  // شکست وضعیت: هر ردیف برچسب و عدد دارد، پس معنی فقط با رنگ منتقل نمی‌شود
  const statusRows = [
    { label: "ارسال‌شده", value: count("SENT"), color: "var(--success)" },
    { label: "تحویل‌شده", value: count("DELIVERED"), color: "var(--info)" },
    { label: "در صف", value: count("QUEUED"), color: "var(--warn)" },
    { label: "ناموفق", value: count("FAILED"), color: "var(--danger)" },
  ].filter((r) => r.value > 0);

  const campaignRows = campaignStats
    .map((c) => ({ label: CAMPAIGN_LABELS[c.status] ?? c.status, value: c._count._all }))
    .sort((a, b) => b.value - a.value);

  const query = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="گزارش‌ها"
        description="وضعیت ارسال پیامک‌ها، بازدید نامه‌ها و روند روزانه"
        action={<a className="btn btn-sm" href={`/api/reports/export?${query}`}>خروجی CSV</a>}
      />

      {/* برش‌های سریع: بازه‌های پرکاربرد و وضعیت، بدون باز کردن فرم فیلتر */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>بازه:</span>
        {RANGES.map((range) => {
          const target: { from?: string; to?: string } =
            range.days === null ? { from: undefined, to: undefined } : rangeParams(range.days);
          const active = range.days === null ? !sp.from && !sp.to : sp.from === target.from && sp.to === target.to;
          return (
            <Link
              key={range.label}
              href={slicerHref(sp, target)}
              className="chip"
              style={active ? { background: "var(--primary)", color: "var(--primary-text)" } : undefined}
            >
              {range.label}
            </Link>
          );
        })}

        <span className="ms-3 text-xs font-bold" style={{ color: "var(--muted)" }}>وضعیت:</span>
        <Link href={slicerHref(sp, { status: undefined })} className="chip"
              style={!sp.status ? { background: "var(--primary)", color: "var(--primary-text)" } : undefined}>
          همه
        </Link>
        {Object.entries(SMS_STATUS).map(([value, meta]) => (
          <Link key={value} href={slicerHref(sp, { status: value })} className="chip"
                style={sp.status === value ? { background: "var(--primary)", color: "var(--primary-text)" } : undefined}>
            {meta.label}
          </Link>
        ))}
      </div>

      <ReportFilters from={sp.from} to={sp.to} status={sp.status} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ارسال موفق" value={faNumber(successful)} hint={`از ${faNumber(allMessages)} پیامک`} />
        <StatCard label="نرخ موفقیت" value={rate(successful, allMessages)} hint="سهم پیامک‌هایی که درگاه پذیرفت" />
        <StatCard label="ناموفق" value={faNumber(count("FAILED"))} hint={rate(count("FAILED"), allMessages)} />
        <StatCard label="بخش‌های پیامک" value={faNumber(segments)} hint="مبنای محاسبه هزینه" />
        <StatCard label="بازدید نامه‌ها" value={faNumber(views)} hint="مجموع بازکردن لینک" />
        <StatCard label="نرخ بازکردن" value={rate(recipientStats._sum.viewCount ?? 0, recipients)} hint="به‌ازای هر مخاطب" />
        <StatCard label="مخاطبین نامه‌ها" value={faNumber(recipients)} hint="مجموع گیرندگان همه نامه‌ها" />
        <StatCard label="نامه‌های ارسال‌شده" value={faNumber(completedCampaigns)} hint="نامه‌هایی که ارسالشان تمام شده" />
        <StatCard label="مخاطبان یکتا" value={faNumber(uniqueContacts)} hint="افرادی که دست‌کم یک نامه گرفته‌اند" />
        <StatCard label="پاسخ‌ها" value={faNumber(responses)} hint="مخاطبانی که از صفحه نامه پاسخ داده‌اند" />
        <StatCard
          label="میانگین بخش هر پیامک"
          value={allMessages === 0 ? "—" : faNumber((Math.round((segments / allMessages) * 10) / 10).toLocaleString("en-US"))}
          hint="بیشتر از ۱ یعنی متن‌ها بلندند"
        />
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <TimeBars
          points={days.map((d) => ({ label: d.label, value: d.value }))}
          title="پیامک‌های ۳۰ روز اخیر"
          hint="هر ستون یک روز است. برای دیدن عدد، نشانگر را روی ستون نگه دارید."
        />
        <RankedBars rows={statusRows} title="وضعیت پیامک‌ها" hint="در بازه فیلترشده" unit="پیامک" />
        <RankedBars rows={campaignRows} title="نامه‌ها بر اساس وضعیت" hint="کل نامه‌های سازمان" unit="نامه" />
        <RankedBars
          rows={[
            { label: "بازدیدشده", value: views, color: "var(--info)" },
            { label: "بدون بازدید", value: Math.max(0, recipients - (recipientStats._sum.viewCount ?? 0)), color: "var(--muted)" },
          ]}
          title="بازکردن نامه"
          hint="نامه‌هایی که مخاطب لینکشان را باز کرده است"
        />
      </div>

      {messages.length === 0 ? (
        <EmptyState title="رکوردی یافت نشد" description="برای این بازه یا وضعیت، پیامکی ثبت نشده است. فیلترها را تغییر دهید." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <caption className="sr-only">فهرست پیامک‌های ارسال‌شده</caption>
            <thead><tr><th>نامه</th><th>مخاطب</th><th>شماره</th><th>وضعیت</th><th>بخش</th><th>زمان</th><th>خطا</th></tr></thead>
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

const CAMPAIGN_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PENDING_APPROVAL: "منتظر تأیید",
  APPROVED: "تأییدشده",
  PROCESSING: "در حال ارسال",
  COMPLETED: "ارسال‌شده",
  FAILED: "ناموفق",
  CANCELLED: "لغوشده",
};
