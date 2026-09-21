import { prisma } from "./db";
import { ApiError } from "./api";
import type { CurrentUser } from "./auth";
import { audit } from "./audit";

/**
 * گردش تأیید نامه بر اساس سمت سازمانی.
 *
 * هر کمپین یک گردش کار دارد؛ گردش کار ترتیبی از سمت‌هاست (مثلاً
 * «کارشناس مسئول ← رئیس اداره ← معاون»). نامه فقط وقتی ارسال می‌شود که
 * همه مراحل غیراختیاری تأیید شده باشند.
 */

/** ساخت مراحل تأیید یک کمپین از روی گردش کارِ انتخاب‌شده (یا پیش‌فرض سازمان). */
export async function initApprovals(campaignId: string, organizationId: string, workflowId?: string | null) {
  const workflow = workflowId
    ? await prisma.workflow.findFirst({ where: { id: workflowId, organizationId }, include: { steps: { orderBy: { order: "asc" } } } })
    : await prisma.workflow.findFirst({ where: { organizationId, isDefault: true }, include: { steps: { orderBy: { order: "asc" } } } });

  await prisma.campaignApproval.deleteMany({ where: { campaignId } });

  if (!workflow || workflow.steps.length === 0) {
    // بدون گردش کار تعریف‌شده: همان تأیید تک‌مرحله‌ای قبلی
    await prisma.campaign.update({ where: { id: campaignId }, data: { workflowId: null, currentStepOrder: 0 } });
    return { steps: 0 };
  }

  await prisma.campaignApproval.createMany({
    data: workflow.steps.map((step) => ({
      campaignId,
      workflowStepId: step.id,
      positionId: step.positionId,
      order: step.order,
    })),
  });
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { workflowId: workflow.id, currentStepOrder: workflow.steps[0].order },
  });
  return { steps: workflow.steps.length };
}

/** مرحله‌ای که هم‌اکنون منتظر تصمیم است. */
export async function pendingStep(campaignId: string) {
  return prisma.campaignApproval.findFirst({
    where: { campaignId, status: "PENDING" },
    include: { position: true },
    orderBy: { order: "asc" },
  });
}

/**
 * آیا این کاربر اجازه تصمیم‌گیری روی مرحله جاری را دارد؟
 * مدیر سازمان همیشه می‌تواند (برای نشکستن کار وقتی صاحب سمت در دسترس نیست)،
 * وگرنه سمت کاربر باید دقیقاً همان سمتِ مرحله باشد.
 */
export function canDecide(user: CurrentUser, step: { positionId: string }, userPositionId: string | null): boolean {
  if (user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN") return true;
  return userPositionId !== null && userPositionId === step.positionId;
}

export async function decide(
  campaignId: string,
  user: CurrentUser,
  decision: "APPROVED" | "REJECTED",
  note?: string,
) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: user.organizationId } });
  if (!campaign) throw new ApiError(404, "کمپین یافت نشد.");
  if (campaign.status !== "PENDING_APPROVAL") throw new ApiError(409, "این کمپین در انتظار تأیید نیست.");

  const step = await pendingStep(campaignId);

  // کمپین بدون گردش کار: همان مسیر تک‌مرحله‌ای
  if (!step) {
    if (decision === "REJECTED") {
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: "DRAFT", rejectionReason: note ?? null } });
      return { status: "DRAFT" as const, remaining: 0 };
    }
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "APPROVED", approvedByUserId: user.id, approvedAt: new Date(), rejectionReason: null },
    });
    return { status: "APPROVED" as const, remaining: 0 };
  }

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { positionId: true } });
  if (!canDecide(user, step, record.positionId)) {
    throw new ApiError(403, `تصمیم‌گیری این مرحله با سمت «${step.position.name}» است.`);
  }

  await prisma.campaignApproval.update({
    where: { id: step.id },
    data: { status: decision, approverUserId: user.id, note: note ?? null, decidedAt: new Date() },
  });

  if (decision === "REJECTED") {
    // رد در هر مرحله، کل نامه را به پیش‌نویس برمی‌گرداند
    await prisma.$transaction([
      prisma.campaignApproval.updateMany({
        where: { campaignId, status: "PENDING" },
        data: { status: "SKIPPED" },
      }),
      prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "DRAFT", rejectionReason: note ?? null, currentStepOrder: 0 },
      }),
    ]);
    await audit({
      organizationId: user.organizationId, userId: user.id, action: "CAMPAIGN_REJECT",
      entityType: "Campaign", entityId: campaignId, metadata: { step: step.order, position: step.position.name, note },
    });
    return { status: "DRAFT" as const, remaining: 0 };
  }

  const next = await pendingStep(campaignId);
  if (next) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { currentStepOrder: next.order } });
    await audit({
      organizationId: user.organizationId, userId: user.id, action: "CAMPAIGN_APPROVE_STEP",
      entityType: "Campaign", entityId: campaignId, metadata: { step: step.order, position: step.position.name },
    });
    return { status: "PENDING_APPROVAL" as const, remaining: await prisma.campaignApproval.count({ where: { campaignId, status: "PENDING" } }) };
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "APPROVED", approvedByUserId: user.id, approvedAt: new Date(), rejectionReason: null },
  });
  await audit({
    organizationId: user.organizationId, userId: user.id, action: "CAMPAIGN_APPROVE",
    entityType: "Campaign", entityId: campaignId, metadata: { finalStep: step.order },
  });
  return { status: "APPROVED" as const, remaining: 0 };
}
