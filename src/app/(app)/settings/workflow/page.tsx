import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import WorkflowClient from "./workflow-client";

export const metadata: Metadata = { title: "سمت‌ها و گردش تأیید" };
export const dynamic = "force-dynamic";

export default async function WorkflowPage() {
  const admin = await requirePage("users.manage");
  const [positions, workflows] = await Promise.all([
    prisma.position.findMany({
      where: { organizationId: admin.organizationId },
      include: { _count: { select: { users: true, workflowSteps: true } } },
      orderBy: { rank: "asc" },
    }),
    prisma.workflow.findMany({
      where: { organizationId: admin.organizationId },
      include: { steps: { include: { position: true }, orderBy: { order: "asc" } }, _count: { select: { campaigns: true } } },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <WorkflowClient
      positions={positions.map((p) => ({
        id: p.id, name: p.name, rank: p.rank, canApprove: p.canApprove, canSign: p.canSign,
        userCount: p._count.users, stepCount: p._count.workflowSteps,
      }))}
      workflows={workflows.map((w) => ({
        id: w.id, name: w.name, isDefault: w.isDefault, campaignCount: w._count.campaigns,
        steps: w.steps.map((s) => ({ id: s.id, order: s.order, positionName: s.position.name, label: s.label, optional: s.optional })),
      }))}
    />
  );
}
