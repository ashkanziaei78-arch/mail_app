import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { hasApprovalDuty } from "@/lib/workflow";
import { campaignFlow } from "@/lib/flow";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import ApprovalCard, { type PendingCampaign } from "./approval-card";

export const metadata: Metadata = { title: "تأیید نامه‌ها" };
export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const user = await requirePage();
  // صاحب سمتی که حق تأیید دارد هم کارتابل می‌بیند، نه فقط نقش‌های دارای مجوز
  if (!(await hasApprovalDuty(user))) redirect("/dashboard?denied=1");
  const pending = await prisma.campaign.findMany({
    where: { organizationId: user.organizationId, status: "PENDING_APPROVAL" },
    include: {
      createdBy: { select: { fullName: true } },
      department: true,
      approvals: { include: { position: true, approver: { select: { fullName: true } } }, orderBy: { order: "asc" } },
      _count: { select: { recipients: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  const cards: PendingCampaign[] = pending.map((c) => {
    const approvals = c.approvals.map((a) => ({
      id: a.id,
      order: a.order,
      status: a.status,
      positionName: a.position.name,
      approverName: a.approver?.fullName ?? null,
    }));
    const current = approvals.filter((a) => a.status === "PENDING").sort((x, y) => x.order - y.order)[0];
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      createdBy: c.createdBy.fullName,
      departmentName: c.department?.name ?? null,
      updatedAt: c.updatedAt.toISOString(),
      recipients: c._count.recipients,
      confidential: c.confidentiality === "CONFIDENTIAL",
      currentStep: current?.positionName ?? null,
      flow: campaignFlow(c.status, approvals),
    };
  });

  return (
    <>
      <PageHeader
        title="تأیید نامه‌ها"
        description="هر کارت نشان می‌دهد نامه در کدام مرحله است. تأیید یا رد را همین‌جا بزنید؛ لازم نیست وارد نامه شوید."
      />

      {cards.length === 0 ? (
        <EmptyState title="چیزی در انتظار تأیید نیست" description="هر نامه‌ای که برای تأیید فرستاده شود، اینجا نمایش داده می‌شود." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {cards.map((c) => <ApprovalCard key={c.id} campaign={c} />)}
        </ul>
      )}
    </>
  );
}
