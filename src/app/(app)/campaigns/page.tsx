import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { allows, requirePage } from "@/lib/auth";
import { faDate, faNumber } from "@/lib/jalali";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { CAMPAIGN_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "نامه‌های من" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "all", label: "همه نامه‌ها" },
  { key: "sent", label: "ارسالی" },
  { key: "received", label: "دریافتی" },
  { key: "inflight", label: "در گردش" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function CampaignsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const user = await requirePage("campaigns.read");
  const sp = await searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === sp.tab)?.key ?? "all") as TabKey;
  const q = (sp.q ?? "").trim();

  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { positionId: true } });

  /**
   * دسته‌بندی نامه‌ها از دید همین کاربر:
   * ارسالی = نامه‌هایی که خودش ساخته، دریافتی = نامه‌هایی که برای تصمیم به سمت
   * او رسیده (یا خودش تأییدشان کرده)، در گردش = هرچه الان منتظر تأیید است.
   */
  const scope: Record<TabKey, Prisma.CampaignWhereInput> = {
    all: {},
    sent: { createdByUserId: user.id },
    received: {
      OR: [
        { approvedByUserId: user.id },
        { approvals: { some: { approverUserId: user.id } } },
        ...(me.positionId ? [{ approvals: { some: { positionId: me.positionId } } }] : []),
      ],
    },
    inflight: { status: "PENDING_APPROVAL" },
  };

  const search: Prisma.CampaignWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
          { letters: { some: { subject: { contains: q, mode: "insensitive" } } } },
          { letters: { some: { title: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};

  const campaigns = await prisma.campaign.findMany({
    where: { AND: [{ organizationId: user.organizationId }, scope[tab], search] },
    include: {
      department: true,
      createdBy: { select: { fullName: true } },
      _count: { select: { recipients: true } },
      recipients: { where: { status: { in: ["SMS_SENT", "SMS_DELIVERED"] } }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const link = (key: TabKey) => `/campaigns?tab=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader
        title="نامه‌های من"
        description="هر نامه برای فهرستی از مخاطبین شخصی‌سازی و پیامک می‌شود. نامه‌هایی که از کارتابل شما گذشته‌اند در «دریافتی» هستند."
        action={allows(user, "campaigns.write") && <Link href="/campaigns/new" className="btn btn-primary">+ نامه جدید</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <nav aria-label="دسته نامه‌ها" className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={link(t.key)}
              className="chip"
              data-selected={t.key === tab}
              aria-current={t.key === tab ? "page" : undefined}
              style={t.key === tab ? { background: "var(--primary)", color: "var(--primary-text)" } : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <form method="get" className="ms-auto flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input
            className="input"
            name="q"
            defaultValue={q}
            placeholder="جست‌وجو در نام و موضوع نامه…"
            aria-label="جست‌وجوی نامه"
          />
          <button className="btn" type="submit">جست‌وجو</button>
          {q && <Link href={link(tab)} className="btn">پاک کردن</Link>}
        </form>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          title={q ? "نامه‌ای با این جست‌وجو پیدا نشد" : "در این دسته نامه‌ای نیست"}
          description={q
            ? "عبارت دیگری را امتحان کنید یا دسته را عوض کنید."
            : "برای شروع، یک نامه بسازید: نام، سربرگ و متن را مشخص کنید و بعد مخاطبین را انتخاب کنید."}
          action={allows(user, "campaigns.write") && <Link href="/campaigns/new" className="btn btn-primary">ساخت نامه جدید</Link>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <caption className="sr-only">فهرست نامه‌های سازمان</caption>
            <thead>
              <tr><th>نام نامه</th><th className="col-optional">سازنده</th><th className="col-optional">واحد</th><th className="col-optional">مخاطبین</th><th className="col-optional">پیامک موفق</th><th className="col-optional">محرمانگی</th><th>وضعیت</th><th>تاریخ</th></tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/campaigns/${c.id}`} className="link">{c.name}</Link></td>
                  <td className="col-optional">{c.createdBy.fullName}</td>
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
