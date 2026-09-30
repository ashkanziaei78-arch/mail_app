import { allows } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { can } from "@/lib/rbac";
import { generateDocuments, resolveRecipients, sendCampaign } from "@/lib/campaign";
import { decide, hasApprovalDuty, initApprovals, notifyPendingApprover } from "@/lib/workflow";
import { sanitizeHtml } from "@/lib/render";
import { audit } from "@/lib/audit";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setRecipients"),
    contactIds: z.array(z.string().uuid()).default([]),
    groupIds: z.array(z.string().uuid()).default([]),
    tagIds: z.array(z.string().uuid()).default([]),
    tagMode: z.enum(["AND", "OR"]).default("OR"),
    /** true یعنی به فهرست فعلی اضافه شود، false یعنی فهرست جایگزین شود */
    append: z.boolean().default(false),
  }),
  z.object({ action: z.literal("removeRecipient"), recipientId: z.string().uuid() }),
  z.object({ action: z.literal("overrideLetter"), recipientId: z.string().uuid(), bodyHtml: z.string().nullable() }),
  z.object({ action: z.literal("generate") }),
  z.object({
    action: z.literal("submit"),
    workflowId: z.string().uuid().optional().nullable(),
    /** مدیر سازمان می‌تواند نامه آزمایشی را بدون گردش تأیید مستقیم آماده ارسال کند */
    skipApproval: z.boolean().default(false),
  }),
  z.object({ action: z.literal("approve"), note: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(1, "دلیل رد را بنویسید.").max(500) }),
  z.object({ action: z.literal("send") }),
  z.object({ action: z.literal("retryFailed") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("clone") }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("campaigns.read");
    const { id } = await params;
    const body = await readBody(request, schema);

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { letters: { orderBy: { createdAt: "asc" }, take: 1 } },
    });
    if (!campaign) throw new ApiError(404, "نامه یافت نشد.");

    const needsWrite = () => {
      if (!allows(user, "campaigns.write")) throw new ApiError(403, "اجازه ویرایش نامه را ندارید.");
    };

    switch (body.action) {
      case "setRecipients": {
        needsWrite();
        const contactIds = await resolveRecipients(user, {
          contactIds: body.contactIds, groupIds: body.groupIds, tagIds: body.tagIds, tagMode: body.tagMode,
        });

        // جایگزینی با انتخاب خالی یعنی پاک‌کردن ناخواسته کل فهرست — رد می‌شود
        if (contactIds.length === 0 && !body.append) {
          const existing = await prisma.campaignRecipient.count({ where: { campaignId: id } });
          if (existing > 0) {
            throw new ApiError(422, "انتخاب شما هیچ مخاطبی نداشت. برای خالی کردن فهرست، مخاطبین را تک‌تک حذف کنید.");
          }
        }

        if (!body.append) await prisma.campaignRecipient.deleteMany({ where: { campaignId: id } });
        await prisma.campaignRecipient.createMany({
          data: contactIds.map((contactId) => ({ campaignId: id, contactId })),
          skipDuplicates: true,
        });
        return { count: await prisma.campaignRecipient.count({ where: { campaignId: id } }) };
      }

      case "removeRecipient": {
        needsWrite();
        await prisma.campaignRecipient.deleteMany({ where: { id: body.recipientId, campaignId: id } });
        return { removed: body.recipientId };
      }

      case "overrideLetter": {
        needsWrite();
        await prisma.campaignRecipient.updateMany({
          where: { id: body.recipientId, campaignId: id },
          data: { letterOverrideHtml: body.bodyHtml ? sanitizeHtml(body.bodyHtml) : null },
        });
        return { recipientId: body.recipientId };
      }

      case "generate": {
        needsWrite();
        const result = await generateDocuments(id);
        await audit({ organizationId: user.organizationId, userId: user.id, action: "DOCUMENTS_GENERATE", entityType: "Campaign", entityId: id, metadata: result });
        return result;
      }

      case "submit": {
        needsWrite();
        const count = await prisma.campaignRecipient.count({ where: { campaignId: id } });
        if (count === 0) throw new ApiError(422, "ابتدا مخاطبین نامه را انتخاب کنید.");
        await generateDocuments(id);

        // میان‌بر مدیر سازمان: نامه آزمایشی بدون عبور از گردش تأیید آماده ارسال
        // می‌شود. برای بقیه نقش‌ها باز است تا کسی تأیید سازمان را دور نزند.
        if (body.skipApproval) {
          // فقط مدیر کل سازمان؛ تأییدکننده‌ها هم باید از گردش رد شوند تا مسیر
          // رسمی نامه دور زده نشود.
          if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN") {
            throw new ApiError(403, "رد کردن گردش تأیید فقط با مدیر کل سازمان است.");
          }
          await prisma.campaignApproval.deleteMany({ where: { campaignId: id } });
          await prisma.campaign.update({
            where: { id },
            data: { status: "APPROVED", approvedByUserId: user.id, approvedAt: new Date(), rejectionReason: null, currentStepOrder: 0 },
          });
          await audit({ organizationId: user.organizationId, userId: user.id, action: "CAMPAIGN_APPROVE", entityType: "Campaign", entityId: id, metadata: { skipApproval: true } });
          return { status: "APPROVED", steps: 0 };
        }

        // مراحل تأیید از روی گردش کار سازمان ساخته می‌شود
        const { steps } = await initApprovals(id, user.organizationId, body.workflowId ?? campaign.workflowId);
        await prisma.campaign.update({ where: { id }, data: { status: "PENDING_APPROVAL", rejectionReason: null } });
        await notifyPendingApprover(id, user.organizationId);
        await audit({ organizationId: user.organizationId, userId: user.id, action: "CAMPAIGN_SUBMIT", entityType: "Campaign", entityId: id, metadata: { steps } });
        return { status: "PENDING_APPROVAL", steps };
      }

      case "approve": {
        // یا مجوز عمومی تأیید، یا صاحب سمتِ همین مرحله بودن؛ تصمیم نهایی را
        // decide با تطبیق دقیق سمت می‌گیرد.
        if (!(await hasApprovalDuty(user))) throw new ApiError(403, "اجازه تأیید نامه را ندارید.");
        return decide(id, user, "APPROVED", body.note);
      }

      case "reject": {
        if (!(await hasApprovalDuty(user))) throw new ApiError(403, "اجازه رد نامه را ندارید.");
        return decide(id, user, "REJECTED", body.reason);
      }

      case "send":
      case "retryFailed": {
        if (!allows(user, "campaigns.send")) throw new ApiError(403, "اجازه ارسال پیامک را ندارید.");
        if (campaign.status === "PENDING_APPROVAL") throw new ApiError(409, "نامه هنوز تأیید نشده است.");
        return sendCampaign(id, user);
      }

      case "cancel": {
        needsWrite();
        if (campaign.status === "COMPLETED") throw new ApiError(409, "نامه تکمیل‌شده قابل لغو نیست.");
        await prisma.$transaction([
          prisma.smsMessage.updateMany({ where: { campaignRecipient: { campaignId: id }, status: "QUEUED" }, data: { status: "CANCELLED" } }),
          prisma.campaign.update({ where: { id }, data: { status: "CANCELLED" } }),
        ]);
        await audit({ organizationId: user.organizationId, userId: user.id, action: "CAMPAIGN_CANCEL", entityType: "Campaign", entityId: id });
        return { status: "CANCELLED" };
      }

      case "clone": {
        needsWrite();
        const letter = campaign.letters[0];
        const recipients = await prisma.campaignRecipient.findMany({ where: { campaignId: id }, select: { contactId: true } });
        const clone = await prisma.campaign.create({
          data: {
            organizationId: campaign.organizationId,
            departmentId: campaign.departmentId,
            createdByUserId: user.id,
            name: `${campaign.name} (رونوشت)`,
            subject: campaign.subject,
            confidentiality: campaign.confidentiality,
            smsBodyText: campaign.smsBodyText,
            clonedFromId: campaign.id,
            recipients: { create: recipients.map((r) => ({ contactId: r.contactId })) },
            letters: letter
              ? {
                  create: {
                    organizationId: campaign.organizationId,
                    letterheadId: letter.letterheadId,
                    letterTemplateId: letter.letterTemplateId,
                    title: letter.title,
                    subject: letter.subject,
                    bodyHtml: letter.bodyHtml,
                    senderName: letter.senderName,
                    letterDate: new Date(),
                  },
                }
              : undefined,
          },
        });
        return { id: clone.id };
      }
    }
  });
}
