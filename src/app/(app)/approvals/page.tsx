import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { faDateTime, faNumber } from "@/lib/jalali";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "تأیید نامه‌ها" };
export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const user = await requirePage("campaigns.approve");
  const pending = await prisma.campaign.findMany({
    where: { organizationId: user.organizationId, status: "PENDING_APPROVAL" },
    include: {
      createdBy: { select: { fullName: true } },
      department: true,
      letters: { take: 1, orderBy: { createdAt: "asc" } },
      _count: { select: { recipients: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  return (
    <>
      <PageHeader title="تأیید نامه‌ها" description="نامه‌ها پیش از ارسال باید توسط تأییدکننده بررسی شوند." />

      {pending.length === 0 ? (
        <EmptyState title="چیزی در انتظار تأیید نیست" description="هر کمپینی که برای تأیید فرستاده شود، اینجا نمایش داده می‌شود." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {pending.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {c.createdBy.fullName} — {c.department?.name ?? "بدون واحد"} — {faDateTime(c.updatedAt)}
                  </p>
                </div>
                {c.confidentiality === "CONFIDENTIAL" && <Badge tone="warn">محرمانه</Badge>}
              </div>
              <p className="mb-3 text-sm">موضوع: {c.subject ?? "—"} — <span className="tnum">{faNumber(c._count.recipients)}</span> مخاطب</p>
              <Link href={`/campaigns/${c.id}`} className="btn btn-primary btn-sm">بررسی و تأیید</Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
