import { prisma } from "./db";
import { ApiError } from "./api";
import { allows, type CurrentUser } from "./auth";
import { audit } from "./audit";
import { normalizeMobile } from "./sms";
import { resolveProvider } from "./sms-server";
import { appBaseUrl } from "./base-url";
import { MESSENGERS, sendMessenger } from "./messengers";
import { decrypt } from "./crypto";

/**
 * گردش تأیید نامه بر اساس سمت سازمانی.
 *
 * هر نامه یک گردش کار دارد؛ گردش کار ترتیبی از سمت‌هاست (مثلاً
 * «کارشناس مسئول ← رئیس اداره ← معاون»). نامه فقط وقتی ارسال می‌شود که
 * همه مراحل غیراختیاری تأیید شده باشند.
 */

/** ساخت مراحل تأیید یک نامه از روی گردش کارِ انتخاب‌شده (یا پیش‌فرض سازمان). */
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
  if (!campaign) throw new ApiError(404, "نامه یافت نشد.");
  if (campaign.status !== "PENDING_APPROVAL") throw new ApiError(409, "این نامه در انتظار تأیید نیست.");

  const step = await pendingStep(campaignId);

  // نامه بدون گردش کار: همان مسیر تک‌مرحله‌ای
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
    await notifyPendingApprover(campaignId, user.organizationId);
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

/**
 * خبر دادن به صاحب مرحله جاری با پیامک: «نامه‌ای منتظر تأیید شماست».
 *
 * بهترین‌تلاش است و هیچ‌وقت کار تأیید را نمی‌شکند؛ اگر درگاه پیامک تنظیم نشده
 * یا شماره کاربر ثبت نیست، بی‌سروصدا رد می‌شود.
 */
export async function notifyPendingApprover(campaignId: string, organizationId: string) {
  try {
    const step = await pendingStep(campaignId);
    if (!step) return;

    const approvers = await prisma.user.findMany({
      where: { organizationId, positionId: step.positionId, status: "ACTIVE", deletedAt: null },
      select: { mobilePhone: true, baleChatId: true, telegramChatId: true, eitaaChatId: true },
    });
    if (approvers.length === 0) return;

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      select: { name: true },
    });
    const baseUrl = appBaseUrl();
    const text = `نامه «${campaign.name}» منتظر تأیید شماست: ${baseUrl}/approvals`;

    const numbers = approvers
      .map((u) => normalizeMobile(u.mobilePhone))
      .filter((n): n is string => Boolean(n));
    if (numbers.length > 0) {
      const config = await prisma.smsProviderConfig.findFirst({ where: { organizationId, isDefault: true } });
      const provider = resolveProvider(config);
      const sender = config?.senderNumber ?? "10008663";
      for (const to of numbers) await provider.send(to, text, sender);
    }

    // پیام‌رسان‌ها: هر کاربری که شناسه گفت‌وگویش را ثبت کرده و سازمان برای همان
    // پیام‌رسان توکن دارد، پیام می‌گیرد. نبودن یکی، بقیه را نمی‌شکند.
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { baleBotTokenEncrypted: true, telegramBotTokenEncrypted: true, eitaaTokenEncrypted: true },
    });
    const tokens: Record<string, string | null> = {
      bale: org.baleBotTokenEncrypted,
      telegram: org.telegramBotTokenEncrypted,
      eitaa: org.eitaaTokenEncrypted,
    };

    for (const messenger of MESSENGERS) {
      const encrypted = tokens[messenger.id];
      if (!encrypted) continue;
      const token = decrypt(encrypted);
      for (const approver of approvers) {
        const chatId =
          messenger.id === "bale" ? approver.baleChatId
          : messenger.id === "telegram" ? approver.telegramChatId
          : approver.eitaaChatId;
        if (chatId) await sendMessenger(messenger.id, token, chatId, text);
      }
    }
  } catch {
    // خطای اطلاع‌رسانی نباید جلوی گردش تأیید را بگیرد
  }
}

/**
 * آیا این کاربر اصلاً کار تأیید دارد؟
 *
 * دو راه: یا نقشش مجوز عمومی تأیید دارد، یا سمتش سمتی است که در سازمان حق
 * تأیید دارد (Position.canApprove). راه دوم لازم است چون گردش کار روی «سمت»
 * تعریف می‌شود نه «نقش»؛ بدون آن، نامه‌ای که مرحله‌اش سمت رئیس اداره است در
 * کارتابل هیچ‌کس نمی‌نشست و فقط مدیر سازمان می‌توانست جلو ببردش.
 */
export async function hasApprovalDuty(user: CurrentUser): Promise<boolean> {
  if (allows(user, "campaigns.approve")) return true;
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { position: { select: { canApprove: true } } },
  });
  return record?.position?.canApprove === true;
}
